'use client';

import React, { useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import {
  DEFAULT_ENTRY_ROOM_ID,
  gameStore,
  getLayoutForRoomId,
  InputController,
  resolveZoneForRoomId,
  ZOO_LOBBY_LAYOUT
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
  const effectiveEntryRoomId = explicitRoomId ?? DEFAULT_ENTRY_ROOM_ID;
  const initialSpawn = useMemo<[number, number, number]>(() => {
    if (explicitRoomId) {
      return [...getLayoutForRoomId(explicitRoomId).spawnPosition];
    }
    return [...ZOO_LOBBY_LAYOUT.spawnPosition];
  }, [explicitRoomId]);

  const multiplayerOptions = useMemo(() => {
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL;
    return {
      ...(wsUrl ? { url: wsUrl } : {}),
      roomId: effectiveEntryRoomId,
      alwaysSpawnInLobby: !explicitRoomId
    };
  }, [effectiveEntryRoomId, explicitRoomId]);

  useEffect(() => {
    const entryZone = resolveZoneForRoomId(effectiveEntryRoomId);
    gameStore.getState().setCurrentZoneId(entryZone.zoneId);
    gameStore.getState().updateMultiplayerState({ roomId: effectiveEntryRoomId });
  }, [effectiveEntryRoomId]);

  return (
    <main
      className="relative h-screen w-screen select-none overflow-hidden"
      onContextMenu={(e) => e.preventDefault()}
      onDragStart={(e) => e.preventDefault()}
    >
      {/* 3D React Three Fiber + Rapier Runtime */}
      <DynamicZooGameCanvas
        initialSpawn={initialSpawn}
        inputController={inputController}
        multiplayerOptions={multiplayerOptions}
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
    </main>
  );
};
