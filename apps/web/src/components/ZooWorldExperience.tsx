'use client';

import React, { useMemo } from 'react';
import dynamic from 'next/dynamic';
import { InputController } from '@online-zoo/game-core';
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

export const ZooWorldExperience: React.FC = () => {
  const inputController = useMemo(() => new InputController(), []);
  const multiplayerOptions = useMemo(() => {
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL;
    return wsUrl ? { url: wsUrl } : undefined;
  }, []);

  return (
    <main
      className="relative h-screen w-screen select-none overflow-hidden"
      onContextMenu={(e) => e.preventDefault()}
      onDragStart={(e) => e.preventDefault()}
    >
      {/* 3D React Three Fiber + Rapier Runtime */}
      <DynamicZooGameCanvas
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
