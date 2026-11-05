import { describe, expect, it } from 'vitest';
import {
  ACHIEVEMENT_IDS,
  computePassportProgressSummary,
  createDefaultEncyclopediaState,
  createDefaultPassportState,
  evaluatePassportAchievements,
  evaluateProximityZoneStamp,
  INITIAL_ZOO_COINS,
  loadPlayerPassportState,
  PASSPORT_STORAGE_KEY,
  PASSPORT_ZONE_IDS,
  PASSPORT_ZONES_BY_ID,
  recordPassportActivityCompletion,
  recordPassportSocialInteraction,
  recordPassportZoneStamp,
  savePlayerPassportState
} from '@online-zoo/game-core';
import { InMemoryMultiplayerHub, ZooInstanceAuthority } from '../src';

function createMemoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear() {
      map.clear();
    },
    getItem(key: string) {
      return map.get(key) ?? null;
    },
    key(index: number) {
      return Array.from(map.keys())[index] ?? null;
    },
    removeItem(key: string) {
      map.delete(key);
    },
    setItem(key: string, value: string) {
      map.set(key, value);
    }
  };
}

describe('Feature 007 — Zoo Passport & Progression', () => {
  it('starts with 0/5 stamps at spawn and unlocks zone stamps + exploration achievements via natural proximity (SC-001, SC-002)', () => {
    const storage = createMemoryStorage();
    const emptyEncyclopedia = createDefaultEncyclopediaState();
    let state = createDefaultPassportState('2026-06-01T10:00:00.000Z');

    // At initial spawn [0, 0.1, 18], no zone stamp should be triggered
    const atSpawn = evaluateProximityZoneStamp(
      [0, 0.1, 18],
      state,
      0,
      '2026-06-01T10:00:01.000Z',
      storage
    );
    expect(atSpawn.newlyStampedZoneIds).toHaveLength(0);
    expect(
      computePassportProgressSummary(atSpawn.state, emptyEncyclopedia).obtainedStampsCount
    ).toBe(0);

    // Walking into Welcome Plaza [-5.2, 0, 12.6] stamps zone-welcome-plaza and unlocks ach-first-stamp
    const inPlaza = evaluateProximityZoneStamp(
      [-5.2, 0.1, 12.6],
      atSpawn.state,
      0,
      '2026-06-01T10:00:05.000Z',
      storage
    );
    expect(inPlaza.newlyStampedZoneIds).toEqual(['zone-welcome-plaza']);
    expect(inPlaza.newlyUnlockedAchievementIds).toContain('ach-first-stamp');
    expect(inPlaza.state.stamps['zone-welcome-plaza'].obtained).toBe(true);
    expect(inPlaza.state.achievements['ach-first-stamp'].unlocked).toBe(true);

    // Stamp all remaining zones to unlock ach-world-explorer (5/5 stamps)
    state = inPlaza.state;
    for (const zoneId of PASSPORT_ZONE_IDS) {
      const center = PASSPORT_ZONES_BY_ID[zoneId].center;
      state = evaluateProximityZoneStamp(
        center,
        state,
        0,
        '2026-06-01T10:01:00.000Z',
        storage
      ).state;
    }

    expect(state.achievements['ach-world-explorer'].unlocked).toBe(true);
    expect(
      computePassportProgressSummary(state, emptyEncyclopedia).obtainedStampsCount
    ).toBe(5);

    // Verify localStorage persistence round-trip
    savePlayerPassportState(state, storage);
    expect(storage.getItem(PASSPORT_STORAGE_KEY)).toBeTruthy();
    const reloaded = loadPlayerPassportState(storage);
    for (const zoneId of PASSPORT_ZONE_IDS) {
      expect(reloaded.stamps[zoneId].obtained).toBe(true);
    }
    expect(reloaded.achievements['ach-first-stamp'].unlocked).toBe(true);
    expect(reloaded.achievements['ach-world-explorer'].unlocked).toBe(true);
  });

  it('unlocks animal discovery, social interaction, and activity achievements and computes 0%–100% progress (SC-003, SC-004, SC-006)', () => {
    let state = createDefaultPassportState('2026-06-01T10:00:00.000Z');
    const encyclopedia = createDefaultEncyclopediaState();
    expect(computePassportProgressSummary(state, encyclopedia).overallPercentage).toBe(0);

    // 1. Discover 1 animal species -> unlocks ach-first-animal
    encyclopedia.entries.panda.discovered = true;
    const oneAnimal = evaluatePassportAchievements(
      state,
      1,
      '2026-06-01T10:01:00.000Z'
    );
    expect(oneAnimal.newlyUnlockedAchievementIds).toEqual(['ach-first-animal']);
    state = oneAnimal.state;

    // 2. Discover all 3 animal species -> unlocks ach-zoologist
    encyclopedia.entries.penguin.discovered = true;
    encyclopedia.entries.otter.discovered = true;
    const allAnimals = evaluatePassportAchievements(
      state,
      3,
      '2026-06-01T10:02:00.000Z'
    );
    expect(allAnimals.newlyUnlockedAchievementIds).toEqual(['ach-zoologist']);
    state = allAnimals.state;

    // 3. Social interaction -> unlocks ach-social-greeting
    const socialRes = recordPassportSocialInteraction(
      state,
      3,
      '2026-06-01T10:03:00.000Z',
      null
    );
    expect(socialRes.newlyUnlockedAchievementIds).toEqual(['ach-social-greeting']);
    state = socialRes.state;

    // 4. Activity completion -> unlocks ach-keeper-helper
    const activityRes = recordPassportActivityCompletion(
      state,
      3,
      '2026-06-01T10:04:00.000Z',
      null
    );
    expect(activityRes.newlyUnlockedAchievementIds).toEqual(['ach-keeper-helper']);
    state = activityRes.state;

    // 5. Stamp all 5 zones -> all 14 milestones completed (100%)
    for (const zoneId of PASSPORT_ZONE_IDS) {
      state = recordPassportZoneStamp(
        state,
        zoneId,
        3,
        '2026-06-01T10:05:00.000Z',
        null
      ).state;
    }

    for (const achId of ACHIEVEMENT_IDS) {
      expect(state.achievements[achId].unlocked).toBe(true);
    }

    const summary = computePassportProgressSummary(state, encyclopedia);
    expect(summary.obtainedStampsCount).toBe(5);
    expect(summary.discoveredSpeciesCount).toBe(3);
    expect(summary.unlockedAchievementsCount).toBe(6);
    expect(summary.completedMilestones).toBe(14);
    expect(summary.totalMilestones).toBe(14);
    expect(summary.overallPercentage).toBe(100);
  });

  it('authoritatively validates one-time achievement reward claims and prevents duplicate payouts (SC-005)', () => {
    const authority = new ZooInstanceAuthority();
    const hub = new InMemoryMultiplayerHub(authority);
    void hub;

    const joined = authority.joinOrResumePlayer({
      playerId: 'pid_passport_tester_01',
      displayName: 'MeiExplorer',
      now: 1000
    });
    const sessionId = joined.welcome.sessionId;
    expect(joined.welcome.diningWallet?.currencyBalance).toBe(INITIAL_ZOO_COINS);

    // 1. Attempting to claim a locked achievement is rejected with ACHIEVEMENT_LOCKED
    const lockedClaim = authority.claimAchievementReward(
      sessionId,
      {
        type: 'claim_achievement_reward',
        achievementId: 'ach-first-stamp',
        requestId: 'req_locked_001'
      },
      1100
    );
    expect(lockedClaim.success).toBe(false);
    expect(lockedClaim.errorCode).toBe('ACHIEVEMENT_LOCKED');
    expect(lockedClaim.rewardCoinsGranted).toBe(0);
    expect(lockedClaim.currencyBalance).toBe(INITIAL_ZOO_COINS);

    // 2. Record zone stamp on server -> unlocks ach-first-stamp (+15 Zoo Coins)
    const updatedPassport = authority.recordPassportProgress(
      sessionId,
      {
        type: 'record_passport_progress',
        zoneId: 'zone-welcome-plaza'
      },
      1200
    );
    expect(updatedPassport?.stamps['zone-welcome-plaza'].obtained).toBe(true);
    expect(updatedPassport?.achievements['ach-first-stamp'].unlocked).toBe(true);

    // 3. Claim ach-first-stamp reward -> succeeds and credits +15 Zoo Coins (100 -> 115)
    const firstClaim = authority.claimAchievementReward(
      sessionId,
      {
        type: 'claim_achievement_reward',
        achievementId: 'ach-first-stamp',
        requestId: 'req_claim_first_stamp_01'
      },
      1300
    );
    expect(firstClaim.success).toBe(true);
    expect(firstClaim.rewardCoinsGranted).toBe(15);
    expect(firstClaim.rewardBadgeGranted).toBe('Trailblazer');
    expect(firstClaim.currencyBalance).toBe(INITIAL_ZOO_COINS + 15);
    expect(firstClaim.passportState.achievements['ach-first-stamp'].claimed).toBe(true);
    expect(firstClaim.passportState.earnedBadges).toContain('Trailblazer');

    // 4. Duplicate packet with the same requestId returns idempotent response without double-crediting
    const duplicatePacketClaim = authority.claimAchievementReward(
      sessionId,
      {
        type: 'claim_achievement_reward',
        achievementId: 'ach-first-stamp',
        requestId: 'req_claim_first_stamp_01'
      },
      1350
    );
    expect(duplicatePacketClaim.success).toBe(true);
    expect(duplicatePacketClaim.currencyBalance).toBe(INITIAL_ZOO_COINS + 15);
    expect(
      authority.getPlayerDiningWallet('pid_passport_tester_01').currencyBalance
    ).toBe(INITIAL_ZOO_COINS + 15);

    // 5. Subsequent claim attempt with a new requestId is rejected with ALREADY_CLAIMED
    const secondClaimNewReq = authority.claimAchievementReward(
      sessionId,
      {
        type: 'claim_achievement_reward',
        achievementId: 'ach-first-stamp',
        requestId: 'req_claim_first_stamp_02'
      },
      1400
    );
    expect(secondClaimNewReq.success).toBe(false);
    expect(secondClaimNewReq.errorCode).toBe('ALREADY_CLAIMED');
    expect(secondClaimNewReq.rewardCoinsGranted).toBe(0);
    expect(secondClaimNewReq.currencyBalance).toBe(INITIAL_ZOO_COINS + 15);
  });
});
