import { describe, expect, it, beforeEach } from 'vitest';
import {
  AVATAR_CUSTOMIZATION_CATALOG,
  DEFAULT_AVATAR_APPEARANCE,
  gameStore,
  isValidAvatarAppearance,
  loadOrCreatePlayerIdentity,
  MultiplayerClient,
  PLAYER_IDENTITY_STORAGE_KEY,
  sanitizeAvatarAppearance,
  savePlayerIdentity,
  validateDisplayName
} from '@online-zoo/game-core';
import { InMemoryMultiplayerHub, ZooInstanceAuthority } from '../src';

function createMemoryStorage(): Pick<Storage, 'getItem' | 'setItem'> & {
  data: Map<string, string>;
} {
  const data = new Map<string, string>();
  return {
    data,
    getItem(key: string) {
      return data.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      data.set(key, value);
    }
  };
}

describe('Feature 003: Player Identity & Avatar Customization', () => {
  beforeEach(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.clear();
    }
    gameStore.getState().resetSession();
  });

  it('provisions a persistent playerId and default avatar on first visit and restores across visits (FR-001, FR-002, FR-011, FR-012)', () => {
    const storage = createMemoryStorage();
    const firstVisit = loadOrCreatePlayerIdentity(storage);

    expect(firstVisit.playerId).toMatch(/^player-[a-zA-Z0-9_-]{8,60}$/);
    expect(firstVisit.displayName).toMatch(/^Explorer #\d{3}$/);
    expect(firstVisit.avatar).toEqual(DEFAULT_AVATAR_APPEARANCE);
    expect(firstVisit.isCustomized).toBe(false);

    // Customize and save
    const saved = savePlayerIdentity(
      {
        ...firstVisit,
        displayName: 'BambooRanger',
        avatar: {
          skinTone: 'amber-tan',
          hairstyle: 'bamboo-ponytail',
          hairColor: 'forest-teal',
          outfit: 'botanist-cobalt',
          accessory: 'round-glasses'
        },
        isCustomized: true
      },
      storage
    );

    const secondVisit = loadOrCreatePlayerIdentity(storage);
    expect(secondVisit.playerId).toBe(firstVisit.playerId);
    expect(secondVisit.displayName).toBe('BambooRanger');
    expect(secondVisit.avatar).toEqual(saved.avatar);
    expect(secondVisit.isCustomized).toBe(true);

    // Corrupted partial JSON repairs invalid fields while preserving valid playerId (FR-012)
    storage.setItem(
      PLAYER_IDENTITY_STORAGE_KEY,
      JSON.stringify({
        playerId: firstVisit.playerId,
        displayName: 'x', // invalid (< 3 chars)
        avatar: {
          skinTone: 'amber-tan',
          hairstyle: 'invalid-hair',
          hairColor: 'forest-teal',
          outfit: 'invalid-outfit',
          accessory: 'round-glasses'
        }
      })
    );
    const repaired = loadOrCreatePlayerIdentity(storage);
    expect(repaired.playerId).toBe(firstVisit.playerId);
    expect(repaired.displayName).toMatch(/^Explorer #\d{3}$/);
    expect(repaired.avatar.skinTone).toBe('amber-tan');
    expect(repaired.avatar.hairstyle).toBe(DEFAULT_AVATAR_APPEARANCE.hairstyle);
    expect(repaired.avatar.hairColor).toBe('forest-teal');
    expect(repaired.avatar.outfit).toBe(DEFAULT_AVATAR_APPEARANCE.outfit);
    expect(repaired.avatar.accessory).toBe('round-glasses');
  });

  it('enforces display name formatting and profanity/reserved moderation rules (FR-004, FR-005, SC-006)', () => {
    expect(validateDisplayName('BambooRanger').valid).toBe(true);
    expect(validateDisplayName('  Panda_Scout-1  ')).toEqual({
      valid: true,
      normalizedName: 'Panda_Scout-1'
    });

    // Length bounds (3..16)
    expect(validateDisplayName('ab')).toMatchObject({
      valid: false,
      errorCode: 'TOO_SHORT'
    });
    expect(validateDisplayName('ThisNameIsWayTooLong123')).toMatchObject({
      valid: false,
      errorCode: 'TOO_LONG'
    });

    // Disallowed characters or consecutive spaces
    expect(validateDisplayName('<script>alert')).toMatchObject({
      valid: false,
      errorCode: 'INVALID_CHARS'
    });
    expect(validateDisplayName('Panda  Scout')).toMatchObject({
      valid: false,
      errorCode: 'INVALID_CHARS'
    });

    // Reserved staff/impersonation names
    expect(validateDisplayName('Admin')).toMatchObject({
      valid: false,
      errorCode: 'RESERVED_NAME'
    });
    expect(validateDisplayName('sys_admin')).toMatchObject({
      valid: false,
      errorCode: 'RESERVED_NAME'
    });

    // Direct and leetspeak profanity/slurs
    expect(validateDisplayName('BadFuckName')).toMatchObject({
      valid: false,
      errorCode: 'PROFANITY_BLOCKED'
    });
    expect(validateDisplayName('Sh1tPlayer')).toMatchObject({
      valid: false,
      errorCode: 'PROFANITY_BLOCKED'
    });
  });

  it('validates all 5 appearance categories against the curated catalog (FR-006, FR-007)', () => {
    expect(AVATAR_CUSTOMIZATION_CATALOG.skinTones.length).toBe(6);
    expect(AVATAR_CUSTOMIZATION_CATALOG.hairstyles.length).toBe(4);
    expect(AVATAR_CUSTOMIZATION_CATALOG.hairColors.length).toBe(6);
    expect(AVATAR_CUSTOMIZATION_CATALOG.outfits.length).toBe(5);
    expect(AVATAR_CUSTOMIZATION_CATALOG.accessories.length).toBe(5);

    expect(isValidAvatarAppearance(DEFAULT_AVATAR_APPEARANCE)).toBe(true);
    expect(
      isValidAvatarAppearance({
        ...DEFAULT_AVATAR_APPEARANCE,
        outfit: 'neon-hacker-suit'
      })
    ).toBe(false);

    const sanitized = sanitizeAvatarAppearance({
      skinTone: 'bamboo-sage',
      hairstyle: 'unknown',
      hairColor: 'silver-mist',
      outfit: 'panda-monochrome',
      accessory: 'explorer-backpack'
    });
    expect(sanitized).toEqual({
      skinTone: 'bamboo-sage',
      hairstyle: DEFAULT_AVATAR_APPEARANCE.hairstyle,
      hairColor: 'silver-mist',
      outfit: 'panda-monochrome',
      accessory: 'explorer-backpack'
    });
  });

  it('supports preview, cancel, reset to default, and confirm workflows in gameStore (FR-008, FR-009, SC-004)', () => {
    const store = gameStore.getState();
    const initialProfile = store.initializePlayerIdentity();

    store.openAvatarCustomizer();
    expect(gameStore.getState().identity.draft.isOpen).toBe(true);

    // Edit draft values across all 5 categories + name
    store.setDraftDisplayName('DraftVisitor');
    store.setDraftAvatarOption('skinTone', 'deep-umber');
    store.setDraftAvatarOption('hairstyle', 'sun-spiky');
    store.setDraftAvatarOption('hairColor', 'golden-blonde');
    store.setDraftAvatarOption('outfit', 'sunset-coral');
    store.setDraftAvatarOption('accessory', 'bamboo-visor');

    expect(gameStore.getState().identity.draft.avatar).toEqual({
      skinTone: 'deep-umber',
      hairstyle: 'sun-spiky',
      hairColor: 'golden-blonde',
      outfit: 'sunset-coral',
      accessory: 'bamboo-visor'
    });
    // Confirmed profile remains untouched while previewing
    expect(gameStore.getState().identity.profile.displayName).toBe(initialProfile.displayName);

    // Cancel discards draft changes (SC-004)
    store.cancelAvatarCustomizer();
    expect(gameStore.getState().identity.draft.isOpen).toBe(false);
    expect(gameStore.getState().identity.profile.displayName).toBe(initialProfile.displayName);
    expect(gameStore.getState().identity.profile.avatar).toEqual(DEFAULT_AVATAR_APPEARANCE);

    // Reopen, edit, and Confirm & Save
    store.openAvatarCustomizer();
    store.setDraftDisplayName('LotusKeeper');
    store.setDraftAvatarOption('hairstyle', 'park-bun');
    store.setDraftAvatarOption('outfit', 'safari-khaki');
    const confirmRes = store.confirmAvatarCustomization();
    expect(confirmRes.ok).toBe(true);
    expect(gameStore.getState().identity.profile.displayName).toBe('LotusKeeper');
    expect(gameStore.getState().identity.profile.avatar.hairstyle).toBe('park-bun');
    expect(gameStore.getState().identity.profile.avatar.outfit).toBe('safari-khaki');

    // Reset to default appearance and confirm
    store.openAvatarCustomizer();
    store.resetDraftToDefault();
    store.confirmAvatarCustomization();
    expect(gameStore.getState().identity.profile.avatar).toEqual(DEFAULT_AVATAR_APPEARANCE);
  });

  it('synchronizes confirmed identity & avatar updates in real time, disambiguates duplicate names, and rejects invalid updates on the server (FR-015, FR-016, FR-017, SC-005, SC-006)', async () => {
    const authority = new ZooInstanceAuthority();
    const hub = new InMemoryMultiplayerHub(authority);

    const clientA = new MultiplayerClient({
      transportFactory: hub.createTransportFactory()
    });
    const clientB = new MultiplayerClient({
      transportFactory: hub.createTransportFactory()
    });

    clientA.connect();
    clientB.connect();
    await new Promise((r) => setTimeout(r, 15));

    const sidA = clientA.getSessionId()!;
    const sidB = clientB.getSessionId()!;
    expect(sidA).toBeTruthy();
    expect(sidB).toBeTruthy();

    // Player A confirms a customized identity and appearance
    const customProfileA = {
      schemaVersion: 1 as const,
      playerId: 'player-11111111-2222-4333-8444-555555555555',
      displayName: 'PandaScout',
      avatar: {
        skinTone: 'rich-sienna' as const,
        hairstyle: 'bamboo-ponytail' as const,
        hairColor: 'copper-auburn' as const,
        outfit: 'botanist-cobalt' as const,
        accessory: 'round-glasses' as const
      },
      isCustomized: true,
      updatedAt: new Date().toISOString()
    };

    clientA.sendIdentityUpdate(customProfileA);
    await new Promise((r) => setTimeout(r, 10));

    // Verify Client B's store received Player A's updated display name and 5-category avatar
    const visitorAInStore = gameStore.getState().multiplayer.remoteVisitors[sidA];
    expect(visitorAInStore).toBeDefined();
    expect(visitorAInStore?.displayName).toBe('PandaScout');
    expect(visitorAInStore?.avatar).toEqual(customProfileA.avatar);

    // Duplicate display name disambiguation ("PandaScout" -> "PandaScout #2") (FR-017)
    const duplicateNameRes = authority.updatePlayerIdentity(sidB, {
      type: 'update_identity',
      playerId: 'player-99999999-8888-4777-8666-555555555555',
      displayName: 'PandaScout',
      avatar: DEFAULT_AVATAR_APPEARANCE
    });
    expect(duplicateNameRes.accepted).toBe(true);
    expect(duplicateNameRes.broadcast?.displayName).toBe('PandaScout #2');

    // Server rejects invalid/profane name or invalid catalog option in update_identity (SC-006)
    const rejectedProfanity = authority.updatePlayerIdentity(sidB, {
      type: 'update_identity',
      playerId: 'player-99999999-8888-4777-8666-555555555555',
      displayName: 'fuck_troll',
      avatar: DEFAULT_AVATAR_APPEARANCE
    });
    expect(rejectedProfanity.accepted).toBe(false);
    expect(rejectedProfanity.errorCode).toBe('INVALID_IDENTITY_UPDATE');

    const rejectedCatalog = authority.updatePlayerIdentity(sidB, {
      type: 'update_identity',
      playerId: 'player-99999999-8888-4777-8666-555555555555',
      displayName: 'ValidVisitor',
      avatar: {
        ...DEFAULT_AVATAR_APPEARANCE,
        hairstyle: 'invalid-style' as never
      }
    });
    expect(rejectedCatalog.accepted).toBe(false);
    expect(rejectedCatalog.errorCode).toBe('INVALID_IDENTITY_UPDATE');

    clientA.disconnect(true);
    clientB.disconnect(true);
  });
});

