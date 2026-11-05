import type { PassportZoneId } from '../passport/passportCatalog';
import {
  isValidZooEventId,
  sanitizeEventAdministrationConfig,
  SEASONAL_THEMES_BY_ID,
  ZOO_EVENT_IDS,
  ZOO_EVENTS_BY_ID,
  type SeasonalThemeId,
  type ZooEventId,
  type ZooEventStatus
} from './eventsCatalog';

export interface LiveZooEventState {
  eventId: ZooEventId;
  eventInstanceId: string;
  status: ZooEventStatus;
  startTimeMs: number;
  endTimeMs: number;
  maxParticipants: number;
  participantSessionIds: string[];
  participantPlayerIds: string[];
  contributedPlayerIds: string[];
  claimedPlayerIds: string[];
  sharedProgressCount: number;
  targetProgress: number;
  rewardCoins: number;
}

export type RoomEventErrorCode =
  | 'INVALID_EVENT'
  | 'EVENT_NOT_ACTIVE'
  | 'EVENT_FULL'
  | 'NOT_PARTICIPATING'
  | 'REWARD_NOT_ELIGIBLE'
  | 'ALREADY_CLAIMED'
  | 'INVALID_EVENT_CONFIG';

export function createDefaultLiveZooEvents(
  nowMs = Date.now(),
  seasonalTheme: SeasonalThemeId = 'spring-blossom'
): Record<ZooEventId, LiveZooEventState> {
  const result = {} as Record<ZooEventId, LiveZooEventState>;

  for (const eventId of ZOO_EVENT_IDS) {
    const desc = ZOO_EVENTS_BY_ID[eventId];
    const startTimeMs = nowMs + desc.defaultStartOffsetMs;
    const endTimeMs = startTimeMs + desc.defaultDurationMs;
    const status: ZooEventStatus =
      desc.isSeasonal && seasonalTheme === 'none'
        ? 'finished'
        : desc.defaultStatus;

    result[eventId] = {
      eventId,
      eventInstanceId: `evinst_${eventId}_1`,
      status,
      startTimeMs,
      endTimeMs,
      maxParticipants: desc.defaultMaxParticipants,
      participantSessionIds: [],
      participantPlayerIds: [],
      contributedPlayerIds: [],
      claimedPlayerIds: [],
      sharedProgressCount: 0,
      targetProgress: desc.targetProgress,
      rewardCoins: desc.rewardCoins
    };
  }

  return result;
}

export function createDefaultEventsList(
  nowMs = Date.now(),
  seasonalTheme: SeasonalThemeId = 'spring-blossom'
): LiveZooEventState[] {
  const map = createDefaultLiveZooEvents(nowMs, seasonalTheme);
  return ZOO_EVENT_IDS.map((id) => map[id]);
}

function cloneLiveEvent(state: LiveZooEventState): LiveZooEventState {
  return {
    ...state,
    participantSessionIds: [...state.participantSessionIds],
    participantPlayerIds: [...state.participantPlayerIds],
    contributedPlayerIds: [...state.contributedPlayerIds],
    claimedPlayerIds: [...state.claimedPlayerIds]
  };
}

export class RoomEventsEngine {
  private seasonalTheme: SeasonalThemeId;
  private events: Record<ZooEventId, LiveZooEventState>;
  private instanceCounters: Record<ZooEventId, number>;

  constructor(
    nowMs = Date.now(),
    initialTheme: SeasonalThemeId = 'spring-blossom'
  ) {
    this.seasonalTheme = initialTheme;
    this.events = createDefaultLiveZooEvents(nowMs, initialTheme);
    this.instanceCounters = {
      'event-panda-feeding-gala': 1,
      'event-penguin-dive-show': 1,
      'event-guided-sanctuary-tour': 1,
      'event-plaza-group-photo': 1,
      'event-lantern-trivia-game': 1
    };
  }

  public getSeasonalTheme(): SeasonalThemeId {
    return this.seasonalTheme;
  }

  public getEventState(eventId: ZooEventId): LiveZooEventState {
    return cloneLiveEvent(this.events[eventId]);
  }

