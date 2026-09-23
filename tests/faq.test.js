require('dotenv').config();

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const test = require('node:test');
const { getPool } = require('../src/config/database');
const {
  MATCH_THRESHOLD,
  calculateScore,
  findBestMatch,
  normalizeQuestion,
  tokenize
} = require('../src/services/faqMatcher');
const { server } = require('../src/app');

let baseUrl;
let activeFaqId;
let inactiveFaqId;
const marker = `Phase Six ${crypto.randomUUID()}`;

test.before(async () => {
  await new Promise((resolve) => {
    server.listen(0, () => {
      baseUrl = `http://127.0.0.1:${server.address().port}`;
      resolve();
    });
  });

  const result = await getPool().query(
    `INSERT INTO faqs (question, answer, category, keywords, is_active)
     VALUES
       ($1, $2, $3, $4, true),
       ($5, $6, $3, $7, false)
     RETURNING id, is_active`,
    [
      `${marker}: How do I apply for admission?`,
      `${marker}: Visit the admissions section and follow the application instructions.`,
      marker,
      ['apply', 'admission'],
      `${marker}: How do I reset my password?`,
      `${marker}: This inactive answer must never be returned.`,
      ['reset', 'password']
    ]
  );

  activeFaqId = result.rows.find((faq) => faq.is_active).id;
  inactiveFaqId = result.rows.find((faq) => !faq.is_active).id;
});

test.after(async () => {
  await getPool().query('DELETE FROM faqs WHERE id = ANY($1::uuid[])', [[activeFaqId, inactiveFaqId]]);
  await getPool().end();
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});

test('FAQ normalization and tokenization are deterministic', () => {
  assert.equal(normalizeQuestion('  How, CAN I apply?  '), 'how can i apply');
  assert.deepEqual(tokenize('How, can I apply for admission?'), ['apply', 'admission']);
  assert.deepEqual(tokenize('   !!! '), []);
});

test('FAQ scoring accepts a sufficient overlap and rejects weak overlap', () => {
  const faqs = [
    { question: 'How do I apply for admission?', keywords: ['apply', 'admission'] },
    { question: 'How do I reset my password?', keywords: ['reset', 'password'] }
  ];

  const match = findBestMatch('How can I apply for admission?', faqs);
  assert.equal(match.faq.question, faqs[0].question);
  assert.equal(match.score >= MATCH_THRESHOLD, true);
  assert.equal(findBestMatch('What is the weather today?', faqs), null);
  assert.equal(findBestMatch('Hello', faqs), null);
  assert.equal(findBestMatch('Tell me something', faqs), null);
});

test('FAQ keywords accept PostgreSQL arrays with punctuation, case, and duplicates', () => {
  const faq = {
    question: 'Admission information',
    keywords: [' APPLY!!! ', 'admission', 'ADMISSION', '']
  };

  assert.equal(findBestMatch('apply admission', [faq]).faq, faq);
  assert.equal(findBestMatch('apply', [{ question: 'Unrelated question', keywords: [] }]), null);
  assert.equal(findBestMatch('admission', [faq]).faq, faq);
  assert.equal(calculateScore(['apply', 'admission', 'unknown'], faq).score, 2 / 3);
});

test('FAQ ties resolve in source order', () => {
  const faqs = [
    { question: 'Admission dates', keywords: ['admission'] },
    { question: 'Admission requirements', keywords: ['admission'] }
  ];

  assert.equal(findBestMatch('admission', faqs).faq.question, 'Admission dates');
});

test('FAQ page renders and query validation states work', async () => {
  const pageResponse = await fetch(`${baseUrl}/faq`);
  assert.equal(pageResponse.status, 200);
  assert.match(await pageResponse.text(), /Frequently asked questions/);

  const emptyResponse = await fetch(`${baseUrl}/faq`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ question: '   ' })
  });
  assert.equal(emptyResponse.status, 400);
  assert.match(await emptyResponse.text(), /Enter a question/);

  const longResponse = await fetch(`${baseUrl}/faq`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ question: 'a'.repeat(501) })
  });
  assert.equal(longResponse.status, 400);
  assert.match(await longResponse.text(), /500 characters or fewer/);
});

test('FAQ query returns the database-backed match and ignores inactive records', async () => {
  const matchResponse = await fetch(`${baseUrl}/faq`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ question: 'How can I apply for admission?' })
  });
  assert.equal(matchResponse.status, 200);
  const matchBody = await matchResponse.text();
  assert.match(matchBody, new RegExp(`${marker}: How do I apply for admission\\?`));
  assert.match(matchBody, new RegExp(`${marker}: Visit the admissions section`));
  assert.doesNotMatch(matchBody, /This inactive answer must never be returned/);

  const fallbackResponse = await fetch(`${baseUrl}/faq`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ question: 'How do I reset my password?' })
  });
  assert.equal(fallbackResponse.status, 200);
  const fallbackBody = await fallbackResponse.text();
  assert.match(fallbackBody, /No matching FAQ/);
  assert.match(fallbackBody, /Contact support/);
});
