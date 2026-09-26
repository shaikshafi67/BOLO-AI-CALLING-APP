# BoloAI Web

**BoloAI – AI-Powered Real-Time Multilingual Video Calling System**

*Speak your language. We'll translate the rest.*

BoloAI is a video calling app that removes language barriers. Each person speaks their own language; BoloAI transcribes the speech, translates it, and plays it to the listener as translated voice with live captions.

This folder is the **web frontend** for the university capstone project. It is a complete, responsive UI prototype. The AI and backend services are not connected yet, so calls, translation and data run on clearly labelled mock data.

## Current status

| Implemented in this web app | Needs backend / AI services (planned) |
|---|---|
| 13 responsive screens with routing | Firebase Authentication |
| Light, dark and system themes (saved locally) | WebRTC peer-to-peer video (Socket.IO signaling) |
| Mock sign-in, register with password rules, route guards | Streaming Speech-to-Text |
| Dashboard with stats, activity chart, recent calls | Translation API |
| Start and join call flows with language settings | Text-to-Speech translated voice |
| Video call screen: captions, translation panel, all call states | PostgreSQL-backed history, contacts, notifications |
| Optional **real** camera preview via `getUserMedia` (stays on-device) | Automatic language detection |
| Call history with search, filters, pagination | Screen sharing |
| Contacts, profile editing, settings, notification centre | |
| Service layer with `TODO` hooks for every integration | |

The UI marks unfinished features with "Backend coming soon" tags and prototype notices, so nothing claims the AI is working when it isn't.

## Features

- **Landing page**: hero with a mock translated call, "How it works" pipeline, feature cards, language cards (Available vs Planned), architecture diagram, implemented-vs-planned summary.
- **Auth**: login (remember me, forgot password, Google button) and register (password strength, confirm, preferred language). Demo mode: any valid email and password signs in.
- **Dashboard**: greeting, Start/Join call cards, statistics, weekly call-minutes chart, online contacts, recent calls.
- **Start Call / Join Call**: camera and mic checks, language selection with swap, AI voice, captions and auto-detect toggles, room code validation (`BOLO-1234`, bare digits are accepted), paste from clipboard.
- **Video Call** (`/call/:callId`): top bar with room code, connection status, language pair and timer; remote video placeholder and local picture-in-picture; live captions; live translation panel (side panel on desktop, bottom drawer on mobile); controls for mic, camera, speaker, captions, translation, panel, screen share, more, end call, all with tooltips.
  - Keyboard shortcuts: `M` mic, `V` camera, `C` captions, `T` translation panel.
  - Call states: connecting, connected, reconnecting, connection unstable, microphone muted, camera disabled, translation processing, translation ready, translation unavailable, call ended (with summary and rating).
  - **Presenter demo**: the "More" menu can simulate *Connection unstable*, *Reconnecting* and *Translation unavailable* so every state can be shown during a presentation.
- **Call History**: table on desktop, cards on mobile, search, language and date filters, pagination, details modal, "Call again".
- **Contacts**: search (also from the top bar), online filter, add contact, profile modal, call and message actions.
- **Profile**: photo upload (kept in the browser), edit and save name, email, language, country.
- **Settings**: Account, Audio & Video, Translation, Notifications, Privacy, Appearance (Light/Dark/System), Language.
- **Notifications**: unread badges, mark read / all read, accept or decline an incoming call, contact requests.
- **404** page.

## Design and media

