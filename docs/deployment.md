# Deployment Plan

## Target Platforms

- **Application:** Vercel.
- **Database:** PostgreSQL hosted by Supabase.
- **Source control:** Git repository with a stable `main` branch and reviewed feature branches.

The project does not use Docker, Kubernetes, Redis, microservices, or local SQLite in production.

## Supabase Preparation

1. Create a Supabase project for the application.
2. Obtain the PostgreSQL connection string appropriate for the deployment environment.
3. Apply the schema and session-store table from the database design.
4. Create controlled seed data for initial FAQ records and the first administrator.
5. Verify constraints, indexes, backups, and connection limits.
6. Keep credentials in the Vercel environment settings and local `.env` files only.

The application, not Supabase Auth, owns the required session and role design because the specified authentication stack is express-session, connect-pg-simple, and bcryptjs.

## Vercel Preparation

1. Connect the Git repository to a Vercel project.
2. Configure the Express entry point according to the final Vercel Node deployment arrangement.
3. Add `NODE_ENV`, `DATABASE_URL`, `SESSION_SECRET`, `APP_URL`, and `FAQ_CONFIDENCE_THRESHOLD` as environment variables.
4. Configure preview and production values separately.
5. Deploy a preview build and run the critical acceptance tests.
6. Promote only after database connectivity, secure cookies, protected routes, public pages, and chat behavior are verified.

## Socket.IO Verification

Socket.IO requires a persistent bidirectional connection. Before production release, verify that the selected Vercel hosting arrangement supports the required Socket.IO behavior. If the target arrangement does not support persistent connections as required, deployment must be adjusted within the approved simple stack and documented before release; no external chatbot or unnecessary infrastructure is to be added as a shortcut.

## Production Checklist

- Database schema is applied and migrations are recorded.
- Production `DATABASE_URL` and `SESSION_SECRET` are configured securely.
- `APP_URL` uses HTTPS.
- Session cookies use production-safe settings.
- Helmet and rate limits are enabled.
- Error pages do not expose stack traces.
- The initial administrator account is secured and test credentials are removed.
- Public pages, registration, login, logout, tickets, FAQ matching, announcements, contact form, and chat are tested.
- Vercel logs and Supabase health are reviewed after deployment.
- No `.env` file, secret, or real personal data is committed.

## Rollback and Maintenance

Use Vercel's previous deployment rollback for application regressions. Database changes shall be reviewed and applied deliberately, with backups and a documented reversal approach for destructive changes. Review logs and dependencies periodically, and deactivate compromised accounts promptly.

## Environment Variables

```text
NODE_ENV=production
DATABASE_URL=postgresql://...
SESSION_SECRET=<long-random-secret>
APP_URL=https://<deployed-domain>
FAQ_CONFIDENCE_THRESHOLD=0.5
```

These values are placeholders. Secrets must be generated and stored outside Git.
