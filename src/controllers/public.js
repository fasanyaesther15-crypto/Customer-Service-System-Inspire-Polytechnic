const { query } = require('../config/database');
const { findActiveFaqs } = require('../models/faq');
const {
  findBestMatch,
  MAX_QUESTION_LENGTH,
  tokenize
} = require('../services/faqMatcher');
const crypto = require('node:crypto');
const chat = require('../models/chat');

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const programmeGroups = [
  {
    category: 'National Diploma (ND)',
    programmes: [
      'Computer Science',
      'Computer Engineering',
      'Business Administration and Management',
      'Electrical and Electronics Engineering'
    ]
  },
  {
    category: 'Vocational Courses',
    programmes: [
      'Automobile Services and Management',
      'Refrigeration and Air Conditioning',
      'Electricals'
    ]
  }
];

function pageData(pageTitle, extra = {}) {
  return { pageTitle, ...extra };
}

async function showHome(request, response, next) {
  try {
    const [faqs, announcementResult] = await Promise.all([
      findActiveFaqs(),
      query(
        `SELECT id, title, body, published_at, created_at
         FROM announcements
         WHERE is_published = true
           AND (published_at IS NULL OR published_at <= CURRENT_TIMESTAMP)
         ORDER BY COALESCE(published_at, created_at) DESC
         LIMIT 3`
      )
    ]);

    return response.render('home', pageData('Home', {
      faqs,
      announcements: announcementResult.rows,
      programmeGroups
    }));
  } catch (error) {
    return next(error);
  }
}

function showAbout(request, response) {
  return response.render('about', pageData('About'));
}

function showProgrammes(request, response) {
  return response.render('programmes', pageData('Programmes', { programmeGroups }));
}

function showAdmissions(request, response) {
  return response.render('admissions', pageData('Admissions'));
}

async function showFaq(request, response, next) {
  try {
    const result = await findActiveFaqs();
    const categories = result.reduce((groups, faq) => {
      const category = faq.category || 'General';
      groups[category] = groups[category] || [];
      groups[category].push(faq);
      return groups;
    }, {});

    return response.render('faq', pageData('FAQ', {
      categories,
      question: '',
      faqResult: null,
      faqError: null
    }));
  } catch (error) {
    return next(error);
  }
}

async function askFaq(request, response, next) {
  const question = String(request.body.question || '').trim();

  if (!question || question.length > MAX_QUESTION_LENGTH) {
    return renderFaqResult(response, question, {
      message: question ? `Question must be ${MAX_QUESTION_LENGTH} characters or fewer.` : 'Enter a question to search the FAQ.',
      type: 'error'
    }, next);
  }

  try {
    const faqs = await findActiveFaqs();
    const match = findBestMatch(question, faqs);

    return renderFaqResult(response, question, match ? {
      match,
      type: 'match'
    } : {
      message: 'We could not find a matching FAQ. Please contact support or submit a support enquiry.',
      type: 'fallback'
    }, next);
  } catch (error) {
    return next(error);
  }
}

async function renderFaqResult(response, question, result, next) {
  try {
    const faqs = await findActiveFaqs();
    const categories = faqs.reduce((groups, faq) => {
      const category = faq.category || 'General';
      groups[category] = groups[category] || [];
      groups[category].push(faq);
      return groups;
    }, {});

    return response.status(result.type === 'error' ? 400 : 200).render('faq', pageData('FAQ', {
      categories,
      question,
      faqResult: result,
      faqError: result.type === 'error' ? result.message : null,
      matchedTokens: result.match ? tokenize(question) : []
    }));
  } catch (error) {
    return next(error);
  }
}

async function showAnnouncements(request, response, next) {
  try {
    const result = await query(
      `SELECT id, title, body, published_at, created_at
       FROM announcements
       WHERE is_published = true
         AND (published_at IS NULL OR published_at <= CURRENT_TIMESTAMP)
       ORDER BY COALESCE(published_at, created_at) DESC`
    );

    return response.render('announcements', pageData('Announcements', {
      announcements: result.rows
    }));
  } catch (error) {
    return next(error);
  }
}

function showContact(request, response) {
  return response.render('contact', pageData('Contact', {
    values: {},
    errors: [],
    success: request.query.sent === '1'
  }));
}

async function startGuestChat(request, response, next) {
  if (request.session.user) {
    return response.status(409).json({ error: 'Use the chat available in your account.' });
  }

  const guestName = String(request.body.name || '').trim();
  const guestEmail = String(request.body.email || '').trim().toLowerCase();
  const message = String(request.body.message || '').trim();
  if (!guestName || guestName.length > 150) {
    return response.status(400).json({ error: 'Enter your name (150 characters or fewer).' });
  }
  if (guestEmail && (guestEmail.length > 320 || !emailPattern.test(guestEmail))) {
    return response.status(400).json({ error: 'Enter a valid email address or leave it blank.' });
  }
  if (!message || message.length > 10000) {
    return response.status(400).json({ error: 'Enter a message (10,000 characters or fewer).' });
  }

  try {
    if (!uuidPattern.test(request.session.guestSessionId || '')) {
      await new Promise((resolve, reject) => {
        request.session.regenerate((error) => error ? reject(error) : resolve());
      });
      request.session.guestSessionId = crypto.randomUUID();
    }

    const session = await chat.createGuestChatSession({
      guestSessionId: request.session.guestSessionId,
      guestName,
      guestEmail: guestEmail || null,
      message
    });
    request.session.guestChatSessionId = session.id;
    await new Promise((resolve, reject) => {
      request.session.save((error) => error ? reject(error) : resolve());
    });

    return response.status(201).json({ sessionId: session.id });
  } catch (error) {
    return next(error);
  }
}

function validateContact({ name, email, subject, message }) {
  const values = {
    name: String(name || '').trim(),
    email: String(email || '').trim().toLowerCase(),
    subject: String(subject || '').trim(),
    message: String(message || '').trim()
  };
  const errors = [];

  if (!values.name) errors.push('Name is required.');
  if (!emailPattern.test(values.email)) errors.push('Enter a valid email address.');
  if (!values.subject) errors.push('Subject is required.');
  if (!values.message) errors.push('Message is required.');
  if (values.name.length > 150) errors.push('Name must be 150 characters or fewer.');
  if (values.subject.length > 200) errors.push('Subject must be 200 characters or fewer.');
  if (values.message.length > 10000) errors.push('Message must be 10,000 characters or fewer.');

  return { values, errors };
}

async function submitContact(request, response, next) {
  const validation = validateContact(request.body);

  if (validation.errors.length) {
    return response.status(400).render('contact', pageData('Contact', {
      values: validation.values,
      errors: validation.errors,
      success: false
    }));
  }

  try {
    await query(
      `INSERT INTO contact_messages (name, email, subject, message)
       VALUES ($1, $2, $3, $4)`,
      [
        validation.values.name,
        validation.values.email,
        validation.values.subject,
        validation.values.message
      ]
    );

    return response.redirect('/contact?sent=1');
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  showAbout,
  showAdmissions,
  askFaq,
  showAnnouncements,
  showContact,
  showFaq,
  showHome,
  showProgrammes,
  submitContact,
  startGuestChat,
  validateContact
};
