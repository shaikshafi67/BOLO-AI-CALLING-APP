import { MAX_PARTICIPANTS, Participant, ROOM_CODE_PATTERN, RoomManager } from '../src/websocket/roomManager';

const person = (n: number, language = 'en'): Participant => ({ socketId: `s${n}`, uid: `u${n}`, name: `User ${n}`, language });

describe('RoomManager', () => {
  test('creates room codes in the BOLO-1234 format', () => {
    const rooms = new RoomManager();
    expect(rooms.createRoom()).toMatch(ROOM_CODE_PATTERN);
  });

  test('never hands out a code that is already in use', () => {
    const codes = ['BOLO-1111', 'BOLO-1111', 'BOLO-2222'];
    const rooms = new RoomManager(() => codes.shift()!);
    expect(rooms.createRoom()).toBe('BOLO-1111');
    expect(rooms.createRoom()).toBe('BOLO-2222');
  });

  test('second participant sees the first as a peer', () => {
    const rooms = new RoomManager();
    const code = rooms.createRoom();
    expect(rooms.join(code, person(1))).toEqual({ ok: true, peers: [] });
    const second = rooms.join(code, person(2));
    expect(second.ok && second.peers.map((p) => p.uid)).toEqual(['u1']);
    expect(rooms.peersOf('s1').map((p) => p.uid)).toEqual(['u2']);
  });

  test('rejects unknown rooms, full rooms and double joins', () => {
    const rooms = new RoomManager();
    expect(rooms.join('BOLO-0000', person(1))).toEqual({ ok: false, error: 'not_found' });

    const code = rooms.createRoom();
    for (let i = 1; i <= MAX_PARTICIPANTS; i++) rooms.join(code, person(i));
    expect(rooms.join(code, person(9))).toEqual({ ok: false, error: 'full' });
    expect(rooms.join(code, person(1))).toEqual({ ok: false, error: 'already_in_room' });
  });

  test('leaving removes the participant and deletes empty rooms', () => {
    const rooms = new RoomManager();
    const code = rooms.createRoom();
    rooms.join(code, person(1));
    rooms.join(code, person(2));

    expect(rooms.leave('s1')?.participant.uid).toBe('u1');
    expect(rooms.peersOf('s2')).toEqual([]);
    expect(rooms.roomCount).toBe(1);

    rooms.leave('s2');
    expect(rooms.roomCount).toBe(0);
    expect(rooms.leave('s2')).toBeNull();
  });

  test('updates a participant language', () => {
    const rooms = new RoomManager();
    const code = rooms.createRoom();
    rooms.join(code, person(1, 'hi'));
    rooms.updateLanguage('s1', 'te');
    expect(rooms.participant('s1')?.language).toBe('te');
  });
});
