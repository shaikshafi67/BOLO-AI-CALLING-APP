import { randomInt } from 'crypto';

/// One person connected to a call room.
export interface Participant {
  socketId: string;
  uid: string;
  name: string;
  language: string;
}

export type JoinError = 'not_found' | 'full' | 'already_in_room';

export type JoinResult =
  | { ok: true; peers: Participant[] }
  | { ok: false; error: JoinError };

/// Room codes look like BOLO-4829 — same format the web and Flutter apps validate.
export const ROOM_CODE_PATTERN = /^BOLO-\d{4}$/;

/// BoloAI calls are 1:1, so a room holds at most two people.
export const MAX_PARTICIPANTS = 2;

/// In-memory registry of active call rooms. Signaling state is short-lived
/// (it only exists while people are connected), so it does not need the
/// database. Call records are saved separately through /api/calls.
export class RoomManager {
  private readonly rooms = new Map<string, Map<string, Participant>>();
  private readonly roomBySocket = new Map<string, string>();

  constructor(private readonly generateCode: () => string = defaultCode) {}

  /// Reserves a fresh, unused room code.
  createRoom(): string {
    for (let attempt = 0; attempt < 50; attempt++) {
      const code = this.generateCode();
      if (!this.rooms.has(code)) {
        this.rooms.set(code, new Map());
        return code;
      }
    }
    throw new Error('Could not allocate a free room code');
  }

  join(roomCode: string, participant: Participant): JoinResult {
    if (this.roomBySocket.has(participant.socketId)) return { ok: false, error: 'already_in_room' };
    const room = this.rooms.get(roomCode);
    if (!room) return { ok: false, error: 'not_found' };
    if (room.size >= MAX_PARTICIPANTS) return { ok: false, error: 'full' };

    const peers = [...room.values()];
    room.set(participant.socketId, participant);
    this.roomBySocket.set(participant.socketId, roomCode);
    return { ok: true, peers };
  }

  /// Removes the socket from its room. Empty rooms are deleted.
  leave(socketId: string): { roomCode: string; participant: Participant } | null {
    const roomCode = this.roomBySocket.get(socketId);
    if (!roomCode) return null;
    this.roomBySocket.delete(socketId);

    const room = this.rooms.get(roomCode);
    const participant = room?.get(socketId);
    room?.delete(socketId);
    if (room && room.size === 0) this.rooms.delete(roomCode);
    return participant ? { roomCode, participant } : null;
  }

  roomOf(socketId: string): string | undefined {
    return this.roomBySocket.get(socketId);
  }

  participant(socketId: string): Participant | undefined {
    const code = this.roomBySocket.get(socketId);
    return code ? this.rooms.get(code)?.get(socketId) : undefined;
  }

  /// Whether [uid] is in any call right now (on any device).
  hasUser(uid: string): boolean {
    for (const room of this.rooms.values()) {
      for (const p of room.values()) if (p.uid === uid) return true;
    }
    return false;
  }

  /// Everyone in [roomCode], in the order they joined (the creator first).
  participants(roomCode: string): Participant[] {
    return [...(this.rooms.get(roomCode)?.values() ?? [])];
  }

  /// Everyone else in the same room as [socketId].
  peersOf(socketId: string): Participant[] {
    const code = this.roomBySocket.get(socketId);
    if (!code) return [];
    return [...(this.rooms.get(code)?.values() ?? [])].filter((p) => p.socketId !== socketId);
  }

  updateLanguage(socketId: string, language: string): Participant | undefined {
    const p = this.participant(socketId);
    if (p) p.language = language;
    return p;
  }

  get roomCount(): number {
    return this.rooms.size;
  }
}

function defaultCode(): string {
  return `BOLO-${randomInt(1000, 10000)}`;
}
