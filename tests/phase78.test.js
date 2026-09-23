require('dotenv').config();

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const test = require('node:test');
const bcrypt = require('bcryptjs');
const { io: connectSocket } = require('socket.io-client');
const { getPool } = require('../src/config/database');
const { server } = require('../src/app');

let baseUrl;
const password = 'phase seven eight password';
const ids = { student: null, otherStudent: null, agent: null, admin: null, ticket: null, chat: null, otherChat: null, routeChat: null, faq: null, announcement: null };
const emails = {
  student: `phase78-student-${crypto.randomUUID()}@example.test`,
  otherStudent: `phase78-other-${crypto.randomUUID()}@example.test`,
  agent: `phase78-agent-${crypto.randomUUID()}@example.test`,
  admin: `phase78-admin-${crypto.randomUUID()}@example.test`
};

function body(values) { return new URLSearchParams(values); }
function cookie(response) { return response.headers.get('set-cookie')?.split(';', 1)[0]; }

async function createUser(name, email, role) {
  const result = await getPool().query(
    'INSERT INTO users (full_name, email, password_hash, role) VALUES ($1,$2,$3,$4) RETURNING id',
    [name, email, await bcrypt.hash(password, 12), role]
  );
  return result.rows[0].id;
}

async function login(email) {
  const response = await fetch(`${baseUrl}/login`, {
    method: 'POST', redirect: 'manual', headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: body({ email, password })
  });
  assert.equal(response.status, 302);
  return cookie(response);
}

