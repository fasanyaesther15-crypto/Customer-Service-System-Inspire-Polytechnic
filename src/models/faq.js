const { query } = require('../config/database');

async function findActiveFaqs() {
  const result = await query(
    `SELECT id, question, answer, category, keywords
     FROM faqs
     WHERE is_active = true
     ORDER BY category, question`
  );

  return result.rows;
}

module.exports = { findActiveFaqs };
