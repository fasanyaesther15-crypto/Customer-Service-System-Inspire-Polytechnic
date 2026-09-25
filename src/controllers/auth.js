const bcrypt = require('bcryptjs');
const { createStudent, findUserByEmail } = require('../models/user');
const {
  hashPassword,
  normalizeEmail,
  validateRegistration,
  verifyPassword
} = require('../services/auth');

const invalidCredentialsMessage = 'Invalid email or password.';

function renderRegistration(response, values = {}, errors = []) {
  return response.status(errors.length ? 400 : 200).render('register', {
    values,
    errors
  });
}

function showRegistration(request, response) {
  return renderRegistration(response);
}

async function register(request, response, next) {
  const validation = validateRegistration(request.body);

  if (validation.errors.length) {
    return renderRegistration(response, request.body, validation.errors);
  }

  try {
    const existingUser = await findUserByEmail(validation.email);

    if (existingUser) {
      return renderRegistration(response, request.body, ['An account with that email already exists.']);
    }

    const passwordHash = await hashPassword(request.body.password);
    await createStudent({
      fullName: validation.fullName,
      email: validation.email,
      passwordHash
    });

    return response.redirect('/login?registered=1');
  } catch (error) {
    if (error.code === '23505') {
      return renderRegistration(response, request.body, ['An account with that email already exists.']);
    }

    return next(error);
  }
}

function showLogin(request, response) {
  return response.render('login', {
    error: null,
    registered: request.query.registered === '1'
  });
}

async function login(request, response, next) {
  const email = normalizeEmail(request.body.email);
  const password = String(request.body.password || '');

  if (!email || !password) {
    return response.status(401).render('login', {
      error: invalidCredentialsMessage,
      registered: false
    });
  }

  try {
    const user = await findUserByEmail(email);
    const passwordMatches = user ? await verifyPassword(password, user.password_hash) : false;

    if (!user || !user.is_active || !passwordMatches) {
      return response.status(401).render('login', {
        error: invalidCredentialsMessage,
        registered: false
      });
    }

    return request.session.regenerate((error) => {
      if (error) {
        return next(error);
      }

      request.session.user = {
        id: user.id,
        fullName: user.full_name,
        email: user.email,
        role: user.role
      };

      return request.session.save((saveError) => {
        if (saveError) {
          return next(saveError);
        }

        const redirectMap = {
          student: '/student/dashboard',
          support_agent: '/support/dashboard',
          administrator: '/admin/dashboard'
        };

        return response.redirect(redirectMap[user.role] || '/');
      });
    });
  } catch (error) {
    return next(error);
  }
}

function logout(request, response, next) {
  request.session.destroy((error) => {
    if (error) {
      return next(error);
    }

    response.clearCookie('connect.sid');
    return response.redirect('/');
  });
}

module.exports = { login, logout, register, showLogin, showRegistration };