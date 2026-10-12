-- One active app session per account.
-- Each signed-in device sends a random session id. Signing in on a new
-- device replaces this row, which signs the previous device out
-- (see docs/sessions.md). Keyed by firebase_uid rather than users.id because
-- a session exists before the profile is created during registration.

CREATE TABLE user_sessions (
    firebase_uid  TEXT PRIMARY KEY,
    session_id    TEXT NOT NULL,
    device        TEXT,
    claimed_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
