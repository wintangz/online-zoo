import {
  ACHIEVEMENT_IDS,
  ACHIEVEMENTS_BY_ID,
  ANIMAL_SPECIES_IDS,
  AnimalSimulationSystem,
  ChatRateLimiter,
  createDefaultPassportState,
  createEmptyFoodInventory,
  createInitialRoomSeatStates,
  DEFAULT_AVATAR_APPEARANCE,
  DEFAULT_MAX_PLAYERS_PER_ROOM,
  DEFAULT_PUBLIC_INSTANCES,
  DEFAULT_ROOM_ID,
  deriveAccentColorFromSessionId,
  evaluatePassportAchievements,
  evaluateProximityZoneStamp,
  FOOD_CATALOG_BY_ID,
  getEmoteDescriptor,
  getOutfitColors,
  HEARTBEAT_TIMEOUT_MS,
  INITIAL_ZOO_COINS,
  isValidAchievementId,
  isValidAvatarAppearance,
  isValidEmoteId,
  isValidFoodItemId,
  isValidPassportZoneId,
  isValidPlayerId,
  isValidReportReason,
  isValidZooEventId,
  MAX_CHAT_HISTORY_ENTRIES,
  MAX_FOOD_ITEM_QUANTITY,
  PANDA_FOREST_LAYOUT,
  PASSPORT_ZONE_IDS,
  PASSPORT_ZONES_BY_ID,
  PROXIMITY_CHAT_RANGE_METERS,
  PUBLIC_BETA_VERSION,
  recordPassportActivityCompletion,
  recordPassportSocialInteraction,
  recordPassportZoneStamp,
  resolveHorizontalWorldCollisions,
  RESUME_GRACE_WINDOW_MS,
  RoomEventsEngine,
  sanitizeAvatarAppearance,
  sanitizeDiningWalletSnapshot,
  sanitizePlayerPassportState,
  SPEECH_BUBBLE_DURATION_MS,
  validateBetaFeedbackInput,
  validateChatMessage,
  validateDisplayName,
  ZOO_EVENTS_BY_ID,
  type AchievementRewardResultMessage,
  type ActiveAvatarEmote,
  type ActiveFoodConsumption,
  type AnimalFeedingEventMessage,
  type AnimalInstanceState,
  type AnimalSpeciesId,
  type AvatarAppearance,
  type BetaDiagnosticContext,
  type BetaFeedbackAckMessage,
  type BetaFeedbackRecord,
  type ChatRateLimiterOptions,
  type ClaimAchievementRewardMessage,
  type ClaimEventRewardMessage,
  type ConfigureInstanceMessage,
  type ConfigureZooEventsMessage,
  type ConsumeFoodItemMessage,
  type DiagnosticErrorEntry,
  type ErrorNoticeMessage,
  type EventErrorCode,
  type EventRewardResultMessage,
  type FoodConsumeResultMessage,
  type FoodInventoryRecord,
  type FoodPurchaseResultMessage,
  type FriendRequestRecord,
  type FriendStatusEntry,
  type HabitatFeedingState,
  type HabitatId,
  type InstanceDirectoryUpdateMessage,
  type InstancePlacementReason,
  type InteractPropMessage,
  type InteractSeatMessage,
  type JoinFriendInstanceMessage,
  type JoinZooEventMessage,
  type LeaveZooEventMessage,
  type LiveZooEventState,
  type MaintenanceNoticeState,
  type OccupancySnapshotResponse,
  type OpsHealthSnapshot,
  type OpsSnapshotMessage,
  type PandaForestLayoutConfig,
  type PerformEventActionMessage,
  type PlayerConsumptionUpdatedMessage,
  type PlayerEmoteTriggeredMessage,
  type PlayerIdentityUpdatedMessage,
  type PlayerJoinedMessage,
  type PlayerLeftMessage,
  type PlayerModerationReport,
  type PlayerMoveMessage,
  type PlayerPassportState,
  type PlayerSessionRecord,
  type PropStateUpdatedMessage,
  type ProximityChatBroadcastMessage,
  type ProximityChatMessage,
  type PurchaseFoodItemMessage,
  type RecordPassportProgressMessage,
  type RemoveFriendMessage,
  type ReportSubmittedAckMessage,
  type ResolvePlayerReportMessage,
  type RespondFriendRequestMessage,
  type RoomStateTickMessage,
  type SeasonalThemeId,
  type SeatStateUpdatedMessage,
  type SendChatMessage,
  type SendFriendRequestMessage,
  type SerializedPlayerState,
  type SetMaintenanceNoticeMessage,
  type SetPlayerBlockMessage,
  type SetSocialPrivacyMessage,
  type SharedPropAuthorityState,
  type SocialPresenceUpdateMessage,
  type SubmitBetaFeedbackMessage,
  type SubmitPlayerReportMessage,
  type SwitchInstanceMessage,
  type TriggerAnimalFeedingMessage,
  type TriggerEmoteMessage,
  type UpdateIdentityMessage,
  type WelcomeSnapshotMessage,
  type WorldSeatOccupancyState,
  type ZoneOccupancySummary,
  type ZooEventsSnapshotMessage,
  type ZooInstanceHealthStatus,
  type ZooInstanceRoom,
  type ZooInstanceSummary
} from '@online-zoo/game-core';

export interface ZooInstanceAuthorityOptions {
  maxPlayersPerRoom?: number;
  heartbeatTimeoutMs?: number;
  resumeGraceWindowMs?: number;
  proximityChatRangeMeters?: number;
  chatRateLimiterOptions?: ChatRateLimiterOptions;
  layout?: PandaForestLayoutConfig;
}

const MAX_LEGAL_RUN_SPEED = 7.5;
const JITTER_TOLERANCE_FACTOR = 1.25;
const BASE_DISPLACEMENT_SLACK = 0.35;
const MIN_VERTICAL_Y = 0.1;
const MAX_VERTICAL_Y = 4.5;
const AVATAR_COLLIDER_RADIUS = 0.45;
const GOLDEN_ANGLE_RAD = 2.399963229728653; // ~137.5 degrees

function normalizeRadians(angle: number): number {
  let a = (angle + Math.PI) % (2 * Math.PI);
  if (a < 0) a += 2 * Math.PI;
  return a - Math.PI;
}

export function serializePlayerRecord(record: PlayerSessionRecord): SerializedPlayerState {
  return {
    sessionId: record.sessionId,
    playerId: record.playerId,
    displayName: record.displayName,
    accentColor: record.accentColor,
    avatar: { ...record.avatar },
    position: [
      record.transform.position[0],
      record.transform.position[1],
      record.transform.position[2]
    ],
    velocity: [
      record.transform.velocity[0],
      record.transform.velocity[1],
      record.transform.velocity[2]
    ],
    facingYaw: record.transform.facingYaw,
    locomotionState: record.transform.locomotionState,
    sequence: record.transform.sequence,
    serverTimestamp: record.transform.serverTimestamp,
    ...(record.transform.reconciled !== undefined
      ? { reconciled: record.transform.reconciled }
      : {}),
    ...(record.transform.discrepancyDistance !== undefined
      ? { discrepancyDistance: record.transform.discrepancyDistance }
      : {}),
    activeEmote: record.activeEmote ? { ...record.activeEmote } : null,
    seatedOn: record.seatedOn
      ? {
          objectId: record.seatedOn.objectId,
          seatIndex: record.seatedOn.seatIndex,
          seatPosition: [
            record.seatedOn.seatPosition[0],
            record.seatedOn.seatPosition[1],
            record.seatedOn.seatPosition[2]
          ],
          facingYaw: record.seatedOn.facingYaw
        }
      : null,
    activeConsumption: record.activeConsumption ? { ...record.activeConsumption } : null
  };
}

/**
 * Pure server-authoritative multiplayer room and social engine (`FR-001`–`FR-024`).
 */
export class ZooInstanceAuthority {
  private readonly maxPlayersPerRoom: number;
  private readonly heartbeatTimeoutMs: number;
  private readonly resumeGraceWindowMs: number;
  private readonly proximityChatRangeMeters: number;
  private readonly layout: PandaForestLayoutConfig;
  private readonly chatRateLimiter: ChatRateLimiter;
  private readonly rooms = new Map<string, ZooInstanceRoom>();
  private readonly roomAnimalSystems = new Map<string, AnimalSimulationSystem>();
  private readonly sessionToRoom = new Map<string, string>();
  private readonly knownPlayerNames = new Map<string, string>();
  private readonly friendships = new Map<string, Set<string>>();
  private readonly pendingFriendRequests = new Map<string, FriendRequestRecord>();
  private readonly blockedPlayers = new Map<string, Set<string>>();
  private readonly moderationReports: PlayerModerationReport[] = [];
  private readonly playerWallets = new Map<
    string,
    { currencyBalance: number; inventory: FoodInventoryRecord }
  >();
  private readonly processedPurchaseRequests = new Map<string, FoodPurchaseResultMessage>();
  private readonly playerPassports = new Map<string, PlayerPassportState>();
  private readonly playerDiscoveredSpecies = new Map<string, Set<AnimalSpeciesId>>();
  private readonly processedRewardClaims = new Map<string, AchievementRewardResultMessage>();
  private readonly roomEventEngines = new Map<string, RoomEventsEngine>();
  private readonly processedEventRewardClaims = new Map<string, EventRewardResultMessage>();
  private readonly playerPrivacy = new Map<string, { allowFriendJoin: boolean }>();
  private readonly configuredRoomIds = new Set<string>();
  private readonly startedAt: number;
  private readonly betaFeedbackItems: BetaFeedbackRecord[] = [];
  private readonly feedbackTimestampsBySession = new Map<string, number[]>();
  private readonly diagnosticErrors: DiagnosticErrorEntry[] = [];
  private maintenanceNotice: MaintenanceNoticeState | null = null;

  private globalSessionCounter = 0;
  private globalMessageCounter = 0;
  private globalFriendReqCounter = 0;
  private globalReportCounter = 0;
  private globalFeedbackCounter = 0;
  private globalErrorCounter = 0;

  constructor(options: ZooInstanceAuthorityOptions = {}) {
    this.startedAt = Date.now();
    this.maxPlayersPerRoom = options.maxPlayersPerRoom ?? DEFAULT_MAX_PLAYERS_PER_ROOM;
    this.heartbeatTimeoutMs = options.heartbeatTimeoutMs ?? HEARTBEAT_TIMEOUT_MS;
    this.resumeGraceWindowMs = options.resumeGraceWindowMs ?? RESUME_GRACE_WINDOW_MS;
    this.proximityChatRangeMeters =
      options.proximityChatRangeMeters ?? PROXIMITY_CHAT_RANGE_METERS;
    this.layout = options.layout ?? PANDA_FOREST_LAYOUT;
    this.chatRateLimiter = new ChatRateLimiter(options.chatRateLimiterOptions);
  }

  public getRoom(roomId: string): ZooInstanceRoom | undefined {
    return this.rooms.get(roomId);
  }

  public getActivePlayerCount(roomId: string = DEFAULT_ROOM_ID): number {
    return this.rooms.get(roomId)?.activeSessions.size ?? 0;
  }

  public getAllRoomIds(): string[] {
    return Array.from(this.rooms.keys());
  }

  public getRoomIdForSession(sessionId: string): string | undefined {
    return this.sessionToRoom.get(sessionId);
  }

  public getModerationReports(): PlayerModerationReport[] {
    return [...this.moderationReports];
  }

  private getOrCreateAnimalSystem(roomId: string, now = Date.now()): AnimalSimulationSystem {
    let sys = this.roomAnimalSystems.get(roomId);
    if (!sys) {
      sys = new AnimalSimulationSystem(now);
      this.roomAnimalSystems.set(roomId, sys);
    }
    return sys;
  }

  public getRoomAnimals(roomId: string = DEFAULT_ROOM_ID): AnimalInstanceState[] {
    return this.getOrCreateAnimalSystem(roomId).getAnimals();
  }

  public getRoomHabitatFeedings(
    roomId: string = DEFAULT_ROOM_ID
  ): Record<HabitatId, HabitatFeedingState> {
    return this.getOrCreateAnimalSystem(roomId).getHabitatFeedings();
  }

  private getOrCreateEventEngine(
    roomId: string = DEFAULT_ROOM_ID,
    now = Date.now()
  ): RoomEventsEngine {
    let engine = this.roomEventEngines.get(roomId);
    if (!engine) {
      engine = new RoomEventsEngine(now, 'spring-blossom');
      this.roomEventEngines.set(roomId, engine);
    }
    return engine;
  }

  public getRoomEventsSnapshot(
    roomId: string = DEFAULT_ROOM_ID,
    now = Date.now()
  ): {
    seasonalTheme: SeasonalThemeId;
    events: LiveZooEventState[];
  } {
    const engine = this.getOrCreateEventEngine(roomId, now);
    return {
      seasonalTheme: engine.getSeasonalTheme(),
      events: engine.getEventsSnapshot()
    };
  }

  public getInstanceLabel(roomId: string): string {
    for (const preset of DEFAULT_PUBLIC_INSTANCES) {
      if (preset.roomId === roomId) {
        return preset.label;
      }
    }
    const overflowMatch = /^panda-forest-(\d+)$/.exec(roomId);
    if (overflowMatch && overflowMatch[1]) {
      return `Panda Forest #${overflowMatch[1]} (Overflow Sanctuary)`;
    }
    return `Sanctuary Instance (${roomId})`;
  }

  public getPlayerAllowFriendJoin(playerId: string): boolean {
    return this.playerPrivacy.get(playerId)?.allowFriendJoin ?? true;
  }

  /**
   * Prunes dynamically created overflow or custom rooms once they have 0 active
   * and 0 resumable sessions, unless explicitly configured (`FR-006`, `SC-001`).
   */
  public pruneEmptyOverflowRooms(now = Date.now()): string[] {
    const presetIds = new Set<string>(DEFAULT_PUBLIC_INSTANCES.map((p) => p.roomId));
    const pruned: string[] = [];
    for (const [roomId, room] of this.rooms.entries()) {
      this.pruneExpiredResumableTokens(room, now);
      if (
        !presetIds.has(roomId) &&
        !this.configuredRoomIds.has(roomId) &&
        (room.status ?? 'healthy') === 'healthy' &&
        room.activeSessions.size === 0 &&
        room.resumableSessions.size === 0
      ) {
        this.rooms.delete(roomId);
        this.roomAnimalSystems.delete(roomId);
        this.roomEventEngines.delete(roomId);
        pruned.push(roomId);
      }
    }
    return pruned;
  }

  /**
   * Returns a live directory of available zoo instances (`FR-025`, `SC-009`),
   * always including the default public channels plus any active custom/overflow rooms.
   * When `forPlayerId` is provided, annotates `friendCount` and sorts instances with friends first.
   */
  public getAvailableInstances(forPlayerId?: string): ZooInstanceSummary[] {
    this.pruneEmptyOverflowRooms();

    const presetIds = new Set<string>(DEFAULT_PUBLIC_INSTANCES.map((p) => p.roomId));
    const roomIds = new Set<string>(DEFAULT_PUBLIC_INSTANCES.map((p) => p.roomId));
    for (const rid of this.rooms.keys()) {
      roomIds.add(rid);
    }

    const friendCountByRoom = new Map<string, number>();
    if (forPlayerId) {
      const friendSet = this.friendships.get(forPlayerId);
      if (friendSet) {
        for (const friendId of friendSet) {
          if (this.isPlayerBlocked(forPlayerId, friendId)) continue;
          const friendSession = this.findActiveSessionByPlayerId(friendId);
          if (friendSession) {
            friendCountByRoom.set(
              friendSession.roomId,
              (friendCountByRoom.get(friendSession.roomId) ?? 0) + 1
            );
          }
        }
      }
    }

    const summaries: ZooInstanceSummary[] = [];
    for (const rid of roomIds) {
      const room = this.rooms.get(rid);
      const visitorCount = room ? room.activeSessions.size : 0;
      const maxPlayers = room ? room.maxPlayers : this.maxPlayersPerRoom;
      const status: ZooInstanceHealthStatus = room?.status ?? 'healthy';
      const friendCount = friendCountByRoom.get(rid) ?? 0;
      summaries.push({
        roomId: rid,
        label: this.getInstanceLabel(rid),
        visitorCount,
        maxPlayers,
        isFull: status === 'healthy' && visitorCount >= maxPlayers,
        status,
        friendCount,
        isOverflow: !presetIds.has(rid)
      });
    }

    if (forPlayerId) {
      summaries.sort((a, b) => {
        const fa = a.friendCount ?? 0;
        const fb = b.friendCount ?? 0;
        if (fb !== fa) return fb - fa;
        return 0;
      });
    }

    return summaries;
  }

