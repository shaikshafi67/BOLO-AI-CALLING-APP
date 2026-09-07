# BoloAI

**BoloAI – AI-Powered Real-Time Multilingual Calling Application**

*Your Voice, Any Language.*

BoloAI is a real-time 1:1 video/voice calling app that removes language barriers: a caller speaks in one language, and the receiver hears translated speech and sees live captions, layered on top of a standard WebRTC call.

## Status

Phase 1 — project scaffolding complete. Auth, calling, and AI pipeline are not yet implemented.

## Tech Stack

| Component | Technology |
|---|---|
| Frontend | Flutter (Android + Web) |
| WebRTC | flutter_webrtc |
| Signaling | Socket.IO on Node.js/TypeScript |
| Backend | Node.js + TypeScript (Express) |
| Database | PostgreSQL |
| Auth | Firebase Authentication |
| ASR | Google Cloud Speech-to-Text (streaming) |
| Translation | Google Cloud Translation API |
| TTS | Google Cloud Text-to-Speech |

## Repository Structure

```
BoloAI/
├── frontend/   Flutter app (lib/core, config, models, services, repositories, features, widgets)
├── backend/    Node.js + TypeScript API/signaling server (src/controllers, services, models, routes, middleware, websocket, config)
├── docs/       Requirements, architecture, API docs
```

## Prerequisites

- Flutter 3.35+ / Dart 3.9+
- Node.js 20+ (developed against v24)
- A PostgreSQL instance (local or hosted, e.g. Supabase/Neon)
- A Firebase project (Authentication enabled)
- A Google Cloud project with Speech-to-Text, Translation, and Text-to-Speech APIs enabled, plus a service account key

## Backend Setup

```bash
cd backend
npm install
cp .env.example .env   # then fill in DATABASE_URL, AUTH_SECRET, GOOGLE_APPLICATION_CREDENTIALS, Firebase keys
npm run dev             # starts on http://localhost:4000
```

Health check: `GET http://localhost:4000/api/health`

## Frontend Setup

```bash
cd frontend
flutter pub get
flutter run              # choose a connected device/emulator, or Chrome for web
```

## Testing

```bash
cd backend && npm test
cd frontend && flutter test
```

## Known Limitations (Phase 1)

- No authentication, calling, or AI pipeline implemented yet — this is scaffolding only.
- Android build has a Gradle/Java version compatibility warning from `flutter create`; not yet resolved (only matters when building an APK).
- TURN server not yet selected/configured — required before cross-network calls will work in later phases.

## Roadmap

See `docs/requirements.md` for full functional/non-functional requirements and phase-by-phase development plan.
