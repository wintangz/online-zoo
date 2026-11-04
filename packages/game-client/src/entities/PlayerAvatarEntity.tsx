import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { RigidBody, CapsuleCollider, type RapierRigidBody } from '@react-three/rapier';
import { useStore } from 'zustand';
import * as THREE from 'three';
import {
  gameStore,
  getOutfitColors,
  mutableRuntimeState,
   type ActiveAvatarEmote,
  type SeatedAttachmentState
} from '@online-zoo/game-core';
import { AvatarVisualRig } from './AvatarVisualRig';

export function applyAvatarProceduralPose(
  t: number,
  locomotionState: string,
  activeEmote: ActiveAvatarEmote | null | undefined,
  seatedOn: SeatedAttachmentState | null | undefined,
  bodyAnim: THREE.Group,
  leftLeg: THREE.Mesh,
  rightLeg: THREE.Mesh,
  leftArm: THREE.Mesh,
  rightArm: THREE.Mesh
): void {
  // Reset secondary axes
  bodyAnim.rotation.y = 0;
  bodyAnim.rotation.z = 0;
  leftArm.rotation.z = 0;
  rightArm.rotation.z = 0;

  if (seatedOn) {
    bodyAnim.position.y = -0.22;
    bodyAnim.rotation.x = -0.04;
    leftLeg.rotation.x = -1.35;
    rightLeg.rotation.x = -1.35;
    leftArm.rotation.x = -0.35;
    rightArm.rotation.x = -0.35;

    if (activeEmote?.emoteId === 'wave') {
      rightArm.rotation.x = -2.35;
      rightArm.rotation.z = Math.sin(t * 10.0) * 0.35;
    } else if (activeEmote?.emoteId === 'clap') {
      leftArm.rotation.x = -1.35;
      rightArm.rotation.x = -1.35;
      leftArm.rotation.z = Math.abs(Math.sin(t * 12.0)) * 0.25;
      rightArm.rotation.z = -Math.abs(Math.sin(t * 12.0)) * 0.25;
    } else if (activeEmote?.emoteId === 'laugh') {
      bodyAnim.position.y = -0.22 + Math.abs(Math.sin(t * 14.0)) * 0.045;
      bodyAnim.rotation.x = Math.sin(t * 14.0) * 0.1;
    }
    return;
  }

  if (activeEmote && locomotionState === 'Idle') {
    switch (activeEmote.emoteId) {
      case 'wave':
        bodyAnim.position.y = Math.sin(t * 3.0) * 0.03;
        bodyAnim.rotation.x = 0;
        leftLeg.rotation.x = 0;
        rightLeg.rotation.x = 0;
        leftArm.rotation.x = Math.sin(t * 2.0) * 0.05;
        rightArm.rotation.x = -2.45;
        rightArm.rotation.z = Math.sin(t * 10.0) * 0.38;
        return;

      case 'dance':
        bodyAnim.position.y = Math.abs(Math.sin(t * 9.0)) * 0.14;
        bodyAnim.rotation.y = Math.sin(t * 4.5) * 0.35;
        bodyAnim.rotation.z = Math.cos(t * 4.5) * 0.08;
        leftLeg.rotation.x = Math.sin(t * 9.0) * 0.65;
        rightLeg.rotation.x = -Math.sin(t * 9.0) * 0.65;
        leftArm.rotation.x = -1.6 + Math.sin(t * 9.0) * 0.55;
        rightArm.rotation.x = -1.6 - Math.sin(t * 9.0) * 0.55;
        return;

      case 'clap':
        bodyAnim.position.y = Math.abs(Math.sin(t * 6.0)) * 0.04;
        bodyAnim.rotation.x = 0.04;
        leftLeg.rotation.x = 0;
        rightLeg.rotation.x = 0;
        leftArm.rotation.x = -1.35;
        rightArm.rotation.x = -1.35;
        leftArm.rotation.z = Math.abs(Math.sin(t * 12.0)) * 0.28;
        rightArm.rotation.z = -Math.abs(Math.sin(t * 12.0)) * 0.28;
        return;

      case 'laugh':
        bodyAnim.position.y = Math.abs(Math.sin(t * 14.0)) * 0.06;
        bodyAnim.rotation.x = Math.sin(t * 14.0) * 0.12;
        leftLeg.rotation.x = 0;
        rightLeg.rotation.x = 0;
        leftArm.rotation.x = -0.65 + Math.sin(t * 14.0) * 0.15;
        rightArm.rotation.x = -0.65 + Math.sin(t * 14.0) * 0.15;
        return;

      case 'sit':
        bodyAnim.position.y = -0.24;
        bodyAnim.rotation.x = -0.05;
        leftLeg.rotation.x = -1.35;
        rightLeg.rotation.x = -1.35;
        leftArm.rotation.x = -0.35;
        rightArm.rotation.x = -0.35;
        return;
    }
  }

  if (locomotionState === 'Idle') {
    bodyAnim.position.y = Math.sin(t * 2.4) * 0.025;
    bodyAnim.rotation.x = 0;
    leftLeg.rotation.x = 0;
    rightLeg.rotation.x = 0;
    leftArm.rotation.x = Math.sin(t * 2.0) * 0.04;
    rightArm.rotation.x = -Math.sin(t * 2.0) * 0.04;
  } else if (locomotionState === 'Walking') {
    const freq = 8.5;
    bodyAnim.position.y = Math.abs(Math.sin(t * freq)) * 0.055;
    bodyAnim.rotation.x = 0.06;
    leftLeg.rotation.x = Math.sin(t * freq) * 0.55;
    rightLeg.rotation.x = -Math.sin(t * freq) * 0.55;
    leftArm.rotation.x = -Math.sin(t * freq) * 0.45;
    rightArm.rotation.x = Math.sin(t * freq) * 0.45;
  } else if (locomotionState === 'Running') {
    const freq = 14.0;
    bodyAnim.position.y = Math.abs(Math.sin(t * freq)) * 0.095;
    bodyAnim.rotation.x = 0.16;
    leftLeg.rotation.x = Math.sin(t * freq) * 0.92;
    rightLeg.rotation.x = -Math.sin(t * freq) * 0.92;
    leftArm.rotation.x = -Math.sin(t * freq) * 0.85;
    rightArm.rotation.x = Math.sin(t * freq) * 0.85;
  } else if (locomotionState === 'Jumping') {
    bodyAnim.position.y = 0.08;
    bodyAnim.rotation.x = -0.05;
    leftLeg.rotation.x = -0.35;
    rightLeg.rotation.x = 0.25;
    leftArm.rotation.x = -0.65;
    rightArm.rotation.x = -0.65;
  }
}