  /**
   * Builds a live HTTP occupancy snapshot for `/occupancy` and `/api/occupancy` (`FR-002`).
   */
  public buildOccupancySnapshot(now = Date.now()): OccupancySnapshotResponse {
    const rooms = this.getAvailableInstances();
    let totalPlayers = 0;
    for (const room of rooms) {
      totalPlayers += room.visitorCount;
    }

    const pandaForestPrimary = rooms.find((r) => r.roomId === DEFAULT_ROOM_ID) ?? rooms[0];
    const pandaForestRooms = rooms.filter((r) => r.roomId.startsWith('panda-forest'));
    const pandaForestPlayers = pandaForestRooms.reduce((acc, r) => acc + r.visitorCount, 0);
    const pandaForestMaxPlayers = pandaForestPrimary?.maxPlayers ?? this.maxPlayersPerRoom;
    const healthyPandaRooms = pandaForestRooms.filter((r) => (r.status ?? 'healthy') === 'healthy');
    const pandaForestHealthy = healthyPandaRooms.length > 0;
    const pandaForestFull =
      healthyPandaRooms.length > 0 && healthyPandaRooms.every((r) => r.isFull);

    const zones: ZoneOccupancySummary[] = [
      {
        zoneId: 'panda-forest',
        displayName: 'Panda Forest',
        roomId: DEFAULT_ROOM_ID,
        playerCount: pandaForestPlayers,
        maxPlayers: pandaForestMaxPlayers,
        isFull: pandaForestFull,
        status: pandaForestHealthy ? 'healthy' : 'unhealthy'
      }
    ];

    return {
      status: 'ok',
      serverTimestamp: now,
      totalPlayers,
      zones,
      rooms
    };
  }

  /**
   * Ensures a session is active, automatically reactivating it from `resumableSessions`
   * if a backgrounded browser tab resumes sending messages on a still-open socket (`FR-029`, `SC-011`).
   */
  public ensureSessionActive(
    sessionId: string,
    now = Date.now()
  ): {
    room: ZooInstanceRoom | null;
    session: PlayerSessionRecord | null;
    reactivatedBroadcast: PlayerJoinedMessage | null;
  } {
    const activeRoomId = this.sessionToRoom.get(sessionId);
    if (activeRoomId) {
      const activeRoom = this.rooms.get(activeRoomId);
      const activeSession = activeRoom?.activeSessions.get(sessionId);
      if (activeRoom && activeSession) {
        activeSession.lastHeartbeatAt = now;
        return {
          room: activeRoom,
          session: activeSession,
          reactivatedBroadcast: null
        };
      }
    }

    for (const room of this.rooms.values()) {
      for (const [token, entry] of room.resumableSessions.entries()) {
        if (entry.record.sessionId === sessionId) {
          room.resumableSessions.delete(token);
          const restored: PlayerSessionRecord = {
            ...entry.record,
            lastHeartbeatAt: now,
            lastMoveAt: now
          };
          room.activeSessions.set(sessionId, restored);
          this.sessionToRoom.set(sessionId, room.roomId);
          return {
            room,
            session: restored,
            reactivatedBroadcast: {
              type: 'player_joined',
              roomId: room.roomId,
              player: serializePlayerRecord(restored),
              visitorCount: room.activeSessions.size,
              serverTimestamp: now
            }
          };
        }
      }
    }

    return {
      room: null,
      session: null,
      reactivatedBroadcast: null
    };
  }

  public findActiveSessionByPlayerId(playerId: string): PlayerSessionRecord | null {
    for (const room of this.rooms.values()) {
      for (const session of room.activeSessions.values()) {
        if (session.playerId === playerId) {
          return session;
        }
      }
    }
    return null;
  }

  private getOrCreateFriendSet(playerId: string): Set<string> {
    let set = this.friendships.get(playerId);
    if (!set) {
      set = new Set<string>();
      this.friendships.set(playerId, set);
    }
    return set;
  }

  private getOrCreateBlockSet(playerId: string): Set<string> {
    let set = this.blockedPlayers.get(playerId);
    if (!set) {
      set = new Set<string>();
      this.blockedPlayers.set(playerId, set);
    }
    return set;
  }

  public isPlayerBlocked(playerA: string, playerB: string): boolean {
    return Boolean(
      this.blockedPlayers.get(playerA)?.has(playerB) ||
        this.blockedPlayers.get(playerB)?.has(playerA)
    );
  }

  private getOrCreateRoom(
    requestedRoomId: string = DEFAULT_ROOM_ID,
    now = Date.now()
  ): ZooInstanceRoom {
    let existing = this.rooms.get(requestedRoomId);
    if (existing) {
      return existing;
    }
    const initialProps: Record<string, SharedPropAuthorityState> = {
      'prop-stone-lantern': {
        objectId: 'prop-stone-lantern',
        active: true,
        lastTriggeredBy: null,
        lastTriggeredAt: 0
      },
      'prop-wind-chime': {
        objectId: 'prop-wind-chime',
        active: false,
        lastTriggeredBy: null,
        lastTriggeredAt: 0
      },
      'prop-scenic-bench': {
        objectId: 'prop-scenic-bench',
        active: false,
        lastTriggeredBy: null,
        lastTriggeredAt: 0
      },
      'prop-plaza-bench': {
        objectId: 'prop-plaza-bench',
        active: false,
        lastTriggeredBy: null,
        lastTriggeredAt: 0
      },
      'prop-pond-chair': {
        objectId: 'prop-pond-chair',
        active: false,
        lastTriggeredBy: null,
        lastTriggeredAt: 0
      },
      'prop-plaza-cafe-table': {
        objectId: 'prop-plaza-cafe-table',
        active: false,
        lastTriggeredBy: null,
        lastTriggeredAt: 0
      },
      'prop-bamboo-picnic-table': {
        objectId: 'prop-bamboo-picnic-table',
        active: false,
        lastTriggeredBy: null,
        lastTriggeredAt: 0
      }
    };

    existing = {
      roomId: requestedRoomId,
      maxPlayers: this.maxPlayersPerRoom,
      status: 'healthy',
      nextVisitorNumber: 101,
      activeSessions: new Map(),
      resumableSessions: new Map(),
      propStates: initialProps,
      seatStates: createInitialRoomSeatStates(this.layout.interactiveObjects),
      recentChatHistory: [],
      tickSequence: 0,
      lastTickAt: now
    };
    this.rooms.set(requestedRoomId, existing);
    return existing;
  }

  private selectAvailableRoomWithReason(
    requestedRoomId: string = DEFAULT_ROOM_ID,
    now = Date.now(),
    playerId?: string,
    preferFriendPlacement = false,
    excludedRoomIds?: Set<string>
  ): {
    room: ZooInstanceRoom;
    placementReason: InstancePlacementReason;
    placementNotice?: string;
  } {
    // 1. Friend-prioritized placement when entering without an explicit pinned room override (FR-003, SC-002)
    if (preferFriendPlacement && playerId) {
      const friendSet = this.friendships.get(playerId);
      if (friendSet && friendSet.size > 0) {
        const candidateCounts = new Map<string, number>();
        for (const friendId of friendSet) {
          if (this.isPlayerBlocked(playerId, friendId)) continue;
          if (!this.getPlayerAllowFriendJoin(friendId)) continue;
          const friendSession = this.findActiveSessionByPlayerId(friendId);
          if (!friendSession) continue;
          if (excludedRoomIds?.has(friendSession.roomId)) continue;
          const friendRoom = this.rooms.get(friendSession.roomId);
          if (
            !friendRoom ||
            (friendRoom.status ?? 'healthy') !== 'healthy' ||
            friendRoom.activeSessions.size >= friendRoom.maxPlayers
          ) {
            continue;
          }
          candidateCounts.set(
            friendRoom.roomId,
            (candidateCounts.get(friendRoom.roomId) ?? 0) + 1
          );
        }

        let bestFriendRoomId: string | null = null;
        let bestFriendCount = 0;
        for (const [rid, count] of candidateCounts.entries()) {
          if (count > bestFriendCount) {
            bestFriendCount = count;
            bestFriendRoomId = rid;
          }
        }

        if (bestFriendRoomId && bestFriendCount > 0) {
          const friendRoom = this.getOrCreateRoom(bestFriendRoomId, now);
          const label = this.getInstanceLabel(friendRoom.roomId);
          return {
            room: friendRoom,
            placementReason: 'friend_priority',
            placementNotice: `Placed in ${label} alongside ${bestFriendCount} online ${bestFriendCount === 1 ? 'friend' : 'friends'}!`
          };
        }
      }
    }

    // 2. Check requested room if healthy, not excluded, and under capacity
    const primary = this.getOrCreateRoom(requestedRoomId, now);
    const primaryHealthy = (primary.status ?? 'healthy') === 'healthy';
    const primaryExcluded = Boolean(excludedRoomIds?.has(primary.roomId));
    if (
      primaryHealthy &&
      !primaryExcluded &&
      primary.activeSessions.size < primary.maxPlayers
    ) {
      return {
        room: primary,
        placementReason: 'requested'
      };
    }

    // 3. Otherwise find the first healthy preset or overflow room with available capacity (FR-002, FR-005, FR-007)
    const rawPrefix = requestedRoomId.replace(/-\d+$/, '');
    const basePrefix = rawPrefix || 'panda-forest';
    const candidateIds: string[] = [
      ...DEFAULT_PUBLIC_INSTANCES.map((p) => p.roomId)
    ];
    for (let idx = 1; idx < 100; idx++) {
      const cid = `${basePrefix}-${idx}`;
      if (!candidateIds.includes(cid)) {
        candidateIds.push(cid);
      }
    }

    for (const candidateId of candidateIds) {
      if (excludedRoomIds?.has(candidateId)) continue;
      const room = this.getOrCreateRoom(candidateId, now);
      if (
        (room.status ?? 'healthy') === 'healthy' &&
        room.activeSessions.size < room.maxPlayers
      ) {
        const label = this.getInstanceLabel(room.roomId);
        const notice = !primaryHealthy
          ? `Instance ${requestedRoomId} is currently unavailable; placed in ${label}.`
          : `Instance ${requestedRoomId} is full (${primary.activeSessions.size}/${primary.maxPlayers}); placed in ${label}.`;
        return {
          room,
          placementReason: !primaryHealthy ? 'failover_recovery' : 'overflow_redirect',
          placementNotice: notice
        };
      }
    }

    const fallbackId = `panda-forest-recovery-${now}`;
    const fallbackRoom = this.getOrCreateRoom(fallbackId, now);
    return {
      room: fallbackRoom,
      placementReason: 'failover_recovery',
      placementNotice: `Placed in recovery instance ${fallbackId}.`
    };
  }

  /**
   * Removes any duplicate active or resumable sessions for the same `playerId`
   * across all instances so rapid transfers or multi-tab joins never leave ghost avatars (`FR-012`, `SC-003`).
   */
  public purgeDuplicatePlayerSessions(
    playerId: string,
    excludeSessionId?: string,
    now = Date.now()
  ): PlayerLeftMessage[] {
    const leftBroadcasts: PlayerLeftMessage[] = [];
    if (!playerId) return leftBroadcasts;

    for (const room of this.rooms.values()) {
      for (const [token, entry] of room.resumableSessions.entries()) {
        if (
          entry.record.playerId === playerId &&
          entry.record.sessionId !== excludeSessionId
        ) {
          room.resumableSessions.delete(token);
        }
      }

      for (const [sessId, session] of Array.from(room.activeSessions.entries())) {
        if (session.playerId === playerId && sessId !== excludeSessionId) {
          this.releasePlayerSeat(room, session, now);
          this.getOrCreateEventEngine(room.roomId, now).removeParticipantSession(
            sessId,
            session.playerId
          );
          room.activeSessions.delete(sessId);
          this.sessionToRoom.delete(sessId);
          this.chatRateLimiter.clearSession(sessId);

          leftBroadcasts.push({
            type: 'player_left',
            roomId: room.roomId,
            sessionId: sessId,
            reason: 'switched_room',
            visitorCount: room.activeSessions.size,
            serverTimestamp: now
          });
        }
      }
    }

    return leftBroadcasts;
  }

  public computeSpawnPosition(spawnIndex: number): [number, number, number] {
    const base = this.layout.spawnPosition;
    if (spawnIndex <= 0) {
      return [base[0], base[1], base[2]];
    }
    const normalizedSlot = ((spawnIndex - 1) % 15) + 1;
    const radius = Math.min(2.2, 0.65 * Math.sqrt(normalizedSlot));
    const angle = normalizedSlot * GOLDEN_ANGLE_RAD;
    const candidateX = Number((base[0] + Math.cos(angle) * radius).toFixed(3));
    const candidateZ = Number((base[2] + Math.abs(Math.sin(angle)) * radius).toFixed(3));

    const resolved = resolveHorizontalWorldCollisions(
      [candidateX, base[1], candidateZ],
      AVATAR_COLLIDER_RADIUS,
      this.layout
    );
    return [
      Number(resolved.position[0].toFixed(3)),
      base[1],
      Number(resolved.position[2].toFixed(3))
    ];
  }

  private pruneExpiredResumableTokens(room: ZooInstanceRoom, now: number): void {
    for (const [token, entry] of room.resumableSessions.entries()) {
      if (now > entry.expiresAt) {
        room.resumableSessions.delete(token);
      }
    }
  }

  public disambiguateDisplayName(
    room: ZooInstanceRoom,
    baseDisplayName: string,
    excludeSessionId?: string,
    playerId?: string
  ): string {
    const targetLower = baseDisplayName.toLowerCase();
    const existingNamesLower = new Set<string>();
    let hasBaseCollision = false;

    for (const session of room.activeSessions.values()) {
      if (session.sessionId === excludeSessionId) continue;
      void playerId;
      existingNamesLower.add(session.displayName.toLowerCase());
      if (
        session.baseDisplayName.toLowerCase() === targetLower ||
        session.displayName.toLowerCase() === targetLower
      ) {
        hasBaseCollision = true;
      }
    }

    if (!hasBaseCollision) {
      return baseDisplayName;
    }

    let suffix = 2;
    while (suffix < 100) {
      const candidate = `${baseDisplayName} #${suffix}`;
      if (!existingNamesLower.has(candidate.toLowerCase())) {
        return candidate;
      }
      suffix += 1;
    }
    return `${baseDisplayName} #${suffix}`;
  }

  private getOrInitPlayerWallet(
    playerId: string,
    initialSnapshot?: unknown
  ): { currencyBalance: number; inventory: FoodInventoryRecord } {
    const existing = this.playerWallets.get(playerId);
    if (existing) {
      return existing;
    }
    const sanitized = sanitizeDiningWalletSnapshot(initialSnapshot);
    const created = {
      currencyBalance: sanitized.currencyBalance,
      inventory: { ...sanitized.inventory }
    };
    this.playerWallets.set(playerId, created);
    return created;
  }

  public getPlayerDiningWallet(playerId: string): {
    currencyBalance: number;
    inventory: FoodInventoryRecord;
  } {
    const wallet = this.getOrInitPlayerWallet(playerId);
    return {
      currencyBalance: wallet.currencyBalance,
      inventory: { ...wallet.inventory }
    };
  }

  private getOrInitDiscoveredSpeciesSet(playerId: string): Set<AnimalSpeciesId> {
    let set = this.playerDiscoveredSpecies.get(playerId);
    if (!set) {
      set = new Set<AnimalSpeciesId>();
      this.playerDiscoveredSpecies.set(playerId, set);
    }
    return set;
  }

  private getOrInitPlayerPassport(
    playerId: string,
    initialSnapshot?: unknown,
    nowIso = new Date().toISOString()
  ): PlayerPassportState {
    const existing = this.playerPassports.get(playerId);
    const incoming = initialSnapshot
      ? sanitizePlayerPassportState(initialSnapshot, nowIso)
      : null;

    if (!existing) {
      const created = incoming ?? createDefaultPassportState(nowIso);
      this.playerPassports.set(playerId, created);
      return created;
    }

    if (incoming) {
      for (const zoneId of PASSPORT_ZONE_IDS) {
        if (incoming.stamps[zoneId].obtained && !existing.stamps[zoneId].obtained) {
          existing.stamps[zoneId] = { ...incoming.stamps[zoneId] };
        }
      }
      for (const achId of ACHIEVEMENT_IDS) {
        const incAch = incoming.achievements[achId];
        const exAch = existing.achievements[achId];
        if (incAch.progressCount > exAch.progressCount) {
          exAch.progressCount = incAch.progressCount;
        }
        if (incAch.unlocked && !exAch.unlocked) {
          exAch.unlocked = true;
          exAch.unlockedAt = incAch.unlockedAt ?? nowIso;
        }
        if (incAch.claimed && !exAch.claimed) {
          exAch.claimed = true;
          exAch.claimedAt = incAch.claimedAt ?? nowIso;
        }
      }
      existing.socialInteractionsCount = Math.max(
        existing.socialInteractionsCount,
        incoming.socialInteractionsCount
      );
      existing.activitiesCompletedCount = Math.max(
        existing.activitiesCompletedCount,
        incoming.activitiesCompletedCount
      );
      for (const badge of incoming.earnedBadges) {
        if (!existing.earnedBadges.includes(badge)) {
          existing.earnedBadges.push(badge);
        }
      }
      if (!existing.activeBadge && incoming.activeBadge) {
        existing.activeBadge = incoming.activeBadge;
      }
      const speciesSet = this.getOrInitDiscoveredSpeciesSet(playerId);
      const evaluated = evaluatePassportAchievements(
        existing,
        speciesSet.size,
        nowIso
      ).state;
      this.playerPassports.set(playerId, evaluated);
      return evaluated;
    }

    return existing;
  }

  public getPlayerPassportState(playerId: string): PlayerPassportState {
    const passport = this.getOrInitPlayerPassport(playerId);
    return sanitizePlayerPassportState(passport, passport.updatedAt);
  }

