const { getPool, query } = require('../config/database');

async function createChatSession(studentId) {
  const result = await query(
    `INSERT INTO chat_sessions (student_id)
     VALUES ($1)
     RETURNING id, student_id, assigned_agent_id, status, started_at, updated_at`,
    [studentId]
  );
  return result.rows[0];
}

async function createGuestChatSession({ guestSessionId, guestName, guestEmail, message }) {
  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const result = await client.query(
      `INSERT INTO chat_sessions (guest_session_id, guest_name, guest_email)
       VALUES ($1, $2, $3)
       RETURNING id, status, started_at, updated_at`,
      [guestSessionId, guestName, guestEmail]
    );
    const session = result.rows[0];
    await client.query(
      `INSERT INTO chat_messages (chat_session_id, sender_id, message)
       VALUES ($1, NULL, $2)`,
      [session.id, message]
    );
    await client.query('COMMIT');
    return session;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function findChatSessionForUser(sessionId, user) {
  const result = await query(
    `SELECT chat_sessions.id, chat_sessions.student_id, chat_sessions.assigned_agent_id,
            chat_sessions.status, chat_sessions.started_at, chat_sessions.updated_at,
            chat_sessions.closed_at, chat_sessions.guest_session_id,
            chat_sessions.guest_name, chat_sessions.guest_email,
            (chat_sessions.student_id IS NULL) AS is_guest,
            COALESCE(students.full_name, chat_sessions.guest_name) AS student_name
     FROM chat_sessions
     LEFT JOIN users students ON students.id = chat_sessions.student_id
    WHERE chat_sessions.id = $1
       AND (chat_sessions.student_id = $2 OR $3 IN ('support_agent', 'administrator'))`,
    [sessionId, user.id, user.role]
  );
  return result.rows[0] || null;
}

async function findChatSessionForGuest(sessionId, guestSessionId) {
  const result = await query(
    `SELECT id, guest_session_id, guest_name, guest_email, status, started_at,
            updated_at, closed_at
     FROM chat_sessions
     WHERE id = $1 AND student_id IS NULL AND guest_session_id = $2`,
    [sessionId, guestSessionId]
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

async function addGuestChatMessage(sessionId, guestSessionId, message) {
  const result = await query(
    `INSERT INTO chat_messages (chat_session_id, sender_id, message)
     SELECT chat_sessions.id, NULL, $3
     FROM chat_sessions
     WHERE chat_sessions.id = $1
       AND chat_sessions.student_id IS NULL
       AND chat_sessions.guest_session_id = $2
       AND chat_sessions.status <> 'closed'
     RETURNING id, chat_session_id, sender_id, message, created_at`,
    [sessionId, guestSessionId, message]
  );
  return result.rows[0] || null;
}

async function findChatMessages(sessionId, user) {
  const result = await query(
        `SELECT chat_messages.id, chat_messages.message, chat_messages.created_at,
          chat_messages.sender_id,
          COALESCE(users.full_name, chat_sessions.guest_name) AS sender_name
     FROM chat_messages
     JOIN chat_sessions ON chat_sessions.id = chat_messages.chat_session_id
         LEFT JOIN users ON users.id = chat_messages.sender_id
     WHERE chat_sessions.id = $1
       AND (chat_sessions.student_id = $2 OR $3 IN ('support_agent', 'administrator'))
     ORDER BY chat_messages.created_at ASC`,
    [sessionId, user.id, user.role]
  );
  return result.rows;
}

async function findChatMessagesForGuest(sessionId, guestSessionId) {
  const result = await query(
    `SELECT chat_messages.id, chat_messages.message, chat_messages.created_at,
            chat_messages.sender_id,
            COALESCE(users.full_name, chat_sessions.guest_name) AS sender_name
     FROM chat_messages
     JOIN chat_sessions ON chat_sessions.id = chat_messages.chat_session_id
     LEFT JOIN users ON users.id = chat_messages.sender_id
     WHERE chat_sessions.id = $1
       AND chat_sessions.student_id IS NULL
       AND chat_sessions.guest_session_id = $2
     ORDER BY chat_messages.created_at ASC`,
    [sessionId, guestSessionId]
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

async function closeGuestChatSession(sessionId, guestSessionId) {
  const result = await query(
    `UPDATE chat_sessions
     SET status = 'closed', closed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
     WHERE id = $1
       AND student_id IS NULL
       AND guest_session_id = $2
       AND status <> 'closed'
     RETURNING id`,
    [sessionId, guestSessionId]
  );
  return result.rows[0] || null;
}

async function listChatSessions() {
  const result = await query(
        `SELECT chat_sessions.id, chat_sessions.student_id, chat_sessions.status, chat_sessions.started_at,
            chat_sessions.updated_at, chat_sessions.assigned_agent_id,
          COALESCE(students.full_name, chat_sessions.guest_name) AS student_name,
          chat_sessions.guest_name, chat_sessions.guest_email,
          (chat_sessions.student_id IS NULL) AS is_guest,
          agents.full_name AS agent_name,
            recent.message AS last_message
     FROM chat_sessions
         LEFT JOIN users students ON students.id = chat_sessions.student_id
     LEFT JOIN users agents ON agents.id = chat_sessions.assigned_agent_id
     LEFT JOIN LATERAL (
       SELECT message FROM chat_messages
       WHERE chat_session_id = chat_sessions.id
       ORDER BY created_at DESC LIMIT 1
     ) recent ON true
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
  addGuestChatMessage,
  assignChat,
  closeGuestChatSession,
  closeChatSession,
  createChatSession,
  createGuestChatSession,
  findChatMessages,
  findChatMessagesForGuest,
    findChatSessionsByStudent,
  findChatSessionForGuest,
  findChatSessionForUser,
  findOpenChatForStudent,
  listChatSessions
};
