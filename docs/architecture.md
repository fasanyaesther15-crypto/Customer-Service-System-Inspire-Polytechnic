# System Architecture

## Architectural Decision

The application will be one Node.js process/application using Express 5, EJS, HTML, CSS, vanilla JavaScript, Socket.IO, and PostgreSQL hosted by Supabase. It will use a straightforward layered organization rather than microservices.

## Request Flow

```text
Browser
  -> Express middleware
     -> Helmet, rate limits, session loading
     -> authentication and role authorization
     -> route/controller
        -> validation and business logic
           -> PostgreSQL via parameterized queries
  <- EJS HTML or small JSON response

Browser <-> Socket.IO gateway <-> authorized chat logic <-> PostgreSQL
```

## Application Areas

- **Public routes:** informational pages, FAQ, announcements, and contact enquiries.
- **Authentication:** registration, login, logout, password hashing, and sessions.
- **Student portal:** dashboard, tickets, FAQ access, announcements, and chat.
- **Support:** ticket assignment, statuses, responses, chat monitoring, and activity.
- **Administration:** user/staff access, FAQs, announcements, tickets, chats, and logs.
- **Persistence:** PostgreSQL tables and the session store.

## Request Responsibilities

Routes should remain thin: receive input, invoke validation and the appropriate service/data-access operation, then render or redirect. Services should contain FAQ scoring, ticket state rules, and chat authorization decisions. Database access should use parameterized queries and return only the fields needed by the caller. EJS templates should render escaped user-controlled values.

## Session and Chat Boundaries

The session cookie identifies the authenticated user; the server remains the authority for identity and role. Socket.IO connections must authenticate from the session and re-check authorization for each room and protected event. A room identifier is not permission by itself. Chat messages are written to PostgreSQL so a reconnect can load history.

## Deployment Shape

Vercel is the intended deployment platform. Supabase provides the hosted PostgreSQL database. The design avoids local-only persistence and avoids Redis, containers, Kubernetes, microservices, and other infrastructure not needed by this project. Socket.IO deployment compatibility must be verified during implementation because serverless hosting can impose connection-lifetime constraints.

## Simplicity Rules

- Prefer server-rendered EJS pages over a frontend framework.
- Prefer a small number of modules with clear responsibilities over abstractions without a current use.
- Keep the FAQ algorithm deterministic and explainable.
- Use PostgreSQL constraints for data integrity and application checks for workflow rules.
- Do not add AI, machine learning, external chatbot services, or unrelated features.
