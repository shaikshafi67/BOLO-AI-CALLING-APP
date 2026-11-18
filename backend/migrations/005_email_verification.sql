-- One-time email verification for new email/password accounts: a 6-digit
-- code is emailed after sign-up. Only a hash of the code is stored, and the
-- row is deleted once the email is verified.

CREATE TABLE email_verification_codes (
    firebase_uid  TEXT PRIMARY KEY,
    email         TEXT NOT NULL,
    code_hash     TEXT NOT NULL,
    expires_at    TIMESTAMPTZ NOT NULL,
    attempts      INTEGER NOT NULL DEFAULT 0,
    sent_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
