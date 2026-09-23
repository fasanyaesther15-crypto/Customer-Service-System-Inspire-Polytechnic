require('dotenv').config();

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const test = require('node:test');
const { getPool } = require('../src/config/database');
const { server } = require('../src/app');

let baseUrl;
const testEmail = `phase4-${crypto.randomUUID()}@example.test`;

function formBody(values) {
  return new URLSearchParams(values);
}

test.before(async () => {
  await new Promise((resolve) => {
    server.listen(0, () => {
      baseUrl = `http://127.0.0.1:${server.address().port}`;
      resolve();
    });
  });
});

test.after(async () => {
  await getPool().query('DELETE FROM contact_messages WHERE email = $1', [testEmail]);
  await getPool().end();
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});

test('all public website pages render successfully', async () => {
  const routes = [
    ['/', 'Support that keeps student questions moving.'],
    ['/about', 'A single public front door for student support.'],
    ['/programmes', 'Programmes at Inspire Polytechnic.'],
    ['/admissions', 'Begin with the information you need.'],
    ['/faq', 'Frequently asked questions.'],
    ['/announcements', 'Announcements.'],
    ['/contact', 'How can we help?']
  ];

  for (const [route, expectedText] of routes) {
    const response = await fetch(`${baseUrl}${route}`);
    const body = await response.text();

    assert.equal(response.status, 200, `${route} should return 200`);
    assert.match(body, new RegExp(expectedText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
});

test('contact validation rejects incomplete enquiries', async () => {
  const response = await fetch(`${baseUrl}/contact`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: formBody({ name: '', email: 'invalid', subject: '', message: '' })
  });

  assert.equal(response.status, 400);
  const body = await response.text();
  assert.match(body, /Name is required/);
  assert.match(body, /valid email address/);
});

test('valid contact enquiries are persisted without creating tickets', async () => {
  const response = await fetch(`${baseUrl}/contact`, {
    method: 'POST',
    redirect: 'manual',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: formBody({
      name: 'Phase Four Visitor',
      email: testEmail,
      subject: 'Public enquiry test',
      message: 'This is a temporary public website integration test.'
    })
  });

  assert.equal(response.status, 302);
  assert.equal(response.headers.get('location'), '/contact?sent=1');

  const result = await getPool().query(
    'SELECT name, email, subject, status FROM contact_messages WHERE email = $1',
    [testEmail]
  );

  assert.equal(result.rows.length, 1);
  assert.equal(result.rows[0].status, 'new');
});