  public joinOrResumePlayer(params: {
    requestedRoomId?: string;
    preferFriendPlacement?: boolean;
    allowFriendJoin?: boolean;
    resumeToken?: string | null;
    playerId?: string;
    displayName?: string;
    avatar?: AvatarAppearance | unknown;
    friendPlayerIds?: string[];
    blockedPlayerIds?: string[];
    diningWallet?: unknown;
    passportState?: unknown;
    deduplicatePlayerId?: boolean;
    now?: number;
  }): {
    welcome: WelcomeSnapshotMessage;
    joinedBroadcast: PlayerJoinedMessage;
    purgedDuplicates?: PlayerLeftMessage[];
  } {
    const now = params.now ?? Date.now();
    const requestedRoomId = params.requestedRoomId ?? DEFAULT_ROOM_ID;
    const preferFriendPlacement =
      params.preferFriendPlacement ?? requestedRoomId === DEFAULT_ROOM_ID;

    if (params.playerId && isValidPlayerId(params.playerId)) {
      this.syncInitialSocialLists(
        params.playerId,
        params.friendPlayerIds,
        params.blockedPlayerIds
      );
      if (typeof params.allowFriendJoin === 'boolean') {
        this.playerPrivacy.set(params.playerId, {
          allowFriendJoin: params.allowFriendJoin
        });
      }
    }

    // 1. Check if resumeToken matches an active or grace-window session in any healthy room
    if (params.resumeToken) {
      for (const room of this.rooms.values()) {
        this.pruneExpiredResumableTokens(room, now);
        const resumable = room.resumableSessions.get(params.resumeToken);
        if (
          resumable &&
          now <= resumable.expiresAt &&
          (room.status ?? 'healthy') === 'healthy' &&
          room.activeSessions.size < room.maxPlayers
        ) {
          room.resumableSessions.delete(params.resumeToken);
          const purgedDuplicates = params.deduplicatePlayerId
            ? this.purgeDuplicatePlayerSessions(
                resumable.record.playerId,
                resumable.record.sessionId,
                now
              )
            : [];

          let baseDisplayName = resumable.record.baseDisplayName;
          if (
            typeof params.displayName === 'string' &&
            !/^Explorer #\d+$/.test(params.displayName.trim())
          ) {
            const validated = validateDisplayName(params.displayName);
            if (validated.valid) {
              baseDisplayName = validated.normalizedName;
            }
          }
          const avatar = params.avatar
            ? sanitizeAvatarAppearance(params.avatar)
            : { ...resumable.record.avatar };
          const displayName = this.disambiguateDisplayName(
            room,
            baseDisplayName,
            resumable.record.sessionId,
            resumable.record.playerId
          );

          const wallet = this.getOrInitPlayerWallet(
            resumable.record.playerId,
            params.diningWallet
          );
          this.getOrInitPlayerPassport(
            resumable.record.playerId,
            params.passportState,
            new Date(now).toISOString()
          );
          if (typeof params.allowFriendJoin === 'boolean') {
            this.playerPrivacy.set(resumable.record.playerId, {
              allowFriendJoin: params.allowFriendJoin
            });
          }

          const resumedRecord: PlayerSessionRecord = {
            ...resumable.record,
            baseDisplayName,
            displayName,
            avatar,
            lastHeartbeatAt: now,
            lastMoveAt: now,
            activeEmote: null,
            seatedOn: null,
            currencyBalance: wallet.currencyBalance,
            foodInventory: { ...wallet.inventory },
            activeConsumption: null,
            transform: {
              ...resumable.record.transform,
              velocity: [0, 0, 0],
              locomotionState: 'Idle',
              serverTimestamp: now,
              reconciled: false,
              discrepancyDistance: 0
            }
          };
          room.activeSessions.set(resumedRecord.sessionId, resumedRecord);
          this.sessionToRoom.set(resumedRecord.sessionId, room.roomId);
          this.knownPlayerNames.set(resumedRecord.playerId, resumedRecord.baseDisplayName);
          this.syncInitialSocialLists(
            resumedRecord.playerId,
            params.friendPlayerIds,
            params.blockedPlayerIds
          );

          const serializedSelf = serializePlayerRecord(resumedRecord);
          return {
            welcome: this.buildWelcomeSnapshot(room, resumedRecord, true, now, {
              placementReason: 'requested'
            }),
            joinedBroadcast: {
              type: 'player_joined',
              roomId: room.roomId,
              player: serializedSelf,
              visitorCount: room.activeSessions.size,
              serverTimestamp: now
            },
            purgedDuplicates
          };
        }
      }
    }

    // 2. Assign a fresh session in an available room
    this.globalSessionCounter += 1;
    const prelimPlayerId = isValidPlayerId(params.playerId)
      ? params.playerId
      : `pid_sess_${this.globalSessionCounter.toString(16).padStart(4, '0')}`;
    const purgedDuplicates = params.deduplicatePlayerId
      ? this.purgeDuplicatePlayerSessions(prelimPlayerId, undefined, now)
      : [];

    const selection = this.selectAvailableRoomWithReason(
      requestedRoomId,
      now,
      prelimPlayerId,
      preferFriendPlacement
    );
    const room = selection.room;
    this.pruneExpiredResumableTokens(room, now);

    const visitorNum = room.nextVisitorNumber++;
    const sessionId = `sess_${this.globalSessionCounter.toString(16).padStart(4, '0')}_${visitorNum}`;
    const playerId = isValidPlayerId(params.playerId) ? params.playerId : `pid_${sessionId}`;
    const resumeToken = `tok_${sessionId}_${Math.random().toString(36).slice(2, 10)}`;

    const defaultVisitorLabel = `Explorer #${visitorNum}`;
    let baseDisplayName = defaultVisitorLabel;
    let hasCustomName = false;
    if (
      typeof params.displayName === 'string' &&
      !/^Explorer #\d+$/.test(params.displayName.trim())
    ) {
      const nameValidation = validateDisplayName(params.displayName);
      if (nameValidation.valid) {
        baseDisplayName = nameValidation.normalizedName;
        hasCustomName = true;
      }
    }

    const displayName = this.disambiguateDisplayName(room, baseDisplayName, sessionId, playerId);
    const avatar = sanitizeAvatarAppearance(params.avatar ?? DEFAULT_AVATAR_APPEARANCE);
    const isNonDefaultAvatar =
      avatar.skinTone !== DEFAULT_AVATAR_APPEARANCE.skinTone ||
      avatar.hairstyle !== DEFAULT_AVATAR_APPEARANCE.hairstyle ||
      avatar.hairColor !== DEFAULT_AVATAR_APPEARANCE.hairColor ||
      avatar.outfit !== DEFAULT_AVATAR_APPEARANCE.outfit ||
      avatar.accessory !== DEFAULT_AVATAR_APPEARANCE.accessory;

    const accentColor =
      hasCustomName || isNonDefaultAvatar
        ? getOutfitColors(avatar.outfit).accent
        : deriveAccentColorFromSessionId(sessionId);
    const spawnIndex = room.activeSessions.size;
    const spawnPosition = this.computeSpawnPosition(spawnIndex);
    const spawnYaw = Math.PI; // Facing North (-Z) down the Panda Forest trail
    const wallet = this.getOrInitPlayerWallet(playerId, params.diningWallet);
    this.getOrInitPlayerPassport(
      playerId,
      params.passportState,
      new Date(now).toISOString()
    );
    if (typeof params.allowFriendJoin === 'boolean') {
      this.playerPrivacy.set(playerId, {
        allowFriendJoin: params.allowFriendJoin
      });
    }

    const record: PlayerSessionRecord = {
      sessionId,
      playerId,
      resumeToken,
      baseDisplayName,
      displayName,
      accentColor,
      avatar,
      roomId: room.roomId,
      spawnIndex,
      connectedAt: now,
      lastHeartbeatAt: now,
      lastMoveAt: now,
      activeEmote: null,
      seatedOn: null,
      currencyBalance: wallet.currencyBalance,
      foodInventory: { ...wallet.inventory },
      activeConsumption: null,
      transform: {
        position: [spawnPosition[0], spawnPosition[1], spawnPosition[2]],
        velocity: [0, 0, 0],
        facingYaw: spawnYaw,
        locomotionState: 'Idle',
        sequence: 0,
        serverTimestamp: now,
        reconciled: false,
        discrepancyDistance: 0
      }
    };

    room.activeSessions.set(sessionId, record);
    this.sessionToRoom.set(sessionId, room.roomId);
    this.knownPlayerNames.set(playerId, baseDisplayName);
    this.syncInitialSocialLists(playerId, params.friendPlayerIds, params.blockedPlayerIds);

    return {
      welcome: this.buildWelcomeSnapshot(room, record, false, now, {
        placementReason: selection.placementReason,
        ...(selection.placementNotice !== undefined
          ? { placementNotice: selection.placementNotice }
          : {})
      }),
      joinedBroadcast: {
        type: 'player_joined',
        roomId: room.roomId,
        player: serializePlayerRecord(record),
        visitorCount: room.activeSessions.size,
        serverTimestamp: now
      },
      purgedDuplicates
    };
  }

  private syncInitialSocialLists(
    playerId: string,
    friendPlayerIds?: string[],
    blockedPlayerIds?: string[]
  ): void {
    if (Array.isArray(blockedPlayerIds)) {
      const blockSet = this.getOrCreateBlockSet(playerId);
      for (const bid of blockedPlayerIds) {
        if (bid && bid !== playerId) {
          blockSet.add(bid);
        }
      }
    }
    if (Array.isArray(friendPlayerIds)) {
      const friendSet = this.getOrCreateFriendSet(playerId);
      for (const fid of friendPlayerIds) {
        if (fid && fid !== playerId && !this.isPlayerBlocked(playerId, fid)) {
          friendSet.add(fid);
          this.getOrCreateFriendSet(fid).add(playerId);
        }
      }
    }
  }

  public updatePlayerIdentity(
    sessionId: string,
    msg: UpdateIdentityMessage,
    now = Date.now()
  ): {
    accepted: boolean;
    broadcast: PlayerIdentityUpdatedMessage | null;
    errorCode?: ErrorNoticeMessage['code'];
    errorMessage?: string;
  } {
    const { room, session } = this.ensureSessionActive(sessionId, now);
    if (!room || !session) {
      return {
        accepted: false,
        broadcast: null,
        errorCode: 'INVALID_IDENTITY_UPDATE',
        errorMessage: 'Session not active.'
      };
    }

    if (!isValidPlayerId(msg.playerId)) {
      return {
        accepted: false,
        broadcast: null,
        errorCode: 'INVALID_IDENTITY_UPDATE',
        errorMessage: 'Invalid persistent player identifier.'
      };
    }

    const nameValidation = validateDisplayName(msg.displayName);
    if (!nameValidation.valid) {
      return {
        accepted: false,
        broadcast: null,
        errorCode: 'INVALID_IDENTITY_UPDATE',
        errorMessage: nameValidation.errorMessage ?? 'Invalid display name.'
      };
    }

    if (!isValidAvatarAppearance(msg.avatar)) {
      return {
        accepted: false,
        broadcast: null,
        errorCode: 'INVALID_IDENTITY_UPDATE',
        errorMessage: 'Unsupported avatar customization option values.'
      };
    }

    const oldPlayerId = session.playerId;
    const baseDisplayName = nameValidation.normalizedName;
    const disambiguatedName = this.disambiguateDisplayName(
      room,
      baseDisplayName,
      sessionId,
      msg.playerId
    );
    const outfitColors = getOutfitColors(msg.avatar.outfit);

    session.playerId = msg.playerId;
    session.baseDisplayName = baseDisplayName;
    session.displayName = disambiguatedName;
    session.avatar = { ...msg.avatar };
    session.accentColor = outfitColors.accent;
    session.lastHeartbeatAt = now;
    this.knownPlayerNames.set(session.playerId, baseDisplayName);

    // If the player tuned their playerId, migrate their friendships/blocks if the new ID doesn't have any yet
    if (oldPlayerId !== msg.playerId) {
      const oldFriends = this.friendships.get(oldPlayerId);
      if (oldFriends && !this.friendships.has(msg.playerId)) {
        this.friendships.set(msg.playerId, new Set(oldFriends));
      }
      const oldBlocks = this.blockedPlayers.get(oldPlayerId);
      if (oldBlocks && !this.blockedPlayers.has(msg.playerId)) {
        this.blockedPlayers.set(msg.playerId, new Set(oldBlocks));
      }
    }

    // Update display name in any occupied seat slot
    if (session.seatedOn) {
      const slots = room.seatStates[session.seatedOn.objectId];
      const slot = slots?.find((s) => s.occupiedBySessionId === sessionId);
      if (slot) {
        slot.occupiedByPlayerId = session.playerId;
        slot.occupiedByDisplayName = session.displayName;
      }
    }

    return {
      accepted: true,
      broadcast: {
        type: 'player_identity_updated',
        roomId: room.roomId,
        sessionId: session.sessionId,
        playerId: session.playerId,
        displayName: session.displayName,
        accentColor: session.accentColor,
        avatar: { ...session.avatar },
        serverTimestamp: now
      }
    };
  }

  private buildWelcomeSnapshot(
    room: ZooInstanceRoom,
    selfRecord: PlayerSessionRecord,
    resumed: boolean,
    now: number,
    placementMeta?: {
      placementReason?: InstancePlacementReason;
      placementNotice?: string;
    }
  ): WelcomeSnapshotMessage {
    const players: SerializedPlayerState[] = [];
    for (const session of room.activeSessions.values()) {
      players.push(serializePlayerRecord(session));
    }

    const propStates: Record<string, { active: boolean; lastTriggeredAt: number }> = {};
    for (const [key, val] of Object.entries(room.propStates)) {
      propStates[key] = {
        active: val.active,
        lastTriggeredAt: val.lastTriggeredAt
      };
    }

    const seatStates: Record<string, WorldSeatOccupancyState[]> = {};
    for (const [objId, slots] of Object.entries(room.seatStates)) {
      seatStates[objId] = slots.map((s): WorldSeatOccupancyState => ({
        ...s,
        worldPosition: [s.worldPosition[0], s.worldPosition[1], s.worldPosition[2]]
      }));
    }

    return {
      type: 'welcome_snapshot',
      roomId: room.roomId,
      sessionId: selfRecord.sessionId,
      playerId: selfRecord.playerId,
      resumeToken: selfRecord.resumeToken,
      displayName: selfRecord.displayName,
      accentColor: selfRecord.accentColor,
      avatar: { ...selfRecord.avatar },
      resumed,
      spawnPosition: [
        selfRecord.transform.position[0],
        selfRecord.transform.position[1],
        selfRecord.transform.position[2]
      ],
      spawnYaw: selfRecord.transform.facingYaw,
      serverTimestamp: now,
      players,
      propStates,
      seatStates,
      availableInstances: this.getAvailableInstances(selfRecord.playerId),
      ...(placementMeta?.placementReason !== undefined
        ? { placementReason: placementMeta.placementReason }
        : {}),
      ...(placementMeta?.placementNotice !== undefined
        ? { placementNotice: placementMeta.placementNotice }
        : {}),
      allowFriendJoin: this.getPlayerAllowFriendJoin(selfRecord.playerId),
      animals: this.getOrCreateAnimalSystem(room.roomId, now).getAnimals(),
      habitatFeedings: this.getOrCreateAnimalSystem(room.roomId, now).getHabitatFeedings(),
      diningWallet: {
        currencyBalance: selfRecord.currencyBalance ?? INITIAL_ZOO_COINS,
        inventory: { ...(selfRecord.foodInventory ?? createEmptyFoodInventory()) }
      },
      passportState: this.getPlayerPassportState(selfRecord.playerId),
      zooEvents: this.getRoomEventsSnapshot(room.roomId, now),
      maintenanceNotice: this.maintenanceNotice ? { ...this.maintenanceNotice } : null
    };
  }

