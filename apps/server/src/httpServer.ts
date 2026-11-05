import { createServer, type IncomingMessage, type Server as HttpServer, type ServerResponse } from 'node:http';
import { DEFAULT_SERVER_PORT, DEFAULT_WS_PATH } from '@online-zoo/game-core';
import {
  attachMultiplayerWebSocketServer,
  MultiplayerServerHub
} from './multiplayerHub';
import { ZooInstanceAuthority, type ZooInstanceAuthorityOptions } from './zooInstanceAuthority';

export interface StandaloneGameServerOptions {
  port?: number;
  wsPath?: string;
  allowedOrigins?: string[] | string;
  authority?: ZooInstanceAuthority;
  authorityOptions?: ZooInstanceAuthorityOptions;
}

export interface StandaloneGameServerInstance {
  httpServer: HttpServer;
  authority: ZooInstanceAuthority;
  hub: MultiplayerServerHub;
  port: number;
  allowedOrigins: string[];
  listen: (port?: number, hostname?: string) => Promise<number>;
  close: () => Promise<void>;
}

export function parseAllowedOrigins(raw?: string | string[]): string[] {
  if (Array.isArray(raw)) {
    const cleaned = raw.map((item) => item.trim()).filter(Boolean);
    return cleaned.length > 0 ? cleaned : ['*'];
  }
  if (typeof raw !== 'string' || raw.trim().length === 0) {
    return ['*'];
  }
  const parts = raw
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
  return parts.length > 0 ? parts : ['*'];
}

export function isOriginAllowed(
  origin: string | undefined,
  allowedOrigins: string[]
): boolean {
  if (allowedOrigins.includes('*')) {
    return true;
  }
  if (!origin) {
    return false;
  }
  const normalizedOrigin = origin.trim().toLowerCase();
  return allowedOrigins.some((allowed) => allowed.trim().toLowerCase() === normalizedOrigin);
}

function applyCorsHeaders(
  req: IncomingMessage,
  res: ServerResponse,
  allowedOrigins: string[]
): boolean {
  const origin = typeof req.headers.origin === 'string' ? req.headers.origin : undefined;
  if (allowedOrigins.includes('*')) {
    res.setHeader('Access-Control-Allow-Origin', origin ?? '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return true;
  }

  if (origin) {
    if (!isOriginAllowed(origin, allowedOrigins)) {
      return false;
    }
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  return true;
}

export function createStandaloneGameServer(
  options: StandaloneGameServerOptions = {}
): StandaloneGameServerInstance {
  const envPort = process.env.PORT ? Number.parseInt(process.env.PORT, 10) : undefined;
  const port =
    options.port ??
    (envPort !== undefined && Number.isFinite(envPort) ? envPort : DEFAULT_SERVER_PORT);
  const allowedOrigins = parseAllowedOrigins(
    options.allowedOrigins ?? process.env.ALLOWED_ORIGINS
  );
  const authority =
    options.authority ?? new ZooInstanceAuthority(options.authorityOptions);
  const hub = new MultiplayerServerHub(authority);

  const httpServer = createServer((req, res) => {
    const corsAllowed = applyCorsHeaders(req, res, allowedOrigins);
    if (!corsAllowed) {
      res.writeHead(403, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: 'Origin not allowed' }));
      return;
    }

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const pathname = new URL(req.url ?? '/', 'http://localhost').pathname;
    if (
      req.method === 'GET' &&
      (pathname === '/occupancy' || pathname === '/api/occupancy' || pathname === '/health')
    ) {
      const snapshot = authority.buildOccupancySnapshot(Date.now());
      res.writeHead(200, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store'
      });
      res.end(JSON.stringify(snapshot));
      return;
    }

    res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ error: 'Not Found' }));
  });

  const wsAttachment = attachMultiplayerWebSocketServer(httpServer, {
    path: options.wsPath ?? DEFAULT_WS_PATH,
    authority,
    hub,
    isOriginAllowed: (origin) => isOriginAllowed(origin, allowedOrigins)
  });

  return {
    httpServer,
    authority,
    hub,
    port,
    allowedOrigins,
    listen: (listenPort = port, hostname = '0.0.0.0') =>
      new Promise<number>((resolve, reject) => {
        const onError = (err: Error) => {
          httpServer.off('error', onError);
          reject(err);
        };
        httpServer.once('error', onError);
        httpServer.listen(listenPort, hostname, () => {
          httpServer.off('error', onError);
          const addr = httpServer.address();
          const boundPort =
            typeof addr === 'object' && addr !== null ? addr.port : listenPort;
          resolve(boundPort);
        });
      }),
    close: () =>
      new Promise<void>((resolve, reject) => {
        wsAttachment.close();
        if (!httpServer.listening) {
          resolve();
          return;
        }
        httpServer.close((err) => {
          if (err) reject(err);
          else resolve();
        });
      })
  };
}

