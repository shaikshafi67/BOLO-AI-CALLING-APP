# BoloAI

**BoloAI – AI-Powered Real-Time Multilingual Calling Application**

*Your Voice, Any Language.*

BoloAI is a real-time 1:1 video/voice calling app that removes language barriers: a caller speaks in one language, and the receiver hears translated speech and sees live captions, layered on top of a standard WebRTC call.

## Status

Auth (Firebase), one-device sessions and real 1:1 video/voice calls (WebRTC over the Socket.IO signaling server) work. The AI translation pipeline (Phase 6) is not implemented yet: calls carry the original audio, and live captions show "Translation unavailable".

## Tech Stack

| Component | Technology |
|---|---|
| Frontend | Flutter (Android + Web) |
| WebRTC | flutter_webrtc |
| Signaling | Socket.IO on Node.js/TypeScript |
| Backend | Node.js + TypeScript (Express) |
| Database | PostgreSQL |
| Auth | Firebase Authentication (project `bolo-ai-8f1a0`) |
| ASR | Google Cloud Speech-to-Text (streaming) |
| Translation | Google Cloud Translation API |
| TTS | Google Cloud Text-to-Speech |

## Repository Structure

```
BoloAI/
├── frontend/   Flutter app (lib/core, config, models, services, repositories, features, widgets)
├── web/        React + TypeScript + Vite web app (see web/README.md)
├── backend/    Node.js + TypeScript API/signaling server (src/controllers, services, models, routes, middleware, websocket, config)
├── docs/       Requirements, architecture, API docs
```

## Web App (React)

`web/` is the full web frontend prototype: landing page, auth, dashboard, start/join call, the video call screen with live translation panel and captions, history, contacts, profile, settings and notifications, with light/dark mode. It runs on mock data today; services in `web/src/services/` are the integration points for the backend.

```bash
cd web
npm install
npm run dev    # http://localhost:5173
```

Details: [web/README.md](web/README.md)

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

## Known Limitations

- The AI pipeline (speech recognition, translation, TTS, captions) is not implemented yet (Phase 6).
- Calls are by room code; ringing a specific contact (incoming-call screen) is not wired up yet.- Contacts, call history, and user profile are still mock data pending backend integration (Phase 4).
- No TURN server is configured by default. Calls work on the same network and behind most home routers; set `TURN_SERVER_URL`/`TURN_USERNAME`/`TURN_PASSWORD` in `backend/.env` for calls across mobile data or strict NATs (see `docs/signaling.md`).
- Browsers only allow the camera on `https://` or `localhost`.
- `firebase_core_web` is pinned to 3.10.0 via `dependency_overrides` in `frontend/pubspec.yaml` — 3.11.0 fails to compile for web (a dart2js `isA`/`JSObject` regression). Remove the override once upstream ships a fix.

## Roadmap

See `docs/requirements.md` for full functional/non-functional requirements and phase-by-phase development plan.