  /**
   * Validates and applies a client movement update (`FR-011`, `FR-012`, `SC-006`, `VR-004`–`VR-006`).
   * Automatically cancels active emotes (`FR-011`) and releases occupied bench seats (`FR-015`) when moving.
   */
  public processPlayerMove(
    sessionId: string,
    msg: PlayerMoveMessage,
    now = Date.now()
  ): {
    accepted: boolean;
    state: SerializedPlayerState | null;
    emoteCancelledBroadcast?: PlayerEmoteTriggeredMessage | null;
    seatReleasedBroadcast?: SeatStateUpdatedMessage | null;
    errorCode?: ErrorNoticeMessage['code'];
  } {
    const { room, session } = this.ensureSessionActive(sessionId, now);
    if (!room || !session) {
      return { accepted: false, state: null, errorCode: 'INVALID_PAYLOAD' };
    }

    if (msg.sequence <= session.transform.sequence) {
      return {
        accepted: false,
        state: serializePlayerRecord(session),
        errorCode: 'STALE_SEQUENCE'
      };
    }

    const prevPos = session.transform.position;
    const rawElapsedSec = (now - session.lastMoveAt) / 1000;
    const dt = Math.min(1.0, Math.max(0.016, rawElapsedSec));

    let targetX = msg.position[0];
    const targetY = Math.min(MAX_VERTICAL_Y, Math.max(MIN_VERTICAL_Y, msg.position[1]));
    let targetZ = msg.position[2];

    let reconciled = false;

    if (msg.position[1] < MIN_VERTICAL_Y - 0.05 || msg.position[1] > MAX_VERTICAL_Y + 0.05) {
      reconciled = true;
    }

    const dx = targetX - prevPos[0];
    const dz = targetZ - prevPos[2];
    const horizontalDist = Math.hypot(dx, dz);
    const maxAllowedDist =
      MAX_LEGAL_RUN_SPEED * JITTER_TOLERANCE_FACTOR * dt + BASE_DISPLACEMENT_SLACK;

    if (horizontalDist > maxAllowedDist && horizontalDist > 1e-5) {
      const scale = maxAllowedDist / horizontalDist;
      targetX = prevPos[0] + dx * scale;
      targetZ = prevPos[2] + dz * scale;
      reconciled = true;
    }

    const collisionResolved = resolveHorizontalWorldCollisions(
      [targetX, targetY, targetZ],
      AVATAR_COLLIDER_RADIUS,
      this.layout
    );

    if (collisionResolved.collided) {
      const postCollisionDiff = Math.hypot(
        collisionResolved.position[0] - msg.position[0],
        collisionResolved.position[2] - msg.position[2]
      );
      if (postCollisionDiff > 0.02) {
        reconciled = true;
      }
    }

    const finalX = Number(collisionResolved.position[0].toFixed(4));
    const finalY = Number(targetY.toFixed(4));
    const finalZ = Number(collisionResolved.position[2].toFixed(4));

    const discrepancyDistance = Number(
      Math.hypot(finalX - msg.position[0], finalZ - msg.position[2]).toFixed(4)
    );

    const vx = Math.max(-MAX_LEGAL_RUN_SPEED, Math.min(MAX_LEGAL_RUN_SPEED, msg.velocity[0]));
    const vy = Math.max(-25.0, Math.min(10.0, msg.velocity[1]));
    const vz = Math.max(-MAX_LEGAL_RUN_SPEED, Math.min(MAX_LEGAL_RUN_SPEED, msg.velocity[2]));

    let emoteCancelledBroadcast: PlayerEmoteTriggeredMessage | null = null;
    if (
      session.activeEmote &&
      (msg.locomotionState !== 'Idle' || horizontalDist > 0.08)
    ) {
      session.activeEmote = null;
      emoteCancelledBroadcast = {
        type: 'player_emote_triggered',
        roomId: room.roomId,
        sessionId: session.sessionId,
        playerId: session.playerId,
        emote: null,
        serverTimestamp: now
      };
    }

    let seatReleasedBroadcast: SeatStateUpdatedMessage | null = null;
    if (
      session.seatedOn &&
      (msg.locomotionState !== 'Idle' ||
        Math.hypot(
          finalX - session.seatedOn.seatPosition[0],
          finalZ - session.seatedOn.seatPosition[2]
        ) > 0.25)
    ) {
      seatReleasedBroadcast = this.releasePlayerSeat(room, session, now);
    }

    session.lastMoveAt = now;
    session.lastHeartbeatAt = now;
    session.transform = {
      position: [finalX, finalY, finalZ],
      velocity: [vx, vy, vz],
      facingYaw: normalizeRadians(msg.facingYaw),
      locomotionState: msg.locomotionState,
      sequence: msg.sequence,
      serverTimestamp: now,
      reconciled,
      discrepancyDistance
    };

    const currentPassport = this.getOrInitPlayerPassport(session.playerId);
    const speciesSet = this.getOrInitDiscoveredSpeciesSet(session.playerId);
    const proxRes = evaluateProximityZoneStamp(
      [finalX, finalY, finalZ],
      currentPassport,
      speciesSet.size,
      new Date(now).toISOString(),
      null
    );
    if (
      proxRes.newlyStampedZoneIds.length > 0 ||
      proxRes.newlyUnlockedAchievementIds.length > 0
    ) {
      this.playerPassports.set(session.playerId, proxRes.state);
    }

    return {
      accepted: true,
      state: serializePlayerRecord(session),
      emoteCancelledBroadcast,
      seatReleasedBroadcast,
      ...(reconciled ? { errorCode: 'OUT_OF_BOUNDS_CLAMPED' as const } : {})
    };
  }

  /**
   * Processes proximity text chat messages (`FR-001`–`FR-007`, `SC-001`–`SC-003`).
   * Validates content & length (`1..140` chars), applies rate limits, and filters recipients to `<= 24.0m`.
   */
  public processChatMessage(
    sessionId: string,
    msg: SendChatMessage,
    now = Date.now()
  ): {
    accepted: boolean;
    broadcast: ProximityChatBroadcastMessage | null;
    recipientSessionIds: string[];
    errorCode?: ErrorNoticeMessage['code'];
    errorMessage?: string;
  } {
    const { room, session: sender } = this.ensureSessionActive(sessionId, now);
    if (!room || !sender) {
      return {
        accepted: false,
        broadcast: null,
        recipientSessionIds: [],
        errorCode: 'INVALID_PAYLOAD',
        errorMessage: 'Session not active.'
      };
    }

    const validation = validateChatMessage(msg.text);
    if (!validation.valid) {
      return {
        accepted: false,
        broadcast: null,
        recipientSessionIds: [],
        errorCode:
          validation.errorCode === 'PROFANITY_BLOCKED'
            ? 'CHAT_MODERATION_BLOCKED'
            : 'INVALID_PAYLOAD',
        errorMessage: validation.errorMessage ?? 'Invalid chat message.'
      };
    }

    const rateCheck = this.chatRateLimiter.checkAndRecord(sessionId, now);
    if (!rateCheck.allowed) {
      return {
        accepted: false,
        broadcast: null,
        recipientSessionIds: [],
        errorCode: 'CHAT_RATE_LIMITED',
        errorMessage: `Rate limit reached. Please wait ${Math.ceil(rateCheck.retryAfterMs / 100) / 10}s before sending another message.`
      };
    }

    sender.lastHeartbeatAt = now;
    this.globalMessageCounter += 1;
    const chatMessage: ProximityChatMessage = {
      messageId: `msg_${this.globalMessageCounter}_${now}`,
      roomId: room.roomId,
      senderSessionId: sender.sessionId,
      senderPlayerId: sender.playerId,
      senderDisplayName: sender.displayName,
      senderAccentColor: sender.accentColor,
      text: validation.normalizedText,
      position: [
        sender.transform.position[0],
        sender.transform.position[1],
        sender.transform.position[2]
      ],
      createdAt: now,
      expiresAt: now + SPEECH_BUBBLE_DURATION_MS
    };

    room.recentChatHistory.push(chatMessage);
    if (room.recentChatHistory.length > MAX_CHAT_HISTORY_ENTRIES) {
      room.recentChatHistory.splice(0, room.recentChatHistory.length - MAX_CHAT_HISTORY_ENTRIES);
    }

    const senderPassport = this.getOrInitPlayerPassport(sender.playerId);
    const senderSpeciesSet = this.getOrInitDiscoveredSpeciesSet(sender.playerId);
    this.playerPassports.set(
      sender.playerId,
      recordPassportSocialInteraction(
        senderPassport,
        senderSpeciesSet.size,
        new Date(now).toISOString(),
        null
      ).state
    );

    const recipientSessionIds: string[] = [];
    for (const target of room.activeSessions.values()) {
      if (this.isPlayerBlocked(target.playerId, sender.playerId)) {
        continue;
      }
      const dx = target.transform.position[0] - sender.transform.position[0];
      const dz = target.transform.position[2] - sender.transform.position[2];
      const dist = Math.hypot(dx, dz);
      if (dist <= this.proximityChatRangeMeters) {
        recipientSessionIds.push(target.sessionId);
      }
    }

    return {
      accepted: true,
      broadcast: {
        type: 'proximity_chat_message',
        message: chatMessage
      },
      recipientSessionIds
    };
  }

  /**
   * Triggers or cancels an avatar emote (`FR-009`–`FR-011`, `SC-004`).
   */
  public processTriggerEmote(
    sessionId: string,
    msg: TriggerEmoteMessage,
    now = Date.now()
  ): {
    accepted: boolean;
    broadcast: PlayerEmoteTriggeredMessage | null;
    recipientSessionIds: string[];
  } {
    const { room, session: sender } = this.ensureSessionActive(sessionId, now);
    if (!room || !sender) {
      return { accepted: false, broadcast: null, recipientSessionIds: [] };
    }

    if (msg.emoteId !== null && !isValidEmoteId(msg.emoteId)) {
      return { accepted: false, broadcast: null, recipientSessionIds: [] };
    }

    sender.lastHeartbeatAt = now;
    let activeEmote: ActiveAvatarEmote | null = null;
    if (msg.emoteId !== null) {
      const desc = getEmoteDescriptor(msg.emoteId);
      activeEmote = {
        emoteId: desc.id,
        label: desc.label,
        icon: desc.icon,
        startedAt: now,
        expiresAt: now + desc.durationMs
      };
      const senderPassport = this.getOrInitPlayerPassport(sender.playerId);
      const senderSpeciesSet = this.getOrInitDiscoveredSpeciesSet(sender.playerId);
      this.playerPassports.set(
        sender.playerId,
        recordPassportSocialInteraction(
          senderPassport,
          senderSpeciesSet.size,
          new Date(now).toISOString(),
          null
        ).state
      );
    }

    sender.activeEmote = activeEmote;

    const recipientSessionIds: string[] = [];
    for (const target of room.activeSessions.values()) {
      if (this.isPlayerBlocked(target.playerId, sender.playerId)) {
        continue;
      }
      const dx = target.transform.position[0] - sender.transform.position[0];
      const dz = target.transform.position[2] - sender.transform.position[2];
      if (Math.hypot(dx, dz) <= this.proximityChatRangeMeters * 1.5) {
        recipientSessionIds.push(target.sessionId);
      }
    }

    return {
      accepted: true,
      broadcast: {
        type: 'player_emote_triggered',
        roomId: room.roomId,
        sessionId: sender.sessionId,
        playerId: sender.playerId,
        emote: activeEmote,
        serverTimestamp: now
      },
      recipientSessionIds
    };
  }

  /**
   * Releases any bench or chair seat currently occupied by `session` (`FR-015`).
   */
  private releasePlayerSeat(
    room: ZooInstanceRoom,
    session: PlayerSessionRecord,
    now = Date.now()
  ): SeatStateUpdatedMessage | null {
    const seatedOn = session.seatedOn;
    session.seatedOn = null;

    let updatedObjectId: string | null = seatedOn?.objectId ?? null;
    for (const [objId, slots] of Object.entries(room.seatStates)) {
      for (const slot of slots) {
        if (slot.occupiedBySessionId === session.sessionId) {
          slot.occupiedBySessionId = null;
          slot.occupiedByPlayerId = null;
          slot.occupiedByDisplayName = null;
          slot.occupiedAt = 0;
          updatedObjectId = objId;
        }
      }
    }

    if (!updatedObjectId) {
      return null;
    }

    const slots = room.seatStates[updatedObjectId] ?? [];
    const anyOccupied = slots.some((s) => s.occupiedBySessionId !== null);
    const propState = room.propStates[updatedObjectId];
    if (propState) {
      propState.active = anyOccupied;
      propState.lastTriggeredBy = session.sessionId;
      propState.lastTriggeredAt = now;
    }

    return {
      type: 'seat_state_updated',
      roomId: room.roomId,
      objectId: updatedObjectId,
      seats: slots.map((s): WorldSeatOccupancyState => ({
        ...s,
        worldPosition: [s.worldPosition[0], s.worldPosition[1], s.worldPosition[2]]
      })),
      propActive: anyOccupied,
      triggeredBySessionId: session.sessionId,
      serverTimestamp: now
    };
  }

  /**
   * Authoritatively claims or vacates a seat on a multi-seat bench or chair (`FR-012`–`FR-015`, `SC-005`).
   */
  public processSeatInteraction(
    sessionId: string,
    msg: InteractSeatMessage,
    now = Date.now()
  ): {
    accepted: boolean;
    seatUpdate: SeatStateUpdatedMessage | null;
    previousSeatUpdate?: SeatStateUpdatedMessage | null;
    playerState: SerializedPlayerState | null;
    errorCode?: ErrorNoticeMessage['code'];
    errorMessage?: string;
  } {
    const { room, session } = this.ensureSessionActive(sessionId, now);
    if (!room || !session) {
      return { accepted: false, seatUpdate: null, playerState: null, errorCode: 'INVALID_PAYLOAD' };
    }

    session.lastHeartbeatAt = now;

    if (msg.action === 'stand') {
      const released = this.releasePlayerSeat(room, session, now);
      return {
        accepted: true,
        seatUpdate: released,
        playerState: serializePlayerRecord(session)
      };
    }

    const slots = room.seatStates[msg.objectId];
    if (!slots || slots.length === 0) {
      return {
        accepted: false,
        seatUpdate: null,
        playerState: serializePlayerRecord(session),
        errorCode: 'INVALID_PAYLOAD',
        errorMessage: 'Object does not support seating.'
      };
    }

    // If the player is already sitting on this exact object and did not ask for a different seat, stand them up
    if (
      session.seatedOn?.objectId === msg.objectId &&
      (msg.preferredSeatIndex === undefined ||
        msg.preferredSeatIndex === session.seatedOn.seatIndex)
    ) {
      const released = this.releasePlayerSeat(room, session, now);
      return {
        accepted: true,
        seatUpdate: released,
        playerState: serializePlayerRecord(session)
      };
    }

    // Find an available seat slot
    let targetSlot: WorldSeatOccupancyState | undefined;
    if (msg.preferredSeatIndex !== undefined) {
      const preferred = slots.find((s) => s.seatIndex === msg.preferredSeatIndex);
      if (
        preferred &&
        (preferred.occupiedBySessionId === null || preferred.occupiedBySessionId === sessionId)
      ) {
        targetSlot = preferred;
      }
    }
    if (!targetSlot) {
      targetSlot = slots.find((s) => s.occupiedBySessionId === null);
    }

    if (!targetSlot) {
      return {
        accepted: false,
        seatUpdate: null,
        playerState: serializePlayerRecord(session),
        errorCode: 'SEAT_OCCUPIED',
        errorMessage: 'All seats on this bench are currently occupied.'
      };
    }

    // Vacate any previous seat first
    let previousSeatUpdate: SeatStateUpdatedMessage | null = null;
    if (session.seatedOn) {
      previousSeatUpdate = this.releasePlayerSeat(room, session, now);
    }

    targetSlot.occupiedBySessionId = session.sessionId;
    targetSlot.occupiedByPlayerId = session.playerId;
    targetSlot.occupiedByDisplayName = session.displayName;
    targetSlot.occupiedAt = now;

    session.seatedOn = {
      objectId: msg.objectId,
      seatIndex: targetSlot.seatIndex,
      seatPosition: [
        targetSlot.worldPosition[0],
        targetSlot.worldPosition[1],
        targetSlot.worldPosition[2]
      ],
      facingYaw: targetSlot.facingYaw
    };
    session.transform = {
      ...session.transform,
      position: [
        targetSlot.worldPosition[0],
        targetSlot.worldPosition[1],
        targetSlot.worldPosition[2]
      ],
      velocity: [0, 0, 0],
      facingYaw: targetSlot.facingYaw,
      locomotionState: 'Idle',
      serverTimestamp: now,
      reconciled: false,
      discrepancyDistance: 0
    };

    const anyOccupied = slots.some((s) => s.occupiedBySessionId !== null);
    const propState = room.propStates[msg.objectId];
    if (propState) {
      propState.active = anyOccupied;
      propState.lastTriggeredBy = session.sessionId;
      propState.lastTriggeredAt = now;
    }

    const seatedPassport = this.getOrInitPlayerPassport(session.playerId);
    const seatedSpeciesSet = this.getOrInitDiscoveredSpeciesSet(session.playerId);
    this.playerPassports.set(
      session.playerId,
      recordPassportSocialInteraction(
        seatedPassport,
        seatedSpeciesSet.size,
        new Date(now).toISOString(),
        null
      ).state
    );

    const seatUpdate: SeatStateUpdatedMessage = {
      type: 'seat_state_updated',
      roomId: room.roomId,
      objectId: msg.objectId,
      seats: slots.map((s): WorldSeatOccupancyState => ({
        ...s,
        worldPosition: [s.worldPosition[0], s.worldPosition[1], s.worldPosition[2]]
      })),
      propActive: anyOccupied,
      triggeredBySessionId: session.sessionId,
      serverTimestamp: now
    };

    return {
      accepted: true,
      seatUpdate,
      previousSeatUpdate:
        previousSeatUpdate && previousSeatUpdate.objectId !== msg.objectId
          ? previousSeatUpdate
          : null,
      playerState: serializePlayerRecord(session)
    };
  }