  public getEventsSnapshot(): LiveZooEventState[] {
    return ZOO_EVENT_IDS.map((eventId) => cloneLiveEvent(this.events[eventId]));
  }

  public joinEvent(
    sessionId: string,
    playerId: string,
    eventId: string
  ):
    | { ok: true; event: LiveZooEventState; notice: string }
    | {
        ok: false;
        code: 'INVALID_EVENT' | 'EVENT_NOT_ACTIVE' | 'EVENT_FULL';
        message: string;
      } {
    if (!isValidZooEventId(eventId)) {
      return {
        ok: false,
        code: 'INVALID_EVENT',
        message: `Unknown zoo event "${eventId}".`
      };
    }

    const ev = this.events[eventId];
    const desc = ZOO_EVENTS_BY_ID[eventId];

    if (ev.status !== 'active') {
      return {
        ok: false,
        code: 'EVENT_NOT_ACTIVE',
        message: `"${desc.title}" is currently ${ev.status} and cannot be joined right now.`
      };
    }

    // Idempotent if the session or player is already participating
    const alreadyInBySession = ev.participantSessionIds.includes(sessionId);
    const alreadyInByPlayer = ev.participantPlayerIds.includes(playerId);
    if (alreadyInBySession || alreadyInByPlayer) {
      if (!alreadyInBySession) {
        ev.participantSessionIds.push(sessionId);
      }
      if (!alreadyInByPlayer) {
        ev.participantPlayerIds.push(playerId);
      }
      return {
        ok: true,
        event: cloneLiveEvent(ev),
        notice: `Joined "${desc.title}"!`
      };
    }

    if (ev.participantPlayerIds.length >= ev.maxParticipants) {
      return {
        ok: false,
        code: 'EVENT_FULL',
        message: `"${desc.title}" is currently full (${ev.maxParticipants}/${ev.maxParticipants} participants).`
      };
    }

    ev.participantSessionIds.push(sessionId);
    ev.participantPlayerIds.push(playerId);

    return {
      ok: true,
      event: cloneLiveEvent(ev),
      notice: `Joined "${desc.title}" (${ev.participantPlayerIds.length}/${ev.maxParticipants} participants)!`
    };
  }

  public leaveEvent(
    sessionId: string,
    playerId: string,
    eventId: string
  ):
    | { ok: true; event: LiveZooEventState; notice: string }
    | {
        ok: false;
        code: 'INVALID_EVENT' | 'NOT_PARTICIPATING';
        message: string;
      } {
    if (!isValidZooEventId(eventId)) {
      return {
        ok: false,
        code: 'INVALID_EVENT',
        message: `Unknown zoo event "${eventId}".`
      };
    }

    const ev = this.events[eventId];
    const desc = ZOO_EVENTS_BY_ID[eventId];
    const wasInSession = ev.participantSessionIds.includes(sessionId);
    const wasInPlayer = ev.participantPlayerIds.includes(playerId);

    if (!wasInSession && !wasInPlayer) {
      return {
        ok: false,
        code: 'NOT_PARTICIPATING',
        message: `You are not currently participating in "${desc.title}".`
      };
    }

    ev.participantSessionIds = ev.participantSessionIds.filter(
      (id) => id !== sessionId
    );
    ev.participantPlayerIds = ev.participantPlayerIds.filter(
      (id) => id !== playerId
    );

    return {
      ok: true,
      event: cloneLiveEvent(ev),
      notice: `Left "${desc.title}". You can rejoin anytime while it remains active.`
    };
  }

  public removeParticipantSession(
    sessionId: string,
    playerId?: string
  ): {
    changed: boolean;
    affectedEventIds: ZooEventId[];
  } {
    const affectedEventIds: ZooEventId[] = [];
    for (const eventId of ZOO_EVENT_IDS) {
      const ev = this.events[eventId];
      const prevSessionsLen = ev.participantSessionIds.length;
      const prevPlayersLen = ev.participantPlayerIds.length;

      ev.participantSessionIds = ev.participantSessionIds.filter(
        (id) => id !== sessionId
      );
      if (playerId) {
        ev.participantPlayerIds = ev.participantPlayerIds.filter(
          (id) => id !== playerId
        );
      }

      if (
        ev.participantSessionIds.length !== prevSessionsLen ||
        ev.participantPlayerIds.length !== prevPlayersLen
      ) {
        affectedEventIds.push(eventId);
      }
    }

    return {
      changed: affectedEventIds.length > 0,
      affectedEventIds
    };
  }

