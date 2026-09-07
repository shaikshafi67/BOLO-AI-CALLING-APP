# BoloAI — Software Requirements

## A. Functional Requirements

| ID | Requirement |
|----|-------------|
| FR-01 | User registration (email/password via Firebase Auth) |
| FR-02 | User login |
| FR-03 | User logout / session management |
| FR-04 | User profile (name, preferred language, avatar) |
| FR-05 | User search (find another registered user to call) |
| FR-06 | Start a 1:1 call (video or audio) |
| FR-07 | Accept / reject an incoming call |
| FR-08 | Real-time video communication (WebRTC) |
| FR-09 | Real-time audio communication (WebRTC) |
| FR-10 | Select source and target languages per call |
| FR-11 | Streaming speech recognition (ASR) on the caller's mic audio |
| FR-12 | Spoken-language detection (or explicit user-selected source language) |
| FR-13 | Text translation between source and target language |
| FR-14 | Translated speech generation (TTS) delivered to the receiver |
| FR-15 | Live captions (original + translated text) shown during the call |
| FR-16 | Call history (past calls, participants, duration, timestamps) |
| FR-17 | Mute/unmute microphone, enable/disable camera, switch camera |
| FR-18 | End call (either participant) |
| FR-19 | Error recovery (permission denied, network loss, AI service failure) |
| FR-20 | Settings (preferred language, notification preferences) |

## B. Non-Functional Requirements

- **Performance**: end-to-end translation latency measured and logged per call; target is stated as "measured," not promised, until Phase 6 instrumentation exists.
- **Security**: all API traffic over HTTPS/WSS; no secrets in client code; JWT/Firebase token verified on every protected backend route.
- **Scalability**: backend stateless where possible so it can run multiple instances behind a load balancer; signaling state kept in Redis if horizontal scaling is needed later (not required for MVP demo).
- **Reliability**: WebRTC reconnection handling; AI pipeline failures degrade gracefully (call continues without translation rather than dropping).
- **Maintainability**: layered architecture (controllers/services/models on backend; core/features/services on frontend); no business logic in route handlers.
- **Usability**: call setup in ≤3 taps from home screen; clear mic/camera/translation status indicators at all times.
- **Privacy**: raw audio is not persisted; only transcript/translation text and call metadata are stored, and only as long as needed for call history.
- **Availability**: target demo-grade uptime only for MVP; no HA requirement for a capstone project.

## C. User Stories

- As a user, I want to register and log in securely so that my identity and call history are protected.
- As a user, I want to search for another registered user so that I can start a call with them.
- As a user, I want to call another user so that I can communicate through video.
- As a user, I want my speech translated into another language so that I can communicate with someone who does not speak my language.
- As a user, I want to see live captions during a call so that I can follow the conversation even if the translated audio is unclear.
- As a user, I want to view my past calls so that I can keep track of who I've spoken with.
- As a user, I want to mute my microphone or turn off my camera so that I control what I share during a call.
- As a user, I want to be told clearly when something fails (e.g., translation service down) so that I'm not confused by silent failure.

## D. Acceptance Criteria (sample, expanded per feature during implementation)

**FR-06/07 Start/accept a call**
- Given two logged-in users, when User A calls User B, User B receives an incoming-call notification within 3 seconds.
- If User B rejects, User A sees "Call declined" within 2 seconds.

**FR-11–FR-14 AI translation pipeline**
- Given User A speaks a sentence in the selected source language, User B receives translated audio and captions within a measured latency window (to be benchmarked in Phase 6, not assumed in advance).
- If the ASR/translation/TTS service is unavailable, the call continues uninterrupted and the UI shows "Translation unavailable" rather than freezing.

**FR-16 Call history**
- After a call ends, an entry appears in both participants' call history with correct duration and timestamp within 5 seconds of call end.