  /**
   * Synchronizes shared world prop interactions (`FR-010`, `FR-012`–`FR-016`).
   * If `objectId` is a bench/chair with seat slots, delegates to `processSeatInteraction`.
   */
  public processPropInteraction(
    sessionId: string,
    msg: InteractPropMessage,
    now = Date.now()
  ): {
    propUpdate: PropStateUpdatedMessage | null;
    seatUpdate?: SeatStateUpdatedMessage | null;
    errorCode?: ErrorNoticeMessage['code'];
    errorMessage?: string;
  } {
    const { room, session } = this.ensureSessionActive(sessionId, now);
    if (!room || !session) return { propUpdate: null };

    if (room.seatStates[msg.objectId]) {
      const isAlreadySeatedHere = session.seatedOn?.objectId === msg.objectId;
      const seatRes = this.processSeatInteraction(
        sessionId,
        {
          type: 'interact_seat',
          objectId: msg.objectId,
          action: isAlreadySeatedHere ? 'stand' : 'sit',
          clientTimestamp: msg.clientTimestamp
        },
        now
      );
      if (!seatRes.accepted) {
        return {
          propUpdate: null,
          seatUpdate: null,
          ...(seatRes.errorCode !== undefined ? { errorCode: seatRes.errorCode } : {}),
          ...(seatRes.errorMessage !== undefined ? { errorMessage: seatRes.errorMessage } : {})
        };
      }
      const prop = room.propStates[msg.objectId];
      return {
        propUpdate: prop
          ? {
              type: 'prop_state_updated',
              roomId: room.roomId,
              objectId: msg.objectId,
              active: prop.active,
              triggeredBySessionId: sessionId,
              lastTriggeredAt: now
            }
          : null,
        seatUpdate: seatRes.seatUpdate
      };
    }

    const prop = room.propStates[msg.objectId];
    if (!prop) return { propUpdate: null };

    session.lastHeartbeatAt = now;
    const nextActive = !prop.active;
    prop.active = nextActive;
    prop.lastTriggeredBy = sessionId;
    prop.lastTriggeredAt = now;

    return {
      propUpdate: {
        type: 'prop_state_updated',
        roomId: room.roomId,
        objectId: msg.objectId,
        active: nextActive,
        triggeredBySessionId: sessionId,
        lastTriggeredAt: now
      }
    };
  }

  /**
   * Builds a player's live friend list, online status, room capacity, and pending requests (`FR-017`–`FR-020`).
   */
  public buildSocialPresenceForPlayer(
    playerId: string,
    now = Date.now()
  ): SocialPresenceUpdateMessage {
    const friendSet = this.getOrCreateFriendSet(playerId);
    const blockSet = this.getOrCreateBlockSet(playerId);
    const friends: FriendStatusEntry[] = [];

    for (const friendId of friendSet) {
      if (this.isPlayerBlocked(playerId, friendId)) continue;
      const activeSession = this.findActiveSessionByPlayerId(friendId);
      const activeRoom = activeSession ? this.rooms.get(activeSession.roomId) : undefined;
      const roomVisitorCount = activeRoom ? activeRoom.activeSessions.size : 0;
      const roomMaxPlayers = activeRoom ? activeRoom.maxPlayers : this.maxPlayersPerRoom;
      const roomStatus: ZooInstanceHealthStatus = activeRoom?.status ?? 'healthy';
      const friendAllowJoin = this.getPlayerAllowFriendJoin(friendId);
      const displayName =
        activeSession?.baseDisplayName ??
        this.knownPlayerNames.get(friendId) ??
        friendId;

      friends.push({
        playerId: friendId,
        displayName,
        online: Boolean(activeSession),
        roomId: activeSession ? activeSession.roomId : null,
        roomVisitorCount,
        roomMaxPlayers,
        allowFriendJoin: friendAllowJoin,
        roomStatus,
        canJoin: Boolean(
          activeSession &&
            friendAllowJoin &&
            roomStatus === 'healthy' &&
            roomVisitorCount < roomMaxPlayers
        )
      });
    }

    const incomingRequests: FriendRequestRecord[] = [];
    const outgoingRequests: FriendRequestRecord[] = [];
    for (const req of this.pendingFriendRequests.values()) {
      if (req.status !== 'pending') continue;
      if (this.isPlayerBlocked(req.fromPlayerId, req.toPlayerId)) continue;
      if (req.toPlayerId === playerId) {
        incomingRequests.push({ ...req });
      } else if (req.fromPlayerId === playerId) {
        outgoingRequests.push({ ...req });
      }
    }

    return {
      type: 'social_presence_update',
      playerId,
      friends,
      incomingRequests,
      outgoingRequests,
      blockedPlayerIds: Array.from(blockSet),
      allowFriendJoin: this.getPlayerAllowFriendJoin(playerId),
      availableInstances: this.getAvailableInstances(playerId),
      serverTimestamp: now
    };
  }

  public sendFriendRequest(
    sessionId: string,
    msg: SendFriendRequestMessage,
    now = Date.now()
  ): {
    accepted: boolean;
    affectedPlayerIds: string[];
    errorCode?: ErrorNoticeMessage['code'];
    errorMessage?: string;
  } {
    const { room, session: sender } = this.ensureSessionActive(sessionId, now);
    if (!room || !sender) {
      return {
        accepted: false,
        affectedPlayerIds: [],
        errorCode: 'FRIEND_REQUEST_INVALID',
        errorMessage: 'Sender session not active.'
      };
    }

    let targetPlayerId = msg.targetPlayerId.trim();
    let targetDisplayName = msg.targetDisplayName?.trim() || targetPlayerId;

    // Allow resolving by sessionId or displayName if a player typed a displayName/sessionId
    const activeByPlayerId = this.findActiveSessionByPlayerId(targetPlayerId);
    if (activeByPlayerId) {
      targetDisplayName = activeByPlayerId.baseDisplayName;
    } else {
      for (const r of this.rooms.values()) {
        for (const s of r.activeSessions.values()) {
          if (
            s.sessionId === targetPlayerId ||
            s.displayName.toLowerCase() === targetPlayerId.toLowerCase() ||
            s.baseDisplayName.toLowerCase() === targetPlayerId.toLowerCase()
          ) {
            targetPlayerId = s.playerId;
            targetDisplayName = s.baseDisplayName;
            break;
          }
        }
      }
    }

    if (targetPlayerId === sender.playerId) {
      return {
        accepted: false,
        affectedPlayerIds: [],
        errorCode: 'FRIEND_REQUEST_INVALID',
        errorMessage: 'You cannot send a friend request to yourself.'
      };
    }

    if (this.isPlayerBlocked(sender.playerId, targetPlayerId)) {
      return {
        accepted: false,
        affectedPlayerIds: [],
        errorCode: 'PLAYER_BLOCKED',
        errorMessage: 'Cannot send friend request due to block settings.'
      };
    }

    this.knownPlayerNames.set(sender.playerId, sender.baseDisplayName);
    if (targetDisplayName) {
      this.knownPlayerNames.set(targetPlayerId, targetDisplayName);
    }

    // If already friends, just refresh presence
    if (this.getOrCreateFriendSet(sender.playerId).has(targetPlayerId)) {
      return {
        accepted: true,
        affectedPlayerIds: [sender.playerId, targetPlayerId]
      };
    }

    // Check if there is an existing pending request in either direction
    for (const [reqId, existing] of this.pendingFriendRequests.entries()) {
      if (existing.status !== 'pending') continue;
      if (existing.fromPlayerId === sender.playerId && existing.toPlayerId === targetPlayerId) {
        return {
          accepted: true,
          affectedPlayerIds: [sender.playerId, targetPlayerId]
        };
      }
      if (existing.fromPlayerId === targetPlayerId && existing.toPlayerId === sender.playerId) {
        // Mutual request -> auto-accept
        this.pendingFriendRequests.delete(reqId);
        this.getOrCreateFriendSet(sender.playerId).add(targetPlayerId);
        this.getOrCreateFriendSet(targetPlayerId).add(sender.playerId);
        return {
          accepted: true,
          affectedPlayerIds: [sender.playerId, targetPlayerId]
        };
      }
    }

    this.globalFriendReqCounter += 1;
    const requestId = `freq_${this.globalFriendReqCounter}_${now}`;
    this.pendingFriendRequests.set(requestId, {
      requestId,
      fromPlayerId: sender.playerId,
      fromDisplayName: sender.baseDisplayName,
      toPlayerId: targetPlayerId,
      toDisplayName: this.knownPlayerNames.get(targetPlayerId) ?? targetDisplayName,
      status: 'pending',
      createdAt: now
    });

    return {
      accepted: true,
      affectedPlayerIds: [sender.playerId, targetPlayerId]
    };
  }

  public respondFriendRequest(
    sessionId: string,
    msg: RespondFriendRequestMessage,
    now = Date.now()
  ): {
    accepted: boolean;
    affectedPlayerIds: string[];
    errorCode?: ErrorNoticeMessage['code'];
    errorMessage?: string;
  } {
    const { room, session: responder } = this.ensureSessionActive(sessionId, now);
    if (!room || !responder) {
      return {
        accepted: false,
        affectedPlayerIds: [],
        errorCode: 'FRIEND_REQUEST_INVALID',
        errorMessage: 'Session not active.'
      };
    }

    const req = this.pendingFriendRequests.get(msg.requestId);
    if (!req || req.toPlayerId !== responder.playerId) {
      return {
        accepted: false,
        affectedPlayerIds: [],
        errorCode: 'FRIEND_REQUEST_INVALID',
        errorMessage: 'Friend request not found.'
      };
    }

    this.pendingFriendRequests.delete(msg.requestId);
    if (
      msg.decision === 'accept' &&
      !this.isPlayerBlocked(req.fromPlayerId, req.toPlayerId)
    ) {
      this.getOrCreateFriendSet(req.fromPlayerId).add(req.toPlayerId);
      this.getOrCreateFriendSet(req.toPlayerId).add(req.fromPlayerId);
    }

    void now;
    return {
      accepted: true,
      affectedPlayerIds: [req.fromPlayerId, req.toPlayerId]
    };
  }

  public removeFriend(
    sessionId: string,
    msg: RemoveFriendMessage,
    now = Date.now()
  ): {
    accepted: boolean;
    affectedPlayerIds: string[];
  } {
    const { room, session } = this.ensureSessionActive(sessionId, now);
    if (!room || !session) {
      return { accepted: false, affectedPlayerIds: [] };
    }

    this.getOrCreateFriendSet(session.playerId).delete(msg.targetPlayerId);
    this.getOrCreateFriendSet(msg.targetPlayerId).delete(session.playerId);

    return {
      accepted: true,
      affectedPlayerIds: [session.playerId, msg.targetPlayerId]
    };
  }

  /**
   * Transitions a player into an online friend's zoo instance when accessible and under capacity (`FR-020`, `SC-006`).
   */
  public joinFriendInstance(
    sessionId: string,
    msg: JoinFriendInstanceMessage,
    now = Date.now()
  ): {
    accepted: boolean;
    alreadyInRoom?: boolean;
    oldRoomId?: string;
    newRoomId?: string;
    leftOldRoomBroadcast?: PlayerLeftMessage | null;
    seatReleasedOldRoom?: SeatStateUpdatedMessage | null;
    welcome?: WelcomeSnapshotMessage;
    joinedNewRoomBroadcast?: PlayerJoinedMessage;
    errorCode?: ErrorNoticeMessage['code'];
    errorMessage?: string;
  } {
    const { room: currentRoom, session } = this.ensureSessionActive(sessionId, now);
    if (!currentRoom || !session) {
      return {
        accepted: false,
        errorCode: 'INVALID_PAYLOAD',
        errorMessage: 'Session not active.'
      };
    }

    if (this.isPlayerBlocked(session.playerId, msg.friendPlayerId)) {
      return {
        accepted: false,
        errorCode: 'PLAYER_BLOCKED',
        errorMessage: 'Cannot join this player.'
      };
    }

    const friendSession = this.findActiveSessionByPlayerId(msg.friendPlayerId);
    if (!friendSession) {
      return {
        accepted: false,
        errorCode: 'FRIEND_REQUEST_INVALID',
        errorMessage: 'Friend is not currently online.'
      };
    }

    if (!this.getPlayerAllowFriendJoin(msg.friendPlayerId)) {
      return {
        accepted: false,
        errorCode: 'FRIEND_JOIN_DISABLED',
        errorMessage: `${friendSession.displayName} has disabled "Allow Friends to Join My Instance".`
      };
    }

    const targetRoom = this.rooms.get(friendSession.roomId);
    if (!targetRoom || (targetRoom.status ?? 'healthy') !== 'healthy') {
      return {
        accepted: false,
        errorCode: 'INSTANCE_UNAVAILABLE',
        errorMessage: "Friend's zoo instance is currently unavailable."
      };
    }

    if (targetRoom.roomId === currentRoom.roomId) {
      return {
        accepted: true,
        alreadyInRoom: true,
        oldRoomId: currentRoom.roomId,
        newRoomId: targetRoom.roomId
      };
    }

    if (targetRoom.activeSessions.size >= targetRoom.maxPlayers) {
      return {
        accepted: false,
        errorCode: 'ROOM_FULL',
        errorMessage: "Friend's zoo instance is currently full."
      };
    }

    const seatReleasedOldRoom = this.releasePlayerSeat(currentRoom, session, now);
    this.getOrCreateEventEngine(currentRoom.roomId, now).removeParticipantSession(
      sessionId,
      session.playerId
    );
    currentRoom.activeSessions.delete(sessionId);

    const leftOldRoomBroadcast: PlayerLeftMessage = {
      type: 'player_left',
      roomId: currentRoom.roomId,
      sessionId,
      reason: 'switched_room',
      visitorCount: currentRoom.activeSessions.size,
      serverTimestamp: now
    };

    // Place near the friend in the target room
    const friendPos = friendSession.transform.position;
    const candidateNearFriend = resolveHorizontalWorldCollisions(
      [friendPos[0] + 1.4, 0.1, friendPos[2] + 1.2],
      AVATAR_COLLIDER_RADIUS,
      this.layout
    ).position;

    session.roomId = targetRoom.roomId;
    session.displayName = this.disambiguateDisplayName(
      targetRoom,
      session.baseDisplayName,
      session.sessionId,
      session.playerId
    );
    session.activeEmote = null;
    session.seatedOn = null;
    session.lastHeartbeatAt = now;
    session.lastMoveAt = now;
    session.transform = {
      ...session.transform,
      position: [
        Number(candidateNearFriend[0].toFixed(3)),
        0.1,
        Number(candidateNearFriend[2].toFixed(3))
      ],
      velocity: [0, 0, 0],
      locomotionState: 'Idle',
      serverTimestamp: now,
      reconciled: false,
      discrepancyDistance: 0
    };

    targetRoom.activeSessions.set(sessionId, session);
    this.sessionToRoom.set(sessionId, targetRoom.roomId);
    this.pruneEmptyOverflowRooms(now);

    const welcome = this.buildWelcomeSnapshot(targetRoom, session, false, now);
    const joinedNewRoomBroadcast: PlayerJoinedMessage = {
      type: 'player_joined',
      roomId: targetRoom.roomId,
      player: serializePlayerRecord(session),
      visitorCount: targetRoom.activeSessions.size,
      serverTimestamp: now
    };

    return {
      accepted: true,
      alreadyInRoom: false,
      oldRoomId: currentRoom.roomId,
      newRoomId: targetRoom.roomId,
      leftOldRoomBroadcast,
      seatReleasedOldRoom,
      welcome,
      joinedNewRoomBroadcast
    };
  }

  /**
   * Switches a player directly to a selected zoo instance/room (`FR-025`, `FR-026`, `SC-009`).
   */
  public switchPlayerInstance(
    sessionId: string,
    msg: SwitchInstanceMessage,
    now = Date.now()
  ): {
    accepted: boolean;
    alreadyInRoom?: boolean;
    oldRoomId?: string;
    newRoomId?: string;
    leftOldRoomBroadcast?: PlayerLeftMessage | null;
    seatReleasedOldRoom?: SeatStateUpdatedMessage | null;
    welcome?: WelcomeSnapshotMessage;
    joinedNewRoomBroadcast?: PlayerJoinedMessage;
    errorCode?: ErrorNoticeMessage['code'];
    errorMessage?: string;
  } {
    const { room: currentRoom, session } = this.ensureSessionActive(sessionId, now);
    if (!currentRoom || !session) {
      return {
        accepted: false,
        errorCode: 'INVALID_PAYLOAD',
        errorMessage: 'Session not active.'
      };
    }

    const requestedRoomId = msg.targetRoomId.trim();
    if (!requestedRoomId || !/^[a-zA-Z0-9_-]{3,48}$/.test(requestedRoomId)) {
      return {
        accepted: false,
        errorCode: 'INVALID_PAYLOAD',
        errorMessage: 'Invalid instance identifier.'
      };
    }

    if (requestedRoomId === currentRoom.roomId) {
      return {
        accepted: true,
        alreadyInRoom: true,
        oldRoomId: currentRoom.roomId,
        newRoomId: currentRoom.roomId
      };
    }

    const targetRoom = this.getOrCreateRoom(requestedRoomId, now);
    if ((targetRoom.status ?? 'healthy') !== 'healthy') {
      return {
        accepted: false,
        errorCode: 'INSTANCE_UNAVAILABLE',
        errorMessage: `Instance ${requestedRoomId} is currently unavailable.`
      };
    }

    if (targetRoom.activeSessions.size >= targetRoom.maxPlayers) {
      return {
        accepted: false,
        errorCode: 'ROOM_FULL',
        errorMessage: `Instance ${requestedRoomId} is currently full (${targetRoom.activeSessions.size}/${targetRoom.maxPlayers}).`
      };
    }

    const seatReleasedOldRoom = this.releasePlayerSeat(currentRoom, session, now);
    this.getOrCreateEventEngine(currentRoom.roomId, now).removeParticipantSession(
      sessionId,
      session.playerId
    );
    currentRoom.activeSessions.delete(sessionId);

    const leftOldRoomBroadcast: PlayerLeftMessage = {
      type: 'player_left',
      roomId: currentRoom.roomId,
      sessionId,
      reason: 'switched_room',
      visitorCount: currentRoom.activeSessions.size,
      serverTimestamp: now
    };

    const spawnIndex = targetRoom.activeSessions.size;
    const spawnPos = this.computeSpawnPosition(spawnIndex);

    session.roomId = targetRoom.roomId;
    session.spawnIndex = spawnIndex;
    session.displayName = this.disambiguateDisplayName(
      targetRoom,
      session.baseDisplayName,
      session.sessionId,
      session.playerId
    );
    session.activeEmote = null;
    session.seatedOn = null;
    session.lastHeartbeatAt = now;
    session.lastMoveAt = now;
    session.transform = {
      ...session.transform,
      position: [spawnPos[0], spawnPos[1], spawnPos[2]],
      velocity: [0, 0, 0],
      facingYaw: Math.PI,
      locomotionState: 'Idle',
      serverTimestamp: now,
      reconciled: false,
      discrepancyDistance: 0
    };

    targetRoom.activeSessions.set(sessionId, session);
    this.sessionToRoom.set(sessionId, targetRoom.roomId);
    this.pruneEmptyOverflowRooms(now);

    const welcome = this.buildWelcomeSnapshot(targetRoom, session, false, now);
    const joinedNewRoomBroadcast: PlayerJoinedMessage = {
      type: 'player_joined',
      roomId: targetRoom.roomId,
      player: serializePlayerRecord(session),
      visitorCount: targetRoom.activeSessions.size,
      serverTimestamp: now
    };

    return {
      accepted: true,
      alreadyInRoom: false,
      oldRoomId: currentRoom.roomId,
      newRoomId: targetRoom.roomId,
      leftOldRoomBroadcast,
      seatReleasedOldRoom,
      welcome,
      joinedNewRoomBroadcast
    };
  }

