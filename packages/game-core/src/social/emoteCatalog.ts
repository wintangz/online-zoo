import type { EmoteDescriptor, EmoteId } from '../types';

export const EMOTE_CATALOG: readonly EmoteDescriptor[] = [
  {
    id: 'wave',
    label: 'Wave',
    icon: '👋',
    durationMs: 3500
  },
  {
    id: 'dance',
    label: 'Dance',
    icon: '💃',
    durationMs: 4500
  },
  {
    id: 'clap',
    label: 'Clap',
    icon: '👏',
    durationMs: 3500
  },
  {
    id: 'laugh',
    label: 'Laugh',
    icon: '😄',
    durationMs: 3500
  },
  {
    id: 'sit',
    label: 'Sit / Relax',
    icon: '🧘',
    durationMs: 6000
  }
] as const;

export const VALID_EMOTE_IDS: readonly EmoteId[] = EMOTE_CATALOG.map((e) => e.id);

export function isValidEmoteId(value: unknown): value is EmoteId {
  return typeof value === 'string' && (VALID_EMOTE_IDS as readonly string[]).includes(value);
}

const DEFAULT_EMOTE_DESCRIPTOR: EmoteDescriptor = {
  id: 'wave',
  label: 'Wave',
  icon: '👋',
  durationMs: 3500
};

export function getEmoteDescriptor(emoteId: EmoteId): EmoteDescriptor {
  return EMOTE_CATALOG.find((e) => e.id === emoteId) ?? DEFAULT_EMOTE_DESCRIPTOR;
}

