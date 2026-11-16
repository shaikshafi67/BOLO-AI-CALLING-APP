-- Missed-call notifications kept on the server (they used to live on the
-- device only), the push token of each account's signed-in device, and how
-- long each translated sentence took.

CREATE TABLE notifications (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    kind        TEXT NOT NULL CHECK (kind IN ('missed_call', 'system')),
    title       TEXT NOT NULL,
    message     TEXT NOT NULL,
    -- The other person (e.g. who called), for "Call back".
    contact_id  UUID REFERENCES users (id) ON DELETE SET NULL,
    read        BOOLEAN NOT NULL DEFAULT false,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user ON notifications (user_id, created_at DESC);

-- One signed-in device per account (user_sessions), so its push token lives
-- on the same row: signing in elsewhere replaces the row and the old device
-- stops getting pushes.
ALTER TABLE user_sessions ADD COLUMN push_token TEXT;

-- translate_ms: final transcript -> translated caption.
-- voice_ms: final transcript -> translated voice ready (NULL when no voice
-- was made, e.g. both people speak the same language).
ALTER TABLE translations
    ADD COLUMN translate_ms  INTEGER,
    ADD COLUMN voice_ms      INTEGER;
