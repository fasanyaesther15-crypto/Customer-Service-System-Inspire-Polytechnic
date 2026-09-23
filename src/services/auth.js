const bcrypt = require('bcryptjs');

const MINIMUM_PASSWORD_LENGTH = 8;

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function validateRegistration({ fullName, email, password, passwordConfirmation }) {
  const errors = [];
  const normalizedName = String(fullName || '').trim();
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedName) {
    errors.push('Full name is required.');
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    errors.push('Enter a valid email address.');
  }

  if (String(password || '').length < MINIMUM_PASSWORD_LENGTH) {
    errors.push(`Password must be at least ${MINIMUM_PASSWORD_LENGTH} characters.`);
  }

  if (password !== passwordConfirmation) {
    errors.push('Passwords do not match.');
  }

  return {
    errors,
    fullName: normalizedName,
    email: normalizedEmail
  };
}

async function hashPassword(password) {
  return bcrypt.hash(password, 12);
}

async function verifyPassword(password, passwordHash) {
  return bcrypt.compare(password, passwordHash);
}

module.exports = {
  MINIMUM_PASSWORD_LENGTH,
  hashPassword,
  normalizeEmail,
  validateRegistration,
  verifyPassword
};