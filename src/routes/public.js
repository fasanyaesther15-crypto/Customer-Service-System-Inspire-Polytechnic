const express = require('express');
const { rateLimit } = require('express-rate-limit');
const {
  showAbout,
  showAdmissions,
  showAnnouncements,
  askFaq,
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
const faqRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: 'Too many FAQ searches. Please try again later.'
});

router.get('/', showHome);
router.get('/about', showAbout);
router.get('/programmes', showProgrammes);
router.get('/admissions', showAdmissions);
router.get('/faq', showFaq);
router.post('/faq', faqRateLimit, askFaq);
router.get('/announcements', showAnnouncements);
router.get('/contact', showContact);
router.post('/contact', contactRateLimit, submitContact);

module.exports = router;
