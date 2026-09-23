# Design and Implementation of a Web-Based Automated Customer Service System for Inspire Polytechnic

## 1. Project Overview

This project is a simple web-based customer service system for Inspire Polytechnic. It gives students a single place to find common answers, submit and follow support tickets, communicate with support staff, and read institutional announcements. Support agents and administrators receive tools for managing requests, conversations, FAQs, and service activity.

The system is an academic final-year project. Its automated FAQ assistant uses transparent question tokenization and keyword matching only. It is not an artificial intelligence, machine learning, or external chatbot system.

## 2. Problem Being Solved

Students may not know where to direct questions about admissions, programmes, or general school services. Support requests can be difficult to track when they are handled through disconnected channels. Staff also need a central view of open requests, ticket history, chat conversations, FAQs, and announcements.

The system addresses these problems by combining public information, a rule-based FAQ assistant, authenticated student support, and staff management in one web application.

## 3. Project Objectives

- Provide accessible public information about Inspire Polytechnic.
- Allow students to register, authenticate, and manage their support requests.
- Provide a searchable and rule-based automated FAQ response process.
- Allow students and support agents to communicate through tickets and live chat.
- Give support staff tools to assign, update, and resolve requests.
- Give administrators control over FAQs, announcements, users, and activity records.
- Maintain persistent records in PostgreSQL hosted by Supabase.
- Produce a simple, secure, defensible final-year project.

## 4. Scope

### In scope

- Public pages: Home, About, Programmes, Admissions, FAQ, Announcements, quick FAQ assistant, and contact/enquiry form.
- Student registration, login, logout, sessions, password hashing, and role-based access.
- Student dashboard, tickets, ticket replies, FAQ access, live chat, and announcements.
- FAQ records with categories, keywords, active status, tokenization, matching, scoring, and a confidence threshold.
- Support tickets with categories, priorities, statuses, assignment, conversation history, and activity logs.
- Socket.IO chat rooms with persistent sessions and messages.
- Support-agent and administrator dashboards and management actions.
- PostgreSQL persistence through Supabase and deployment planning for Vercel.

### Out of scope

- AI, machine learning, natural-language model APIs, or external chatbot services.
- Payments, student grading, course management, library management, or learning management features.
- Mobile-native applications.
- Microservices, Docker, Kubernetes, Redis, vector databases, or unnecessary infrastructure.
- React, Next.js, TypeScript, Prisma, MongoDB, Firebase, or SQLite.

## 5. User Roles

| Role | Main permissions |
| --- | --- |
| Visitor | View public pages, use the quick FAQ assistant, and submit a general enquiry. |
| Student | Manage their account, create and view their own tickets, reply to tickets, use live chat, and view announcements and FAQs. |
| Support agent | View and manage assigned or permitted support tickets, respond to students, participate in chats, and monitor support activity. |
| Administrator | Manage users, tickets, assignments, FAQs, announcements, chats, and activity logs. |

## 6. Functional Requirements

### Public website

- The system shall provide Home, About, Programmes, Admissions, FAQ, and Announcements pages.
- The system shall provide a quick FAQ assistant using the FAQ knowledge base.
- The system shall provide a general contact/enquiry form.

### Authentication

- The system shall support student registration, login, and logout.
- Passwords shall be hashed with bcryptjs and never stored as plain text.
- Authenticated access shall use express-session with PostgreSQL-backed sessions.
- The system shall enforce role-based access control.
- Login attempts shall be rate limited.
- Email addresses shall be unique and duplicate registration shall be rejected.

### Student portal

- Students shall see dashboard ticket statistics and recent support requests.
- Students shall see their own tickets and ticket details.
- Students shall add replies to their ticket conversations.
- Students shall view FAQs, announcements, and use live chat.

### Automated FAQ

- FAQ records shall contain questions, answers, categories, keywords, and active/inactive state.
- A submitted question shall be normalized and tokenized.
- Tokens shall be compared with FAQ question and keyword tokens.
- Each candidate shall receive a simple match score.
- The highest score shall be returned only when it meets the configured confidence threshold.
- When no answer meets the threshold, the user shall be directed to human support through a ticket or chat.

### Support tickets

- Students shall create tickets with a category, subject, description, and priority.
- Priority shall be one of `low`, `medium`, `high`, or `urgent`.
- Status shall be one of `open`, `assigned`, `in progress`, `pending`, `resolved`, or `closed`.
- Tickets shall retain conversation history, student replies, staff responses, assignment, and activity records.

### Live chat and administration

- Socket.IO shall provide authorized student/support-agent communication through chat rooms.
- Chat sessions and messages shall be persisted.
- Students shall not access another student's chat.
- Staff shall monitor and close authorized chat sessions.
- Staff shall manage tickets, assignments, statuses, responses, FAQs, announcements, and activity records according to role.