test.before(async () => {
  await new Promise((resolve) => server.listen(0, resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
  ids.student = await createUser('Phase 78 Student', emails.student, 'student');
  ids.otherStudent = await createUser('Phase 78 Other Student', emails.otherStudent, 'student');
  ids.agent = await createUser('Phase 78 Agent', emails.agent, 'support_agent');
  ids.admin = await createUser('Phase 78 Admin', emails.admin, 'administrator');
  const ticket = await getPool().query(
    "INSERT INTO tickets (student_id, category, subject, priority) VALUES ($1,'General','Phase 78 ticket','medium') RETURNING id",
    [ids.student]
  );
  ids.ticket = ticket.rows[0].id;
  await getPool().query('INSERT INTO ticket_messages (ticket_id, sender_id, message) VALUES ($1,$2,$3)', [ids.ticket, ids.student, 'Initial phase 78 message']);
  const chat = await getPool().query('INSERT INTO chat_sessions (student_id) VALUES ($1) RETURNING id', [ids.student]);
  ids.chat = chat.rows[0].id;
  const otherChat = await getPool().query('INSERT INTO chat_sessions (student_id) VALUES ($1) RETURNING id', [ids.otherStudent]);
  ids.otherChat = otherChat.rows[0].id;
  const routeChat = await getPool().query('INSERT INTO chat_sessions (student_id) VALUES ($1) RETURNING id', [ids.student]);
  ids.routeChat = routeChat.rows[0].id;
});

test.after(async () => {
  const pool = getPool();
  if (ids.chat) await pool.query('DELETE FROM chat_messages WHERE chat_session_id = $1', [ids.chat]);
  if (ids.chat) await pool.query('DELETE FROM chat_sessions WHERE id = $1', [ids.chat]);
  if (ids.otherChat) await pool.query('DELETE FROM chat_messages WHERE chat_session_id = $1', [ids.otherChat]);
  if (ids.otherChat) await pool.query('DELETE FROM chat_sessions WHERE id = $1', [ids.otherChat]);
  if (ids.routeChat) await pool.query('DELETE FROM chat_messages WHERE chat_session_id = $1', [ids.routeChat]);
  if (ids.routeChat) await pool.query('DELETE FROM chat_sessions WHERE id = $1', [ids.routeChat]);
  if (ids.ticket) await pool.query('DELETE FROM ticket_messages WHERE ticket_id = $1', [ids.ticket]);
  if (ids.ticket) await pool.query('DELETE FROM tickets WHERE id = $1', [ids.ticket]);
  if (ids.faq) await pool.query('DELETE FROM faqs WHERE id = $1', [ids.faq]);
  if (ids.announcement) await pool.query('DELETE FROM announcements WHERE id = $1', [ids.announcement]);
  await pool.query('DELETE FROM activity_logs WHERE actor_id = ANY($1::uuid[])', [[ids.student, ids.agent, ids.admin]]);
  await pool.query('DELETE FROM users WHERE id = ANY($1::uuid[])', [[ids.student, ids.otherStudent, ids.agent, ids.admin]]);
  await pool.end();
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});

test('role-protected support and admin routes reject guests and incorrect roles', async () => {
  const routes = ['/support/dashboard', '/support/tickets', '/admin/dashboard', '/admin/users'];
  for (const route of routes) {
    const response = await fetch(`${baseUrl}${route}`, { redirect: 'manual' });
    assert.equal(response.status, 302);
    assert.equal(response.headers.get('location'), '/login');
  }
  const studentCookie = await login(emails.student);
  const forbidden = await fetch(`${baseUrl}/admin/dashboard`, { headers: { cookie: studentCookie } });
  assert.equal(forbidden.status, 403);
});

test('support agent can view and update tickets and respond', async () => {
  const agentCookie = await login(emails.agent);
  const page = await fetch(`${baseUrl}/support/tickets/${ids.ticket}`, { headers: { cookie: agentCookie } });
  assert.equal(page.status, 200);
  assert.match(await page.text(), /Phase 78 ticket/);
  const status = await fetch(`${baseUrl}/support/tickets/${ids.ticket}/status`, {
    method: 'POST', redirect: 'manual', headers: { cookie: agentCookie, 'content-type': 'application/x-www-form-urlencoded' }, body: body({ status: 'in progress' })
  });
  assert.equal(status.status, 302);
  const message = await fetch(`${baseUrl}/support/tickets/${ids.ticket}/messages`, {
    method: 'POST', redirect: 'manual', headers: { cookie: agentCookie, 'content-type': 'application/x-www-form-urlencoded' }, body: body({ message: 'Agent response.' })
  });
  assert.equal(message.status, 302);
  const result = await getPool().query('SELECT status FROM tickets WHERE id = $1', [ids.ticket]);
  assert.equal(result.rows[0].status, 'in progress');
});

test('administrator can manage FAQs, announcements, users, logs, and chats', async () => {
  const adminCookie = await login(emails.admin);
  for (const route of ['/admin/dashboard', '/admin/users', '/admin/faqs', '/admin/announcements', '/admin/activity-logs']) {
    const response = await fetch(`${baseUrl}${route}`, { headers: { cookie: adminCookie } });
    assert.equal(response.status, 200, route);
  }
  const faq = await fetch(`${baseUrl}/admin/faqs`, { method: 'POST', redirect: 'manual', headers: { cookie: adminCookie, 'content-type': 'application/x-www-form-urlencoded' }, body: body({ question: 'Phase 78 question', answer: 'Phase 78 answer', category: 'Test', keywords: 'phase, test' }) });
  assert.equal(faq.status, 302);
  const faqResult = await getPool().query("SELECT id FROM faqs WHERE question = 'Phase 78 question'");
  ids.faq = faqResult.rows[0].id;
  const announcement = await fetch(`${baseUrl}/admin/announcements`, { method: 'POST', redirect: 'manual', headers: { cookie: adminCookie, 'content-type': 'application/x-www-form-urlencoded' }, body: body({ title: 'Phase 78 announcement', body: 'Test announcement', isPublished: 'true' }) });
  assert.equal(announcement.status, 302);
  const announcementResult = await getPool().query("SELECT id FROM announcements WHERE title = 'Phase 78 announcement'");
  ids.announcement = announcementResult.rows[0].id;
  const chats = await fetch(`${baseUrl}/support/chats`, { headers: { cookie: adminCookie } });
  assert.equal(chats.status, 200);
  const chatDetail = await fetch(`${baseUrl}/support/chats/${ids.routeChat}`, { headers: { cookie: adminCookie } });
  assert.equal(chatDetail.status, 200);
  const closedChat = await fetch(`${baseUrl}/support/chats/${ids.routeChat}/close`, { method: 'POST', redirect: 'manual', headers: { cookie: adminCookie } });
  assert.equal(closedChat.status, 302);
});

test('administrator self-lockout is rejected while another-user management is allowed', async () => {
  const adminCookie = await login(emails.admin);
  const selfRole = await fetch(`${baseUrl}/admin/users/${ids.admin}`, { method: 'POST', headers: { cookie: adminCookie, 'content-type': 'application/x-www-form-urlencoded' }, body: body({ role: 'student', isActive: 'true' }) });
  assert.equal(selfRole.status, 400);
  const selfDeactivate = await fetch(`${baseUrl}/admin/users/${ids.admin}`, { method: 'POST', headers: { cookie: adminCookie, 'content-type': 'application/x-www-form-urlencoded' }, body: body({ role: 'administrator', isActive: 'false' }) });
  assert.equal(selfDeactivate.status, 400);
  const otherUpdate = await fetch(`${baseUrl}/admin/users/${ids.student}`, { method: 'POST', redirect: 'manual', headers: { cookie: adminCookie, 'content-type': 'application/x-www-form-urlencoded' }, body: body({ role: 'support_agent', isActive: 'true' }) });
  assert.equal(otherUpdate.status, 302);
  await getPool().query("UPDATE users SET role = 'student' WHERE id = $1", [ids.student]);
});

test('chat persistence enforces session ownership at the model boundary', async () => {
  const chatModel = require('../src/models/chat');
  const own = await chatModel.findChatSessionForUser(ids.chat, { id: ids.student, role: 'student' });
  const other = await chatModel.findChatSessionForUser(ids.chat, { id: ids.agent, role: 'student' });
  assert.equal(own.id, ids.chat);
  assert.equal(other, null);
  const saved = await chatModel.addChatMessage(ids.chat, ids.student, 'Persistent chat message.');
  assert.equal(saved.message, 'Persistent chat message.');
  const messages = await chatModel.findChatMessages(ids.chat, { id: ids.student, role: 'student' });
  assert.equal(messages.some((message) => message.message === 'Persistent chat message.'), true);
});

function waitForSocket(socket) {
  return new Promise((resolve, reject) => {
    socket.once('connect', resolve);
    socket.once('connect_error', reject);
  });
}

function eventOnce(socket, event) {
  return new Promise((resolve) => socket.once(event, resolve));
}

test('Socket.IO enforces authenticated chat events and lifecycle', async () => {
  const studentCookie = await login(emails.student);
  const otherCookie = await login(emails.otherStudent);
  const agentCookie = await login(emails.agent);
  const studentSocket = connectSocket(baseUrl, { extraHeaders: { Cookie: studentCookie }, transports: ['websocket'] });
  const otherSocket = connectSocket(baseUrl, { extraHeaders: { Cookie: otherCookie }, transports: ['websocket'] });
  const agentSocket = connectSocket(baseUrl, { extraHeaders: { Cookie: agentCookie }, transports: ['websocket'] });
  const unauthenticatedSocket = connectSocket(baseUrl, { transports: ['websocket'], autoConnect: false });

  await Promise.all([waitForSocket(studentSocket), waitForSocket(otherSocket), waitForSocket(agentSocket)]);
  unauthenticatedSocket.connect();
  await new Promise((resolve) => unauthenticatedSocket.once('connect_error', resolve));

  const ownJoin = await new Promise((resolve) => studentSocket.emit('chat:join', { sessionId: ids.chat }, resolve));
  assert.equal(ownJoin.ok, true);
  const unauthorizedJoin = await new Promise((resolve) => otherSocket.emit('chat:join', { sessionId: ids.chat }, resolve));
  assert.match(unauthorizedJoin.error, /not found/);
  await new Promise((resolve) => otherSocket.emit('chat:join', { sessionId: ids.otherChat }, resolve));

  await new Promise((resolve) => agentSocket.emit('chat:join', { sessionId: ids.chat }, resolve));
  const broadcast = eventOnce(agentSocket, 'chat:message');
  const sent = await new Promise((resolve) => studentSocket.emit('chat:message', { sessionId: ids.chat, message: 'Socket message.' }, resolve));
  assert.equal(sent.ok, true);
  assert.equal((await broadcast).message, 'Socket message.');

  const unauthorizedMessage = await new Promise((resolve) => otherSocket.emit('chat:message', { sessionId: ids.chat, message: 'Unauthorized.' }, resolve));
  assert.match(unauthorizedMessage.error, /not found/);
  const authorizedTypingEvent = eventOnce(agentSocket, 'chat:typing');
  const typing = await new Promise((resolve) => studentSocket.emit('chat:typing', { sessionId: ids.chat, active: true }, resolve));
  assert.equal(typing.ok, true);
  assert.equal((await authorizedTypingEvent).active, true);
  const unauthorizedTyping = await new Promise((resolve) => otherSocket.emit('chat:typing', { sessionId: ids.chat, active: true }, resolve));
  assert.match(unauthorizedTyping.error, /not found/);

  const history = await new Promise((resolve) => studentSocket.emit('chat:history', { sessionId: ids.chat }, resolve));
  assert.equal(history.messages.some((message) => message.message === 'Socket message.'), true);
  const unauthorizedHistory = await new Promise((resolve) => otherSocket.emit('chat:history', { sessionId: ids.chat }, resolve));
  assert.match(unauthorizedHistory.error, /not found/);

  const closed = await new Promise((resolve) => agentSocket.emit('chat:close', { sessionId: ids.chat }, resolve));
  assert.equal(closed.ok, true);
  const afterClose = await new Promise((resolve) => studentSocket.emit('chat:message', { sessionId: ids.chat, message: 'After close.' }, resolve));
  assert.match(afterClose.error, /closed/);

  studentSocket.close();
  otherSocket.close();
  agentSocket.close();
  unauthenticatedSocket.close();
});