- **Look:** warm paper background, a single ink-blue brand colour with a marigold accent, and warm charcoal in dark mode. No gradients or glow effects. Headlines use *Instrument Serif*; UI text uses *DM Sans*. Tokens live in `src/index.css`.
- **Photos and video:** real stock footage from [Mixkit](https://mixkit.co) (free licence) in `public/media/`, listed in `public/media/CREDITS.md` with clip numbers. They're used in the landing hero (a call window with example subtitles), the "Who it's for" stories, a full-width video banner, the login panel, the dashboard, and the call screen.
- **Demo call:** the demo contact *Marcus Bello* (English, London) "joins" with stock video. Other contacts show an avatar until WebRTC delivers a real stream. Default call languages are Hindi → English.
- Autoplaying video is skipped for visitors who have turned on "reduce motion" in their system settings.
- Stock people and scenarios are labelled as illustrations, not real users or customer stories.

## Technology stack

| Area | Choice |
|---|---|
| Framework | React 19 + TypeScript |
| Build tool | Vite |
| Styling | Tailwind CSS v4 (design tokens in `src/index.css`) |
| Routing | React Router |
| Icons | Lucide React |
| State | React Context + `useState` (no Redux needed) |

## Folder structure

```
web/
├── index.html              # fonts, meta tags, no-flash theme script
├── public/favicon.svg
└── src/
    ├── main.tsx            # entry point
    ├── App.tsx             # providers + routes (pages are lazy-loaded)
    ├── index.css           # Tailwind + design tokens (light/dark), animations
    ├── types/              # User, Contact, Call, Participant, Translation, Notification, Language, CallSettings…
    ├── data/               # all mock data (users, contacts, calls, stats, notifications, translations, languages)
    ├── services/           # authService, callService, translationService, speechService, userService, notificationService
    ├── context/            # Theme, Auth, CallSettings, Notifications, Toast
    ├── hooks/              # useCallTimer, useMediaPreview, useDemoTranslation, usePersistentState
    ├── utils/              # formatting and validation helpers
    ├── components/
    │   ├── ui/             # Button, Card, Badge, Avatar, Input/Select/Toggle, Modal, Tooltip, Logo…
    │   ├── layout/         # AppLayout, Sidebar, Topbar, MobileNav, AuthLayout, route guards
    │   ├── navigation/     # nav item config
    │   ├── landing/        # landing page sections and hero mockup
    │   ├── dashboard/      # StatCard, ActivityChart, RecentCalls
    │   ├── call/           # VideoTile, controls, captions, overlays, camera preview, call-ended screen
    │   └── translation/    # TranslationPanel, language pickers, status indicators
    └── pages/              # one file per route
```

## Getting started

Requires Node.js 20+.

```bash
cd web
npm install
npm run dev
```

Open http://localhost:5173. Click **Get Started** or **Login** and use any valid email and password (demo mode).

Other scripts:

```bash
npm run build      # type-check + production build to dist/
npm run preview    # serve the production build
npm run typecheck  # TypeScript only
```

## Routes

| Path | Page | Auth |
|---|---|---|
| `/` | Landing | public |
| `/login`, `/register` | Auth | guests only |
| `/dashboard` | Dashboard | signed in |
| `/start-call`, `/join-call` | Call setup | signed in |
| `/call/:callId` | Video call (full screen) | signed in |
| `/history`, `/contacts`, `/profile`, `/settings`, `/notifications` | App pages | signed in |
| anything else | 404 | public |

## Future backend integration

All data access goes through `src/services/`. Each file has `TODO` comments describing the real integration, and pages never import mock data for writes, so swapping a mock for a real call does not change the UI.

| Service | Integrate with |
|---|---|
| `authService.ts` | Firebase Authentication (`signInWithEmailAndPassword`, Google provider, password reset). The backend already verifies Firebase ID tokens. |
| `callService.ts` | WebRTC + Socket.IO signaling (create/join room, SDP offer/answer, ICE), plus `POST/GET/PATCH /api/calls` (routes already exist in `backend/`). |
| `speechService.ts` | Streaming Speech-to-Text (mic audio over WebSocket) and Text-to-Speech playback. |
| `translationService.ts` | Translation API; results pushed to both participants over the socket. |
| `userService.ts` | `GET /api/users/me`, `PATCH /api/users/me/language`, `GET /api/users/search`; contacts endpoints still to build. |
| `notificationService.ts` | Notifications API plus real-time pushes (socket / FCM). |

Environment variables for later are listed in `.env.example` (`VITE_API_BASE_URL`, `VITE_SIGNALING_URL`, Firebase keys).

**Language support:** English, Hindi, Telugu and Tamil are marked *Available* because they match the backend's `supportedLanguages.ts`. Gujarati, Kannada, Malayalam, Bengali and Marathi are *Planned*. Actual availability depends on the connected AI services.

## Future AI architecture

```
                 BOLOAI WEB APP
                       |
          -------------------------
          |                       |
          ▼                       ▼
       WebRTC                 AI PIPELINE
          |                       |
          ▼                       ▼
 Video + Original Audio     Speech-to-Text
                                  |
                                  ▼
                             Translation
                                  |
                                  ▼
                                  TTS
                                  |
                                  ▼
                         Translated Audio
                                  |
                                  ▼
                              Listener
```

Video and the original audio travel peer-to-peer over WebRTC. In parallel, the speaker's audio is streamed to the backend, which runs Speech-to-Text → Translation → Text-to-Speech and sends the translated text (captions) and audio to the listener. The call screen already renders this data shape (`Translation` type: original text, translated text, languages, status).