  /**
   * Updates whether online friends are permitted to directly join this player's instance (`FR-009`, `FR-010`, `SC-002`).
   */
  public setSocialPrivacy(
    sessionId: string,
    msg: SetSocialPrivacyMessage,
    now = Date.now()
  ): {
    accepted: boolean;
    playerId: string | null;
    allowFriendJoin: boolean;
    affectedPlayerIds: string[];
  } {
    const { room, session } = this.ensureSessionActive(sessionId, now);
    if (!room || !session) {
      return {
        accepted: false,
        playerId: null,
        allowFriendJoin: true,
        affectedPlayerIds: []
      };
    }

    this.playerPrivacy.set(session.playerId, {
      allowFriendJoin: msg.allowFriendJoin
    });
    const friendIds = Array.from(this.getOrCreateFriendSet(session.playerId));
    return {
      accepted: true,
      playerId: session.playerId,
      allowFriendJoin: msg.allowFriendJoin,
      affectedPlayerIds: [session.playerId, ...friendIds]
    };
  }

  /**
   * Runtime instance capacity and health configuration (`FR-004`, `FR-007`, `FR-008`, `SC-001`, `SC-005`).
   * When an instance is marked `'unhealthy'`, all active sessions in that room are automatically
   * migrated to a healthy available instance while preserving identity, wallet, and passport state.
   */
  public configureInstance(
    sessionId: string | null,
    msg: ConfigureInstanceMessage,
    now = Date.now()
  ): {
    accepted: boolean;
    roomId: string;
    maxPlayers: number;
    status: ZooInstanceHealthStatus;
    directoryUpdate: InstanceDirectoryUpdateMessage;
    migratedSessions: Array<{
      sessionId: string;
      playerId: string;
      oldRoomId: string;
      newRoomId: string;
      leftOldRoomBroadcast: PlayerLeftMessage;
      welcome: WelcomeSnapshotMessage;
      joinedNewRoomBroadcast: PlayerJoinedMessage;
    }>;
    errorCode?: ErrorNoticeMessage['code'];
    errorMessage?: string;
  } {
    if (sessionId) {
      this.ensureSessionActive(sessionId, now);
    }

    const roomId = msg.roomId.trim() || DEFAULT_ROOM_ID;
    const room = this.getOrCreateRoom(roomId, now);
    this.configuredRoomIds.add(roomId);

    if (
      msg.maxPlayers !== undefined &&
      Number.isFinite(msg.maxPlayers) &&
      msg.maxPlayers >= 1 &&
      msg.maxPlayers <= 128
    ) {
      room.maxPlayers = Math.floor(msg.maxPlayers);
    }

    if (msg.status === 'healthy' || msg.status === 'unhealthy') {
      room.status = msg.status;
    }

    const migratedSessions: Array<{
      sessionId: string;
      playerId: string;
      oldRoomId: string;
      newRoomId: string;
      leftOldRoomBroadcast: PlayerLeftMessage;
      welcome: WelcomeSnapshotMessage;
      joinedNewRoomBroadcast: PlayerJoinedMessage;
    }> = [];

    if ((room.status ?? 'healthy') === 'unhealthy') {
      room.resumableSessions.clear();
      const sessionsToEvacuate = Array.from(room.activeSessions.values());
      const excluded = new Set<string>([room.roomId]);

      for (const session of sessionsToEvacuate) {
        this.releasePlayerSeat(room, session, now);
        this.getOrCreateEventEngine(room.roomId, now).removeParticipantSession(
          session.sessionId,
          session.playerId
        );
        room.activeSessions.delete(session.sessionId);

        const leftOldRoomBroadcast: PlayerLeftMessage = {
          type: 'player_left',
          roomId: room.roomId,
          sessionId: session.sessionId,
          reason: 'switched_room',
          visitorCount: room.activeSessions.size,
          serverTimestamp: now
        };

        const selection = this.selectAvailableRoomWithReason(
          DEFAULT_ROOM_ID,
          now,
          session.playerId,
          true,
          excluded
        );
        const targetRoom = selection.room;
        const spawnIndex = targetRoom.activeSessions.size;
        const spawnPos = this.computeSpawnPosition(spawnIndex);

        session.roomId = targetRoom.roomId;
        session.spawnIndex = spawnIndex;
        session.displayName = this.disambiguateDisplayName(
          targetRoom,
          session.baseDisplayName,
          session.sessionId,
          session.playerId
        );
        session.activeEmote = null;
        session.seatedOn = null;
        session.lastHeartbeatAt = now;
        session.lastMoveAt = now;
        session.transform = {
          ...session.transform,
          position: [spawnPos[0], spawnPos[1], spawnPos[2]],
          velocity: [0, 0, 0],
          facingYaw: Math.PI,
          locomotionState: 'Idle',
          serverTimestamp: now,
          reconciled: false,
          discrepancyDistance: 0
        };

        targetRoom.activeSessions.set(session.sessionId, session);
        this.sessionToRoom.set(session.sessionId, targetRoom.roomId);

        const recoveryNotice = `Instance ${room.roomId} became unavailable. You were safely moved to ${this.getInstanceLabel(targetRoom.roomId)} with all progress intact.`;
        const welcome = this.buildWelcomeSnapshot(targetRoom, session, false, now, {
          placementReason: 'failover_recovery',
          placementNotice: recoveryNotice
        });
        const joinedNewRoomBroadcast: PlayerJoinedMessage = {
          type: 'player_joined',
          roomId: targetRoom.roomId,
          player: serializePlayerRecord(session),
          visitorCount: targetRoom.activeSessions.size,
          serverTimestamp: now
        };

        migratedSessions.push({
          sessionId: session.sessionId,
          playerId: session.playerId,
          oldRoomId: room.roomId,
          newRoomId: targetRoom.roomId,
          leftOldRoomBroadcast,
          welcome,
          joinedNewRoomBroadcast
        });
      }
    }

    const status: ZooInstanceHealthStatus = room.status ?? 'healthy';
    const notice =
      status === 'unhealthy'
        ? `Instance ${room.roomId} marked unavailable; ${migratedSessions.length} visitor(s) safely evacuated.`
        : `Instance ${room.roomId} configured (${room.activeSessions.size}/${room.maxPlayers} capacity, status: Healthy).`;

    return {
      accepted: true,
      roomId: room.roomId,
      maxPlayers: room.maxPlayers,
      status,
      directoryUpdate: {
        type: 'instance_directory_update',
        availableInstances: this.getAvailableInstances(),
        notice,
        serverTimestamp: now
      },
      migratedSessions
    };
  }

  /**
   * Blocks or unblocks a player (`FR-022`, `SC-007`).
   * Blocking removes any existing friendship and cancels pending friend requests between the two players.
   */
  public setPlayerBlock(
    sessionId: string,
    msg: SetPlayerBlockMessage,
    now = Date.now()
  ): {
    accepted: boolean;
    affectedPlayerIds: string[];
  } {
    const { room, session } = this.ensureSessionActive(sessionId, now);
    if (!room || !session || msg.targetPlayerId === session.playerId) {
      return { accepted: false, affectedPlayerIds: [] };
    }

    const blockSet = this.getOrCreateBlockSet(session.playerId);
    if (msg.blocked) {
      blockSet.add(msg.targetPlayerId);
      this.getOrCreateFriendSet(session.playerId).delete(msg.targetPlayerId);
      this.getOrCreateFriendSet(msg.targetPlayerId).delete(session.playerId);
      for (const [reqId, req] of this.pendingFriendRequests.entries()) {
        if (
          (req.fromPlayerId === session.playerId && req.toPlayerId === msg.targetPlayerId) ||
          (req.fromPlayerId === msg.targetPlayerId && req.toPlayerId === session.playerId)
        ) {
          this.pendingFriendRequests.delete(reqId);
        }
      }
    } else {
      blockSet.delete(msg.targetPlayerId);
    }

    return {
      accepted: true,
      affectedPlayerIds: [session.playerId, msg.targetPlayerId]
    };
  }

  /**
   * Records a structured player safety moderation report with recent chat context (`FR-023`, `SC-008`).
   */
  public submitPlayerReport(
    sessionId: string,
    msg: SubmitPlayerReportMessage,
    now = Date.now()
  ): {
    accepted: boolean;
    ack: ReportSubmittedAckMessage | null;
    errorCode?: ErrorNoticeMessage['code'];
    errorMessage?: string;
  } {
    const { room, session: reporter } = this.ensureSessionActive(sessionId, now);
    if (!room || !reporter) {
      return {
        accepted: false,
        ack: null,
        errorCode: 'INVALID_PAYLOAD',
        errorMessage: 'Reporter session not active.'
      };
    }

    if (!isValidReportReason(msg.reason)) {
      return {
        accepted: false,
        ack: null,
        errorCode: 'INVALID_PAYLOAD',
        errorMessage: 'Invalid report reason.'
      };
    }

    const relevantMessages = room.recentChatHistory
      .filter(
        (m) =>
          m.senderPlayerId === msg.reportedPlayerId ||
          (msg.reportedSessionId && m.senderSessionId === msg.reportedSessionId)
      )
      .slice(-10);
    const contextMessages =
      relevantMessages.length > 0 ? relevantMessages : room.recentChatHistory.slice(-10);

    this.globalReportCounter += 1;
    const report: PlayerModerationReport = {
      reportId: `rep_${this.globalReportCounter}_${now}`,
      reporterPlayerId: reporter.playerId,
      reporterSessionId: reporter.sessionId,
      reportedPlayerId: msg.reportedPlayerId,
      reportedSessionId: msg.reportedSessionId ?? null,
      reportedDisplayName: msg.reportedDisplayName.slice(0, 32),
      roomId: room.roomId,
      reason: msg.reason,
      details: (msg.details ?? '').trim().slice(0, 200),
      recentChatSnapshot: contextMessages.map((m) => ({
        messageId: m.messageId,
        senderPlayerId: m.senderPlayerId,
        senderDisplayName: m.senderDisplayName,
        text: m.text,
        createdAt: m.createdAt
      })),
      createdAt: new Date(now).toISOString(),
      status: 'open',
      resolvedAt: null
    };

    this.moderationReports.push(report);

    return {
      accepted: true,
      ack: {
        type: 'report_submitted_ack',
        report
      }
    };
  }

  /**
   * Submits structured player Beta Feedback with diagnostic metadata and rate limiting (`FR-007`, `FR-008`, `SC-004`).
   */
  public submitBetaFeedback(
    sessionId: string,
    msg: SubmitBetaFeedbackMessage,
    now = Date.now()
  ): {
    accepted: boolean;
    ack: BetaFeedbackAckMessage | null;
    opsUpdate?: OpsSnapshotMessage;
    errorCode?: ErrorNoticeMessage['code'];
    errorMessage?: string;
  } {
    const { room, session } = this.ensureSessionActive(sessionId, now);
    if (!room || !session) {
      return {
        accepted: false,
        ack: null,
        errorCode: 'INVALID_PAYLOAD',
        errorMessage: 'Session not active.'
      };
    }

    // Rate limit: max 5 feedback submissions per 60s per session
    const windowMs = 60_000;
    const recent = (this.feedbackTimestampsBySession.get(sessionId) ?? []).filter(
      (t) => now - t < windowMs
    );
    if (recent.length >= 5) {
      this.recordDiagnosticError(
        {
          code: 'FEEDBACK_RATE_LIMITED',
          message: 'Player exceeded beta feedback submission rate limit (5/60s).',
          roomId: room.roomId,
          playerId: session.playerId
        },
        now
      );
      return {
        accepted: false,
        ack: null,
        errorCode: 'FEEDBACK_RATE_LIMITED',
        errorMessage: 'You are submitting feedback too quickly. Please wait a moment.'
      };
    }

    const validated = validateBetaFeedbackInput({
      category: msg.category,
      severity: msg.severity,
      message: msg.message
    });
    if (!validated.valid || !validated.category || !validated.severity || !validated.normalizedMessage) {
      return {
        accepted: false,
        ack: null,
        errorCode: 'INVALID_PAYLOAD',
        errorMessage: validated.errorMessage ?? 'Invalid beta feedback payload.'
      };
    }

    recent.push(now);
    this.feedbackTimestampsBySession.set(sessionId, recent);

    const rawDiag = msg.diagnostics ?? {};
    const diagnostics: BetaDiagnosticContext = {
      playerId: session.playerId,
      roomId: room.roomId,
      fps:
        typeof rawDiag.fps === 'number' && Number.isFinite(rawDiag.fps)
          ? Math.max(1, Math.min(240, Math.round(rawDiag.fps)))
          : 60,
      avgFrameTimeMs:
        typeof rawDiag.avgFrameTimeMs === 'number' && Number.isFinite(rawDiag.avgFrameTimeMs)
          ? Number(rawDiag.avgFrameTimeMs.toFixed(1))
          : 16.7,
      qualityPreset:
        rawDiag.qualityPreset === 'auto' ||
        rawDiag.qualityPreset === 'low' ||
        rawDiag.qualityPreset === 'medium' ||
        rawDiag.qualityPreset === 'high'
          ? rawDiag.qualityPreset
          : 'auto',
      viewport:
        typeof rawDiag.viewport === 'string' && rawDiag.viewport.trim().length > 0
          ? rawDiag.viewport.trim().slice(0, 32)
          : '1280x800',
      inputMode: rawDiag.inputMode === 'touch' ? 'touch' : 'desktop',
      visitorCount: room.activeSessions.size,
      userAgentSummary:
        typeof rawDiag.userAgentSummary === 'string' && rawDiag.userAgentSummary.trim().length > 0
          ? rawDiag.userAgentSummary.trim().slice(0, 80)
          : 'Browser Client'
    };

    this.globalFeedbackCounter += 1;
    const feedback: BetaFeedbackRecord = {
      feedbackId: `fb_${this.globalFeedbackCounter}_${now}`,
      playerId: session.playerId,
      displayName: session.baseDisplayName,
      roomId: room.roomId,
      category: validated.category,
      severity: validated.severity,
      message: validated.normalizedMessage,
      diagnostics,
      createdAt: now
    };

    this.betaFeedbackItems.unshift(feedback);
    if (this.betaFeedbackItems.length > 100) {
      this.betaFeedbackItems.pop();
    }

    return {
      accepted: true,
      ack: {
        type: 'beta_feedback_ack',
        feedback,
        confirmationMessage: `Thank you! Beta feedback #${feedback.feedbackId} has been recorded with device diagnostics.`
      },
      opsUpdate: this.buildOpsSnapshotMessage(now)
    };
  }

  /**
   * Resolves or dismisses a submitted player safety report (`FR-010`, `SC-005`).
   */
  public resolvePlayerReport(
    sessionId: string | null,
    msg: ResolvePlayerReportMessage,
    now = Date.now()
  ): {
    accepted: boolean;
    report: PlayerModerationReport | null;
    opsUpdate?: OpsSnapshotMessage;
    errorCode?: ErrorNoticeMessage['code'];
    errorMessage?: string;
  } {
    if (sessionId) {
      this.ensureSessionActive(sessionId, now);
    }
    const target = this.moderationReports.find((r) => r.reportId === msg.reportId);
    if (!target) {
      return {
        accepted: false,
        report: null,
        errorCode: 'INVALID_PAYLOAD',
        errorMessage: `Report ${msg.reportId} not found.`
      };
    }

    target.status = msg.resolution;
    target.resolvedAt = now;

    return {
      accepted: true,
      report: { ...target },
      opsUpdate: this.buildOpsSnapshotMessage(now)
    };
  }

