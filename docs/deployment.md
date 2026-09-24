# Deployment Plan

## Target Platforms

- **Application:** Render (Node web service).
- **Database:** PostgreSQL hosted by Supabase.
- **Source control:** Git repository with a stable `main` branch and reviewed feature branches.

The project does not use Docker, Kubernetes, Redis, microservices, or local SQLite in production.

## Why Render is the correct target

The application requires a persistent Socket.IO connection and a long-lived Node process for authenticated chat, typing events, chat history, and chat closure. Standard Vercel serverless hosting is not a safe fit for this architecture without a different backend design; the project intentionally avoids unnecessary infrastructure. Render provides a simple Node web service that keeps the existing Express + Socket.IO + PostgreSQL stack intact without adding external chatbot, queue, or worker infrastructure.

## Supabase Preparation

1. Create a Supabase project for the application.
2. Obtain the PostgreSQL connection string appropriate for the deployment environment.
3. Apply the schema and session-store table from the database design.
4. Create controlled seed data for initial FAQ records and the first administrator.
5. Verify constraints, indexes, backups, and connection limits.
6. Keep credentials in the Render environment settings and local `.env` files only.

The application, not Supabase Auth, owns the required session and role design because the specified authentication stack is express-session, connect-pg-simple, and bcryptjs.

## Render Preparation

1. Connect the Git repository to a Render web service.
2. Use the existing Node.js entry point: `npm start`.
3. Set the runtime environment to `production`.
4. Add `DATABASE_URL` and `SESSION_SECRET` as environment variables.
5. Keep `PORT` managed by Render unless explicitly overridden.
6. Deploy a preview build and run the critical acceptance tests.
7. Promote only after database connectivity, secure cookies, protected routes, public pages, and chat behavior are verified.

## Socket.IO Verification

Socket.IO requires a persistent bidirectional connection. Render's Node web service supports this architecture without forcing a rewrite to serverless functions. Before production release, verify the live Socket.IO behavior in the deployed environment: authenticated connect, room join, message send, history, typing, and closure.

## Production Checklist

- Database schema is applied and migrations are recorded.
- Production `DATABASE_URL` and `SESSION_SECRET` are configured securely.
- `NODE_ENV=production` is set.
- Session cookies use production-safe settings.
- Helmet and rate limits are enabled.
- Error pages do not expose stack traces.
- The initial administrator account is secured and test credentials are removed.
- Public pages, registration, login, logout, tickets, FAQ matching, announcements, contact form, and chat are tested.
- Render logs and Supabase health are reviewed after deployment.
- No `.env` file, secret, or real personal data is committed.

## Rollback and Maintenance

Use Render's previous deployment rollback for application regressions. Database changes shall be reviewed and applied deliberately, with backups and a documented reversal approach for destructive changes. Review logs and dependencies periodically, and deactivate compromised accounts promptly.

## Environment Variables

```text
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://...
SESSION_SECRET=<long-random-secret>
```

`APP_URL` and `FAQ_CONFIDENCE_THRESHOLD` are not required by the current runtime and are not required in `.env.example`. They may be added for external metadata or operational checks later, but the app does not currently read them at runtime.

These values are placeholders. Secrets must be generated and stored outside Git.
