const { query } = require('../config/database');

async function listSupportTickets() {
  const result = await query(
    `SELECT tickets.*, students.full_name AS student_name, agents.full_name AS agent_name
     FROM tickets JOIN users students ON students.id = tickets.student_id
     LEFT JOIN users agents ON agents.id = tickets.assigned_agent_id
     ORDER BY tickets.updated_at DESC`
  );
  return result.rows;
}

async function findStaffTicket(id) {
  const result = await query(
    `SELECT tickets.*, students.full_name AS student_name, agents.full_name AS agent_name
     FROM tickets JOIN users students ON students.id = tickets.student_id
     LEFT JOIN users agents ON agents.id = tickets.assigned_agent_id
     WHERE tickets.id = $1`, [id]
  );
  return result.rows[0] || null;
}

async function listTicketMessages(id) {
  const result = await query(
    `SELECT ticket_messages.*, users.full_name AS sender_name FROM ticket_messages
     JOIN users ON users.id = ticket_messages.sender_id WHERE ticket_id = $1 ORDER BY created_at`, [id]
  );
  return result.rows;
}

async function updateTicket(id, agentId, status) {
  const result = await query(
    `UPDATE tickets SET assigned_agent_id = $2, status = $3::varchar,
     resolved_at = CASE WHEN $3::varchar = 'resolved' THEN CURRENT_TIMESTAMP ELSE resolved_at END,
     closed_at = CASE WHEN $3::varchar = 'closed' THEN CURRENT_TIMESTAMP ELSE closed_at END,
     updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING id`, [id, agentId, status]
  );
  return result.rows[0] || null;
}

async function addStaffMessage(ticketId, senderId, message) {
  const result = await query(
    'INSERT INTO ticket_messages (ticket_id, sender_id, message) VALUES ($1, $2, $3) RETURNING id',
    [ticketId, senderId, message]
  );
  return result.rows[0];
}

async function listUsers() {
  const result = await query('SELECT id, full_name, email, role, is_active, created_at FROM users ORDER BY created_at DESC');
  return result.rows;
}

async function updateUser(id, role, isActive) {
  const result = await query('UPDATE users SET role = $2, is_active = $3 WHERE id = $1 RETURNING id', [id, role, isActive]);
  return result.rows[0] || null;
}

async function findUser(id) {
  const result = await query('SELECT id FROM users WHERE id = $1', [id]);
  return result.rows[0] || null;
}

async function listFaqs() {
  const result = await query('SELECT id, question, answer, category, keywords, is_active FROM faqs ORDER BY category, question');
  return result.rows;
}

async function saveFaq(values, id, actorId) {
  if (id) {
    const result = await query('UPDATE faqs SET question=$2, answer=$3, category=$4, keywords=$5, is_active=$6, updated_at=CURRENT_TIMESTAMP WHERE id=$1 RETURNING id', [id, values.question, values.answer, values.category, values.keywords, values.isActive]);
    return result.rows[0];
  }
  const result = await query('INSERT INTO faqs (question, answer, category, keywords, is_active, created_by) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id', [values.question, values.answer, values.category, values.keywords, values.isActive, actorId]);
  return result.rows[0];
}

async function listAnnouncements() {
  const result = await query('SELECT * FROM announcements ORDER BY created_at DESC');
  return result.rows;
}

async function createAnnouncement(values, actorId) {
  const result = await query('INSERT INTO announcements (title, body, is_published, published_at, created_by) VALUES ($1,$2,$3,CASE WHEN $3 THEN CURRENT_TIMESTAMP ELSE NULL END,$4) RETURNING id', [values.title, values.body, values.isPublished, actorId]);
  return result.rows[0];
}

async function listActivityLogs() {
  const result = await query('SELECT activity_logs.*, users.full_name AS actor_name FROM activity_logs LEFT JOIN users ON users.id = activity_logs.actor_id ORDER BY created_at DESC LIMIT 100');
  return result.rows;
}

async function logActivity(actorId, action, entityType, entityId, details = {}) {
  await query('INSERT INTO activity_logs (actor_id, action, entity_type, entity_id, details) VALUES ($1,$2,$3,$4,$5)', [actorId, action, entityType, entityId || null, details]);
}

module.exports = { addStaffMessage, createAnnouncement, findStaffTicket, findUser, listActivityLogs, listAnnouncements, listFaqs, listSupportTickets, listTicketMessages, listUsers, logActivity, saveFaq, updateTicket, updateUser };
