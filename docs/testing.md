# Testing Strategy

## Purpose

Testing will show that the simple customer service workflows work correctly, that users cannot cross authorization boundaries, and that PostgreSQL data remains consistent. Tests should match the project scope rather than introduce a large testing framework or unrelated quality targets.

## Test Levels

### Unit tests

Test isolated logic for:

- FAQ normalization and tokenization.
- Keyword/question scoring.
- Confidence threshold behavior.
- Selection of the highest-scoring active FAQ.
- No-match escalation behavior.
- Allowed ticket priorities and status transitions.
- Input normalization and validation helpers.

### Integration tests

Test Express routes with a test database or isolated Supabase database for:

- Student registration and duplicate email rejection.
- Password hashing and successful/failed login.
- Session creation and logout.
- Student ticket creation and message persistence.
- Student ownership checks.
- Staff assignment, status changes, and responses.
- FAQ activation and management.
- Contact enquiry persistence.
- Announcement visibility.
- Activity-log creation.

Phase 3 currently includes live Supabase authentication tests using a temporary HTTP port and generated test email. They verify successful student registration, duplicate-email rejection, bcrypt password hashing, invalid-login handling, PostgreSQL session creation, session contents without password fields, logout invalidation, unauthenticated middleware rejection, and student rejection by administrator-only role middleware. The generated test user is removed after the suite.

Phase 4 includes live Supabase public-site tests for the Home, About, Programmes, Admissions, FAQ, Announcements, and Contact pages. They also verify invalid contact input, successful contact persistence, the default `new` status, and that the contact form does not create tickets. Generated contact test data is removed after the suite.

### Socket.IO tests

Test that:

- An unauthenticated connection is rejected or cannot join a room.
- A student can join only their own authorized chat session.
- An authorized support agent can join an assigned/managed chat.
- Chat messages are validated, persisted, and broadcast to the correct room.
- Unauthorized users cannot read history or close a chat.
- Closed chats reject new messages according to the defined workflow.

### End-to-end acceptance tests

Walk through these complete scenarios in a browser:

1. Visitor reads public information, asks a FAQ, and submits a contact enquiry.
2. Student registers, logs in, creates a ticket, replies, and observes a status update.
3. Student asks an unmatched FAQ question and escalates to human support.
4. Support agent assigns, responds to, resolves, and closes a ticket.
5. Student and support agent exchange messages in a persistent chat and close it.
6. Administrator creates/deactivates an FAQ and publishes an announcement.
7. A student attempts to access another student's ticket and is denied.

## Security Test Cases

- Login rate limiting activates after repeated failures.
- Passwords are not present in responses, logs, or database fields except as hashes.
- Protected routes reject missing sessions.
- Student, support-agent, and administrator permissions remain separate.
- Form inputs are validated and rendered safely.
- SQL injection-style input does not alter query behavior.
- Production configuration does not expose stack traces or secrets.

## Test Data

Use synthetic students, agents, administrators, FAQs, tickets, chats, and announcements only. Do not use real student records. Include active and inactive FAQs, each ticket status and priority, assigned and unassigned work, and both matched and unmatched questions.

## Completion Criteria

A release candidate must pass the focused unit and integration tests, the critical end-to-end workflows, authorization checks, and a production configuration review. Any known limitation, especially hosting constraints affecting Socket.IO on Vercel, must be documented before deployment.
