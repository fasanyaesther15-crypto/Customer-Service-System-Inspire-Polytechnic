const { query } = require('../config/database');

async function createChatSession(studentId) {
  const result = await query(
    `INSERT INTO chat_sessions (student_id)
     VALUES ($1)
     RETURNING id, student_id, assigned_agent_id, status, started_at, updated_at`,
    [studentId]
  );
  return result.rows[0];
}

async function findChatSessionForUser(sessionId, user) {
  const result = await query(
    `SELECT id, student_id, assigned_agent_id, status, started_at, updated_at, closed_at
     FROM chat_sessions
     WHERE id = $1
       AND (student_id = $2 OR $3 IN ('support_agent', 'administrator'))`,
    [sessionId, user.id, user.role]
  );
  return result.rows[0] || null;
}

async function findChatSessionsByStudent(studentId) {
  const result = await query(
    `SELECT id, status, started_at, updated_at FROM chat_sessions
     WHERE student_id = $1 ORDER BY updated_at DESC`,
    [studentId]
  );
  return result.rows;
}

async function findOpenChatForStudent(studentId) {
  const result = await query(
    `SELECT id, student_id, assigned_agent_id, status, started_at, updated_at
     FROM chat_sessions
     WHERE student_id = $1 AND status <> 'closed'
     ORDER BY started_at DESC LIMIT 1`,
    [studentId]
  );
  return result.rows[0] || null;
}

async function addChatMessage(sessionId, senderId, message) {
  const result = await query(
    `INSERT INTO chat_messages (chat_session_id, sender_id, message)
     SELECT chat_sessions.id, $2, $3
     FROM chat_sessions
     WHERE chat_sessions.id = $1 AND chat_sessions.status <> 'closed'
     RETURNING id, chat_session_id, sender_id, message, created_at`,
    [sessionId, senderId, message]
  );
  return result.rows[0] || null;
}

async function findChatMessages(sessionId, user) {
  const result = await query(
    `SELECT chat_messages.id, chat_messages.message, chat_messages.created_at,
            chat_messages.sender_id, users.full_name AS sender_name
     FROM chat_messages
     JOIN chat_sessions ON chat_sessions.id = chat_messages.chat_session_id
     JOIN users ON users.id = chat_messages.sender_id
     WHERE chat_sessions.id = $1
       AND (chat_sessions.student_id = $2 OR $3 IN ('support_agent', 'administrator'))
     ORDER BY chat_messages.created_at ASC`,
    [sessionId, user.id, user.role]
  );
  return result.rows;
}

async function closeChatSession(sessionId, user) {
  const result = await query(
    `UPDATE chat_sessions
     SET status = 'closed', closed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
     WHERE id = $1
       AND (student_id = $2 OR $3 IN ('support_agent', 'administrator'))
     RETURNING id`,
    [sessionId, user.id, user.role]
  );
  return result.rows[0] || null;
}

async function listChatSessions() {
  const result = await query(
    `SELECT chat_sessions.id, chat_sessions.status, chat_sessions.started_at,
            chat_sessions.updated_at, chat_sessions.assigned_agent_id,
            students.full_name AS student_name, agents.full_name AS agent_name
     FROM chat_sessions
     JOIN users students ON students.id = chat_sessions.student_id
     LEFT JOIN users agents ON agents.id = chat_sessions.assigned_agent_id
     ORDER BY chat_sessions.updated_at DESC`
  );
  return result.rows;
}

async function assignChat(sessionId, agentId) {
  const result = await query(
    `UPDATE chat_sessions SET assigned_agent_id = $2, status = 'assigned', updated_at = CURRENT_TIMESTAMP
     WHERE id = $1 RETURNING id`,
    [sessionId, agentId]
  );
  return result.rows[0] || null;
}

module.exports = {
  addChatMessage,
  assignChat,
  closeChatSession,
  createChatSession,
  findChatMessages,
    findChatSessionsByStudent,
  findChatSessionForUser,
  findOpenChatForStudent,
  listChatSessions
};
