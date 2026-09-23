# Security Design

## Security Goals

Protect account credentials, sessions, student records, staff operations, ticket conversations, chat conversations, and database credentials while keeping the implementation understandable for a final-year project.

## Authentication

- Normalize and validate email addresses.
- Enforce unique email at both application and database levels.
- Hash passwords with bcryptjs using an appropriate work factor.
- Never log or render passwords or password hashes.
- Regenerate the session after successful login to reduce session fixation risk.
- Destroy the session at logout.
- Store session data with connect-pg-simple in PostgreSQL.
- Use an `HttpOnly` session cookie, `Secure` in production, an appropriate `SameSite` policy, and a bounded lifetime.

## Authorization

- Require authentication middleware for protected pages.
- Use explicit role middleware for support-agent and administrator routes.
- Check record ownership for every student ticket, message, and chat operation.
- Re-check authorization for each Socket.IO connection, room join, message, history, and close event.
- Treat deactivated users as unable to start new authenticated actions.
- Do not rely on hidden links or client-side role checks.

Phase 3 implements `requireAuth` and `requireRole` middleware. Registration validates name, email, password length, and confirmation, then inserts only the `student` role. Login uses a generic invalid-credentials response, compares passwords with bcryptjs, regenerates the session after success, and never places the password or password hash in the session. Sessions use the existing PostgreSQL `session` table through connect-pg-simple.

Phase 5 applies both middleware functions to every student portal route. Ticket reads require `tickets.student_id = $1`, and ticket message reads and inserts also join or filter through the authenticated student's ticket ownership. Ticket creation derives the owner from the session and uses a transaction for the ticket and initial message, so a client cannot submit another user's ID or create only half of a ticket workflow.

## Input and Output

- Validate required fields, lengths, allowed enum values, and email format on the server.
- Trim and normalize values used for matching or identity.
- Use parameterized SQL for every database query.
- Render EJS values with escaping; do not mark user-authored text as trusted HTML.
- Add CSRF protection or equivalent same-origin checks to state-changing browser forms.
- Limit message and enquiry sizes to reduce abuse.

## HTTP and Abuse Controls

- Use Helmet for security headers.
- Rate limit login, registration, FAQ requests, contact submission, and chat message abuse as appropriate.
- Return generic login failure messages so account existence is not disclosed unnecessarily.
- Use consistent 401, 403, 404, and validation responses.
- Keep error responses free of stack traces and secrets in production.

## Data and Secrets

- Keep `DATABASE_URL` and `SESSION_SECRET` in environment variables.
- Do not commit `.env`, credentials, session secrets, or production data.
- Use least-privilege database credentials where available.
- Do not include secrets in activity-log details.
- Preserve support history when users are deactivated instead of casually deleting records.

## Operational Checks

Before deployment, verify secure cookies over HTTPS, production error handling, rate-limit behavior, authorization boundaries, database connection settings, and Vercel environment variables. Review dependencies for known security issues as part of the release process.

## Explicit Exclusions

There is no AI, external chatbot, machine-learning service, vector database, Redis, or distributed security infrastructure in this design.