## 7. Non-Functional Requirements

- **Usability:** pages and workflows shall be clear to students and staff with ordinary web skills.
- **Performance:** ordinary page requests and FAQ matching shall complete promptly for the expected academic-project workload.
- **Security:** passwords, sessions, authorization, input validation, headers, and rate limiting shall be handled deliberately.
- **Reliability:** ticket, chat, and activity data shall be stored persistently in PostgreSQL.
- **Maintainability:** the application shall use a straightforward Express MVC-style organization with server-rendered EJS views.
- **Scalability:** the design shall support a modest institutional workload without introducing distributed infrastructure.
- **Availability:** deployment shall target Vercel with Supabase providing the hosted database.

## 8. Core System Modules

1. Public information module
2. Authentication and session module
3. Student portal module
4. FAQ knowledge base and rule-based assistant
5. Support ticket module
6. Live chat module
7. Announcement and contact module
8. Support-agent module
9. Administration module
10. Security and activity logging module

## 9. Technology Stack

| Area | Decision |
| --- | --- |
| Frontend | EJS, HTML, CSS, and vanilla JavaScript |
| Backend | Node.js and Express 5 |
| Database | PostgreSQL hosted by Supabase |
| Authentication | express-session, connect-pg-simple, and bcryptjs |
| Real-time communication | Socket.IO |
| Security | Helmet and express-rate-limit, with validation and authorization |
| Deployment | Vercel |

No AI service, model, vector database, or external chatbot is part of this system.

## 10. System Architecture

The application uses a conventional server-rendered web architecture:

1. A browser requests an EJS page or sends an HTML form request.
2. Express 5 routes pass the request through security, session, authentication, and authorization middleware.
3. Controllers or route handlers validate input and call small service/data-access functions.
4. PostgreSQL on Supabase stores users, support records, FAQs, chats, announcements, enquiries, sessions, and logs.
5. EJS renders HTML responses. Vanilla JavaScript provides focused browser interactions.
6. Socket.IO provides authorized real-time chat events while chat sessions and messages remain persistent in PostgreSQL.

The architecture is a single deployable application. It does not require microservices, Redis, Docker, or Kubernetes.

## 11. Database Entities

The initial entities are `users`, `faqs`, `tickets`, `ticket_messages`, `chat_sessions`, `chat_messages`, `announcements`, `contact_messages`, and `activity_logs`. Session records required by `connect-pg-simple` will also be stored in PostgreSQL.

Field definitions, relationships, constraints, and indexes are documented in [docs/database.md](docs/database.md).

## 12. Database Relationships

- A user may create many tickets, ticket messages, chat sessions, chat messages, and activity logs; public contact messages retain submitted contact details without requiring an account.
- A ticket belongs to one student and may be assigned to one support agent at a time.
- A ticket has many ticket messages and activity log entries.
- A chat session belongs to a student and may be assigned to a support agent; it has many chat messages.
- FAQs belong to a category represented by stored category text and contain searchable keywords.
- Announcements and FAQs record the staff user who created or last updated them where applicable.

## 13. Route Structure

Public, authentication, student, support, administrator, and Socket.IO responsibilities are listed in [docs/routes.md](docs/routes.md). Routes use server-rendered pages for ordinary workflows and JSON/event responses only where needed for FAQ assistant and real-time chat behavior.

## 14. Authentication and Authorization Design

Registration validates a unique email and hashes the password with bcryptjs. Login compares the submitted password to the stored hash, regenerates the session after successful authentication, and stores only the authenticated user identity and role in the session. Logout destroys the session and clears its cookie.

Authentication middleware requires a valid session. Role middleware checks the session role before staff or administrator operations. Every ticket, message, and chat operation also checks ownership or staff permission; hiding a link is not treated as authorization.

## 15. Security Requirements

- Use Helmet for secure HTTP response headers.
- Use express-rate-limit for login and other abuse-sensitive endpoints.
- Hash passwords with bcryptjs.
- Store sessions with connect-pg-simple in PostgreSQL, using secure cookie settings in production.
- Validate and normalize form input on the server.
- Use parameterized database queries.
- Enforce ownership and role checks for every protected resource.
- Escape user-controlled content when rendered through EJS.
- Apply CSRF protection or equivalent same-origin form protections to state-changing form workflows during implementation.
- Do not expose password hashes, session secrets, or database credentials.
- Record important staff actions in activity logs.

## 16. FAQ Automation Logic

The quick assistant follows a transparent deterministic process:

1. Normalize the submitted question by lowercasing it and removing irrelevant punctuation.
2. Tokenize the question and remove empty tokens and a small agreed stop-word list.
3. Compare the input tokens against each active FAQ question and keyword tokens.
4. Calculate a simple score from the number of unique query tokens found in the normalized FAQ question or keyword array.
5. Select the highest-scoring FAQ.
6. Return its answer only when the score meets the configured confidence threshold.
7. Otherwise return a clear escalation response that offers human support through a ticket or live chat.