  /**
   * Sets or clears a non-disruptive operator maintenance/update banner (`FR-010`, `SC-005`).
   */
  public setMaintenanceNotice(
    sessionId: string | null,
    msg: SetMaintenanceNoticeMessage,
    now = Date.now()
  ): {
    accepted: boolean;
    maintenanceNotice: MaintenanceNoticeState | null;
    opsUpdate: OpsSnapshotMessage;
  } {
    if (sessionId) {
      this.ensureSessionActive(sessionId, now);
    }

    if (!msg.active) {
      this.maintenanceNotice = null;
    } else {
      const text =
        typeof msg.message === 'string' && msg.message.trim().length > 0
          ? msg.message.trim().slice(0, 240)
          : 'Scheduled Public Beta update in progress — your Zoo Passport and Coins are safely auto-saved.';
      this.maintenanceNotice = {
        active: true,
        message: text,
        severity: msg.severity === 'warning' ? 'warning' : 'info',
        updatedAt: now
      };
    }

    return {
      accepted: true,
      maintenanceNotice: this.maintenanceNotice ? { ...this.maintenanceNotice } : null,
      opsUpdate: this.buildOpsSnapshotMessage(now)
    };
  }

  public recordDiagnosticError(
    params: {
      code: string;
      message: string;
      roomId?: string | null;
      playerId?: string | null;
    },
    now = Date.now()
  ): DiagnosticErrorEntry {
    this.globalErrorCounter += 1;
    const entry: DiagnosticErrorEntry = {
      errorId: `err_${this.globalErrorCounter}_${now}`,
      code: params.code,
      message: params.message,
      roomId: params.roomId ?? null,
      playerId: params.playerId ?? null,
      timestamp: now
    };
    this.diagnosticErrors.unshift(entry);
    if (this.diagnosticErrors.length > 50) {
      this.diagnosticErrors.pop();
    }
    return entry;
  }

  public getBetaFeedbackItems(): BetaFeedbackRecord[] {
    return [...this.betaFeedbackItems];
  }

  public getDiagnosticErrors(): DiagnosticErrorEntry[] {
    return [...this.diagnosticErrors];
  }

  public getMaintenanceNotice(): MaintenanceNoticeState | null {
    return this.maintenanceNotice ? { ...this.maintenanceNotice } : null;
  }

  public getOpsHealthSnapshot(now = Date.now()): OpsHealthSnapshot {
    const instances = this.getAvailableInstances();
    let totalVisitors = 0;
    let healthyInstances = 0;
    let unhealthyInstances = 0;
    for (const inst of instances) {
      totalVisitors += inst.visitorCount;
      if ((inst.status ?? 'healthy') === 'unhealthy') {
        unhealthyInstances += 1;
      } else {
        healthyInstances += 1;
      }
    }

    const openReportsCount = this.moderationReports.filter(
      (r) => (r.status ?? 'open') === 'open'
    ).length;

    return {
      version: PUBLIC_BETA_VERSION,
      status: healthyInstances > 0 ? 'ok' : 'degraded',
      uptimeMs: Math.max(0, now - this.startedAt),
      totalVisitors,
      healthyInstances,
      unhealthyInstances,
      openReportsCount,
      totalReportsCount: this.moderationReports.length,
      feedbackCount: this.betaFeedbackItems.length,
      recentErrorsCount: this.diagnosticErrors.length,
      reports: [...this.moderationReports].reverse().slice(0, 25),
      feedbackItems: this.betaFeedbackItems.slice(0, 25),
      recentErrors: this.diagnosticErrors.slice(0, 25),
      maintenanceNotice: this.maintenanceNotice ? { ...this.maintenanceNotice } : null,
      serverTimestamp: now
    };
  }

  public buildOpsSnapshotMessage(now = Date.now()): OpsSnapshotMessage {
    return {
      type: 'ops_snapshot',
      snapshot: this.getOpsHealthSnapshot(now)
    };
  }

  /**
   * Validates and triggers a species-appropriate habitat feeding session (`FR-013`–`FR-015`, `SC-006`).
   */
  public triggerAnimalFeeding(
    sessionId: string,
    msg: TriggerAnimalFeedingMessage,
    now = Date.now()
  ): {
    accepted: boolean;
    broadcast: AnimalFeedingEventMessage | null;
    errorCode?: ErrorNoticeMessage['code'];
    errorMessage?: string;
  } {
    const { room, session } = this.ensureSessionActive(sessionId, now);
    if (!room || !session) {
      return {
        accepted: false,
        broadcast: null,
        errorCode: 'INVALID_PAYLOAD',
        errorMessage: 'Session not active.'
      };
    }

    const animalSystem = this.getOrCreateAnimalSystem(room.roomId, now);
    const res = animalSystem.triggerHabitatFeeding(msg.habitatId, now, sessionId, 'player');
    if (!res.accepted || !res.feedingState || !res.animals) {
      const reasonMsg =
        res.reason === 'already_active'
          ? 'A feeding session is already underway at this habitat!'
          : res.reason === 'on_cooldown'
            ? 'The animals at this habitat were just fed and are resting. Please wait for the cooldown.'
            : 'Invalid habitat feeding request.';
      return {
        accepted: false,
        broadcast: null,
        errorCode: 'ANIMAL_FEEDING_COOLDOWN',
        errorMessage: reasonMsg
      };
    }

    const feedingPassport = this.getOrInitPlayerPassport(session.playerId);
    const feedingSpeciesSet = this.getOrInitDiscoveredSpeciesSet(session.playerId);
    this.playerPassports.set(
      session.playerId,
      recordPassportActivityCompletion(
        feedingPassport,
        feedingSpeciesSet.size,
        new Date(now).toISOString(),
        null
      ).state
    );

    return {
      accepted: true,
      broadcast: {
        type: 'animal_feeding_event',
        roomId: room.roomId,
        habitatId: msg.habitatId,
        feedingState: res.feedingState,
        animals: res.animals,
        serverTimestamp: now
      }
    };
  }

  /**
   * Authoritatively validates a food or drink purchase (`FR-004`–`FR-006`, `SC-002`, Principle III).
   * Enforces currency balance verification and `requestId` idempotency so duplicate packets never double-charge.
   */
  public purchaseFoodItem(
    sessionId: string,
    msg: PurchaseFoodItemMessage,
    now = Date.now()
  ): FoodPurchaseResultMessage {
    const { room, session } = this.ensureSessionActive(sessionId, now);
    if (!room || !session) {
      return {
        type: 'food_purchase_result',
        requestId: msg.requestId,
        success: false,
        itemId: msg.itemId,
        currencyBalance: INITIAL_ZOO_COINS,
        inventory: createEmptyFoodInventory(),
        errorCode: 'INVALID_ITEM',
        message: 'Session not active.',
        serverTimestamp: now
      };
    }

    const wallet = this.getOrInitPlayerWallet(session.playerId, {
      currencyBalance: session.currencyBalance,
      inventory: session.foodInventory
    });

    const idempotencyKey = `${session.playerId}:${msg.requestId}`;
    const existingResult = this.processedPurchaseRequests.get(idempotencyKey);
    if (existingResult) {
      return {
        ...existingResult,
        inventory: { ...existingResult.inventory }
      };
    }

    if (!isValidFoodItemId(msg.itemId)) {
      return {
        type: 'food_purchase_result',
        requestId: msg.requestId,
        success: false,
        itemId: msg.itemId,
        currencyBalance: wallet.currencyBalance,
        inventory: { ...wallet.inventory },
        errorCode: 'INVALID_ITEM',
        message: 'Selected food or drink is not on the stall menu.',
        serverTimestamp: now
      };
    }

    const item = FOOD_CATALOG_BY_ID[msg.itemId];
    if (wallet.currencyBalance < item.price) {
      return {
        type: 'food_purchase_result',
        requestId: msg.requestId,
        success: false,
        itemId: item.id,
        currencyBalance: wallet.currencyBalance,
        inventory: { ...wallet.inventory },
        errorCode: 'INSUFFICIENT_FUNDS',
        message: `Not enough Zoo Coins for ${item.name} (costs ${item.price}, you have ${wallet.currencyBalance}).`,
        serverTimestamp: now
      };
    }

    const currentQty = wallet.inventory[item.id] ?? 0;
    if (currentQty >= MAX_FOOD_ITEM_QUANTITY) {
      return {
        type: 'food_purchase_result',
        requestId: msg.requestId,
        success: false,
        itemId: item.id,
        currencyBalance: wallet.currencyBalance,
        inventory: { ...wallet.inventory },
        errorCode: 'INVENTORY_FULL',
        message: `Your bag is full of ${item.name} (max ${MAX_FOOD_ITEM_QUANTITY}).`,
        serverTimestamp: now
      };
    }

    wallet.currencyBalance -= item.price;
    wallet.inventory[item.id] = currentQty + 1;
    session.currencyBalance = wallet.currencyBalance;
    session.foodInventory = { ...wallet.inventory };

    const successResult: FoodPurchaseResultMessage = {
      type: 'food_purchase_result',
      requestId: msg.requestId,
      success: true,
      itemId: item.id,
      currencyBalance: wallet.currencyBalance,
      inventory: { ...wallet.inventory },
      message: `Purchased ${item.name} (-${item.price} Zoo Coins)!`,
      serverTimestamp: now
    };
    this.processedPurchaseRequests.set(idempotencyKey, {
      ...successResult,
      inventory: { ...successResult.inventory }
    });
    return successResult;
  }

  /**
   * Authoritatively validates and consumes an owned food or drink item (`FR-007`–`FR-011`, `SC-004`).
   */
  public consumeFoodItem(
    sessionId: string,
    msg: ConsumeFoodItemMessage,
    now = Date.now()
  ): {
    result: FoodConsumeResultMessage;
    broadcast: PlayerConsumptionUpdatedMessage | null;
  } {
    const { room, session } = this.ensureSessionActive(sessionId, now);
    if (!room || !session) {
      return {
        result: {
          type: 'food_consume_result',
          success: false,
          itemId: msg.itemId,
          currencyBalance: INITIAL_ZOO_COINS,
          inventory: createEmptyFoodInventory(),
          errorCode: 'INVALID_ITEM',
          message: 'Session not active.',
          serverTimestamp: now
        },
        broadcast: null
      };
    }

    const wallet = this.getOrInitPlayerWallet(session.playerId, {
      currencyBalance: session.currencyBalance,
      inventory: session.foodInventory
    });

    if (!isValidFoodItemId(msg.itemId)) {
      return {
        result: {
          type: 'food_consume_result',
          success: false,
          itemId: msg.itemId,
          currencyBalance: wallet.currencyBalance,
          inventory: { ...wallet.inventory },
          errorCode: 'INVALID_ITEM',
          message: 'Invalid food or drink item.',
          serverTimestamp: now
        },
        broadcast: null
      };
    }

    const item = FOOD_CATALOG_BY_ID[msg.itemId];
    const currentQty = wallet.inventory[item.id] ?? 0;
    if (currentQty <= 0) {
      return {
        result: {
          type: 'food_consume_result',
          success: false,
          itemId: item.id,
          currencyBalance: wallet.currencyBalance,
          inventory: { ...wallet.inventory },
          errorCode: 'ITEM_NOT_OWNED',
          message: `You do not own any ${item.name} in your bag.`,
          serverTimestamp: now
        },
        broadcast: null
      };
    }

    wallet.inventory[item.id] = currentQty - 1;
    session.currencyBalance = wallet.currencyBalance;
    session.foodInventory = { ...wallet.inventory };

    const consumption: ActiveFoodConsumption = {
      itemId: item.id,
      label: item.name,
      category: item.category,
      icon: item.icon,
      startedAt: now,
      expiresAt: now + item.durationMs
    };
    session.activeConsumption = consumption;

    const currentPassport = this.getOrInitPlayerPassport(session.playerId);
    const speciesSet = this.getOrInitDiscoveredSpeciesSet(session.playerId);
    const actRes = recordPassportActivityCompletion(
      currentPassport,
      speciesSet.size,
      new Date(now).toISOString(),
      null
    );
    this.playerPassports.set(session.playerId, actRes.state);

    return {
      result: {
        type: 'food_consume_result',
        success: true,
        itemId: item.id,
        currencyBalance: wallet.currencyBalance,
        inventory: { ...wallet.inventory },
        consumption: { ...consumption },
        message: `${item.gerundLabel} ${item.name}!`,
        serverTimestamp: now
      },
      broadcast: {
        type: 'player_consumption_updated',
        roomId: room.roomId,
        sessionId: session.sessionId,
        playerId: session.playerId,
        consumption: { ...consumption },
        serverTimestamp: now
      }
    };
  }

  /**
   * Stops active food or drink consumption early (`FR-011`).
   */
  public stopConsumingFood(
    sessionId: string,
    now = Date.now()
  ): {
    accepted: boolean;
    broadcast: PlayerConsumptionUpdatedMessage | null;
  } {
    const { room, session } = this.ensureSessionActive(sessionId, now);
    if (!room || !session) {
      return { accepted: false, broadcast: null };
    }
    session.activeConsumption = null;
    return {
      accepted: true,
      broadcast: {
        type: 'player_consumption_updated',
        roomId: room.roomId,
        sessionId: session.sessionId,
        playerId: session.playerId,
        consumption: null,
        serverTimestamp: now
      }
    };
  }

  /**
   * Records a zone stamp, species discovery, social action, or activity completion
   * on the player's authoritative Zoo Passport (`FR-001`–`FR-007`).
   */
  public recordPassportProgress(
    sessionId: string,
    msg: RecordPassportProgressMessage,
    now = Date.now()
  ): PlayerPassportState | null {
    const { session } = this.ensureSessionActive(sessionId, now);
    if (!session) return null;

    const nowIso = new Date(now).toISOString();
    const speciesSet = this.getOrInitDiscoveredSpeciesSet(session.playerId);
    if (
      typeof msg.speciesId === 'string' &&
      (ANIMAL_SPECIES_IDS as readonly string[]).includes(msg.speciesId)
    ) {
      speciesSet.add(msg.speciesId);
    }

    let passport = this.getOrInitPlayerPassport(session.playerId, undefined, nowIso);
    if (msg.zoneId && isValidPassportZoneId(msg.zoneId)) {
      passport = recordPassportZoneStamp(
        passport,
        msg.zoneId,
        speciesSet.size,
        nowIso,
        null
      ).state;
    }
    if (msg.socialAction) {
      passport = recordPassportSocialInteraction(
        passport,
        speciesSet.size,
        nowIso,
        null
      ).state;
    }
    if (msg.activityCompleted) {
      passport = recordPassportActivityCompletion(
        passport,
        speciesSet.size,
        nowIso,
        null
      ).state;
    }

    passport = evaluatePassportAchievements(
      passport,
      speciesSet.size,
      nowIso
    ).state;
    this.playerPassports.set(session.playerId, passport);
    return sanitizePlayerPassportState(passport, nowIso);
  }

  /**
   * Authoritatively validates and grants an achievement reward (`FR-008`–`FR-010`, `SC-005`).
   * Guarantees one-time reward claiming and `requestId` idempotency so duplicate requests never double-grant coins.
   */
  public claimAchievementReward(
    sessionId: string,
    msg: ClaimAchievementRewardMessage,
    now = Date.now()
  ): AchievementRewardResultMessage {
    const nowIso = new Date(now).toISOString();
    const { room, session } = this.ensureSessionActive(sessionId, now);
    if (!room || !session) {
      return {
        type: 'achievement_reward_result',
        requestId: msg.requestId,
        success: false,
        achievementId: msg.achievementId,
        rewardCoinsGranted: 0,
        currencyBalance: INITIAL_ZOO_COINS,
        passportState: createDefaultPassportState(nowIso),
        errorCode: 'INVALID_ACHIEVEMENT',
        message: 'Session not active.',
        serverTimestamp: now
      };
    }

    const wallet = this.getOrInitPlayerWallet(session.playerId, {
      currencyBalance: session.currencyBalance,
      inventory: session.foodInventory
    });
    const speciesSet = this.getOrInitDiscoveredSpeciesSet(session.playerId);
    let passport = evaluatePassportAchievements(
      this.getOrInitPlayerPassport(session.playerId, undefined, nowIso),
      speciesSet.size,
      nowIso
    ).state;
    this.playerPassports.set(session.playerId, passport);

    const idempotencyKey = `${session.playerId}:${msg.requestId}`;
    const existingClaim = this.processedRewardClaims.get(idempotencyKey);
    if (existingClaim) {
      return {
        ...existingClaim,
        passportState: sanitizePlayerPassportState(
          existingClaim.passportState,
          nowIso
        )
      };
    }

    if (!isValidAchievementId(msg.achievementId)) {
      return {
        type: 'achievement_reward_result',
        requestId: msg.requestId,
        success: false,
        achievementId: msg.achievementId,
        rewardCoinsGranted: 0,
        currencyBalance: wallet.currencyBalance,
        passportState: sanitizePlayerPassportState(passport, nowIso),
        errorCode: 'INVALID_ACHIEVEMENT',
        message: 'Selected achievement does not exist.',
        serverTimestamp: now
      };
    }

    const desc = ACHIEVEMENTS_BY_ID[msg.achievementId];
    const rec = passport.achievements[msg.achievementId];

    if (!rec.unlocked) {
      return {
        type: 'achievement_reward_result',
        requestId: msg.requestId,
        success: false,
        achievementId: desc.achievementId,
        rewardCoinsGranted: 0,
        currencyBalance: wallet.currencyBalance,
        passportState: sanitizePlayerPassportState(passport, nowIso),
        errorCode: 'ACHIEVEMENT_LOCKED',
        message: `${desc.title} has not been unlocked yet.`,
        serverTimestamp: now
      };
    }

    if (rec.claimed) {
      return {
        type: 'achievement_reward_result',
        requestId: msg.requestId,
        success: false,
        achievementId: desc.achievementId,
        rewardCoinsGranted: 0,
        currencyBalance: wallet.currencyBalance,
        passportState: sanitizePlayerPassportState(passport, nowIso),
        errorCode: 'ALREADY_CLAIMED',
        message: `Reward for ${desc.title} has already been claimed.`,
        serverTimestamp: now
      };
    }

    rec.claimed = true;
    rec.claimedAt = nowIso;
    if (!passport.earnedBadges.includes(desc.rewardBadge)) {
      passport.earnedBadges.push(desc.rewardBadge);
    }
    if (!passport.activeBadge) {
      passport.activeBadge = desc.rewardBadge;
    }
    passport.updatedAt = nowIso;
    this.playerPassports.set(session.playerId, passport);

    wallet.currencyBalance += desc.rewardCoins;
    session.currencyBalance = wallet.currencyBalance;

    const successResult: AchievementRewardResultMessage = {
      type: 'achievement_reward_result',
      requestId: msg.requestId,
      success: true,
      achievementId: desc.achievementId,
      rewardCoinsGranted: desc.rewardCoins,
      rewardBadgeGranted: desc.rewardBadge,
      currencyBalance: wallet.currencyBalance,
      passportState: sanitizePlayerPassportState(passport, nowIso),
      message: `Claimed +${desc.rewardCoins} Zoo Coins & "${desc.rewardBadge}" Badge!`,
      serverTimestamp: now
    };

    this.processedRewardClaims.set(idempotencyKey, {
      ...successResult,
      passportState: sanitizePlayerPassportState(passport, nowIso)
    });

    return successResult;
  }

