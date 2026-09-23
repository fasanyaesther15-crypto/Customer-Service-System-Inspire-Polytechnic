const express = require('express');
const { rateLimit } = require('express-rate-limit');
const {
  login,
  logout,
  register,
  showLogin,
  showRegistration
} = require('../controllers/auth');

const router = express.Router();
const authenticationRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: 'Too many authentication attempts. Please try again later.'
});

router.get('/register', showRegistration);
router.post('/register', authenticationRateLimit, register);
router.get('/login', showLogin);
router.post('/login', authenticationRateLimit, login);
router.post('/logout', logout);

module.exports = router;