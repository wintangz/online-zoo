import type { DisplayNameValidationResult } from '../types';

export const MIN_DISPLAY_NAME_LENGTH = 3;
export const MAX_DISPLAY_NAME_LENGTH = 16;

/**
 * Allowed pattern:
 * - Starts and ends with an ASCII letter or digit
 * - Allows letters, digits, spaces, hyphens (-), underscores (_)or '#' only in default Explorer #NNN
 */
const ALLOWED_DISPLAY_NAME_REGEX = /^[A-Za-z0-9](?:[A-Za-z0-9 _#-]{1,14}[A-Za-z0-9])?$/;

const CONSECUTIVE_PUNCTUATION_REGEX = /(?: {2,}|--+|__+|##+)/;

const RESERVED_EXACT_NAMES = new Set([
  'admin',
  'administrator',
  'moderator',
  'mod',
  'system',
  'sysadmin',
  'staff',
  'official',
  'owner',
  'developer',
  'support'
]);

const BLOCKED_PROFANITY_SUBSTRINGS = [
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

function normalizeForModeration(input: string): string {
  const leetMap: Record<string, string> = {
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

  let normalized = '';
  for (const ch of input.toLowerCase()) {
    const mapped = leetMap[ch] ?? ch;
    if (/[a-z0-9]/.test(mapped)) {
      normalized += mapped;
    }
  }
  return normalized;
}

export function validateDisplayName(candidate: unknown): DisplayNameValidationResult {
  if (typeof candidate !== 'string') {
    return {
      valid: false,
      normalizedName: '',
      errorCode: 'TOO_SHORT',
      errorMessage: 'Display name must be between 3 and 16 characters.'
    };
  }

  const trimmed = candidate.trim().replace(/\s+/g, ' ');

  if (trimmed.length < MIN_DISPLAY_NAME_LENGTH) {
    return {
      valid: false,
      normalizedName: trimmed,
      errorCode: 'TOO_SHORT',
      errorMessage: 'Display name must be at least 3 characters long.'
    };
  }

  if (trimmed.length > MAX_DISPLAY_NAME_LENGTH) {
    return {
      valid: false,
      normalizedName: trimmed,
      errorCode: 'TOO_LONG',
      errorMessage: 'Display name must be at most 16 characters long.'
    };
  }

  // Raw candidate had consecutive spaces before collapsing, or invalid characters
  if (
    CONSECUTIVE_PUNCTUATION_REGEX.test(candidate.trim()) ||
    !ALLOWED_DISPLAY_NAME_REGEX.test(trimmed) ||
    // '#' is only allowed for canonical "Explorer #NNN" default visitor names
    (trimmed.includes('#') && !/^Explorer #\d{3,4}$/.test(trimmed))
  ) {
    return {
      valid: false,
      normalizedName: trimmed,
      errorCode: 'INVALID_CHARS',
      errorMessage:
        'Use only letters, numbers, single spaces, hyphens (-), or underscores (_), starting and ending with a letter or number.'
    };
  }

  const lowerCompact = trimmed.toLowerCase().replace(/[\s_-]+/g, '');
  if (RESERVED_EXACT_NAMES.has(lowerCompact)) {
    return {
      valid: false,
      normalizedName: trimmed,
      errorCode: 'RESERVED_NAME',
      errorMessage: 'That display name is reserved by the park staff system.'
    };
  }

  const leetNormalized = normalizeForModeration(trimmed);
  const rawAlphaLower = trimmed.toLowerCase().replace(/[^a-z]/g, '');

  for (const term of BLOCKED_PROFANITY_SUBSTRINGS) {
    if (rawAlphaLower.includes(term) || leetNormalized.includes(term)) {
      return {
        valid: false,
        normalizedName: trimmed,
        errorCode: 'PROFANITY_BLOCKED',
        errorMessage: 'Please choose a family-friendly display name appropriate for the zoo.'
      };
    }
  }

  return {
    valid: true,
    normalizedName: trimmed
  };
}

