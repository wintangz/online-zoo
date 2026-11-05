'use client';

import React, { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import {
  DEFAULT_ENTRY_ROOM_ID,
  DEFAULT_ENTRY_ZONE_ID,
  gameStore,
  getLayoutForRoomId,
  InputController
} from '@online-zoo/game-core';
import {
  AnimalSimulationOverlay,
  AvatarCustomizerModal,
  BetaReadinessOverlay,
  EntryLoadingScreen,
  EventsAndActivitiesOverlay,
  FoodAndDiningOverlay,
  GameHudOverlay,
  InfoPlaqueModal,
  InteractionPromptBanner,
  MainMenuScreen,
  type MainMenuPlayPayload,
  SettingsMenuModal,
  SocialInteractionOverlay,
  TouchControlsOverlay,
  ZooPassportOverlay
} from '@online-zoo/ui';

const DynamicZooGameCanvas = dynamic(
  () => import('@online-zoo/game-client').then((mod) => mod.ZooGameCanvas),
  { ssr: false }
);

function getExplicitRoomParam(): string | null {
  if (typeof window === 'undefined' || !window.location) {
    return null;
  }
  try {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam && /^[a-zA-Z0-9_-]{1,48}$/.test(roomParam)) {
      return roomParam;
    }
  } catch {
    // Ignore URL parse errors
  }
  return null;
}

export const ZooWorldExperience: React.FC = () => {
  const inputController = useMemo(() => new InputController(), []);
  const explicitRoomId = useMemo(() => getExplicitRoomParam(), []);
  const wsUrl = process.env.NEXT_PUBLIC_WS_URL;
  const [activePlaySession, setActivePlaySession] = useState<MainMenuPlayPayload | null>(null);

  // Preload ONLY the lobby zone's assets at menu time
  useEffect(() => {
    void import('@online-zoo/game-client').then((mod) => {
      mod.preloadZoneGlbAssets(DEFAULT_ENTRY_ZONE_ID);
    });
  }, []);

  const initialSpawn = useMemo<[number, number, number]>(() => {
    const roomId = activePlaySession?.roomId ?? DEFAULT_ENTRY_ROOM_ID;
    return [...getLayoutForRoomId(roomId).spawnPosition];
  }, [activePlaySession?.roomId]);

  const multiplayerOptions = useMemo(() => {
    const roomId = activePlaySession?.roomId ?? DEFAULT_ENTRY_ROOM_ID;
    return {
      ...(wsUrl ? { url: wsUrl } : {}),
      roomId,
      alwaysSpawnInLobby: roomId === DEFAULT_ENTRY_ROOM_ID
    };
  }, [activePlaySession?.roomId, wsUrl]);

  const handlePlayFromMenu = (payload: MainMenuPlayPayload) => {
    void import('@online-zoo/game-client').then((mod) => {
      mod.preloadZoneGlbAssets(payload.zoneId);
    });
    const st = gameStore.getState();
    st.setCurrentZoneId(payload.zoneId);
    st.updateMultiplayerState({ roomId: payload.roomId });
    st.setPhase('loading');
    setActivePlaySession(payload);
  };

  return (
    <main
      className="relative h-screen w-screen select-none overflow-hidden"
      onContextMenu={(e) => e.preventDefault()}
      onDragStart={(e) => e.preventDefault()}
    >
      {!activePlaySession ? (
        <>
          <MainMenuScreen
            {...(wsUrl ? { wsUrl } : {})}
            sharedRoomParam={explicitRoomId}
            onPlay={handlePlayFromMenu}
          />
          <SettingsMenuModal />
          <AvatarCustomizerModal />
        </>
      ) : (
        <>
          {/* 3D React Three Fiber + Rapier Runtime (mounted only after clicking PLAY) */}
          <DynamicZooGameCanvas
            initialSpawn={initialSpawn}
            inputController={inputController}
            multiplayerOptions={multiplayerOptions}
            onReady={() => {
              gameStore.getState().setPhase('playing');
            }}
          />

          {/* 2D React + Tailwind Overlays */}
          <EntryLoadingScreen />
          <GameHudOverlay />
          <EventsAndActivitiesOverlay />
          <ZooPassportOverlay />
          <AnimalSimulationOverlay />
          <FoodAndDiningOverlay />
          <SocialInteractionOverlay />
          <TouchControlsOverlay inputController={inputController} />
          <InteractionPromptBanner inputController={inputController} />
          <InfoPlaqueModal />
          <SettingsMenuModal />
          <AvatarCustomizerModal />
          <BetaReadinessOverlay />
        </>
      )}
    </main>
  );
};
