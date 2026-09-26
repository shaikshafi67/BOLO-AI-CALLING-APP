import type { Call, CallSettings, ConnectionState } from '../types';
import { calls } from '../data/calls';
import { delay } from './config';
import { generateRoomCode } from '../utils/format';

// TODO: Connect WebRTC signaling server
// Planned flow (Socket.IO on the Node backend):
//   createRoom  → emit('room:create')      → server returns room code
//   joinRoom    → emit('room:join', code)  → exchange SDP offer/answer + ICE candidates
//   leaveRoom   → emit('room:leave')       → close RTCPeerConnection
// Media: navigator.mediaDevices.getUserMedia + RTCPeerConnection carry
// the video and ORIGINAL audio; translated audio arrives via the AI pipeline.

// TODO: Connect backend database
//   POST  /api/calls                → record a call
//   GET   /api/calls                → getHistory
//   PATCH /api/calls/:id/status     → update status on end

export type ConnectionListener = (state: ConnectionState) => void;

export const callService = {
  async createRoom(_settings: CallSettings): Promise<string> {
    await delay(500);
    return generateRoomCode();
  },

  /** Prototype: any well-formed code "exists". */
  async joinRoom(roomCode: string): Promise<{ roomCode: string }> {
    await delay(700);
    return { roomCode };
  },

  /**
   * Simulates the signaling handshake so the UI can show its connection states.
   * Returns a cleanup function, like a real socket subscription would.
   */
  connect(onState: ConnectionListener): () => void {
    onState('connecting');
    const t = setTimeout(() => onState('connected'), 1800);
    return () => clearTimeout(t);
  },

  async leaveRoom(_roomCode: string): Promise<void> {
    await delay(200);
  },

  async getHistory(): Promise<Call[]> {
    await delay(300);
    return calls;
  },
};
