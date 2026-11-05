import type { BetaFeedbackCategory, BetaFeedbackSeverity } from '../types';

export const PUBLIC_BETA_VERSION = '0.10.0-beta';

export const VALID_BETA_FEEDBACK_CATEGORIES: readonly BetaFeedbackCategory[] = [
  'bug',
  'performance',
  'usability',
  'suggestion',
  'safety'
];

export const VALID_BETA_FEEDBACK_SEVERITIES: readonly BetaFeedbackSeverity[] = [
  'low',
  'medium',
  'high'
];

export interface OnboardingControlTip {
  id: string;
  inputMode: 'desktop' | 'touch' | 'both';
  keysOrGesture: string;
  actionLabel: string;
  description: string;
}

export const ONBOARDING_CONTROL_TIPS: readonly OnboardingControlTip[] = [
  {
    id: 'move-desktop',
    inputMode: 'desktop',
    keysOrGesture: 'WASD / Arrow Keys + Shift',
    actionLabel: 'Walk & Sprint',
    description: 'Explore Panda Forest pathways and habitats; hold Shift to jog faster.'
  },
  {
    id: 'camera-desktop',
    inputMode: 'desktop',
    keysOrGesture: 'Mouse Drag / Scroll Wheel',
    actionLabel: 'Orbit & Zoom Camera',
    description: 'Drag to rotate your view around your explorer and scroll to zoom.'
  },
  {
    id: 'interact-desktop',
    inputMode: 'desktop',
    keysOrGesture: 'E Key / Click Prompts',
    actionLabel: 'Interact with Zoo',
    description: 'Observe animals, sit on benches, buy snacks at food stalls, or read info plaques.'
  },
  {
    id: 'move-touch',
    inputMode: 'touch',
    keysOrGesture: 'Left Virtual Joystick',
    actionLabel: 'Touch Movement',
    description: 'Drag the bottom-left thumbstick to walk smoothly in any direction.'
  },
  {
    id: 'camera-touch',
    inputMode: 'touch',
    keysOrGesture: 'Right-Side Touch Drag',
    actionLabel: 'Touch Camera Orbit',
    description: 'Swipe across the right side of the screen to look around the sanctuary.'
  },
  {
    id: 'social-both',
    inputMode: 'both',
    keysOrGesture: 'Enter / Social & HUD Buttons',
    actionLabel: 'Chat, Emotes & Zoo Passport',
    description: 'Chat with nearby visitors, trigger emotes (1–5), collect stamps, and join live events.'
  }
];

export interface KnownBetaLimitation {
  id: string;
  title: string;
  summary: string;
}

export const KNOWN_BETA_LIMITATIONS: readonly KnownBetaLimitation[] = [
  {
    id: 'limit-single-region',
    title: 'Single-Region Beta Authority',
    summary:
      'Multiplayer instances currently run on a single regional authority node; cross-continent visitors may notice higher ping.'
  },
  {
    id: 'limit-local-persistence',
    title: 'Browser-Scoped Profile Storage',
    summary:
      'Your Player ID, Zoo Coins, Food Bag, and Zoo Passport persist in browser local storage and sync to the live instance on join.'
  },
  {
    id: 'limit-initial-biome',
    title: 'Panda Forest Sanctuary Biome',
    summary:
      'Public Beta features the Panda Forest biome with Giant Pandas, Emperor Penguins, and River Otters; more habitats arrive post-beta.'
  },
  {
    id: 'limit-text-emote-safety',
    title: 'Moderated Proximity Text & Emotes Only',
    summary:
      'Voice chat is intentionally disabled during Public Beta to ensure visitor safety and family-friendly moderation.'
  }
];

export interface SupportedDeviceExpectation {
  platform: string;
  browsers: string;
  targetFps: string;
  notes: string;
}

export const SUPPORTED_DEVICE_EXPECTATIONS: readonly SupportedDeviceExpectation[] = [
  {
    platform: 'Desktop (Windows, macOS, Linux)',
    browsers: 'Chrome 115+, Edge 115+, Firefox 115+, Safari 16.4+',
    targetFps: '60 FPS (High / Medium Quality)',
    notes: 'WebGL 2.0 GPU; keyboard + mouse or trackpad.'
  },
  {
    platform: 'Mobile & Tablet (iOS / iPadOS / Android)',
    browsers: 'iOS Safari 16.4+, Android Chrome 115+',
    targetFps: '30–60 FPS (Adaptive Quality)',
    notes: 'Touchscreen >= 360x640; auto-steps down quality below 28 FPS.'
  }
];

export function isValidBetaFeedbackCategory(val: unknown): val is BetaFeedbackCategory {
  return (
    typeof val === 'string' &&
    (VALID_BETA_FEEDBACK_CATEGORIES as readonly string[]).includes(val)
  );
}

export function isValidBetaFeedbackSeverity(val: unknown): val is BetaFeedbackSeverity {
  return (
    typeof val === 'string' &&
    (VALID_BETA_FEEDBACK_SEVERITIES as readonly string[]).includes(val)
  );
}

export function validateBetaFeedbackInput(input: {
  category: unknown;
  severity: unknown;
  message: unknown;
}): {
  valid: boolean;
  category?: BetaFeedbackCategory;
  severity?: BetaFeedbackSeverity;
  normalizedMessage?: string;
  errorMessage?: string;
} {
  if (!isValidBetaFeedbackCategory(input.category)) {
    return { valid: false, errorMessage: 'Invalid feedback category.' };
  }
  if (!isValidBetaFeedbackSeverity(input.severity)) {
    return { valid: false, errorMessage: 'Invalid feedback severity.' };
  }
  if (typeof input.message !== 'string') {
    return { valid: false, errorMessage: 'Feedback description is required.' };
  }
  const normalized = input.message.replace(/\s+/g, ' ').trim();
  if (normalized.length < 5) {
    return {
      valid: false,
      errorMessage: 'Please enter at least 5 characters describing your feedback or issue.'
    };
  }
  if (normalized.length > 500) {
    return {
      valid: false,
      errorMessage: 'Feedback message cannot exceed 500 characters.'
    };
  }
  return {
    valid: true,
    category: input.category,
    severity: input.severity,
    normalizedMessage: normalized
  };
}

