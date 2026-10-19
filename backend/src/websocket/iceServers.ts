/// One entry of RTCConfiguration.iceServers, in the shape WebRTC expects.
export interface IceServer {
  urls: string | string[];
  username?: string;
  credential?: string;
}

/// Public STUN server: enough for calls on the same network or behind
/// friendly NATs. Calls across mobile data / strict NATs also need TURN.
const DEFAULT_STUN: IceServer = { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] };

/// ICE servers handed to the apps when they create or join a room, so TURN
/// credentials stay on the server instead of being built into the apps.
///
///   TURN_SERVER_URL=turn:turn.example.com:3478   (comma-separate several)
///   TURN_USERNAME=...
///   TURN_PASSWORD=...
export function iceServersFromEnv(environment: NodeJS.ProcessEnv = process.env): IceServer[] {
  const servers: IceServer[] = [DEFAULT_STUN];
  const urls = (environment.TURN_SERVER_URL ?? '')
    .split(',')
    .map((u) => u.trim())
    .filter(Boolean);
  if (urls.length > 0) {
    servers.push({
      urls,
      username: environment.TURN_USERNAME?.trim() || undefined,
      credential: environment.TURN_PASSWORD?.trim() || undefined,
    });
  }
  return servers;
}
