const { getPool, query } = require('../config/database');

async function createTicketWithMessage({ studentId, category, subject, priority, message }) {
  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const ticketResult = await client.query(
      `INSERT INTO tickets (student_id, category, subject, priority)
       VALUES ($1, $2, $3, $4)
       RETURNING id, student_id, category, subject, priority, status, created_at, updated_at`,
      [studentId, category, subject, priority]
    );
    const ticket = ticketResult.rows[0];

    await client.query(
      `INSERT INTO ticket_messages (ticket_id, sender_id, message)
       VALUES ($1, $2, $3)`,
      [ticket.id, studentId, message]
    );

    await client.query('COMMIT');
    return ticket;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function findTicketsByStudent(studentId) {
  const result = await query(
    `SELECT id, category, subject, priority, status, created_at, updated_at
     FROM tickets
     WHERE student_id = $1
     ORDER BY updated_at DESC`,
    [studentId]
  );

  return result.rows;
}

async function findTicketByStudent(ticketId, studentId) {
  const result = await query(
    `SELECT id, student_id, category, subject, priority, status, created_at, updated_at,
            resolved_at, closed_at
     FROM tickets
     WHERE id = $1 AND student_id = $2
     LIMIT 1`,
    [ticketId, studentId]
  );

  return result.rows[0] || null;
}

async function findTicketMessagesByStudent(ticketId, studentId) {
  const result = await query(
    `SELECT ticket_messages.id, ticket_messages.message, ticket_messages.created_at,
            users.full_name AS sender_name
     FROM ticket_messages
     JOIN tickets ON tickets.id = ticket_messages.ticket_id
     JOIN users ON users.id = ticket_messages.sender_id
     WHERE ticket_messages.ticket_id = $1
       AND tickets.student_id = $2
     ORDER BY ticket_messages.created_at ASC`,
    [ticketId, studentId]
  );

  return result.rows;
}

async function addTicketMessageForStudent(ticketId, studentId, message) {
  const result = await query(
    `INSERT INTO ticket_messages (ticket_id, sender_id, message)
     SELECT tickets.id, $2, $3
     FROM tickets
     WHERE tickets.id = $1 AND tickets.student_id = $2
     RETURNING id, ticket_id, sender_id, message, created_at`,
    [ticketId, studentId, message]
  );

  return result.rows[0] || null;
}

async function countTicketsByStudent(studentId) {
  const result = await query(
    'SELECT count(*)::int AS count FROM tickets WHERE student_id = $1',
    [studentId]
  );

  return result.rows[0].count;
}

module.exports = {
  addTicketMessageForStudent,
  countTicketsByStudent,
  createTicketWithMessage,
  findTicketByStudent,
  findTicketMessagesByStudent,
  findTicketsByStudent
};