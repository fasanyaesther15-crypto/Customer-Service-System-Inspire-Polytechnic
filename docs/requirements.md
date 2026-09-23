# Requirements Specification

## Project

**Design and Implementation of a Web-Based Automated Customer Service System for Inspire Polytechnic**

This document converts the approved project requirements into implementation-neutral acceptance requirements. The system remains a simple final-year academic project. PostgreSQL hosted by Supabase replaces the original SQLite decision; all other requirements remain unchanged.

## Actors

- **Visitor:** an unauthenticated person using public information and the contact form.
- **Student:** an authenticated user who owns support requests and chats.
- **Support agent:** an authenticated staff user who handles support work.
- **Administrator:** an authenticated staff user with management authority.

## Functional Requirements

### Public website

- Home, About, Programmes, Admissions, FAQ, and Announcements pages shall be available publicly.
- The quick FAQ assistant shall accept a question and return a matching active FAQ answer or an escalation instruction.
- The general contact/enquiry form shall accept a visitor's contact details and message for staff review.

### Authentication

- Students shall register with a unique email address and password.
- Passwords shall be hashed using bcryptjs.
- Students and staff shall log in and log out through session authentication.
- Protected requests shall require a valid session.
- Role checks shall protect student, support-agent, and administrator functions.
- Login requests shall be rate limited.

### Student services

- Students shall view dashboard ticket statistics, recent requests, FAQs, announcements, and live chat.
- Students shall create tickets with category, subject, description, and priority.
- Students shall view ticket details and add replies.
- Students shall see ticket status, assignment information where appropriate, and conversation history.

### FAQ service

- Staff shall manage FAQ questions, answers, categories, keywords, and active/inactive state.
- The assistant shall normalize and tokenize the question.
- The assistant shall match tokens to active FAQ questions and keywords, score candidates, apply a confidence threshold, and return the best answer.
- The assistant shall direct unresolved questions to human support.

### Ticket service

- Tickets shall support priorities `low`, `medium`, `high`, and `urgent`.
- Tickets shall support statuses `open`, `assigned`, `in progress`, `pending`, `resolved`, and `closed`.
- Authorized staff shall assign tickets, change status, respond, and review activity.
- Ticket messages and activity records shall be persistent.

### Live chat

- Students and authorized support agents shall communicate through Socket.IO rooms.
- Chat sessions and messages shall be persistent.
- Authorization shall be checked when joining a room, sending a message, reading history, and closing a chat.
- Authorized staff shall monitor and close chats.

### Administration

- Administrators shall view support dashboard information and manage tickets, assignments, responses, FAQs, announcements, users, chats, and activity logs.
- Support agents shall access the support functions assigned to their role.

## Non-Functional Requirements

- Server-rendered pages shall work on current desktop and mobile browsers.
- The system shall provide clear validation and error messages without exposing sensitive data.
- Database writes shall be consistent and use parameterized queries.
- Passwords and session secrets shall never be exposed to clients or committed to source control.
- The system shall be maintainable by a student project team using the documented stack.
- The system shall be deployable on Vercel with Supabase PostgreSQL.

## Acceptance Boundaries

The project is complete when the documented public, authentication, student, FAQ, ticket, chat, support, and administration workflows work with persistent PostgreSQL data, role checks, security controls, and tests. AI functionality, external chatbot integrations, and unrelated institutional systems are explicitly excluded.