  public performEventAction(
    sessionId: string,
    playerId: string,
    eventId: string
  ):
    | { ok: true; event: LiveZooEventState; notice: string }
    | {
        ok: false;
        code: 'INVALID_EVENT' | 'EVENT_NOT_ACTIVE' | 'NOT_PARTICIPATING';
        message: string;
      } {
    if (!isValidZooEventId(eventId)) {
      return {
        ok: false,
        code: 'INVALID_EVENT',
        message: `Unknown zoo event "${eventId}".`
      };
    }

    const ev = this.events[eventId];
    const desc = ZOO_EVENTS_BY_ID[eventId];

    if (ev.status !== 'active') {
      return {
        ok: false,
        code: 'EVENT_NOT_ACTIVE',
        message: `"${desc.title}" is not currently active.`
      };
    }

    const isParticipating =
      ev.participantSessionIds.includes(sessionId) ||
      ev.participantPlayerIds.includes(playerId);

    if (!isParticipating) {
      return {
        ok: false,
        code: 'NOT_PARTICIPATING',
        message: `Join "${desc.title}" first before performing the activity action.`
      };
    }

    if (!ev.contributedPlayerIds.includes(playerId)) {
      ev.contributedPlayerIds.push(playerId);
    }

    ev.sharedProgressCount = Math.min(
      Math.max(ev.targetProgress * 4, 20),
      ev.sharedProgressCount + 1
    );

    const goalReached = ev.sharedProgressCount >= ev.targetProgress;
    const notice = goalReached
      ? `🌟 Group goal reached for "${desc.title}" (${ev.sharedProgressCount}/${ev.targetProgress})! Claim your activity reward!`
      : `✨ Contributed to "${desc.title}" (${ev.sharedProgressCount}/${ev.targetProgress})! You are now eligible to claim your reward.`;

    return {
      ok: true,
      event: cloneLiveEvent(ev),
      notice
    };
  }

  public markRewardClaimed(
    playerId: string,
    eventId: string
  ):
    | {
        ok: true;
        event: LiveZooEventState;
        rewardCoins: number;
        zoneId: PassportZoneId;
      }
    | {
        ok: false;
        code: 'INVALID_EVENT' | 'REWARD_NOT_ELIGIBLE' | 'ALREADY_CLAIMED';
        message: string;
      } {
    if (!isValidZooEventId(eventId)) {
      return {
        ok: false,
        code: 'INVALID_EVENT',
        message: `Unknown zoo event "${eventId}".`
      };
    }

    const ev = this.events[eventId];
    const desc = ZOO_EVENTS_BY_ID[eventId];

    if (ev.claimedPlayerIds.includes(playerId)) {
      return {
        ok: false,
        code: 'ALREADY_CLAIMED',
        message: `You have already claimed the reward for this "${desc.title}" session.`
      };
    }

    if (!ev.contributedPlayerIds.includes(playerId)) {
      return {
        ok: false,
        code: 'REWARD_NOT_ELIGIBLE',
        message: `Participate in "${desc.title}" (${desc.actionLabel}) before claiming the activity reward.`
      };
    }

    ev.claimedPlayerIds.push(playerId);

    return {
      ok: true,
      event: cloneLiveEvent(ev),
      rewardCoins: ev.rewardCoins,
      zoneId: desc.zoneId
    };
  }

