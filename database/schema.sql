CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE users (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	full_name varchar(150) NOT NULL,
	email varchar(320) NOT NULL,
	password_hash varchar(255) NOT NULL,
	role varchar(30) NOT NULL DEFAULT 'student',
	is_active boolean NOT NULL DEFAULT true,
	created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
	updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT users_role_check CHECK (role IN ('student', 'support_agent', 'administrator'))
);

CREATE UNIQUE INDEX users_email_unique_idx ON users (lower(email));

CREATE TABLE faqs (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	question text NOT NULL,
	answer text NOT NULL,
	category varchar(100) NOT NULL,
	keywords text[] NOT NULL DEFAULT '{}',
	is_active boolean NOT NULL DEFAULT true,
	created_by uuid REFERENCES users (id) ON DELETE SET NULL,
	created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
	updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX faqs_active_idx ON faqs (is_active);
CREATE INDEX faqs_category_idx ON faqs (category);

CREATE TABLE tickets (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	student_id uuid NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
	assigned_agent_id uuid REFERENCES users (id) ON DELETE SET NULL,
	category varchar(100) NOT NULL,
	subject varchar(200) NOT NULL,
	priority varchar(20) NOT NULL DEFAULT 'medium',
	status varchar(20) NOT NULL DEFAULT 'open',
	created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
	updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
	resolved_at timestamptz,
	closed_at timestamptz,
	CONSTRAINT tickets_priority_check CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
	CONSTRAINT tickets_status_check CHECK (status IN ('open', 'assigned', 'in progress', 'pending', 'resolved', 'closed'))
);

CREATE INDEX tickets_student_idx ON tickets (student_id);
CREATE INDEX tickets_assigned_agent_idx ON tickets (assigned_agent_id);
CREATE INDEX tickets_status_idx ON tickets (status);
CREATE INDEX tickets_created_at_idx ON tickets (created_at);

CREATE TABLE ticket_messages (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	ticket_id uuid NOT NULL REFERENCES tickets (id) ON DELETE CASCADE,
	sender_id uuid NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
	message text NOT NULL,
	created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX ticket_messages_ticket_created_idx
	ON ticket_messages (ticket_id, created_at);

CREATE TABLE chat_sessions (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	student_id uuid NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
	assigned_agent_id uuid REFERENCES users (id) ON DELETE SET NULL,
	status varchar(20) NOT NULL DEFAULT 'open',
	started_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
	updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
	closed_at timestamptz,
	CONSTRAINT chat_sessions_status_check CHECK (status IN ('open', 'assigned', 'closed'))
);

CREATE INDEX chat_sessions_student_idx ON chat_sessions (student_id);
CREATE INDEX chat_sessions_assigned_agent_idx ON chat_sessions (assigned_agent_id);
CREATE INDEX chat_sessions_status_idx ON chat_sessions (status);

CREATE TABLE chat_messages (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	chat_session_id uuid NOT NULL REFERENCES chat_sessions (id) ON DELETE CASCADE,
	sender_id uuid NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
	message text NOT NULL,
	created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX chat_messages_session_created_idx
	ON chat_messages (chat_session_id, created_at);

CREATE TABLE announcements (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	title varchar(200) NOT NULL,
	body text NOT NULL,
	is_published boolean NOT NULL DEFAULT false,
	published_at timestamptz,
	created_by uuid NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
	created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
	updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX announcements_published_idx ON announcements (is_published, published_at);

CREATE TABLE contact_messages (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	name varchar(150) NOT NULL,
	email varchar(320) NOT NULL,
	subject varchar(200) NOT NULL,
	message text NOT NULL,
	status varchar(20) NOT NULL DEFAULT 'new',
	created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
	updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT contact_messages_status_check CHECK (status IN ('new', 'in progress', 'resolved'))
);

CREATE INDEX contact_messages_status_idx ON contact_messages (status);
CREATE INDEX contact_messages_created_at_idx ON contact_messages (created_at);

CREATE TABLE activity_logs (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	actor_id uuid REFERENCES users (id) ON DELETE SET NULL,
	action varchar(100) NOT NULL,
	entity_type varchar(100) NOT NULL,
	entity_id uuid,
	details jsonb,
	created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX activity_logs_actor_idx ON activity_logs (actor_id);
CREATE INDEX activity_logs_entity_idx ON activity_logs (entity_type, entity_id);
CREATE INDEX activity_logs_created_at_idx ON activity_logs (created_at);

CREATE TABLE session (
	sid varchar NOT NULL PRIMARY KEY,
	sess json NOT NULL,
	expire timestamptz NOT NULL
);

CREATE INDEX session_expire_idx ON session (expire);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
	NEW.updated_at = CURRENT_TIMESTAMP;
	RETURN NEW;
END;
$$;

CREATE TRIGGER users_set_updated_at
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER faqs_set_updated_at
BEFORE UPDATE ON faqs
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER tickets_set_updated_at
BEFORE UPDATE ON tickets
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER chat_sessions_set_updated_at
BEFORE UPDATE ON chat_sessions
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER announcements_set_updated_at
BEFORE UPDATE ON announcements
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER contact_messages_set_updated_at
BEFORE UPDATE ON contact_messages
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
