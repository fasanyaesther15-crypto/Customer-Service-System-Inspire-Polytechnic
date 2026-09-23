function requireAuth(request, response, next) {
  if (!request.session.user) {
    return response.redirect('/login');
  }

  return next();
}

function requireRole(...allowedRoles) {
  return (request, response, next) => {
    if (!request.session.user) {
      return response.redirect('/login');
    }

    if (!allowedRoles.includes(request.session.user.role)) {
      return response.status(403).render('error', {
        statusCode: 403,
        message: 'You do not have permission to access this page.'
      });
    }

    return next();
  };
}

module.exports = { requireAuth, requireRole };