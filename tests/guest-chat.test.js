require('dotenv').config();

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const test = require('node:test');
const bcrypt = require('bcryptjs');
const { io: connectSocket } = require('socket.io-client');
const { getPool } = require('../src/config/database');
const { server } = require('../src/app');

let baseUrl;
let agentId;
let agentEmail;
let agentCookie;
const guestChatIds = [];
const cookies = [];
const sockets = [];
const password = 'guest chat integration password';

function body(values) {
  return new URLSearchParams(values);
}

function cookie(response) {
  return response.headers.get('set-cookie')?.split(';', 1)[0];
}

function sessionIdFromCookie(value) {
  const encodedValue = value.slice(value.indexOf('=') + 1);
  const decodedValue = decodeURIComponent(encodedValue);
  return decodedValue.replace(/^s:/, '').split('.')[0];
}

async function login(email) {
  const response = await fetch(`${baseUrl}/login`, {
    method: 'POST',
    redirect: 'manual',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: body({ email, password })
  });
  assert.equal(response.status, 302);
  const value = cookie(response);
  cookies.push(value);
  return value;
}

async function startGuestChat(values) {
  const response = await fetch(`${baseUrl}/guest-chat`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(values)
  });
  return { response, value: cookie(response) };
}

function waitForSocket(socket) {
  return new Promise((resolve, reject) => {
    socket.once('connect', resolve);
    socket.once('connect_error', reject);
  });
}

function emitAck(socket, event, payload) {
  return new Promise((resolve) => socket.emit(event, payload, resolve));
}

function eventOnce(socket, event) {
  return new Promise((resolve) => socket.once(event, resolve));
}

