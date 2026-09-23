const express = require('express');
const { rateLimit } = require('express-rate-limit');
const {
  showAbout,
  showAdmissions,
  showAnnouncements,
  showContact,
  showFaq,
  showHome,
  showProgrammes,
  submitContact
} = require('../controllers/public');

const router = express.Router();
const contactRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: 'Too many enquiries. Please try again later.'
});

router.get('/', showHome);
router.get('/about', showAbout);
router.get('/programmes', showProgrammes);
router.get('/admissions', showAdmissions);
router.get('/faq', showFaq);
router.get('/announcements', showAnnouncements);
router.get('/contact', showContact);
router.post('/contact', contactRateLimit, submitContact);

module.exports = router;