export const PlayerAvatarEntity: React.FC = () => {
  const confirmedProfile = useStore(gameStore, (s) => s.identity.profile);
  const draftState = useStore(gameStore, (s) => s.identity.draft);
  const localSessionId = useStore(gameStore, (s) => s.multiplayer.localSessionId);
  const mpLocalDisplayName = useStore(gameStore, (s) => s.multiplayer.localDisplayName);
  const mpLocalAccentColor = useStore(gameStore, (s) => s.multiplayer.localAccentColor);
  const activeSpeechBubbles = useStore(gameStore, (s) => s.social.activeSpeechBubbles);
  const localActiveEmote = useStore(gameStore, (s) => s.social.localActiveEmote);
  const localSeatedState = useStore(gameStore, (s) => s.social.localSeatedState);

  const activeAppearance = draftState.isOpen ? draftState.avatar : confirmedProfile.avatar;
  const activeDisplayName = confirmedProfile.isCustomized
    ? confirmedProfile.displayName
    : mpLocalDisplayName ?? confirmedProfile.displayName;
  const localAccentColor =
    mpLocalAccentColor ?? getOutfitColors(activeAppearance.outfit).accent;

  const localSpeechBubble =
    (localSessionId ? activeSpeechBubbles[localSessionId] : undefined) ??
    activeSpeechBubbles['local-session'];

  const rigidBodyRef = useRef<RapierRigidBody>(null);
  const visualGroupRef = useRef<THREE.Group>(null);
  const bodyAnimRef = useRef<THREE.Group>(null);
  const leftLegRef = useRef<THREE.Mesh>(null);
  const rightLegRef = useRef<THREE.Mesh>(null);
  const leftArmRef = useRef<THREE.Mesh>(null);
  const rightArmRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const { position, facingYaw, locomotionState } = mutableRuntimeState.avatar;
    const socialState = gameStore.getState().social;

    if (rigidBodyRef.current) {
      rigidBodyRef.current.setNextKinematicTranslation({
        x: position[0],
        y: position[1] + 0.9,
        z: position[2]
      });
    }

    if (visualGroupRef.current) {
      visualGroupRef.current.position.set(position[0], position[1], position[2]);
      visualGroupRef.current.rotation.y = facingYaw;
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
        locomotionState,
        socialState.localActiveEmote,
        socialState.localSeatedState,
        bodyAnimRef.current,
        leftLegRef.current,
        rightLegRef.current,
        leftArmRef.current,
        rightArmRef.current
      );
    }
  });

  return (
    <>
      <RigidBody
        ref={rigidBodyRef}
        type="kinematicPosition"
        colliders={false}
        position={[0, 1.0, 18]}
        name="player-avatar-body"
      >
        <CapsuleCollider args={[0.45, 0.45]} />
      </RigidBody>

      <group ref={visualGroupRef} name="player-avatar-visual" position={[0, 0.1, 18]}>
        {/* Overhead Speech Bubble, Emote Badge & Local Player Nameplate (FR-003, FR-010, FR-013) */}
        <Html
          position={[0, 2.35, 0]}
          center
          zIndexRange={[10, 0]}
          style={{ pointerEvents: 'none', userSelect: 'none' }}
        >
          <div className="pointer-events-none flex flex-col items-center justify-center gap-1">
            {localSpeechBubble && (
              <div
                data-testid="local-speech-bubble"
                className="max-w-[220px] break-words rounded-2xl border border-amber-200/70 bg-white/95 px-3 py-1.5 text-center text-xs font-semibold leading-snug text-emerald-950 shadow-lg"
              >
                {localSpeechBubble.text}
              </div>
            )}

            {localActiveEmote && (
              <div
                data-testid="local-emote-badge"
                data-emote-id={localActiveEmote.emoteId}
                className="inline-flex items-center justify-center gap-1 whitespace-nowrap rounded-full border border-amber-300/60 bg-amber-500/90 px-2.5 py-0.5 text-center text-[11px] font-bold leading-none text-emerald-950 shadow"
              >
                <span>{localActiveEmote.icon}</span>
                <span>{localActiveEmote.label}</span>
              </div>
            )}

            <div
              data-testid="local-avatar-nameplate"
              data-avatar-skin={activeAppearance.skinTone}
              data-avatar-hairstyle={activeAppearance.hairstyle}
              data-avatar-haircolor={activeAppearance.hairColor}
              data-avatar-outfit={activeAppearance.outfit}
              data-avatar-accessory={activeAppearance.accessory}
              data-seated-prop={localSeatedState?.objectId ?? ''}
              className="pointer-events-none inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-full border border-emerald-300/45 bg-emerald-950/85 px-3 py-1 text-center text-[11px] font-bold leading-none text-emerald-100 shadow-md backdrop-blur-sm"
            >
              <span
                className="inline-block h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: localAccentColor }}
              />
              <span className="leading-none">{activeDisplayName}</span>
            </div>
          </div>
        </Html>

        <AvatarVisualRig
          appearance={activeAppearance}
          fallbackAccentColor={localAccentColor}
          bodyAnimRef={bodyAnimRef}
          leftLegRef={leftLegRef}
          rightLegRef={rightLegRef}
          leftArmRef={leftArmRef}
          rightArmRef={rightArmRef}
        />
      </group>
    </>
  );
};
