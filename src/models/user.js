const { query } = require('../config/database');

async function findUserByEmail(email) {
  const result = await query(
    `SELECT id, full_name, email, password_hash, role, is_active
     FROM users
     WHERE lower(email) = lower($1)
     LIMIT 1`,
    [email]
  );

  return result.rows[0] || null;
}

async function createStudent({ fullName, email, passwordHash }) {
  const result = await query(
    `INSERT INTO users (full_name, email, password_hash, role)
     VALUES ($1, $2, $3, 'student')
     RETURNING id, full_name, email, role, is_active`,
    [fullName, email, passwordHash]
  );

  return result.rows[0];
}

module.exports = { createStudent, findUserByEmail };