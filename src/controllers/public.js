const { query } = require('../config/database');

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function pageData(pageTitle, extra = {}) {
  return { pageTitle, ...extra };
}

function showHome(request, response) {
  return response.render('home', pageData('Home'));
}

function showAbout(request, response) {
  return response.render('about', pageData('About'));
}

function showProgrammes(request, response) {
  return response.render('programmes', pageData('Programmes'));
}

function showAdmissions(request, response) {
  return response.render('admissions', pageData('Admissions'));
}

async function showFaq(request, response, next) {
  try {
    const result = await query(
      `SELECT id, question, answer, category
       FROM faqs
       WHERE is_active = true
       ORDER BY category, question`
    );
    const categories = result.rows.reduce((groups, faq) => {
      const category = faq.category || 'General';
      groups[category] = groups[category] || [];
      groups[category].push(faq);
      return groups;
    }, {});

    return response.render('faq', pageData('FAQ', { categories }));
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
  showAnnouncements,
  showContact,
  showFaq,
  showHome,
  showProgrammes,
  submitContact,
  validateContact
};