  /**
   * Authoritatively joins a visitor into an active zoo event (`FR-003`–`FR-006`, `SC-002`).
   * Enforces `maxParticipants` capacity limits and broadcasts live participant counts.
   */
  public joinZooEvent(
    sessionId: string,
    msg: JoinZooEventMessage,
    now = Date.now()
  ): {
    accepted: boolean;
    broadcast: ZooEventsSnapshotMessage | null;
    errorCode?: EventErrorCode;
    errorMessage?: string;
  } {
    const { room, session } = this.ensureSessionActive(sessionId, now);
    if (!room || !session) {
      return {
        accepted: false,
        broadcast: null,
        errorCode: 'INVALID_EVENT',
        errorMessage: 'Session not active.'
      };
    }

    const engine = this.getOrCreateEventEngine(room.roomId, now);
    const res = engine.joinEvent(session.sessionId, session.playerId, msg.eventId);
    if (!res.ok) {
      return {
        accepted: false,
        broadcast: null,
        errorCode: res.code,
        errorMessage: res.message
      };
    }

    return {
      accepted: true,
      broadcast: {
        type: 'zoo_events_snapshot',
        roomId: room.roomId,
        seasonalTheme: engine.getSeasonalTheme(),
        events: engine.getEventsSnapshot(),
        notice: res.notice,
        serverTimestamp: now
      }
    };
  }

  /**
   * Authoritatively removes a visitor from a zoo event (`FR-005`, `FR-006`, `SC-002`).
   */
  public leaveZooEvent(
    sessionId: string,
    msg: LeaveZooEventMessage,
    now = Date.now()
  ): {
    accepted: boolean;
    broadcast: ZooEventsSnapshotMessage | null;
    errorCode?: EventErrorCode;
    errorMessage?: string;
  } {
    const { room, session } = this.ensureSessionActive(sessionId, now);
    if (!room || !session) {
      return {
        accepted: false,
        broadcast: null,
        errorCode: 'INVALID_EVENT',
        errorMessage: 'Session not active.'
      };
    }

    const engine = this.getOrCreateEventEngine(room.roomId, now);
    const res = engine.leaveEvent(session.sessionId, session.playerId, msg.eventId);
    if (!res.ok) {
      return {
        accepted: false,
        broadcast: null,
        errorCode: res.code,
        errorMessage: res.message
      };
    }

    return {
      accepted: true,
      broadcast: {
        type: 'zoo_events_snapshot',
        roomId: room.roomId,
        seasonalTheme: engine.getSeasonalTheme(),
        events: engine.getEventsSnapshot(),
        notice: res.notice,
        serverTimestamp: now
      }
    };
  }

  /**
   * Contributes to an active zoo event's shared group progress (`FR-006`, `SC-002`).
   */
  public performEventAction(
    sessionId: string,
    msg: PerformEventActionMessage,
    now = Date.now()
  ): {
    accepted: boolean;
    broadcast: ZooEventsSnapshotMessage | null;
    errorCode?: EventErrorCode;
    errorMessage?: string;
  } {
    const { room, session } = this.ensureSessionActive(sessionId, now);
    if (!room || !session) {
      return {
        accepted: false,
        broadcast: null,
        errorCode: 'INVALID_EVENT',
        errorMessage: 'Session not active.'
      };
    }

    const engine = this.getOrCreateEventEngine(room.roomId, now);
    const res = engine.performEventAction(
      session.sessionId,
      session.playerId,
      msg.eventId
    );
    if (!res.ok) {
      return {
        accepted: false,
        broadcast: null,
        errorCode: res.code,
        errorMessage: res.message
      };
    }

    return {
      accepted: true,
      broadcast: {
        type: 'zoo_events_snapshot',
        roomId: room.roomId,
        seasonalTheme: engine.getSeasonalTheme(),
        events: engine.getEventsSnapshot(),
        notice: res.notice,
        serverTimestamp: now
      }
    };
  }

  /**
   * Authoritatively claims a one-time reward for participating in a zoo event (`FR-007`–`FR-008`, `SC-003`).
   * Grants Zoo Coins, stamps the corresponding Zoo Passport zone, increments `activitiesCompletedCount`,
   * and enforces both `requestId` and `(playerId, eventInstanceId)` idempotency.
   */
  public claimEventReward(
    sessionId: string,
    msg: ClaimEventRewardMessage,
    now = Date.now()
  ): {
    result: EventRewardResultMessage;
    broadcast: ZooEventsSnapshotMessage | null;
  } {
    const nowIso = new Date(now).toISOString();
    const { room, session } = this.ensureSessionActive(sessionId, now);
    if (!room || !session) {
      return {
        result: {
          type: 'event_reward_result',
          requestId: msg.requestId,
          success: false,
          eventId: msg.eventId,
          eventInstanceId: `evinst_${msg.eventId}_1`,
          rewardCoinsGranted: 0,
          currencyBalance: INITIAL_ZOO_COINS,
          passportState: createDefaultPassportState(nowIso),
          errorCode: 'INVALID_EVENT',
          message: 'Session not active.',
          serverTimestamp: now
        },
        broadcast: null
      };
    }

    const wallet = this.getOrInitPlayerWallet(session.playerId, {
      currencyBalance: session.currencyBalance,
      inventory: session.foodInventory
    });
    const speciesSet = this.getOrInitDiscoveredSpeciesSet(session.playerId);
    let passport = this.getOrInitPlayerPassport(session.playerId, undefined, nowIso);

    const idempotencyKey = `${session.playerId}:${msg.requestId}`;
    const existingClaim = this.processedEventRewardClaims.get(idempotencyKey);
    if (existingClaim) {
      return {
        result: {
          ...existingClaim,
          passportState: sanitizePlayerPassportState(
            existingClaim.passportState,
            nowIso
          )
        },
        broadcast: null
      };
    }

    if (!isValidZooEventId(msg.eventId)) {
      return {
        result: {
          type: 'event_reward_result',
          requestId: msg.requestId,
          success: false,
          eventId: msg.eventId,
          eventInstanceId: `evinst_${String(msg.eventId)}_1`,
          rewardCoinsGranted: 0,
          currencyBalance: wallet.currencyBalance,
          passportState: sanitizePlayerPassportState(passport, nowIso),
          errorCode: 'INVALID_EVENT',
          message: 'Unknown zoo event.',
          serverTimestamp: now
        },
        broadcast: null
      };
    }

    const engine = this.getOrCreateEventEngine(room.roomId, now);
    const currentEvState = engine.getEventState(msg.eventId);
    const markRes = engine.markRewardClaimed(session.playerId, msg.eventId);

    if (!markRes.ok) {
      return {
        result: {
          type: 'event_reward_result',
          requestId: msg.requestId,
          success: false,
          eventId: msg.eventId,
          eventInstanceId: currentEvState.eventInstanceId,
          rewardCoinsGranted: 0,
          currencyBalance: wallet.currencyBalance,
          passportState: sanitizePlayerPassportState(passport, nowIso),
          errorCode: markRes.code,
          message: markRes.message,
          serverTimestamp: now
        },
        broadcast: null
      };
    }

    wallet.currencyBalance += markRes.rewardCoins;
    session.currencyBalance = wallet.currencyBalance;

    passport = recordPassportZoneStamp(
      passport,
      markRes.zoneId,
      speciesSet.size,
      nowIso,
      null
    ).state;
    passport = recordPassportActivityCompletion(
      passport,
      speciesSet.size,
      nowIso,
      null
    ).state;
    passport = evaluatePassportAchievements(
      passport,
      speciesSet.size,
      nowIso
    ).state;
    this.playerPassports.set(session.playerId, passport);

    const desc = ZOO_EVENTS_BY_ID[msg.eventId];
    const zoneDesc = PASSPORT_ZONES_BY_ID[markRes.zoneId];
    const message = `Claimed +${markRes.rewardCoins} Zoo Coins & ${zoneDesc.name} Stamp for "${desc.title}"!`;

    const successResult: EventRewardResultMessage = {
      type: 'event_reward_result',
      requestId: msg.requestId,
      success: true,
      eventId: msg.eventId,
      eventInstanceId: markRes.event.eventInstanceId,
      rewardCoinsGranted: markRes.rewardCoins,
      stampedZoneId: markRes.zoneId,
      currencyBalance: wallet.currencyBalance,
      passportState: sanitizePlayerPassportState(passport, nowIso),
      message,
      serverTimestamp: now
    };

    this.processedEventRewardClaims.set(idempotencyKey, {
      ...successResult,
      passportState: sanitizePlayerPassportState(passport, nowIso)
    });

    return {
      result: successResult,
      broadcast: {
        type: 'zoo_events_snapshot',
        roomId: room.roomId,
        seasonalTheme: engine.getSeasonalTheme(),
        events: engine.getEventsSnapshot(),
        serverTimestamp: now
      }
    };
  }

  /**
   * Authoritatively updates room seasonal themes or event schedules (`FR-009`–`FR-010`, `SC-004`).
   * Safely rejects malformed configurations without disrupting active gameplay.
   */
  public configureZooEvents(
    sessionId: string,
    msg: ConfigureZooEventsMessage | unknown,
    now = Date.now()
  ): {
    accepted: boolean;
    broadcast: ZooEventsSnapshotMessage | null;
    errorCode?: EventErrorCode;
    errorMessage?: string;
  } {
    const { room, session } = this.ensureSessionActive(sessionId, now);
    if (!room || !session) {
      return {
        accepted: false,
        broadcast: null,
        errorCode: 'INVALID_EVENT_CONFIG',
        errorMessage: 'Session not active.'
      };
    }

    const engine = this.getOrCreateEventEngine(room.roomId, now);
    const res = engine.applyAdminConfig(msg, now);
    if (!res.ok) {
      return {
        accepted: false,
        broadcast: null,
        errorCode: res.code,
        errorMessage: res.message
      };
    }

    return {
      accepted: true,
      broadcast: {
        type: 'zoo_events_snapshot',
        roomId: room.roomId,
        seasonalTheme: res.seasonalTheme,
        events: res.events,
        notice: res.notice,
        serverTimestamp: now
      }
    };
  }

  public recordHeartbeat(sessionId: string, now = Date.now()): boolean {
    const { session } = this.ensureSessionActive(sessionId, now);
    if (!session) return false;
    session.lastHeartbeatAt = now;
    return true;
  }

  public disconnectPlayer(
    sessionId: string,
    cleanLeave: boolean,
    now = Date.now()
  ): {
    left: PlayerLeftMessage | null;
    seatUpdate: SeatStateUpdatedMessage | null;
    eventsUpdate?: ZooEventsSnapshotMessage | null;
    disconnectedPlayerId: string | null;
  } {
    const roomId = this.sessionToRoom.get(sessionId);
    if (!roomId) return { left: null, seatUpdate: null, eventsUpdate: null, disconnectedPlayerId: null };
    const room = this.rooms.get(roomId);
    if (!room) return { left: null, seatUpdate: null, eventsUpdate: null, disconnectedPlayerId: null };

    const session = room.activeSessions.get(sessionId);
    if (!session) return { left: null, seatUpdate: null, eventsUpdate: null, disconnectedPlayerId: null };

    const seatUpdate = this.releasePlayerSeat(room, session, now);
    const eventEngine = this.getOrCreateEventEngine(room.roomId, now);
    const evRemoval = eventEngine.removeParticipantSession(
      session.sessionId,
      session.playerId
    );
    const eventsUpdate: ZooEventsSnapshotMessage | null = evRemoval.changed
      ? {
          type: 'zoo_events_snapshot',
          roomId: room.roomId,
          seasonalTheme: eventEngine.getSeasonalTheme(),
          events: eventEngine.getEventsSnapshot(),
          serverTimestamp: now
        }
      : null;

    this.chatRateLimiter.clearSession(sessionId);
    room.activeSessions.delete(sessionId);
    this.sessionToRoom.delete(sessionId);

    if (!cleanLeave) {
      room.resumableSessions.set(session.resumeToken, {
        record: session,
        disconnectedAt: now,
        expiresAt: now + this.resumeGraceWindowMs
      });
    } else {
      room.resumableSessions.delete(session.resumeToken);
      this.pruneEmptyOverflowRooms(now);
    }

    return {
      left: {
        type: 'player_left',
        roomId: room.roomId,
        sessionId,
        reason: cleanLeave ? 'left' : 'disconnected',
        visitorCount: room.activeSessions.size,
        serverTimestamp: now
      },
      seatUpdate,
      eventsUpdate,
      disconnectedPlayerId: session.playerId
    };
  }

  public pruneStaleSessions(now = Date.now()): Array<
    PlayerLeftMessage & {
      left: PlayerLeftMessage;
      seatUpdate: SeatStateUpdatedMessage | null;
      eventsUpdate?: ZooEventsSnapshotMessage | null;
      disconnectedPlayerId: string;
    }
  > {
    const removals: Array<
      PlayerLeftMessage & {
        left: PlayerLeftMessage;
        seatUpdate: SeatStateUpdatedMessage | null;
        eventsUpdate?: ZooEventsSnapshotMessage | null;
        disconnectedPlayerId: string;
      }
    > = [];

    for (const room of this.rooms.values()) {
      this.pruneExpiredResumableTokens(room, now);

      for (const session of Array.from(room.activeSessions.values())) {
        if (now - session.lastHeartbeatAt > this.heartbeatTimeoutMs) {
          const seatUpdate = this.releasePlayerSeat(room, session, now);
          const eventEngine = this.getOrCreateEventEngine(room.roomId, now);
          const evRemoval = eventEngine.removeParticipantSession(
            session.sessionId,
            session.playerId
          );
          const eventsUpdate: ZooEventsSnapshotMessage | null = evRemoval.changed
            ? {
                type: 'zoo_events_snapshot',
                roomId: room.roomId,
                seasonalTheme: eventEngine.getSeasonalTheme(),
                events: eventEngine.getEventsSnapshot(),
                serverTimestamp: now
              }
            : null;
          this.chatRateLimiter.clearSession(session.sessionId);
          room.activeSessions.delete(session.sessionId);
          this.sessionToRoom.delete(session.sessionId);
          room.resumableSessions.set(session.resumeToken, {
            record: session,
            disconnectedAt: now,
            expiresAt: now + this.resumeGraceWindowMs
          });

          const leftMsg: PlayerLeftMessage = {
            type: 'player_left',
            roomId: room.roomId,
            sessionId: session.sessionId,
            reason: 'timeout',
            visitorCount: room.activeSessions.size,
            serverTimestamp: now
          };

          removals.push({
            ...leftMsg,
            left: leftMsg,
            seatUpdate,
            eventsUpdate,
            disconnectedPlayerId: session.playerId
          });
        }
      }
    }

    this.pruneEmptyOverflowRooms(now);
    return removals;
  }

  public buildRoomTickSnapshot(roomId: string, now = Date.now()): RoomStateTickMessage | null {
    const room = this.rooms.get(roomId);
    if (!room) return null;

    const dtSeconds =
      room.lastTickAt > 0
        ? Math.max(0.05, Math.min(0.25, (now - room.lastTickAt) / 1000))
        : 0.05;
    room.tickSequence += 1;
    room.lastTickAt = now;

    const animalSystem = this.getOrCreateAnimalSystem(roomId, now);
    animalSystem.step(dtSeconds, now);

    const players: SerializedPlayerState[] = [];
    for (const session of room.activeSessions.values()) {
      if (session.activeEmote && session.activeEmote.expiresAt <= now) {
        session.activeEmote = null;
      }
      if (session.activeConsumption && session.activeConsumption.expiresAt <= now) {
        session.activeConsumption = null;
      }
      players.push(serializePlayerRecord(session));
    }

    return {
      type: 'room_state_tick',
      roomId: room.roomId,
      tickSequence: room.tickSequence,
      serverTimestamp: now,
      visitorCount: room.activeSessions.size,
      players,
      animals: animalSystem.getAnimals(),
      habitatFeedings: animalSystem.getHabitatFeedings()
    };
  }
}