test.before(async () => {
  await new Promise((resolve) => server.listen(0, resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
  const tag = crypto.randomUUID();
  agentEmail = `guest-chat-agent-${tag}@example.test`;
  const result = await getPool().query(
    'INSERT INTO users (full_name, email, password_hash, role) VALUES ($1,$2,$3,$4) RETURNING id',
    ['Guest Chat Test Agent', agentEmail, await bcrypt.hash(password, 4), 'support_agent']
  );
  agentId = result.rows[0].id;
});

test.after(async () => {
  sockets.forEach((socket) => socket.disconnect());
  const pool = getPool();
  if (guestChatIds.length) {
    await pool.query('DELETE FROM chat_messages WHERE chat_session_id = ANY($1::uuid[])', [guestChatIds]);
    await pool.query('DELETE FROM chat_sessions WHERE id = ANY($1::uuid[])', [guestChatIds]);
  }
  if (agentId) await pool.query('DELETE FROM activity_logs WHERE actor_id = $1', [agentId]);
  const sessionIds = cookies.map(sessionIdFromCookie).filter(Boolean);
  if (sessionIds.length) await pool.query('DELETE FROM session WHERE sid = ANY($1::varchar[])', [sessionIds]);
  if (agentId) await pool.query('DELETE FROM users WHERE id = $1', [agentId]);
  await pool.end();
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});

test('guest chats are private, persistent, real-time, and available to support agents', async () => {
  const invalid = await startGuestChat({ name: '', email: 'invalid', message: '' });
  assert.equal(invalid.response.status, 400);

  const first = await startGuestChat({
    name: 'Guest Visitor One',
    email: `guest-${crypto.randomUUID()}@example.test`,
    message: 'I would like information about studying at Inspire Polytechnic.'
  });
  assert.equal(first.response.status, 201);
  const firstData = await first.response.json();
  guestChatIds.push(firstData.sessionId);
  cookies.push(first.value);

  const second = await startGuestChat({ name: 'Guest Visitor Two', email: '', message: 'A separate conversation.' });
  assert.equal(second.response.status, 201);
  const secondData = await second.response.json();
  guestChatIds.push(secondData.sessionId);
  cookies.push(second.value);
  assert.notEqual(firstData.sessionId, secondData.sessionId);

  for (const route of ['/student/dashboard', '/support/dashboard', '/admin/dashboard']) {
    const response = await fetch(`${baseUrl}${route}`, { redirect: 'manual', headers: { cookie: first.value } });
    assert.equal(response.status, 302, route);
    assert.equal(response.headers.get('location'), '/login', route);
  }

  agentCookie = await login(agentEmail);
  const guestSocket = connectSocket(baseUrl, { extraHeaders: { Cookie: first.value }, transports: ['websocket'] });
  const otherGuestSocket = connectSocket(baseUrl, { extraHeaders: { Cookie: second.value }, transports: ['websocket'] });
  const agentSocket = connectSocket(baseUrl, { extraHeaders: { Cookie: agentCookie }, transports: ['websocket'] });
  sockets.push(guestSocket, otherGuestSocket, agentSocket);
  await Promise.all([waitForSocket(guestSocket), waitForSocket(otherGuestSocket), waitForSocket(agentSocket)]);

  const guestJoin = await emitAck(guestSocket, 'chat:join', { sessionId: firstData.sessionId });
  assert.equal(guestJoin.ok, true);
  assert.equal(guestJoin.guest, true);
  assert.equal(guestJoin.supportAvailable, true);

  const otherJoin = await emitAck(otherGuestSocket, 'chat:join', { sessionId: firstData.sessionId });
  assert.match(otherJoin.error, /not found/);
  const arbitraryJoin = await emitAck(guestSocket, 'chat:join', { sessionId: crypto.randomUUID() });
  assert.match(arbitraryJoin.error, /not found/);

  const history = await emitAck(guestSocket, 'chat:history', { sessionId: firstData.sessionId });
  assert.equal(history.messages.length, 1);
  assert.equal(history.messages[0].sender_name, 'Guest Visitor One');
  assert.equal(history.messages[0].message, 'I would like information about studying at Inspire Polytechnic.');

  const inboxResponse = await fetch(`${baseUrl}/support/chats`, { headers: { cookie: agentCookie } });
  assert.equal(inboxResponse.status, 200);
  const inboxHtml = await inboxResponse.text();
  assert.match(inboxHtml, /Guest visitor/);
  assert.match(inboxHtml, /Guest Visitor One/);

  const detailResponse = await fetch(`${baseUrl}/support/chats/${firstData.sessionId}`, { headers: { cookie: agentCookie } });
  assert.equal(detailResponse.status, 200);
  assert.match(await detailResponse.text(), /Guest Visitor One/);

  const agentJoin = await emitAck(agentSocket, 'chat:join', { sessionId: firstData.sessionId });
  assert.equal(agentJoin.ok, true);
  const agentReceivesGuest = eventOnce(agentSocket, 'chat:message');
  const sentGuest = await emitAck(guestSocket, 'chat:message', { sessionId: firstData.sessionId, message: 'Can you tell me about the Yaba campus?' });
  assert.equal(sentGuest.ok, true);
  assert.equal((await agentReceivesGuest).sender_name, 'Guest Visitor One');

  const guestReceivesAgent = eventOnce(guestSocket, 'chat:message');
  const sentAgent = await emitAck(agentSocket, 'chat:message', { sessionId: firstData.sessionId, message: 'Our team can provide current campus guidance.' });
  assert.equal(sentAgent.ok, true);
  assert.equal((await guestReceivesAgent).message, 'Our team can provide current campus guidance.');

  const guestReceivesClose = eventOnce(guestSocket, 'chat:closed');
  const closed = await fetch(`${baseUrl}/support/chats/${firstData.sessionId}/close`, {
    method: 'POST', redirect: 'manual', headers: { cookie: agentCookie }
  });
  assert.equal(closed.status, 302);
  assert.equal((await guestReceivesClose).sessionId, firstData.sessionId);

  const afterClose = await emitAck(guestSocket, 'chat:message', { sessionId: firstData.sessionId, message: 'This should not send.' });
  assert.equal(afterClose.error, 'Chat is closed.');
  assert.equal(agentId.length > 0, true);
});