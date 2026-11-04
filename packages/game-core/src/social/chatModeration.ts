import type { ChatValidationResult } from '../types';

export const PROXIMITY_CHAT_RANGE_METERS = 24.0;
export const MAX_CHAT_MESSAGE_LENGTH = 140;
export const SPEECH_BUBBLE_DURATION_MS = 6000;
export const CHAT_RATE_WINDOW_MS = 6000;
export const CHAT_MAX_MESSAGES_PER_WINDOW = 4;
export const CHAT_MIN_INTERVAL_MS = 1000;
export const MAX_CHAT_HISTORY_ENTRIES = 50;

const BLOCKED_CHAT_PROFANITY_TERMS: readonly string[] = [
  'fuck',
  'shit',
  'bitch',
  'asshole',
  'bastard',
  'cunt',
  'dick',
  'pussy',
  'slut',
  'whore',
  'nigger',
  'nigga',
  'faggot',
  'fag',
  'retard',
  'kys',
  'nazi',
  'hitler',
  'penis',
  'vagina',
  'porn'
];

const LEETSPEAK_CHAR_MAP: Record<string, string> = {
  '0': 'o',
  '1': 'i',
  '3': 'e',
  '4': 'a',
  '5': 's',
  '7': 't',
  '@': 'a',
  $: 's',
  '!': 'i'
};

function normalizeForChatModeration(input: string): string {
  const lower = input.toLowerCase();
  let out = '';
  for (const ch of lower) {
    const mapped = LEETSPEAK_CHAR_MAP[ch] ?? ch;
    if (/[a-z0-9\s]/.test(mapped)) {
      out += mapped;
    } else {
      out += ' ';
    }
  }
  return out;
}

/**
 * Validates and moderates a proximity chat message on both client and server (`FR-005`, `FR-007`, `SC-003`).
 */
export function validateChatMessage(rawText: unknown): ChatValidationResult {
  if (typeof rawText !== 'string') {
    return {
      valid: false,
      normalizedText: '',
      errorCode: 'EMPTY_MESSAGE',
      errorMessage: 'Message cannot be empty.'
    };
  }

  // Strip control characters and collapse whitespace
  const cleaned = rawText
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');

  if (cleaned.length < 1) {
    return {
      valid: false,
      normalizedText: '',
      errorCode: 'EMPTY_MESSAGE',
      errorMessage: 'Please enter a message before sending.'
    };
  }

  if (cleaned.length > MAX_CHAT_MESSAGE_LENGTH) {
    return {
      valid: false,
      normalizedText: cleaned,
      errorCode: 'MESSAGE_TOO_LONG',
      errorMessage: `Message cannot exceed ${MAX_CHAT_MESSAGE_LENGTH} characters.`
    };
  }

  const normalized = normalizeForChatModeration(cleaned);
  const compactAlpha = normalized.replace(/[^a-z]/g, '');
  const tokens = normalized.split(/\s+/).filter(Boolean);

  for (const term of BLOCKED_CHAT_PROFANITY_TERMS) {
    if (tokens.includes(term) || compactAlpha.includes(term)) {
      return {
        valid: false,
        normalizedText: cleaned,
        errorCode: 'PROFANITY_BLOCKED',
        errorMessage: 'Message blocked by zoo safety and community guidelines.'
      };
    }
  }

  return {
    valid: true,
    normalizedText: cleaned
  };
}

export interface ChatRateLimiterOptions {
  windowMs?: number;
  maxMessagesPerWindow?: number;
  minIntervalMs?: number;
}

/**
 * Sliding-window anti-spam rate limiter for proximity text chat (`FR-006`, `SC-003`).
 */
export class ChatRateLimiter {
  private readonly windowMs: number;
  private readonly maxMessagesPerWindow: number;
  private readonly minIntervalMs: number;
  private readonly historyBySession = new Map<string, number[]>();

  constructor(options: ChatRateLimiterOptions = {}) {
    this.windowMs = options.windowMs ?? CHAT_RATE_WINDOW_MS;
    this.maxMessagesPerWindow = options.maxMessagesPerWindow ?? CHAT_MAX_MESSAGES_PER_WINDOW;
    this.minIntervalMs = options.minIntervalMs ?? CHAT_MIN_INTERVAL_MS;
  }

  public checkAndRecord(
    sessionKey: string,
    now = Date.now()
  ): {
    allowed: boolean;
    retryAfterMs: number;
  } {
    const cutoff = now - this.windowMs;
    const recent = (this.historyBySession.get(sessionKey) ?? []).filter((ts) => ts > cutoff);

    if (recent.length > 0) {
      const lastSentAt = recent[recent.length - 1] ?? now;
      const elapsedSinceLast = now - lastSentAt;
      if (elapsedSinceLast < this.minIntervalMs) {
        this.historyBySession.set(sessionKey, recent);
        return {
          allowed: false,
          retryAfterMs: Math.max(50, this.minIntervalMs - elapsedSinceLast)
        };
      }
    }

    if (recent.length >= this.maxMessagesPerWindow) {
      this.historyBySession.set(sessionKey, recent);
      const oldestInWindow = recent[0] ?? now;
      return {
        allowed: false,
        retryAfterMs: Math.max(50, oldestInWindow + this.windowMs - now)
      };
    }

    recent.push(now);
    this.historyBySession.set(sessionKey, recent);
    return {
      allowed: true,
      retryAfterMs: 0
    };
  }

  public clearSession(sessionKey: string): void {
    this.historyBySession.delete(sessionKey);
  }
}

