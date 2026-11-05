import { afterEach, describe, expect, it } from 'vitest';
import { WebSocket } from 'ws';
import {
  DEFAULT_ROOM_ID,
  resolveServerHttpBaseUrl,
  resolveWebSocketServerUrl,
  type OccupancySnapshotResponse,
  type ServerMultiplayerMessage
} from '@online-zoo/game-core';
import {
  createStandaloneGameServer,
  isOriginAllowed,
  parseAllowedOrigins,
  type StandaloneGameServerInstance
} from '../src';

describe('Standalone Game Server (@online-zoo/server) — web-server-split', () => {
  let activeServer: StandaloneGameServerInstance | null = null;

  afterEach(async () => {
    if (activeServer) {
      await activeServer.close();
      activeServer = null;
    }
  });

  it('resolves NEXT_PUBLIC_WS_URL and derives HTTP base URL with local-dev fallback to port 4000', () => {
    expect(resolveWebSocketServerUrl(DEFAULT_ROOM_ID, '')).toBe(
      `ws://localhost:4000/ws/zoo?room=${DEFAULT_ROOM_ID}`
    );
    expect(
      resolveWebSocketServerUrl(DEFAULT_ROOM_ID, 'wss://zoo-server.example.com/ws/zoo')
    ).toBe(`wss://zoo-server.example.com/ws/zoo?room=${DEFAULT_ROOM_ID}`);
    expect(resolveWebSocketServerUrl('panda-forest-2', 'ws://127.0.0.1:4100/ws/zoo')).toBe(
      'ws://127.0.0.1:4100/ws/zoo?room=panda-forest-2'
    );

    expect(resolveServerHttpBaseUrl('ws://localhost:4000/ws/zoo')).toBe('http://localhost:4000');
    expect(resolveServerHttpBaseUrl('wss://zoo-server.example.com/ws/zoo')).toBe(
      'https://zoo-server.example.com'
    );
  });

  it('parses ALLOWED_ORIGINS and validates origin matching', () => {
    expect(parseAllowedOrigins(undefined)).toEqual(['*']);
    expect(parseAllowedOrigins('http://localhost:3000, https://zoo.example.com ')).toEqual([
      'http://localhost:3000',
      'https://zoo.example.com'
    ]);
    expect(isOriginAllowed('http://evil.example.com', ['*'])).toBe(true);
    expect(
      isOriginAllowed('http://localhost:3000', [
        'http://localhost:3000',
        'https://zoo.example.com'
      ])
    ).toBe(true);
    expect(
      isOriginAllowed('http://evil.example.com', [
        'http://localhost:3000',
        'https://zoo.example.com'
      ])
    ).toBe(false);
  });

  it('serves live occupancy JSON on /occupancy and /api/occupancy, and 404s on web page/asset routes', async () => {
    activeServer = createStandaloneGameServer({ port: 0 });
    const port = await activeServer.listen(0, '127.0.0.1');
    const baseUrl = `http://127.0.0.1:${port}`;

    const initialRes = await fetch(`${baseUrl}/occupancy`);
    expect(initialRes.status).toBe(200);
    const initialBody = (await initialRes.json()) as OccupancySnapshotResponse;
    expect(initialBody.status).toBe('ok');
    expect(initialBody.totalPlayers).toBe(0);
    expect(initialBody.zones.some((z) => z.roomId === DEFAULT_ROOM_ID)).toBe(true);

    // Join a player directly in authority and re-verify live occupancy
    activeServer.authority.joinOrResumePlayer({
      requestedRoomId: DEFAULT_ROOM_ID,
      playerId: 'player-occ-1',
      displayName: 'BambooScout'
    });

    const aliasRes = await fetch(`${baseUrl}/api/occupancy`);
    expect(aliasRes.status).toBe(200);
    const aliasBody = (await aliasRes.json()) as OccupancySnapshotResponse;
    expect(aliasBody.totalPlayers).toBe(1);
    const defaultRoom = aliasBody.rooms.find((r) => r.roomId === DEFAULT_ROOM_ID);
    expect(defaultRoom?.visitorCount).toBe(1);

    // Web page and asset routes must return 404
    const rootRes = await fetch(`${baseUrl}/`);
    expect(rootRes.status).toBe(404);
    const assetRes = await fetch(`${baseUrl}/assets/models/visitor-avatar.glb`);
    expect(assetRes.status).toBe(404);
  });

  it('enforces ALLOWED_ORIGINS on both HTTP CORS requests and WebSocket upgrades', async () => {
    activeServer = createStandaloneGameServer({
      port: 0,
      allowedOrigins: 'http://localhost:3000'
    });
    const port = await activeServer.listen(0, '127.0.0.1');
    const baseUrl = `http://127.0.0.1:${port}`;

    const allowedHttp = await fetch(`${baseUrl}/occupancy`, {
      headers: { Origin: 'http://localhost:3000' }
    });
    expect(allowedHttp.status).toBe(200);
    expect(allowedHttp.headers.get('access-control-allow-origin')).toBe('http://localhost:3000');

    const blockedHttp = await fetch(`${baseUrl}/occupancy`, {
      headers: { Origin: 'http://disallowed.example.com' }
    });
    expect(blockedHttp.status).toBe(403);

    // Disallowed WebSocket origin must be rejected on upgrade
    await expect(
      new Promise<void>((resolve, reject) => {
        const ws = new WebSocket(`ws://127.0.0.1:${port}/ws/zoo`, {
          headers: { Origin: 'http://disallowed.example.com' }
        });
        ws.on('open', () => {
          ws.close();
          resolve();
        });
        ws.on('error', (err) => {
          reject(err);
        });
      })
    ).rejects.toThrow();

    // Allowed WebSocket origin succeeds and receives welcome_snapshot
    const welcome = await new Promise<ServerMultiplayerMessage>((resolve, reject) => {
      const ws = new WebSocket(`ws://127.0.0.1:${port}/ws/zoo`, {
        headers: { Origin: 'http://localhost:3000' }
      });
      ws.on('open', () => {
        ws.send(
          JSON.stringify({
            type: 'join_instance',
            roomId: DEFAULT_ROOM_ID,
            playerId: 'player-ws-origin-ok',
            displayName: 'OriginTester'
          })
        );
      });
      ws.on('message', (raw) => {
        const msg = JSON.parse(raw.toString('utf8')) as ServerMultiplayerMessage;
        if (msg.type === 'welcome_snapshot') {
          ws.close();
          resolve(msg);
        }
      });
      ws.on('error', reject);
    });

    expect(welcome.type).toBe('welcome_snapshot');
    if (welcome.type === 'welcome_snapshot') {
      expect(welcome.roomId).toBe(DEFAULT_ROOM_ID);
      expect(welcome.displayName).toBe('OriginTester');
    }
  });
});