  public applyAdminConfig(
    rawConfig: unknown,
    nowMs = Date.now()
  ):
    | {
        ok: true;
        seasonalTheme: SeasonalThemeId;
        events: LiveZooEventState[];
        notice: string;
      }
    | {
        ok: false;
        code: 'INVALID_EVENT_CONFIG';
        message: string;
      } {
    const sanitized = sanitizeEventAdministrationConfig(rawConfig);
    if (!sanitized.valid) {
      return {
        ok: false,
        code: 'INVALID_EVENT_CONFIG',
        message:
          sanitized.rejectedReasons[0] ??
          'Invalid zoo event schedule configuration.'
      };
    }

    const notices: string[] = [];
    const explicitlyPatchedIds = new Set<ZooEventId>();

    for (const patch of sanitized.eventPatches) {
      const ev = this.events[patch.eventId];
      const desc = ZOO_EVENTS_BY_ID[patch.eventId];
      explicitlyPatchedIds.add(patch.eventId);

      const nextStart = patch.startTimeMs ?? ev.startTimeMs;
      const nextEnd = patch.endTimeMs ?? ev.endTimeMs;
      if (nextEnd <= nextStart) {
        return {
          ok: false,
          code: 'INVALID_EVENT_CONFIG',
          message: `Invalid schedule window for ${patch.eventId}: endTimeMs must be greater than startTimeMs.`
        };
      }

      const prevStatus = ev.status;
      ev.startTimeMs = nextStart;
      ev.endTimeMs = nextEnd;

      if (patch.maxParticipants !== undefined) {
        ev.maxParticipants = patch.maxParticipants;
      }

      if (patch.status !== undefined) {
        ev.status = patch.status;
      }

      if (
        patch.resetInstance === true ||
        (prevStatus === 'finished' && ev.status === 'active')
      ) {
        this.instanceCounters[patch.eventId] += 1;
        ev.eventInstanceId = `evinst_${patch.eventId}_${this.instanceCounters[patch.eventId]}`;
        ev.participantSessionIds = [];
        ev.participantPlayerIds = [];
        ev.contributedPlayerIds = [];
        ev.claimedPlayerIds = [];
        ev.sharedProgressCount = 0;
      } else if (ev.status !== 'active') {
        ev.participantSessionIds = [];
        ev.participantPlayerIds = [];
      }

      if (prevStatus !== 'active' && ev.status === 'active') {
        notices.push(
          `🎉 ${desc.icon} "${desc.title}" is now active at ${desc.locationLabel}!`
        );
      } else if (prevStatus === 'active' && ev.status === 'finished') {
        notices.push(`🏁 "${desc.title}" has concluded.`);
      } else {
        notices.push(`Updated schedule for "${desc.title}".`);
      }
    }

    if (
      sanitized.seasonalTheme !== undefined &&
      sanitized.seasonalTheme !== this.seasonalTheme
    ) {
      this.seasonalTheme = sanitized.seasonalTheme;
      const themeDesc = SEASONAL_THEMES_BY_ID[this.seasonalTheme];

      // Automatically toggle seasonal event if not explicitly overridden in the same patch
      if (!explicitlyPatchedIds.has('event-lantern-trivia-game')) {
        const seasonalEv = this.events['event-lantern-trivia-game'];
        if (this.seasonalTheme === 'none') {
          seasonalEv.status = 'finished';
          seasonalEv.participantSessionIds = [];
          seasonalEv.participantPlayerIds = [];
        } else if (seasonalEv.status !== 'active') {
          this.instanceCounters['event-lantern-trivia-game'] += 1;
          seasonalEv.eventInstanceId = `evinst_event-lantern-trivia-game_${this.instanceCounters['event-lantern-trivia-game']}`;
          seasonalEv.status = 'active';
          seasonalEv.startTimeMs = nowMs;
          seasonalEv.endTimeMs = nowMs + 45 * 60 * 1000;
          seasonalEv.participantSessionIds = [];
          seasonalEv.participantPlayerIds = [];
          seasonalEv.contributedPlayerIds = [];
          seasonalEv.claimedPlayerIds = [];
          seasonalEv.sharedProgressCount = 0;
        }
      }

      notices.unshift(
        this.seasonalTheme === 'none'
          ? '🌿 Seasonal festival decorations deactivated (Standard Sanctuary Season).'
          : `${themeDesc.badgeIcon} Seasonal Theme updated to ${themeDesc.label}!`
      );
    }

    return {
      ok: true,
      seasonalTheme: this.seasonalTheme,
      events: this.getEventsSnapshot(),
      notice:
        notices.join(' ') || 'Updated sanctuary event schedule & seasonal configuration.'
    };
  }
}

