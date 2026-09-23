require('dotenv').config();

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const test = require('node:test');
const bcrypt = require('bcryptjs');
const { getPool } = require('../src/config/database');
const { requireAuth, requireRole } = require('../src/middleware/auth');
const { server } = require('../src/app');

let baseUrl;
let testEmail;
let testUserId;
let sessionCookie;

function formBody(values) {
  return new URLSearchParams(values);
}

function cookieFrom(response) {
  const setCookie = response.headers.get('set-cookie');
  return setCookie ? setCookie.split(';', 1)[0] : null;
}

test.before(async () => {
  await new Promise((resolve) => {
    server.listen(0, () => {
      baseUrl = `http://127.0.0.1:${server.address().port}`;
      resolve();
    });
  });

  testEmail = `phase3-${crypto.randomUUID()}@example.test`;
});

test.after(async () => {
  const pool = getPool();

  if (testUserId) {
    await pool.query('DELETE FROM users WHERE id = $1', [testUserId]);
  }

  await pool.end();
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});

test('authentication routes create a student account with a hashed password', async () => {
  const password = 'correct horse battery staple';
  const response = await fetch(`${baseUrl}/register`, {
    method: 'POST',
    redirect: 'manual',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: formBody({
      fullName: 'Phase Three Student',
      email: testEmail,
      password,
      passwordConfirmation: password,
      role: 'administrator'
    })
  });

  assert.equal(response.status, 302);
  assert.equal(response.headers.get('location'), '/login?registered=1');

  const result = await getPool().query(
    'SELECT id, role, password_hash FROM users WHERE email = $1',
    [testEmail]
  );

  assert.equal(result.rows.length, 1);
  testUserId = result.rows[0].id;
  assert.equal(result.rows[0].role, 'student');
  assert.notEqual(result.rows[0].password_hash, password);
  assert.equal(await bcrypt.compare(password, result.rows[0].password_hash), true);
});

test('duplicate registration is rejected', async () => {
  const response = await fetch(`${baseUrl}/register`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: formBody({
      fullName: 'Duplicate Student',
      email: testEmail,
      password: 'another password',
      passwordConfirmation: 'another password'
    })
  });

  assert.equal(response.status, 400);
  assert.match(await response.text(), /already exists/);
});

test('invalid login is rejected without revealing account details', async () => {
  const response = await fetch(`${baseUrl}/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: formBody({ email: testEmail, password: 'wrong password' })
  });

  assert.equal(response.status, 401);
  assert.match(await response.text(), /Invalid email or password/);
});

test('valid login creates a PostgreSQL-backed session and logout removes it', async () => {
  const response = await fetch(`${baseUrl}/login`, {
    method: 'POST',
    redirect: 'manual',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: formBody({ email: testEmail, password: 'correct horse battery staple' })
  });

  assert.equal(response.status, 302);
  sessionCookie = cookieFrom(response);
  assert.match(sessionCookie, /^connect\.sid=/);

  const signedSessionCookie = decodeURIComponent(sessionCookie.slice('connect.sid='.length));
  const sessionId = signedSessionCookie.replace(/^s:/, '').split('.', 1)[0];
  const sessionResult = await getPool().query(
    'SELECT sess FROM session WHERE sid = $1',
    [sessionId]
  );

  assert.equal(sessionResult.rows.length, 1);
  const sessionData = sessionResult.rows[0].sess;
  assert.equal(sessionData.user.role, 'student');
  assert.equal('password' in sessionData.user, false);
  assert.equal('password_hash' in sessionData.user, false);

  const logoutResponse = await fetch(`${baseUrl}/logout`, {
    method: 'POST',
    redirect: 'manual',
    headers: { cookie: sessionCookie }
  });

  assert.equal(logoutResponse.status, 302);
  assert.equal(logoutResponse.headers.get('location'), '/');

  const deletedSession = await getPool().query(
    'SELECT 1 FROM session WHERE sid = $1',
    [sessionId]
  );
  assert.equal(deletedSession.rows.length, 0);
});

test('auth middleware rejects missing sessions and role middleware rejects students', () => {
  const redirects = [];
  const response = {
    redirect: (location) => redirects.push(location),
    status: () => response,
    render: () => undefined
  };

  requireAuth({ session: {} }, response, () => assert.fail('Unauthenticated request continued'));
  assert.deepEqual(redirects, ['/login']);

  let nextCalled = false;
  const roleResponse = {
    status: () => roleResponse,
    render: (view, values) => {
      assert.equal(view, 'error');
      assert.equal(values.statusCode, 403);
    }
  };

  requireRole('administrator')(
    { session: { user: { role: 'student' } } },
    roleResponse,
    () => { nextCalled = true; }
  );

  assert.equal(nextCalled, false);
});