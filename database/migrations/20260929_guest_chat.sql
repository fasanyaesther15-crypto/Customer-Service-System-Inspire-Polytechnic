BEGIN;

ALTER TABLE chat_sessions
  ALTER COLUMN student_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS guest_session_id uuid,
  ADD COLUMN IF NOT EXISTS guest_name varchar(150),
  ADD COLUMN IF NOT EXISTS guest_email varchar(320);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chat_sessions_owner_check'
      AND conrelid = 'chat_sessions'::regclass
  ) THEN
    ALTER TABLE chat_sessions
      ADD CONSTRAINT chat_sessions_owner_check CHECK (
        (student_id IS NOT NULL AND guest_session_id IS NULL AND guest_name IS NULL AND guest_email IS NULL)
        OR (student_id IS NULL AND guest_session_id IS NOT NULL AND guest_name IS NOT NULL AND length(btrim(guest_name)) > 0)
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS chat_sessions_guest_session_idx
  ON chat_sessions (guest_session_id)
  WHERE guest_session_id IS NOT NULL;

ALTER TABLE chat_messages
  ALTER COLUMN sender_id DROP NOT NULL;

COMMIT;