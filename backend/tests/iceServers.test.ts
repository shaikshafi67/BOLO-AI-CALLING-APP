import { iceServersFromEnv } from '../src/websocket/iceServers';

describe('iceServersFromEnv', () => {
  test('uses public STUN only when no TURN server is configured', () => {
    const servers = iceServersFromEnv({});
    expect(servers).toHaveLength(1);
    expect(JSON.stringify(servers[0].urls)).toContain('stun:');
  });

  test('adds the configured TURN servers with their credentials', () => {
    const servers = iceServersFromEnv({
      TURN_SERVER_URL: 'turn:turn.example.com:3478, turns:turn.example.com:5349',
      TURN_USERNAME: 'bolo',
      TURN_PASSWORD: 'secret',
    });
    expect(servers[1]).toEqual({
      urls: ['turn:turn.example.com:3478', 'turns:turn.example.com:5349'],
      username: 'bolo',
      credential: 'secret',
    });
  });
});