The process is rule-based and explainable. It does not infer intent with AI or call an external service.

## 17. Student Workflow

1. A visitor reads public information or tries the quick FAQ assistant.
2. The visitor registers as a student and logs in.
3. The student views dashboard statistics and recent requests.
4. The student searches FAQs or asks the quick assistant.
5. If the answer is insufficient, the student creates a ticket or starts live chat.
6. The student follows ticket replies, adds messages, and sees status changes.
7. The student reads announcements and closes or acknowledges completed support.

## 18. Support-Agent Workflow

1. The support agent logs in and opens the support dashboard.
2. The agent reviews unassigned, assigned, and active tickets.
3. The agent assigns or accepts a ticket, changes its status, and sets appropriate priority.
4. The agent replies in the ticket conversation and records meaningful activity.
5. The agent responds to authorized live chat sessions and closes chats when complete.
6. The agent escalates or hands over issues to an administrator when required.

## 19. Administrator Workflow

1. The administrator reviews dashboard activity and current support workload.
2. The administrator manages users and support-agent access.
3. The administrator creates, updates, activates, or deactivates FAQ records.
4. The administrator manages announcements and monitors chats and tickets.
5. The administrator reviews activity logs for important changes.

## 20. Development Roadmap

1. Confirm requirements and documentation.
2. Create the Express 5 project structure and environment configuration.
3. Create the PostgreSQL/Supabase schema and seed basic FAQ/public data.
4. Build public pages and contact/enquiry handling.
5. Build authentication, sessions, and role middleware.
6. Build the student portal and ticket workflows.
7. Build FAQ matching and escalation.
8. Build Socket.IO chat with authorization and persistence.
9. Build support-agent and administrator workflows.
10. Apply security controls, test, document, and deploy to Vercel.

## 21. Testing Strategy

Testing will cover unit behavior, route behavior, authorization, database constraints, FAQ matching, chat permissions, and key end-to-end workflows. Important cases include duplicate email registration, incorrect passwords, rate limits, unauthorized ticket access, every ticket status and priority, threshold and no-match FAQ cases, chat closure, and staff role boundaries.

The detailed test matrix and acceptance criteria are in [docs/testing.md](docs/testing.md).

## 22. Environment Variables

The implementation shall use environment variables for:

```text
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://...
SESSION_SECRET=replace-with-a-long-random-value
APP_URL=http://localhost:3000
FAQ_CONFIDENCE_THRESHOLD=0.5
```

Values are examples only. Secrets shall not be committed. Supabase connection settings shall use the connection method recommended for the deployment environment.

## 23. Local Development Setup

Prerequisites are Node.js, npm, and a Supabase project or compatible PostgreSQL database.

1. Clone the repository and install dependencies with `npm install` after implementation begins.
2. Create a local `.env` file from the documented variables.
3. Create the schema in the Supabase SQL editor or through the project migration process.
4. Seed only the initial test/admin data required for development.
5. Start the Express application with the project development script.
6. Run the documented tests before making a deployment build.

Phase 5 includes the authenticated student portal and student-owned support ticket workflow. Support-agent/admin ticket handling, FAQ automation, live chat, and advanced student features remain unimplemented.

## 24. Supabase Setup

Create a Supabase project, copy its PostgreSQL connection information, and store it in `DATABASE_URL`. Apply the schema described in [docs/database.md](docs/database.md). Enable database backups and use least-privilege credentials appropriate to the deployment. Supabase is used for PostgreSQL hosting and persistence; the application remains responsible for authentication, authorization, and business rules.

## 25. Vercel Deployment Plan

The Express application will be deployed as a Vercel serverless web application using the repository's Vercel configuration. Production environment variables will be added in the Vercel project settings, including `DATABASE_URL`, `SESSION_SECRET`, `APP_URL`, and the FAQ threshold. The deployment will use Supabase for persistent data and will verify session cookies, database connectivity, protected routes, and Socket.IO behavior in the selected Vercel deployment arrangement before release.

## 26. Git Workflow

- Keep `main` stable and use short feature branches.
- Make small commits with clear imperative messages.
- Review documentation and tests with each feature.
- Do not commit `.env`, credentials, generated secrets, or production data.
- Merge only after the relevant tests pass and the change is reviewed.

## 27. Documentation Index

- [Requirements](docs/requirements.md)
- [Architecture](docs/architecture.md)
- [Database](docs/database.md)
- [Routes](docs/routes.md)
- [Security](docs/security.md)
- [Testing](docs/testing.md)
- [Deployment](docs/deployment.md)

## Project Status

Phase 8 support-agent and administrator workflows complete. Deployment remains, and no later functionality beyond the documented chat/support/administration scope is implemented.