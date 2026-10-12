import http from 'http';
import { createApp } from './app';
import { attachSignaling } from './websocket/signaling';
import { firebaseVerifier } from './websocket/firebaseVerifier';

const port = Number(process.env.PORT ?? 4000);
const app = createApp();
const server = http.createServer(app);

// WebRTC signaling (Socket.IO) shares the same port as the REST API.
attachSignaling(server, { verifyToken: firebaseVerifier });

server.listen(port, () => {
  console.log(`[INFO] BoloAI backend listening on port ${port} (REST /api, signaling via Socket.IO)`);
});
