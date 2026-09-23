require('dotenv').config();

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const test = require('node:test');
const bcrypt = require('bcryptjs');
const { getPool } = require('../src/config/database');
const { server } = require('../src/app');

let baseUrl;
let studentEmail;
let studentId;
let otherStudentId;
let studentCookie;
let ticketId;
let otherTicketId;

function formBody(values) {
  return new URLSearchParams(values);
}

function cookieFrom(response) {
  const setCookie = response.headers.get('set-cookie');
  return setCookie ? setCookie.split(';', 1)[0] : null;
}

async function registerAndLogin(email, fullName) {
  const password = 'phase five password';
  const registerResponse = await fetch(`${baseUrl}/register`, {
    method: 'POST',
    redirect: 'manual',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: formBody({
      fullName,
      email,
      password,
      passwordConfirmation: password
    })
  });

  assert.equal(registerResponse.status, 302);

  const loginResponse = await fetch(`${baseUrl}/login`, {
    method: 'POST',
    redirect: 'manual',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: formBody({ email, password })
  });

  assert.equal(loginResponse.status, 302);
  return cookieFrom(loginResponse);
}

test.before(async () => {
  await new Promise((resolve) => {
    server.listen(0, () => {
      baseUrl = `http://127.0.0.1:${server.address().port}`;
      resolve();
    });
  });

  studentEmail = `phase5-${crypto.randomUUID()}@example.test`;
});

test.after(async () => {
  const pool = getPool();

  if (ticketId || otherTicketId) {
    await pool.query('DELETE FROM ticket_messages WHERE ticket_id = ANY($1::uuid[])', [
      [ticketId, otherTicketId].filter(Boolean)
    ]);
    await pool.query('DELETE FROM tickets WHERE id = ANY($1::uuid[])', [
      [ticketId, otherTicketId].filter(Boolean)
    ]);
  }

  await pool.query('DELETE FROM users WHERE id = ANY($1::uuid[])', [
    [studentId, otherStudentId].filter(Boolean)
  ]);
  await pool.end();
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});

test('guest access to student routes is rejected', async () => {
  for (const route of ['/student/dashboard', '/student/tickets', '/student/tickets/new']) {
    const response = await fetch(`${baseUrl}${route}`, { redirect: 'manual' });
    assert.equal(response.status, 302);
    assert.equal(response.headers.get('location'), '/login');
  }

  const detailResponse = await fetch(`${baseUrl}/student/tickets/00000000-0000-0000-0000-000000000000`, { redirect: 'manual' });
  assert.equal(detailResponse.status, 302);
  assert.equal(detailResponse.headers.get('location'), '/login');
});

test('student can access the portal and create a ticket', async () => {
  studentCookie = await registerAndLogin(studentEmail, 'Phase Five Student');

  const dashboardResponse = await fetch(`${baseUrl}/student/dashboard`, {
    headers: { cookie: studentCookie }
  });
  assert.equal(dashboardResponse.status, 200);
  assert.match(await dashboardResponse.text(), /Welcome, Phase Five Student/);

  const ticketsResponse = await fetch(`${baseUrl}/student/tickets`, {
    headers: { cookie: studentCookie }
  });
  assert.equal(ticketsResponse.status, 200);

  const newTicketResponse = await fetch(`${baseUrl}/student/tickets/new`, {
    headers: { cookie: studentCookie }
  });
  assert.equal(newTicketResponse.status, 200);
  assert.match(await newTicketResponse.text(), /Create a support ticket/);

  const userResult = await getPool().query('SELECT id FROM users WHERE email = $1', [studentEmail]);
  studentId = userResult.rows[0].id;
});

test('invalid ticket data is rejected', async () => {
  const response = await fetch(`${baseUrl}/student/tickets`, {
    method: 'POST',
    headers: {
      cookie: studentCookie,
      'content-type': 'application/x-www-form-urlencoded'
    },
    body: formBody({ subject: '', category: '', priority: 'not-valid', message: '' })
  });

  assert.equal(response.status, 400);
  const body = await response.text();
  assert.match(body, /Subject is required/);
  assert.match(body, /Category is required/);
  assert.match(body, /Description is required/);
  assert.match(body, /valid priority/);
});

