-- Details the call history screen shows: the room the call happened in and
-- the language each person spoke. Calls are recorded by the signaling server
-- when the second person joins a room (see docs/signaling.md).

ALTER TABLE calls
    ADD COLUMN room_code          TEXT,
    ADD COLUMN caller_language    TEXT,
    ADD COLUMN receiver_language  TEXT;
