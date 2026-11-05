import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { useStore } from 'zustand';
import * as THREE from 'three';
import {
  DEFAULT_AVATAR_APPEARANCE,
  FOOD_CATALOG_BY_ID,
  gameStore,
  mutableRuntimeState,
  type AvatarAppearance
} from '@online-zoo/game-core';
import { AvatarVisualRig } from './AvatarVisualRig';
import { applyAvatarProceduralPose } from './PlayerAvatarEntity';

export interface RemotePlayerAvatarProps {
  sessionId: string;
  displayName: string;
  accentColor: string;
  avatar?: AvatarAppearance;
}

/**
 * Pass-through 3D remote visitor avatar (`Clarification #2`, `FR-003`, `FR-008`–`FR-014`).
 * Reads interpolated transforms directly from `mutableRuntimeState.remotePlayers` inside `useFrame`
 * at 60–120 Hz and renders overhead speech bubbles, emote badges, and seated postures.
 */
export const RemotePlayerAvatar: React.FC<RemotePlayerAvatarProps> = ({
  sessionId,
  displayName,
  accentColor,
  avatar = DEFAULT_AVATAR_APPEARANCE
}) => {
  const remoteVisitor = useStore(
    gameStore,
    (s) => s.multiplayer.remoteVisitors[sessionId]
  );
  const remoteSpeechBubble = useStore(
    gameStore,
    (s) => s.social.activeSpeechBubbles[sessionId]
  );
  const remoteActiveEmote = useStore(
    gameStore,
    (s) => s.social.remoteActiveEmotes[sessionId] ?? s.multiplayer.remoteVisitors[sessionId]?.activeEmote ?? null
  );
  const remoteActiveConsumption = useStore(
    gameStore,
    (s) =>
      s.dining.remoteActiveConsumptions[sessionId] ??
      s.multiplayer.remoteVisitors[sessionId]?.activeConsumption ??
      null
  );
  const mutedPlayerIds = useStore(gameStore, (s) => s.social.mutedPlayerIds);
  const blockedPlayerIds = useStore(gameStore, (s) => s.social.blockedPlayerIds);

  const playerId = remoteVisitor?.playerId;
  const isSuppressed = Boolean(
    (playerId && (mutedPlayerIds.includes(playerId) || blockedPlayerIds.includes(playerId))) ||
      mutedPlayerIds.includes(sessionId) ||
      blockedPlayerIds.includes(sessionId)
  );

  const visibleSpeechBubble = isSuppressed ? undefined : remoteSpeechBubble;
  const visibleEmote = isSuppressed ? null : remoteActiveEmote;
  const visibleConsumption = isSuppressed ? null : remoteActiveConsumption;
  const seatedOn = remoteVisitor?.seatedOn ?? null;

  const visualGroupRef = useRef<THREE.Group>(null);
  const bodyAnimRef = useRef<THREE.Group>(null);
  const leftLegRef = useRef<THREE.Mesh>(null);
  const rightLegRef = useRef<THREE.Mesh>(null);
  const leftArmRef = useRef<THREE.Mesh>(null);
  const rightArmRef = useRef<THREE.Mesh>(null);

  const initialPos = useMemo<[number, number, number]>(() => {
    const entry = mutableRuntimeState.remotePlayers.get(sessionId);
    return entry ? [...entry.renderPosition] : [0, 0.1, 18];
  }, [sessionId]);

  useFrame(({ clock }) => {
    const remoteState = mutableRuntimeState.remotePlayers.get(sessionId);
    if (!remoteState) return;

    const t = clock.getElapsedTime();
    const { renderPosition, renderYaw, renderLocomotionState } = remoteState;
    const storeVisitor = gameStore.getState().multiplayer.remoteVisitors[sessionId];
    const storeEmote =
      gameStore.getState().social.remoteActiveEmotes[sessionId] ??
      storeVisitor?.activeEmote ??
      null;
    const storeConsumption =
      gameStore.getState().dining.remoteActiveConsumptions[sessionId] ??
      storeVisitor?.activeConsumption ??
      null;
    const storeSeated = storeVisitor?.seatedOn ?? null;

    if (visualGroupRef.current) {
      if (storeSeated) {
        visualGroupRef.current.position.set(
          storeSeated.seatPosition[0],
          storeSeated.seatPosition[1],
          storeSeated.seatPosition[2]
        );
        visualGroupRef.current.rotation.y = storeSeated.facingYaw;
      } else {
        visualGroupRef.current.position.set(
          renderPosition[0],
          renderPosition[1],
          renderPosition[2]
        );
        visualGroupRef.current.rotation.y = renderYaw;
      }
    }

    if (
      bodyAnimRef.current &&
      leftLegRef.current &&
      rightLegRef.current &&
      leftArmRef.current &&
      rightArmRef.current
    ) {
      applyAvatarProceduralPose(
        t,
        renderLocomotionState,
        isSuppressed ? null : storeEmote,
        storeSeated,
        bodyAnimRef.current,
        leftLegRef.current,
        rightLegRef.current,
        leftArmRef.current,
        rightArmRef.current,
        isSuppressed ? null : storeConsumption
      );
    }
  });

  return (
    <group
      ref={visualGroupRef}
      name={`remote-player-${sessionId}`}
      position={initialPos}
    >
      {/* Overhead Speech Bubble, Emote Badge & Visitor Nameplate (FR-003, FR-010, FR-013) */}
      <Html
        position={[0, 2.35, 0]}
        center
        zIndexRange={[10, 0]}
        style={{ pointerEvents: 'none', userSelect: 'none' }}
      >
        <div className="pointer-events-none flex flex-col items-center justify-center gap-1">
          {visibleSpeechBubble && (
            <div
              data-testid={`remote-speech-bubble-${sessionId}`}
              className="max-w-[220px] break-words rounded-2xl border border-amber-200/70 bg-white/95 px-3 py-1.5 text-center text-xs font-semibold leading-snug text-emerald-950 shadow-lg"
            >
              {visibleSpeechBubble.text}
            </div>
          )}

          {visibleEmote && (
            <div
              data-testid={`remote-emote-badge-${sessionId}`}
              data-emote-id={visibleEmote.emoteId}
              className="inline-flex items-center justify-center gap-1 whitespace-nowrap rounded-full border border-amber-300/60 bg-amber-500/90 px-2.5 py-0.5 text-center text-[11px] font-bold leading-none text-emerald-950 shadow"
            >
              <span>{visibleEmote.icon}</span>
              <span>{visibleEmote.label}</span>
            </div>
          )}

          {visibleConsumption && (
            <div
              data-testid={`remote-consumption-badge-${sessionId}`}
              data-food-item={visibleConsumption.itemId}
              data-food-category={visibleConsumption.category}
              className="inline-flex items-center justify-center gap-1 whitespace-nowrap rounded-full border border-lime-300/70 bg-emerald-700/95 px-2.5 py-0.5 text-center text-[11px] font-bold leading-none text-lime-100 shadow"
            >
              <span>{visibleConsumption.icon}</span>
              <span>
                {FOOD_CATALOG_BY_ID[visibleConsumption.itemId].gerundLabel}{' '}
                {visibleConsumption.label}
              </span>
            </div>
          )}

          <div
            data-testid={`remote-avatar-3d-badge-${sessionId}`}
            data-avatar-skin={avatar.skinTone}
            data-avatar-hairstyle={avatar.hairstyle}
            data-avatar-haircolor={avatar.hairColor}
            data-avatar-outfit={avatar.outfit}
            data-avatar-accessory={avatar.accessory}
            data-seated-prop={seatedOn?.objectId ?? ''}
            data-consuming-item={visibleConsumption?.itemId ?? ''}
            className="pointer-events-none inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-full border border-white/30 bg-emerald-950/85 px-3 py-1 text-center text-[11px] font-bold leading-none text-white shadow-md backdrop-blur-sm"
          >
            <span
              className="inline-block h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: accentColor }}
            />
            <span className="leading-none">{displayName}</span>
          </div>
        </div>
      </Html>

      <AvatarVisualRig
        appearance={avatar}
        fallbackAccentColor={accentColor}
        activeConsumption={visibleConsumption}
        bodyAnimRef={bodyAnimRef}
        leftLegRef={leftLegRef}
        rightLegRef={rightLegRef}
        leftArmRef={leftArmRef}
        rightArmRef={rightArmRef}
      />
    </group>
  );
};
