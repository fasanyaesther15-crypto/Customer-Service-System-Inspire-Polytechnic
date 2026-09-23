# Route Structure

Routes are grouped by access level. Exact controller filenames may be chosen during implementation; these route responsibilities are fixed for the design stage.

## Public Routes

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/` | Home page. |
| GET | `/about` | About page. |
| GET | `/programmes` | Programmes page. |
| GET | `/admissions` | Admissions page. |
| GET | `/faq` | Public FAQ page. |
| POST | `/faq` | Validate a question, compare it with active FAQ records, and render a match or fallback. |
| GET | `/announcements` | Published announcements. |
| GET | `/contact` | General enquiry form. |
| POST | `/contact` | Validate and store a contact message. |

## Authentication Routes

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/register` | Registration page. |
| POST | `/register` | Validate, reject duplicate email, hash password, and create student. |
| GET | `/login` | Login page. |
| POST | `/login` | Authenticate with bcryptjs and create a session. |
| POST | `/logout` | Destroy the current session and clear its cookie. |

Login and registration endpoints must use appropriate rate limits and server-side validation.

Registration always creates a `student` account; the submitted form cannot select or create `support_agent` or `administrator` accounts. Successful login regenerates the session and stores only the user's `id`, `fullName`, `email`, and `role`. Logout is a `POST` request so session invalidation is not triggered by a normal link visit.

Phase 4 implements the public informational pages and the general enquiry form. FAQ and announcement pages read only active/published records from PostgreSQL and show explicit empty states when no records exist. The contact form validates and stores a `contact_messages` record; it does not create a ticket. The FAQ page is a browse-only interface in this phase and does not perform automated matching.

Phase 6 adds deterministic FAQ matching to `POST /faq`. The server loads active FAQ records from PostgreSQL, normalizes and tokenizes the question, scores meaningful token overlap against each FAQ question and keyword array, and accepts the best result only when its score reaches the documented 50% threshold. Otherwise it renders a fallback linking to contact support. This is not AI, semantic search, or a chatbot.

## Student Routes

All implemented routes below require an authenticated student session and the `student` role. Ticket detail and message operations enforce ownership in their SQL queries.

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/student/dashboard` | Statistics, recent requests, announcements, and links. |
| GET | `/student/tickets` | Student's tickets. |
| GET | `/student/tickets/new` | New ticket form. |
| POST | `/student/tickets` | Create a ticket and initial message. |
| GET | `/student/tickets/:ticketId` | Ticket details and conversation history. |
| POST | `/student/tickets/:ticketId/messages` | Add a student ticket reply. |
| GET | `/student/chat` | Student chat session page. |
| POST | `/student/chat` | Create or reuse the student's open chat session. |

Student ticket creation inserts the ticket and its initial description as the first `ticket_messages` record in one PostgreSQL transaction. Students can view status but cannot change it. Student chat uses authenticated Socket.IO events and session ownership checks.

## Support-Agent Routes

All routes below require a support-agent or administrator role plus resource authorization.

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/support/dashboard` | Support workload and recent activity. |
| GET | `/support/tickets` | Filterable ticket list. |
| GET | `/support/tickets/:ticketId` | Ticket details and history. |
| POST | `/support/tickets/:ticketId/assign` | Assign or reassign a ticket. |
| POST | `/support/tickets/:ticketId/status` | Change ticket status. |
| POST | `/support/tickets/:ticketId/messages` | Add an agent response. |
| GET | `/support/chats` | Monitor authorized chat sessions. |
| GET | `/support/chats/:chatId` | Chat history and controls. |
| POST | `/support/chats/:chatId/assign` | Assign a chat. |
| POST | `/support/chats/:chatId/close` | Close a chat session. |

## Administrator Routes

All routes below require the administrator role.

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/admin/dashboard` | Administrative overview. |
| GET | `/admin/users` | Manage users and staff access. |
| POST | `/admin/users/:userId` | Update a user's validated role and active state. |
| GET | `/admin/faqs` | List FAQ records. |
| POST | `/admin/faqs` | Create an FAQ. |
| POST | `/admin/faqs/:faqId` | Update or activate/deactivate an FAQ. |
| GET | `/admin/announcements` | Manage announcements. |
| POST | `/admin/announcements` | Create or publish an announcement. |
| GET | `/admin/activity-logs` | Review activity logs. |

## Socket.IO Events

The Socket.IO server shall authenticate the session during connection and authorize every event.

- `chat:join` joins an authorized chat room.
- `chat:message` validates and persists a message, then broadcasts it to the authorized room.
- `chat:history` loads persistent messages for an authorized session.
- `chat:typing` broadcasts a non-persistent typing indicator to the authorized room.
- `chat:close` closes a session for an authorized staff user or permitted workflow.
- `chat:error` communicates validation or authorization errors without leaking details.

## Common HTTP Behavior

Successful form actions should redirect to the relevant page. Validation failures should re-render the form with safe, useful errors. Missing resources return 404. Unauthenticated requests redirect to login or return an appropriate Socket.IO error. Unauthorized requests return 403 without revealing another user's data.
