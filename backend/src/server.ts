import http from 'http';
import { createApp } from './app';
import { attachSignaling } from './websocket/signaling';
import { firebaseVerifier } from './websocket/firebaseVerifier';
import { pgSessionStore } from './services/session.service';
import { pgCallRecorder } from './services/callRecorder.service';
import { userService } from './services/user.service';
import { GoogleTranslationEngine } from './translation/googleEngine';

const port = Number(process.env.PORT ?? 4000);

// Signing in on a new device (POST /api/sessions) signs the account's other
// devices out through their sockets.
const app = createApp({
  onSessionClaimed: (uid, sessionId) => {
    signaling.kickOtherSessions(uid, sessionId).catch((err) => console.error('[ERROR] kickOtherSessions', err));
  },
});
const server = http.createServer(app);

// WebRTC signaling (Socket.IO) shares the same port as the REST API.
const signaling = attachSignaling(server, {
  verifyToken: firebaseVerifier,
  sessions: pgSessionStore,
  calls: pgCallRecorder,
  translation: new GoogleTranslationEngine(),
  resolveUser: async (userId) => {
    const user = await userService.getById(userId);
    return user ? { uid: user.firebaseUid } : null;
  },
});

server.listen(port, () => {
  console.log(`[INFO] BoloAI backend listening on port ${port} (REST /api, signaling via Socket.IO)`);
});
