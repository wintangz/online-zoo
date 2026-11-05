import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEFAULT_WS_PATH } from '@online-zoo/game-core';
import {
  createStandaloneGameServer,
  isOriginAllowed,
  parseAllowedOrigins,
  type StandaloneGameServerInstance,
  type StandaloneGameServerOptions
} from './httpServer';
import {
  attachMultiplayerWebSocketServer,
  InMemoryMultiplayerHub,
  MultiplayerServerHub,
  type AttachMultiplayerServerOptions
} from './multiplayerHub';
import {
  serializePlayerRecord,
  ZooInstanceAuthority,
  type ZooInstanceAuthorityOptions
} from './zooInstanceAuthority';

export {
  ZooInstanceAuthority,
  serializePlayerRecord,
  type ZooInstanceAuthorityOptions,
  MultiplayerServerHub,
  InMemoryMultiplayerHub,
  attachMultiplayerWebSocketServer,
  type AttachMultiplayerServerOptions,
  createStandaloneGameServer,
  parseAllowedOrigins,
  isOriginAllowed,
  type StandaloneGameServerOptions,
  type StandaloneGameServerInstance
};

const isDirectEntry = (() => {
  try {
    if (!process.argv[1]) return false;
    const currentFile = path.resolve(fileURLToPath(import.meta.url));
    const entryFile = path.resolve(process.argv[1]);
    return currentFile === entryFile;
  } catch {
    return false;
  }
})();

if (isDirectEntry) {
  const server = createStandaloneGameServer();
  const hostname = process.env.HOST ?? '0.0.0.0';
  server
    .listen(server.port, hostname)
    .then((boundPort) => {
      // eslint-disable-next-line no-console
      console.log(
        `> Online Zoo Game Server listening on http://${hostname}:${boundPort} (WS: ${DEFAULT_WS_PATH}, occupancy: /occupancy)`
      );
    })
    .catch((err) => {
      console.error('Failed to start Online Zoo Game Server:', err);
      process.exit(1);
    });
}

