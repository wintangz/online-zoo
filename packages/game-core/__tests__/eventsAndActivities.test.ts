import { describe, expect, it } from 'vitest';
import {
  getSeasonalThemeDescriptor,
  getZooEventDescriptor,
  INITIAL_ZOO_COINS,
  RoomEventsEngine,
  sanitizeEventAdministrationConfig,
  SEASONAL_THEMES_CATALOG,
  ZOO_EVENT_IDS,
  ZOO_EVENTS_BY_ID,
  ZOO_EVENTS_CATALOG,
  ZooInstanceAuthority
} from '../src';

describe('Feature 008 — Events & Activities', () => {
  it('exposes complete event catalog and seasonal theme descriptors with valid schedule windows (SC-001)', () => {
    expect(ZOO_EVENTS_CATALOG).toHaveLength(5);
    expect(SEASONAL_THEMES_CATALOG).toHaveLength(4);

    for (const eventId of ZOO_EVENT_IDS) {
      const desc = ZOO_EVENTS_BY_ID[eventId];
      expect(getZooEventDescriptor(eventId).eventId).toBe(eventId);
      expect(desc.title.length).toBeGreaterThan(3);
      expect(desc.description.length).toBeGreaterThan(10);
      expect(desc.instructions.length).toBeGreaterThan(10);
      expect(desc.locationLabel.length).toBeGreaterThan(3);
      expect(desc.defaultMaxParticipants).toBeGreaterThan(0);
      expect(desc.targetProgress).toBeGreaterThan(0);
      expect(desc.rewardCoins).toBeGreaterThan(0);
    }

    expect(getSeasonalThemeDescriptor('spring-blossom').label).toBe(
      'Spring Blossom Festival'
    );

    const engine = new RoomEventsEngine(1_000_000, 'spring-blossom');
    const snapshot = engine.getEventsSnapshot();
    expect(snapshot).toHaveLength(5);

    const pandaEvent = snapshot.find(
      (ev) => ev.eventId === 'event-panda-feeding-gala'
    );
    expect(pandaEvent?.status).toBe('active');
    expect((pandaEvent?.endTimeMs ?? 0) > (pandaEvent?.startTimeMs ?? 0)).toBe(
      true
    );
  });

  it('enforces multi-player capacity limits, supports late joins, and frees participant slots on leave or disconnect (SC-002)', () => {
    const authority = new ZooInstanceAuthority();

    const p1 = authority.joinOrResumePlayer({
      playerId: 'pid_ev_01',
      displayName: 'VisitorOne',
      now: 1000
    });
    const p2 = authority.joinOrResumePlayer({
      playerId: 'pid_ev_02',
      displayName: 'VisitorTwo',
      now: 1010
    });
    const p3 = authority.joinOrResumePlayer({
      playerId: 'pid_ev_03',
      displayName: 'VisitorThree',
      now: 1020
    });

    // Configure event-panda-feeding-gala with maxParticipants = 2 to verify capacity enforcement
    const configRes = authority.configureZooEvents(
      p1.welcome.sessionId,
      {
        type: 'configure_zoo_events',
        eventPatches: [
          {
            eventId: 'event-panda-feeding-gala',
            status: 'active',
            maxParticipants: 2
          }
        ]
      },
      1050
    );
    expect(configRes.accepted).toBe(true);

    // Player 1 joins
    const join1 = authority.joinZooEvent(
      p1.welcome.sessionId,
      {
        type: 'join_zoo_event',
        eventId: 'event-panda-feeding-gala'
      },
      1100
    );
    expect(join1.accepted).toBe(true);
    const evAfterJoin1 = join1.broadcast?.events.find(
      (e) => e.eventId === 'event-panda-feeding-gala'
    );
    expect(evAfterJoin1?.participantPlayerIds).toEqual(['pid_ev_01']);

    // Player 2 joins (reaches capacity 2/2)
    const join2 = authority.joinZooEvent(
      p2.welcome.sessionId,
      {
        type: 'join_zoo_event',
        eventId: 'event-panda-feeding-gala'
      },
      1120
    );
    expect(join2.accepted).toBe(true);
    const evAfterJoin2 = join2.broadcast?.events.find(
      (e) => e.eventId === 'event-panda-feeding-gala'
    );
    expect(evAfterJoin2?.participantPlayerIds).toEqual([
      'pid_ev_01',
      'pid_ev_02'
    ]);

    // Player 3 attempts to join while full -> rejected with EVENT_FULL
    const join3Full = authority.joinZooEvent(
      p3.welcome.sessionId,
      {
        type: 'join_zoo_event',
        eventId: 'event-panda-feeding-gala'
      },
      1140
    );
    expect(join3Full.accepted).toBe(false);
    expect(join3Full.errorCode).toBe('EVENT_FULL');

    // Player 1 disconnects -> immediately frees slot (2/2 -> 1/2)
    const disconnected = authority.disconnectPlayer(
      p1.welcome.sessionId,
      false,
      1200
    );
    expect(disconnected.eventsUpdate).toBeTruthy();
    const evAfterDisconnect = disconnected.eventsUpdate?.events.find(
      (e) => e.eventId === 'event-panda-feeding-gala'
    );
    expect(evAfterDisconnect?.participantPlayerIds).toEqual(['pid_ev_02']);

    // Player 3 can now join the freed slot
    const join3AfterFree = authority.joinZooEvent(
      p3.welcome.sessionId,
      {
        type: 'join_zoo_event',
        eventId: 'event-panda-feeding-gala'
      },
      1250
    );
    expect(join3AfterFree.accepted).toBe(true);
    const evAfterJoin3 = join3AfterFree.broadcast?.events.find(
      (e) => e.eventId === 'event-panda-feeding-gala'
    );
    expect(evAfterJoin3?.participantPlayerIds).toEqual([
      'pid_ev_02',
      'pid_ev_03'
    ]);

    // Player 2 leaves explicitly -> frees slot
    const leave2 = authority.leaveZooEvent(
      p2.welcome.sessionId,
      {
        type: 'leave_zoo_event',
        eventId: 'event-panda-feeding-gala'
      },
      1300
    );
    expect(leave2.accepted).toBe(true);
    const evAfterLeave2 = leave2.broadcast?.events.find(
      (e) => e.eventId === 'event-panda-feeding-gala'
    );
    expect(evAfterLeave2?.participantPlayerIds).toEqual(['pid_ev_03']);
  });

  it('synchronizes shared group progress and enforces one-time event reward claims with passport stamp & coin credit (SC-003)', () => {
    const authority = new ZooInstanceAuthority();
    const joined = authority.joinOrResumePlayer({
      playerId: 'pid_reward_tester',
      displayName: 'RewardExplorer',
      now: 2000
    });
    const sessionId = joined.welcome.sessionId;

    // 1. Attempting to claim before participating is rejected with REWARD_NOT_ELIGIBLE
    const prematureClaim = authority.claimEventReward(
      sessionId,
      {
        type: 'claim_event_reward',
        eventId: 'event-panda-feeding-gala',
        requestId: 'req_premature_01'
      },
      2050
    );
    expect(prematureClaim.result.success).toBe(false);
    expect(prematureClaim.result.errorCode).toBe('REWARD_NOT_ELIGIBLE');
    expect(prematureClaim.result.rewardCoinsGranted).toBe(0);

    // 2. Join event-panda-feeding-gala and perform activity action
    const joinRes = authority.joinZooEvent(
      sessionId,
      {
        type: 'join_zoo_event',
        eventId: 'event-panda-feeding-gala'
      },
      2100
    );
    expect(joinRes.accepted).toBe(true);

    const actRes = authority.performEventAction(
      sessionId,
      {
        type: 'perform_event_action',
        eventId: 'event-panda-feeding-gala'
      },
      2150
    );
    expect(actRes.accepted).toBe(true);
    const evAfterAct = actRes.broadcast?.events.find(
      (e) => e.eventId === 'event-panda-feeding-gala'
    );
    expect(evAfterAct?.sharedProgressCount).toBe(1);
    expect(evAfterAct?.contributedPlayerIds).toContain('pid_reward_tester');

    // 3. Claim event reward -> grants +20 Zoo Coins, stamps zone-panda-sanctuary, and unlocks ach-keeper-helper
    const claimRes = authority.claimEventReward(
      sessionId,
      {
        type: 'claim_event_reward',
        eventId: 'event-panda-feeding-gala',
        requestId: 'req_valid_claim_01'
      },
      2200
    );
    expect(claimRes.result.success).toBe(true);
    expect(claimRes.result.rewardCoinsGranted).toBe(20);
    expect(claimRes.result.currencyBalance).toBe(INITIAL_ZOO_COINS + 20);
    expect(claimRes.result.stampedZoneId).toBe('zone-panda-sanctuary');
    expect(
      claimRes.result.passportState.stamps['zone-panda-sanctuary'].obtained
    ).toBe(true);
    expect(
      claimRes.result.passportState.activitiesCompletedCount
    ).toBeGreaterThanOrEqual(1);
    expect(
      claimRes.result.passportState.achievements['ach-keeper-helper'].unlocked
    ).toBe(true);

    // 4. Duplicate packet with identical requestId is idempotent and does not double-credit
    const retrySameReq = authority.claimEventReward(
      sessionId,
      {
        type: 'claim_event_reward',
        eventId: 'event-panda-feeding-gala',
        requestId: 'req_valid_claim_01'
      },
      2250
    );
    expect(retrySameReq.result.success).toBe(true);
    expect(retrySameReq.result.currencyBalance).toBe(INITIAL_ZOO_COINS + 20);
    expect(
      authority.getPlayerDiningWallet('pid_reward_tester').currencyBalance
    ).toBe(INITIAL_ZOO_COINS + 20);

    // 5. Second claim attempt with a new requestId for the same event instance is rejected with ALREADY_CLAIMED
    const duplicateClaimNewReq = authority.claimEventReward(
      sessionId,
      {
        type: 'claim_event_reward',
        eventId: 'event-panda-feeding-gala',
        requestId: 'req_duplicate_claim_02'
      },
      2300
    );
    expect(duplicateClaimNewReq.result.success).toBe(false);
    expect(duplicateClaimNewReq.result.errorCode).toBe('ALREADY_CLAIMED');
    expect(duplicateClaimNewReq.result.rewardCoinsGranted).toBe(0);
    expect(duplicateClaimNewReq.result.currencyBalance).toBe(
      INITIAL_ZOO_COINS + 20
    );
  });

  it('supports seasonal theme switching and rejects invalid schedule or capacity administration configs (SC-004, SC-005)', () => {
    const authority = new ZooInstanceAuthority();
    const joined = authority.joinOrResumePlayer({
      playerId: 'pid_admin_tester',
      displayName: 'SeasonKeeper',
      now: 3000
    });
    const sessionId = joined.welcome.sessionId;

    // 1. Switch seasonal theme to none -> deactivates seasonal event (event-lantern-trivia-game)
    const disableSeason = authority.configureZooEvents(
      sessionId,
      {
        type: 'configure_zoo_events',
        seasonalTheme: 'none'
      },
      3100
    );
    expect(disableSeason.accepted).toBe(true);
    expect(disableSeason.broadcast?.seasonalTheme).toBe('none');
    const seasonalEvOff = disableSeason.broadcast?.events.find(
      (e) => e.eventId === 'event-lantern-trivia-game'
    );
    expect(seasonalEvOff?.status).toBe('finished');

    // 2. Switch seasonal theme to summer-lantern -> reactivates seasonal event with new instance
    const enableSummer = authority.configureZooEvents(
      sessionId,
      {
        type: 'configure_zoo_events',
        seasonalTheme: 'summer-lantern'
      },
      3200
    );
    expect(enableSummer.accepted).toBe(true);
    expect(enableSummer.broadcast?.seasonalTheme).toBe('summer-lantern');
    const seasonalEvOn = enableSummer.broadcast?.events.find(
      (e) => e.eventId === 'event-lantern-trivia-game'
    );
    expect(seasonalEvOn?.status).toBe('active');

    // 3. Reject invalid schedule window (endTimeMs <= startTimeMs)
    const badWindow = authority.configureZooEvents(
      sessionId,
      {
        type: 'configure_zoo_events',
        eventPatches: [
          {
            eventId: 'event-penguin-dive-show',
            startTimeMs: 5000,
            endTimeMs: 4000
          }
        ]
      },
      3300
    );
    expect(badWindow.accepted).toBe(false);
    expect(badWindow.errorCode).toBe('INVALID_EVENT_CONFIG');

    // 4. Reject invalid capacity (maxParticipants <= 0)
    const badCapacity = sanitizeEventAdministrationConfig({
      eventPatches: [
        {
          eventId: 'event-penguin-dive-show',
          maxParticipants: 0
        }
      ]
    });
    expect(badCapacity.valid).toBe(false);
  });
});
