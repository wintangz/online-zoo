import React from 'react';
import { useStore } from 'zustand';
import { gameStore } from '@online-zoo/game-core';
import { RemotePlayerAvatar } from './RemotePlayerAvatar';

/**
 * Mounts `<RemotePlayerAvatar />` instances for all currently connected remote visitors in the room (`FR-004`, `FR-005`).
 */
export const RemotePlayersLayer: React.FC = () => {
  const remoteVisitors = useStore(gameStore, (s) => s.multiplayer.remoteVisitors);
  const visitorsList = Object.values(remoteVisitors);

  if (visitorsList.length === 0) {
    return null;
  }

  return (
    <group name="remote-players-layer">
      {visitorsList.map((visitor) => (
        <RemotePlayerAvatar
          key={visitor.sessionId}
          sessionId={visitor.sessionId}
          displayName={visitor.displayName}
          accentColor={visitor.accentColor}
          {...(visitor.avatar !== undefined ? { avatar: visitor.avatar } : {})}
        />
      ))}
    </group>
  );
};