test('valid ticket creation uses the session student and persists the initial message', async () => {
  const response = await fetch(`${baseUrl}/student/tickets`, {
    method: 'POST',
    redirect: 'manual',
    headers: {
      cookie: studentCookie,
      'content-type': 'application/x-www-form-urlencoded'
    },
    body: formBody({
      subject: 'Phase five ticket',
      category: 'Admissions',
      priority: 'high',
      message: 'Please help with this temporary ticket test.'
    })
  });

  assert.equal(response.status, 302);
  const match = response.headers.get('location').match(/\/student\/tickets\/([^/]+)$/);
  assert.ok(match);
  ticketId = match[1];

  const result = await getPool().query(
    `SELECT tickets.student_id, tickets.status, tickets.priority, ticket_messages.message
     FROM tickets
     JOIN ticket_messages ON ticket_messages.ticket_id = tickets.id
     WHERE tickets.id = $1`,
    [ticketId]
  );

  assert.equal(result.rows.length, 1);
  assert.equal(result.rows[0].student_id, studentId);
  assert.equal(result.rows[0].status, 'open');
  assert.equal(result.rows[0].priority, 'high');
  assert.equal(result.rows[0].message, 'Please help with this temporary ticket test.');
});

test('student can view their ticket and add a message', async () => {
  const detailResponse = await fetch(`${baseUrl}/student/tickets/${ticketId}`, {
    headers: { cookie: studentCookie }
  });
  assert.equal(detailResponse.status, 200);
  assert.match(await detailResponse.text(), /Phase five ticket/);

  const emptyMessageResponse = await fetch(`${baseUrl}/student/tickets/${ticketId}/messages`, {
    method: 'POST',
    headers: {
      cookie: studentCookie,
      'content-type': 'application/x-www-form-urlencoded'
    },
    body: formBody({ message: '' })
  });
  assert.equal(emptyMessageResponse.status, 400);
  assert.match(await emptyMessageResponse.text(), /Message is required/);

  const messageResponse = await fetch(`${baseUrl}/student/tickets/${ticketId}/messages`, {
    method: 'POST',
    redirect: 'manual',
    headers: {
      cookie: studentCookie,
      'content-type': 'application/x-www-form-urlencoded'
    },
    body: formBody({ message: 'A follow-up from the student.' })
  });
  assert.equal(messageResponse.status, 302);

  const messageResult = await getPool().query(
    `SELECT sender_id, message
     FROM ticket_messages
     WHERE ticket_id = $1
     ORDER BY created_at DESC
     LIMIT 1`,
    [ticketId]
  );
  assert.equal(messageResult.rows[0].sender_id, studentId);
  assert.equal(messageResult.rows[0].message, 'A follow-up from the student.');
});

test('student cannot view or message another student ticket', async () => {
  const passwordHash = await bcrypt.hash('other student password', 12);
  const otherUser = await getPool().query(
    `INSERT INTO users (full_name, email, password_hash, role)
     VALUES ($1, $2, $3, 'student')
     RETURNING id`,
    ['Other Phase Five Student', `phase5-other-${crypto.randomUUID()}@example.test`, passwordHash]
  );
  otherStudentId = otherUser.rows[0].id;

  const otherTicket = await getPool().query(
    `INSERT INTO tickets (student_id, category, subject)
     VALUES ($1, $2, $3)
     RETURNING id`,
    [otherStudentId, 'General', 'Private other student ticket']
  );
  otherTicketId = otherTicket.rows[0].id;
  await getPool().query(
    'INSERT INTO ticket_messages (ticket_id, sender_id, message) VALUES ($1, $2, $3)',
    [otherTicketId, otherStudentId, 'Private message.']
  );

  const detailResponse = await fetch(`${baseUrl}/student/tickets/${otherTicketId}`, {
    headers: { cookie: studentCookie }
  });
  assert.equal(detailResponse.status, 404);
  assert.doesNotMatch(await detailResponse.text(), /Private other student ticket/);

  const messageResponse = await fetch(`${baseUrl}/student/tickets/${otherTicketId}/messages`, {
    method: 'POST',
    headers: {
      cookie: studentCookie,
      'content-type': 'application/x-www-form-urlencoded'
    },
    body: formBody({ message: 'Unauthorized message.' })
  });
  assert.equal(messageResponse.status, 404);

  const unauthorizedMessage = await getPool().query(
    `SELECT 1 FROM ticket_messages
     WHERE ticket_id = $1 AND message = $2`,
    [otherTicketId, 'Unauthorized message.']
  );
  assert.equal(unauthorizedMessage.rows.length, 0);
});
