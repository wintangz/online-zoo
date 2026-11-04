import type {
  ActiveAvatarEmote,
  AvatarAppearance,
  FriendRequestRecord,
  FriendStatusEntry,
  PlayerModerationReport,
  PlayerSessionRecord,
  ProximityChatMessage,
  SharedPropAuthorityState,
  WorldSeatOccupancyState,
  ZooInstanceRoom,
  ZooInstanceSummary
} from '../types';
import {
  DEFAULT_AVATAR_APPEARANCE,
  getOutfitColors,
  isValidAvatarAppearance,
  sanitizeAvatarAppearance
} from '../identity/avatarCatalog';
import { validateDisplayName } from '../identity/displayNameValidator';
import { isValidPlayerId } from '../identity/identityPersistence';
import {
  ChatRateLimiter,
  MAX_CHAT_HISTORY_ENTRIES,
  PROXIMITY_CHAT_RANGE_METERS,
  SPEECH_BUBBLE_DURATION_MS,
  validateChatMessage,
  type ChatRateLimiterOptions
} from '../social/chatModeration';
import { getEmoteDescriptor, isValidEmoteId } from '../social/emoteCatalog';
import { isValidReportReason } from '../social/socialPersistence';
import {
  createInitialRoomSeatStates,
  PANDA_FOREST_LAYOUT,
  resolveHorizontalWorldCollisions,
  type PandaForestLayoutConfig
} from '../world/pandaForestLayout';
import {
  DEFAULT_MAX_PLAYERS_PER_ROOM,
  DEFAULT_PUBLIC_INSTANCES,
  DEFAULT_ROOM_ID,
  deriveAccentColorFromSessionId,
  HEARTBEAT_TIMEOUT_MS,
  RESUME_GRACE_WINDOW_MS,
  type ErrorNoticeMessage,
  type InteractPropMessage,
  type InteractSeatMessage,
  type JoinFriendInstanceMessage,
  type PlayerEmoteTriggeredMessage,
  type PlayerIdentityUpdatedMessage,
  type PlayerJoinedMessage,
  type PlayerLeftMessage,
  type PlayerMoveMessage,
  type PropStateUpdatedMessage,
  type ProximityChatBroadcastMessage,
  type RemoveFriendMessage,
  type ReportSubmittedAckMessage,
  type RespondFriendRequestMessage,
  type RoomStateTickMessage,
  type SeatStateUpdatedMessage,
  type SendChatMessage,
  type SendFriendRequestMessage,
  type SerializedPlayerState,
  type SetPlayerBlockMessage,
  type SocialPresenceUpdateMessage,
  type SubmitPlayerReportMessage,
  type SwitchInstanceMessage,
  type TriggerAnimalFeedingMessage,
  type TriggerEmoteMessage,
  type UpdateIdentityMessage,
  type WelcomeSnapshotMessage,
  type AnimalFeedingEventMessage
} from './protocol';
import {
  AnimalSimulationSystem,
  type AnimalInstanceState,
  type HabitatFeedingState,
  type HabitatId
} from '../animals';

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
      : null
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

  private globalSessionCounter = 0;
  private globalMessageCounter = 0;
  private globalFriendReqCounter = 0;
  private globalReportCounter = 0;

  constructor(options: ZooInstanceAuthorityOptions = {}) {
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

  /**
   * Returns a live directory of available zoo instances (`FR-025`, `SC-009`),
   * always including the default public channels plus any active custom/overflow rooms.
   */
  public getAvailableInstances(): ZooInstanceSummary[] {
    const labelMap = new Map<string, string>();
    for (const preset of DEFAULT_PUBLIC_INSTANCES) {
      labelMap.set(preset.roomId, preset.label);
    }

    const roomIds = new Set<string>(DEFAULT_PUBLIC_INSTANCES.map((p) => p.roomId));
    for (const rid of this.rooms.keys()) {
      roomIds.add(rid);
    }

    const summaries: ZooInstanceSummary[] = [];
    for (const rid of roomIds) {
      const room = this.rooms.get(rid);
      const visitorCount = room ? room.activeSessions.size : 0;
      const maxPlayers = room ? room.maxPlayers : this.maxPlayersPerRoom;
      summaries.push({
        roomId: rid,
        label: labelMap.get(rid) ?? `Custom Instance (${rid})`,
        visitorCount,
        maxPlayers,
        isFull: visitorCount >= maxPlayers
      });
    }
    return summaries;
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
      }
    };

    existing = {
      roomId: requestedRoomId,
      maxPlayers: this.maxPlayersPerRoom,
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

  private selectAvailableRoom(
    requestedRoomId: string = DEFAULT_ROOM_ID,
    now = Date.now()
  ): ZooInstanceRoom {
    const primary = this.getOrCreateRoom(requestedRoomId, now);
    if (primary.activeSessions.size < primary.maxPlayers) {
      return primary;
    }

    const basePrefix = requestedRoomId.replace(/-\d+$/, '');
    let overflowIdx = 2;
    while (overflowIdx < 100) {
      const candidateId = `${basePrefix}-${overflowIdx}`;
      const room = this.getOrCreateRoom(candidateId, now);
      if (room.activeSessions.size < room.maxPlayers) {
        return room;
      }
      overflowIdx++;
    }
    return primary;
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
    const candidateZ = Number((base[2] + Math.sin(angle) * radius).toFixed(3));

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

  public joinOrResumePlayer(params: {
    requestedRoomId?: string;
    resumeToken?: string | null;
    playerId?: string;
    displayName?: string;
    avatar?: AvatarAppearance | unknown;
    friendPlayerIds?: string[];
    blockedPlayerIds?: string[];
    now?: number;
  }): {
    welcome: WelcomeSnapshotMessage;
    joinedBroadcast: PlayerJoinedMessage;
  } {
    const now = params.now ?? Date.now();
    const requestedRoomId = params.requestedRoomId ?? DEFAULT_ROOM_ID;

    // 1. Check if resumeToken matches an active or grace-window session in any room
    if (params.resumeToken) {
      for (const room of this.rooms.values()) {
        this.pruneExpiredResumableTokens(room, now);
        const resumable = room.resumableSessions.get(params.resumeToken);
        if (
          resumable &&
          now <= resumable.expiresAt &&
          room.activeSessions.size < room.maxPlayers
        ) {
          room.resumableSessions.delete(params.resumeToken);

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

          const resumedRecord: PlayerSessionRecord = {
            ...resumable.record,
            baseDisplayName,
            displayName,
            avatar,
            lastHeartbeatAt: now,
            lastMoveAt: now,
            activeEmote: null,
            seatedOn: null,
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
            welcome: this.buildWelcomeSnapshot(room, resumedRecord, true, now),
            joinedBroadcast: {
              type: 'player_joined',
              roomId: room.roomId,
              player: serializedSelf,
              visitorCount: room.activeSessions.size,
              serverTimestamp: now
            }
          };
        }
      }
    }

    // 2. Assign a fresh session in an available room
    const room = this.selectAvailableRoom(requestedRoomId, now);
    this.pruneExpiredResumableTokens(room, now);

    this.globalSessionCounter += 1;
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
      welcome: this.buildWelcomeSnapshot(room, record, false, now),
      joinedBroadcast: {
        type: 'player_joined',
        roomId: room.roomId,
        player: serializePlayerRecord(record),
        visitorCount: room.activeSessions.size,
        serverTimestamp: now
      }
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
    now: number
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
      availableInstances: this.getAvailableInstances(),
      animals: this.getOrCreateAnimalSystem(room.roomId, now).getAnimals(),
      habitatFeedings: this.getOrCreateAnimalSystem(room.roomId, now).getHabitatFeedings()
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
        canJoin: Boolean(activeSession && roomVisitorCount < roomMaxPlayers)
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
      availableInstances: this.getAvailableInstances(),
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

    const targetRoom = this.rooms.get(friendSession.roomId);
    if (!targetRoom) {
      return {
        accepted: false,
        errorCode: 'FRIEND_REQUEST_INVALID',
        errorMessage: 'Friend instance is unavailable.'
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
    if (targetRoom.activeSessions.size >= targetRoom.maxPlayers) {
      return {
        accepted: false,
        errorCode: 'ROOM_FULL',
        errorMessage: `Instance ${requestedRoomId} is currently full (${targetRoom.activeSessions.size}/${targetRoom.maxPlayers}).`
      };
    }

    const seatReleasedOldRoom = this.releasePlayerSeat(currentRoom, session, now);
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
      createdAt: new Date(now).toISOString()
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
    disconnectedPlayerId: string | null;
  } {
    const roomId = this.sessionToRoom.get(sessionId);
    if (!roomId) return { left: null, seatUpdate: null, disconnectedPlayerId: null };
    const room = this.rooms.get(roomId);
    if (!room) return { left: null, seatUpdate: null, disconnectedPlayerId: null };

    const session = room.activeSessions.get(sessionId);
    if (!session) return { left: null, seatUpdate: null, disconnectedPlayerId: null };

    const seatUpdate = this.releasePlayerSeat(room, session, now);
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
      disconnectedPlayerId: session.playerId
    };
  }

  public pruneStaleSessions(now = Date.now()): Array<
    PlayerLeftMessage & {
      left: PlayerLeftMessage;
      seatUpdate: SeatStateUpdatedMessage | null;
      disconnectedPlayerId: string;
    }
  > {
    const removals: Array<
      PlayerLeftMessage & {
        left: PlayerLeftMessage;
        seatUpdate: SeatStateUpdatedMessage | null;
        disconnectedPlayerId: string;
      }
    > = [];

    for (const room of this.rooms.values()) {
      this.pruneExpiredResumableTokens(room, now);

      for (const session of Array.from(room.activeSessions.values())) {
        if (now - session.lastHeartbeatAt > this.heartbeatTimeoutMs) {
          const seatUpdate = this.releasePlayerSeat(room, session, now);
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
            disconnectedPlayerId: session.playerId
          });
        }
      }
    }

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
