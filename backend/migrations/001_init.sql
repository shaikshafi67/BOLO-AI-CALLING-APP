-- BoloAI initial schema.
-- Users are keyed by their Firebase Authentication UID (firebase_uid), not
-- an internally generated id, since Firebase owns identity/credentials and
-- this backend only owns profile + app data.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE users (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    firebase_uid        TEXT NOT NULL UNIQUE,
    name                TEXT NOT NULL,
    email               TEXT NOT NULL UNIQUE,
    preferred_language  TEXT NOT NULL DEFAULT 'en',
    avatar_url          TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_users_firebase_uid ON users (firebase_uid);

CREATE TABLE calls (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    caller_id    UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    receiver_id  UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    status       TEXT NOT NULL CHECK (status IN ('ringing', 'accepted', 'rejected', 'missed', 'ended')),
    started_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    ended_at     TIMESTAMPTZ,
    CHECK (caller_id <> receiver_id)
);

CREATE INDEX idx_calls_caller ON calls (caller_id, started_at DESC);
CREATE INDEX idx_calls_receiver ON calls (receiver_id, started_at DESC);

-- Translation log entries are metadata only (source/target language +
-- text), never raw audio — see docs/requirements.md privacy requirements.
CREATE TABLE translations (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    call_id          UUID NOT NULL REFERENCES calls (id) ON DELETE CASCADE,
    source_language  TEXT NOT NULL,
    target_language  TEXT NOT NULL,
    source_text      TEXT NOT NULL,
    translated_text  TEXT NOT NULL,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_translations_call ON translations (call_id, created_at);
