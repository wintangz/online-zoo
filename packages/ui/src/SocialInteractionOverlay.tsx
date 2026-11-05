import React, { useState } from 'react';
import { useStore } from 'zustand';
import {
  EMOTE_CATALOG,
  gameStore,
  MAX_CHAT_MESSAGE_LENGTH,
  type EmoteId,
  type MultiplayerClient,
  type ReportReason
} from '@online-zoo/game-core';

function getRuntimeMultiplayerClient(): MultiplayerClient | undefined {
  if (typeof window === 'undefined') return undefined;
  const w = window as unknown as {
    __ONLINE_ZOO_RUNTIME__?: { multiplayerClient?: MultiplayerClient };
  };
  return w.__ONLINE_ZOO_RUNTIME__?.multiplayerClient;
}

export const SocialInteractionOverlay: React.FC = () => {
  const phase = useStore(gameStore, (s) => s.phase);
  const identityProfile = useStore(gameStore, (s) => s.identity.profile);
  const multiplayer = useStore(gameStore, (s) => s.multiplayer);
  const social = useStore(gameStore, (s) => s.social);
  const toggleMutePlayer = useStore(gameStore, (s) => s.toggleMutePlayer);
  const setSocialDrawerOpen = useStore(gameStore, (s) => s.setSocialDrawerOpen);
  const openReportModal = useStore(gameStore, (s) => s.openReportModal);
  const closeReportModal = useStore(gameStore, (s) => s.closeReportModal);
  const setSocialNotice = useStore(gameStore, (s) => s.setSocialNotice);
  const isHudCompact = useStore(gameStore, (s) => s.isHudCompact);

  const [chatDraft, setChatDraft] = useState('');
  const [chatCollapsed, setChatCollapsed] = useState(false);
  const [friendTargetInput, setFriendTargetInput] = useState('');
  const [customInstanceInput, setCustomInstanceInput] = useState('');
  const [tuneIdInput, setTuneIdInput] = useState('');
  const [copiedIdKey, setCopiedIdKey] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState<ReportReason>('inappropriate-chat');
  const [reportDetails, setReportDetails] = useState('');

  if (phase !== 'playing') {
    return null;
  }

  const remoteVisitors = Object.values(multiplayer.remoteVisitors);

  const handleCopyText = (text: string, key: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).catch(() => {
        // Ignore clipboard permission fallback
      });
    }
    setCopiedIdKey(key);
    setTimeout(() => {
      setCopiedIdKey((prev) => (prev === key ? null : prev));
    }, 1800);
  };

  const handleSwitchInstance = (targetRoomId: string) => {
    const trimmed = targetRoomId.trim();
    if (!trimmed) return;
    if (trimmed === multiplayer.roomId) {
      setSocialNotice(`You are already in instance ${trimmed}.`);
      return;
    }
    const mp = getRuntimeMultiplayerClient();
    if (mp) {
      mp.switchInstance(trimmed);
      setSocialNotice(`Switching to instance ${trimmed}...`);
    } else {
      gameStore.getState().updateMultiplayerState({ roomId: trimmed });
      setSocialNotice(`Switched local instance to ${trimmed}.`);
    }
  };

  const handleJoinCustomInstance = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = customInstanceInput.trim();
    if (!trimmed) return;
    handleSwitchInstance(trimmed);
    setCustomInstanceInput('');
  };

  const handleApplyTunedPlayerId = (e: React.FormEvent) => {
    e.preventDefault();
    const res = gameStore.getState().tunePlayerId(tuneIdInput);
    if (!res.ok || !res.profile) {
      setSocialNotice(res.errorMessage ?? 'Invalid Player ID.');
      return;
    }
    const mp = getRuntimeMultiplayerClient();
    mp?.sendIdentityUpdate(res.profile);
    setTuneIdInput('');
    setSocialNotice(`Player ID tuned to ${res.profile.playerId}.`);
  };

  const handleRegeneratePlayerId = () => {
    const nextProfile = gameStore.getState().regeneratePlayerId();
    const mp = getRuntimeMultiplayerClient();
    mp?.sendIdentityUpdate(nextProfile);
    setTuneIdInput('');
    setSocialNotice(`Generated new Player ID: ${nextProfile.playerId}.`);
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    const mp = getRuntimeMultiplayerClient();
    if (mp) {
      const res = mp.sendChatMessage(chatDraft);
      if (res.valid) {
        setChatDraft('');
      }
    }
  };

  const handleTriggerEmote = (emoteId: EmoteId) => {
    const mp = getRuntimeMultiplayerClient();
    const isSameActive = social.localActiveEmote?.emoteId === emoteId;
    if (mp) {
      mp.sendEmote(isSameActive ? null : emoteId);
    } else {
      gameStore.getState().setLocalActiveEmote(null);
    }
  };

  const handleSendFriendRequest = (targetPlayerId: string, targetDisplayName?: string) => {
    const mp = getRuntimeMultiplayerClient();
    mp?.sendFriendRequest(targetPlayerId, targetDisplayName);
    setSocialNotice(`Friend request sent to ${targetDisplayName ?? targetPlayerId}.`);
  };

  const handleDirectFriendRequest = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = friendTargetInput.trim();
    if (!trimmed) return;
    handleSendFriendRequest(trimmed, trimmed);
    setFriendTargetInput('');
  };

  const handleRespondFriendRequest = (requestId: string, decision: 'accept' | 'reject') => {
    const mp = getRuntimeMultiplayerClient();
    mp?.respondFriendRequest(requestId, decision);
  };

  const handleRemoveFriend = (targetPlayerId: string) => {
    const mp = getRuntimeMultiplayerClient();
    mp?.removeFriend(targetPlayerId);
  };

  const handleJoinFriendInstance = (friendPlayerId: string) => {
    const mp = getRuntimeMultiplayerClient();
    mp?.joinFriendInstance(friendPlayerId);
  };

  const handleToggleAllowFriendJoin = () => {
    const nextAllow = !social.allowFriendJoin;
    const mp = getRuntimeMultiplayerClient();
    if (mp) {
      mp.setSocialPrivacy(nextAllow);
    } else {
      gameStore.getState().setAllowFriendJoin(nextAllow);
    }
    setSocialNotice(
      nextAllow
        ? 'Friend instance joining enabled.'
        : 'Friend instance joining disabled (Private).'
    );
  };

  const handleConfigureInstanceCapacity = (roomId: string, maxPlayers: number) => {
    const mp = getRuntimeMultiplayerClient();
    if (mp) {
      mp.configureInstance({ roomId, maxPlayers });
    } else {
      const next = social.availableInstances.map((inst) =>
        inst.roomId === roomId
          ? { ...inst, maxPlayers, isFull: inst.visitorCount >= maxPlayers }
          : inst
      );
      gameStore.getState().setAvailableInstances(next);
    }
  };

  const handleToggleInstanceHealth = (
    roomId: string,
    status: 'healthy' | 'unhealthy'
  ) => {
    const mp = getRuntimeMultiplayerClient();
    if (mp) {
      mp.configureInstance({ roomId, status });
    } else {
      const next = social.availableInstances.map((inst) =>
        inst.roomId === roomId ? { ...inst, status } : inst
      );
      gameStore.getState().setAvailableInstances(next);
    }
  };

  const handleToggleBlock = (targetPlayerId: string) => {
    const isBlocked = social.blockedPlayerIds.includes(targetPlayerId);
    const mp = getRuntimeMultiplayerClient();
    if (mp) {
      mp.setPlayerBlock(targetPlayerId, !isBlocked);
    } else {
      gameStore.getState().setBlockPlayer(targetPlayerId, !isBlocked);
    }
  };

  const handleSubmitReport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!social.reportModalTarget) return;
    const mp = getRuntimeMultiplayerClient();
    if (mp) {
      mp.submitPlayerReport({
        reportedPlayerId: social.reportModalTarget.playerId,
        reportedSessionId: social.reportModalTarget.sessionId,
        reportedDisplayName: social.reportModalTarget.displayName,
        reason: reportReason,
        details: reportDetails
      });
    }
    setReportDetails('');
  };

  return (
    <>
      {/* Bottom-Left Compact Proximity Chat & Emote Picker Bar (FR-001 - FR-011) */}
      <div
        data-ui-interactive="true"
        className="pointer-events-none fixed bottom-3 left-3 z-20 flex w-64 max-w-[calc(100vw-1.5rem)] select-none flex-col gap-1.5 sm:bottom-4 sm:left-4 sm:w-72"
      >
        {/* 5-Emote Quick Bar (FR-009) */}
        <div
          data-testid="emote-picker-bar"
          className="pointer-events-auto flex flex-wrap items-center justify-center gap-1 rounded-xl border border-white/15 bg-emerald-950/80 p-1.5 shadow-md backdrop-blur-md"
        >
          {EMOTE_CATALOG.map((emote) => {
            const isActive = social.localActiveEmote?.emoteId === emote.id;
            return (
              <button
                key={emote.id}
                type="button"
                data-testid={`emote-btn-${emote.id}`}
                onClick={(e) => {
                  e.currentTarget.blur();
                  handleTriggerEmote(emote.id);
                }}
                className={`inline-flex items-center justify-center gap-1 whitespace-nowrap rounded-lg border px-2 py-1 text-center text-[11px] font-bold leading-none transition active:scale-95 ${
                  isActive
                    ? 'border-amber-300 bg-amber-400 text-emerald-950 shadow'
                    : 'border-white/15 bg-white/10 text-emerald-100 hover:bg-white/20'
                }`}
              >
                <span>{emote.icon}</span>
                <span>{emote.label}</span>
              </button>
            );
          })}
        </div>

        {/* Compact Proximity Chat Panel (FR-001 - FR-008) */}
        <div
          data-testid="proximity-chat-panel"
          className="pointer-events-auto flex flex-col rounded-xl border border-white/15 bg-emerald-950/80 p-2 text-white shadow-lg backdrop-blur-md"
        >
          <div className="mb-1 flex items-center justify-between border-b border-white/10 pb-1">
            <button
              type="button"
              data-testid="toggle-chat-compact-btn"
              onClick={() => setChatCollapsed((prev) => !prev)}
              className="text-left text-[10px] font-bold uppercase tracking-wider text-emerald-300 hover:text-emerald-200"
            >
              Proximity Chat (24m) {chatCollapsed || isHudCompact ? '▸' : '▾'}
            </button>
            <span className="text-[10px] font-medium text-emerald-200/80">
              {social.chatMessages.length} msgs
            </span>
          </div>

          {!chatCollapsed && !isHudCompact && (
            <div
              data-testid="chat-message-list"
              className="mb-1.5 flex max-h-20 min-h-[1.75rem] flex-col gap-1 overflow-y-auto pr-1 text-[11px]"
            >
              {social.chatMessages.length === 0 ? (
                <p className="my-auto text-center text-[10px] italic text-emerald-300/70">
                  Say hello to nearby visitors (24m)
                </p>
              ) : (
                social.chatMessages.map((msg) => {
                  const isSelf = multiplayer.localSessionId
                    ? msg.senderSessionId === multiplayer.localSessionId
                    : msg.senderPlayerId === identityProfile.playerId;
                  return (
                    <div
                      key={msg.messageId}
                      data-testid="chat-message-item"
                      data-sender-player-id={msg.senderPlayerId}
                      className="flex items-start justify-between gap-1.5 rounded bg-white/5 px-1.5 py-0.5"
                    >
                      <div className="min-w-0 flex-1 break-words leading-snug">
                        <span
                          className="mr-1 font-bold"
                          style={{ color: msg.senderAccentColor || '#6ee7b7' }}
                        >
                          {msg.senderDisplayName}:
                        </span>
                        <span className="text-emerald-50">{msg.text}</span>
                      </div>
                      {!isSelf && (
                        <div className="flex shrink-0 items-center gap-1">
                          <button
                            type="button"
                            title="Mute speaker"
                            onClick={() => toggleMutePlayer(msg.senderPlayerId)}
                            className="inline-flex items-center justify-center rounded bg-white/10 px-1 py-0.5 text-[9px] font-semibold leading-none text-amber-200 hover:bg-white/20"
                          >
                            Mute
                          </button>
                          <button
                            type="button"
                            title="Report speaker"
                            onClick={() =>
                              openReportModal({
                                playerId: msg.senderPlayerId,
                                sessionId: msg.senderSessionId,
                                displayName: msg.senderDisplayName
                              })
                            }
                            className="inline-flex items-center justify-center rounded bg-rose-500/25 px-1 py-0.5 text-[9px] font-semibold leading-none text-rose-200 hover:bg-rose-500/40"
                          >
                            Report
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {social.chatFeedback && (
            <div
              data-testid="chat-feedback-banner"
              className="mb-2 rounded-xl border border-rose-400/40 bg-rose-950/80 px-2.5 py-1.5 text-center text-[11px] font-semibold text-rose-200"
            >
              {social.chatFeedback.message}
            </div>
          )}

          <form onSubmit={handleSendChat} className="flex items-center gap-1.5">
            <input
              type="text"
              data-testid="chat-message-input"
              data-ui-interactive="true"
              value={chatDraft}
              maxLength={MAX_CHAT_MESSAGE_LENGTH}
              onChange={(e) => setChatDraft(e.target.value)}
              onKeyDown={(e) => {
                e.stopPropagation();
              }}
              placeholder="Say something to nearby visitors..."
              className="min-w-0 flex-1 rounded-xl border border-white/20 bg-black/35 px-3 py-1.5 text-xs text-white placeholder-emerald-200/50 focus:border-emerald-400 focus:outline-none"
            />
            <button
              type="submit"
              data-testid="chat-send-btn"
              className="inline-flex shrink-0 items-center justify-center rounded-xl bg-emerald-400 px-3 py-1.5 text-center text-xs font-bold leading-none text-emerald-950 shadow transition hover:bg-emerald-300 active:scale-95"
            >
              Send
            </button>
          </form>
        </div>
      </div>

      {/* Floating Instance Placement / Recovery Notice when Social Drawer is closed */}
      {social.socialNotice && !social.isSocialDrawerOpen && (
        <div
          data-testid="social-feedback-banner"
          data-ui-interactive="true"
          className="pointer-events-auto fixed right-4 top-20 z-30 flex max-w-sm items-center justify-between gap-2 rounded-2xl border border-amber-300/45 bg-emerald-950/95 px-3.5 py-2.5 text-center text-xs font-semibold text-amber-100 shadow-xl backdrop-blur-md sm:right-6"
        >
          <span className="flex-1">{social.socialNotice}</span>
          <button
            type="button"
            onClick={() => setSocialNotice(null)}
            className="text-[10px] font-bold uppercase text-amber-200 underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Right-Side Friends, Nearby Visitors & Safety Drawer (FR-017 - FR-024) */}
      {social.isSocialDrawerOpen && (
        <div
          data-testid="social-drawer-panel"
          data-ui-interactive="true"
          className="pointer-events-auto fixed right-4 top-20 z-30 flex max-h-[calc(100vh-7rem)] w-88 max-w-[calc(100vw-2rem)] select-none flex-col gap-3 overflow-y-auto rounded-3xl border border-white/25 bg-emerald-950/95 p-4 text-white shadow-2xl backdrop-blur-xl sm:right-6 sm:w-96"
        >
          <div className="flex items-center justify-between border-b border-white/15 pb-2.5">
            <div>
              <h2 className="text-sm font-extrabold tracking-wide text-white">
                Social, Instances & Safety
              </h2>
              <p className="text-[11px] text-emerald-300">
                Instance: <span className="font-bold text-white">{multiplayer.roomId}</span>
              </p>
            </div>
            <button
              type="button"
              data-testid="close-social-drawer-btn"
              onClick={() => setSocialDrawerOpen(false)}
              className="inline-flex items-center justify-center rounded-xl border border-white/20 bg-white/10 px-2.5 py-1 text-center text-xs font-bold leading-none text-white hover:bg-white/20"
            >
              Close
            </button>
          </div>

          {/* Local Player ID Card: Selectable, Copiable & Tunable (FR-027, FR-028, SC-010) */}
          <div
            data-testid="player-id-tuning-card"
            className="flex flex-col gap-2 rounded-2xl border border-white/15 bg-black/25 p-2.5"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-emerald-300">
                  Your Player ID (Select or Copy)
                </span>
                <code
                  data-testid="social-local-player-id"
                  className="mt-0.5 block truncate select-all cursor-text rounded bg-black/40 px-2 py-1 font-mono text-xs font-bold text-amber-300"
                >
                  {identityProfile.playerId}
                </code>
              </div>
              <div className="flex shrink-0 flex-col gap-1">
                <button
                  type="button"
                  data-testid="copy-local-player-id-btn"
                  onClick={() => handleCopyText(identityProfile.playerId, 'local')}
                  className="inline-flex items-center justify-center rounded-lg bg-amber-400 px-2.5 py-1 text-center text-[11px] font-bold leading-none text-emerald-950 hover:bg-amber-300"
                >
                  {copiedIdKey === 'local' ? 'Copied!' : 'Copy ID'}
                </button>
                <button
                  type="button"
                  data-testid="regenerate-player-id-btn"
                  title="Generate a fresh distinct Player ID (useful for multi-tab testing)"
                  onClick={handleRegeneratePlayerId}
                  className="inline-flex items-center justify-center rounded-lg border border-white/20 bg-white/10 px-2.5 py-1 text-center text-[10px] font-bold leading-none text-emerald-100 hover:bg-white/20"
                >
                  New ID
                </button>
              </div>
            </div>

            <form onSubmit={handleApplyTunedPlayerId} className="flex items-center gap-1.5">
              <input
                type="text"
                data-testid="tune-player-id-input"
                data-ui-interactive="true"
                value={tuneIdInput}
                onChange={(e) => setTuneIdInput(e.target.value)}
                onKeyDown={(e) => e.stopPropagation()}
                placeholder="Tune ID (e.g. bamboo-keeper)..."
                className="min-w-0 flex-1 rounded-xl border border-white/20 bg-black/40 px-2.5 py-1 text-xs text-white placeholder-emerald-200/45 focus:border-emerald-400 focus:outline-none"
              />
              <button
                type="submit"
                data-testid="apply-player-id-btn"
                className="inline-flex shrink-0 items-center justify-center rounded-xl bg-emerald-400 px-2.5 py-1 text-center text-[11px] font-bold leading-none text-emerald-950 hover:bg-emerald-300"
              >
                Tune ID
              </button>
            </form>

            {/* Friend Instance Privacy Setting (FR-006, SC-002) */}
            <div className="flex items-center justify-between gap-2 border-t border-white/10 pt-2">
              <div className="min-w-0 flex-1">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-emerald-300">
                  Friend Instance Joining
                </span>
                <span className="text-[11px] text-emerald-100/80">
                  {social.allowFriendJoin
                    ? 'Friends can join your instance directly'
                    : 'Private (Friends cannot join your instance)'}
                </span>
              </div>
              <button
                type="button"
                data-testid="toggle-allow-friend-join-btn"
                onClick={handleToggleAllowFriendJoin}
                className={`inline-flex shrink-0 items-center justify-center rounded-lg px-2.5 py-1 text-center text-[11px] font-bold leading-none transition ${
                  social.allowFriendJoin
                    ? 'bg-emerald-400 text-emerald-950 hover:bg-emerald-300'
                    : 'bg-rose-500/35 text-rose-100 hover:bg-rose-500/50'
                }`}
              >
                {social.allowFriendJoin ? 'Allowed' : 'Private'}
              </button>
            </div>
          </div>

          {social.socialNotice && (
            <div
              data-testid="social-feedback-banner"
              className="flex items-center justify-between gap-2 rounded-xl border border-amber-300/40 bg-amber-500/20 px-3 py-2 text-center text-xs font-semibold text-amber-100"
            >
              <span className="flex-1">{social.socialNotice}</span>
              <button
                type="button"
                onClick={() => setSocialNotice(null)}
                className="text-[10px] font-bold uppercase text-amber-200 underline"
              >
                Dismiss
              </button>
            </div>
          )}

          {social.reportConfirmationMessage && (
            <div
              data-testid="report-confirmation-banner"
              className="rounded-xl border border-emerald-300/40 bg-emerald-500/20 px-3 py-2 text-center text-xs font-semibold text-emerald-100"
            >
              {social.reportConfirmationMessage}
            </div>
          )}

          {/* 0. Instance (Server) Selection Directory (FR-001 - FR-012, SC-001 - SC-005) */}
          <div data-testid="instance-selector-section" className="flex flex-col gap-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-300">
              Zoo Instances / Servers ({social.availableInstances.length})
            </h3>
            <div className="flex flex-col gap-1.5">
              {social.availableInstances.map((inst) => {
                const isCurrent = inst.roomId === multiplayer.roomId;
                const status = inst.status ?? 'healthy';
                const isUnhealthy = status === 'unhealthy';
                const friendCount = inst.friendCount ?? 0;
                const liveCount = isCurrent
                  ? Math.max(inst.visitorCount, multiplayer.visitorCount)
                  : inst.visitorCount;
                const isFull = liveCount >= inst.maxPlayers && !isCurrent;
                return (
                  <div
                    key={inst.roomId}
                    data-testid={`instance-option-${inst.roomId}`}
                    className={`flex flex-col gap-1.5 rounded-xl border px-2.5 py-2 ${
                      isUnhealthy
                        ? 'border-rose-400/50 bg-rose-950/35'
                        : isCurrent
                          ? 'border-emerald-400/60 bg-emerald-500/20'
                          : 'border-white/15 bg-white/5'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <p className="truncate text-xs font-bold text-white">{inst.label}</p>
                          <span
                            data-testid={`instance-status-badge-${inst.roomId}`}
                            className={`inline-flex items-center justify-center rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase leading-none ${
                              isUnhealthy
                                ? 'bg-rose-500/35 text-rose-200'
                                : 'bg-emerald-500/25 text-emerald-200'
                            }`}
                          >
                            {isUnhealthy ? 'Unavailable' : 'Healthy'}
                          </span>
                          {friendCount > 0 && (
                            <span
                              data-testid={`instance-friends-badge-${inst.roomId}`}
                              className="inline-flex items-center justify-center rounded-full bg-sky-400/25 px-1.5 py-0.5 text-[9px] font-bold leading-none text-sky-200"
                            >
                              👥 {friendCount} {friendCount === 1 ? 'Friend' : 'Friends'}
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 text-[10px] text-emerald-200/80">
                          <code className="font-mono text-amber-200">{inst.roomId}</code> •{' '}
                          <span data-testid={`instance-pop-${inst.roomId}`}>
                            {liveCount}/{inst.maxPlayers} visitors
                          </span>
                        </p>
                      </div>
                      <button
                        type="button"
                        data-testid={`switch-instance-btn-${inst.roomId}`}
                        disabled={isCurrent || isFull || isUnhealthy}
                        onClick={() => handleSwitchInstance(inst.roomId)}
                        className={`inline-flex shrink-0 items-center justify-center rounded-lg px-2.5 py-1 text-center text-[11px] font-bold leading-none transition ${
                          isUnhealthy
                            ? 'bg-rose-500/30 text-rose-200 cursor-not-allowed'
                            : isCurrent
                              ? 'bg-emerald-400/30 text-emerald-100 cursor-default'
                              : isFull
                                ? 'bg-rose-500/30 text-rose-200 cursor-not-allowed'
                                : 'bg-sky-400 text-sky-950 hover:bg-sky-300 active:scale-95'
                        }`}
                      >
                        {isUnhealthy
                          ? 'Unavailable'
                          : isCurrent
                            ? 'Current'
                            : isFull
                              ? 'Full'
                              : 'Switch'}
                      </button>
                    </div>

                    {/* Runtime Instance Capacity & Health Controls (FR-002, FR-011, SC-001, SC-005) */}
                    <div className="flex items-center justify-between gap-2 border-t border-white/10 pt-1.5 text-[10px]">
                      <label className="flex items-center gap-1 text-emerald-200/85">
                        <span>Cap:</span>
                        <select
                          data-testid={`instance-capacity-select-${inst.roomId}`}
                          value={inst.maxPlayers}
                          onChange={(e) =>
                            handleConfigureInstanceCapacity(
                              inst.roomId,
                              Number(e.target.value)
                            )
                          }
                          className="rounded border border-white/20 bg-black/45 px-1.5 py-0.5 text-[10px] font-bold text-white focus:border-emerald-400 focus:outline-none"
                        >
                          {[1, 2, 4, 8, 16, 24, 32].map((cap) => (
                            <option key={cap} value={cap}>
                              {cap} max
                            </option>
                          ))}
                        </select>
                      </label>
                      <button
                        type="button"
                        data-testid={`instance-health-toggle-btn-${inst.roomId}`}
                        onClick={() =>
                          handleToggleInstanceHealth(
                            inst.roomId,
                            isUnhealthy ? 'healthy' : 'unhealthy'
                          )
                        }
                        className={`inline-flex items-center justify-center rounded px-2 py-0.5 text-center text-[10px] font-bold leading-none transition ${
                          isUnhealthy
                            ? 'bg-emerald-400 text-emerald-950 hover:bg-emerald-300'
                            : 'bg-white/10 text-rose-200 hover:bg-rose-500/30'
                        }`}
                      >
                        {isUnhealthy ? 'Restore Healthy' : 'Simulate Outage'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <form onSubmit={handleJoinCustomInstance} className="flex items-center gap-1.5">
              <input
                type="text"
                data-testid="custom-instance-input"
                data-ui-interactive="true"
                value={customInstanceInput}
                onChange={(e) => setCustomInstanceInput(e.target.value)}
                onKeyDown={(e) => e.stopPropagation()}
                placeholder="Custom server ID (e.g. panda-forest-4)..."
                className="min-w-0 flex-1 rounded-xl border border-white/20 bg-black/35 px-2.5 py-1.5 text-xs text-white placeholder-emerald-200/50 focus:border-emerald-400 focus:outline-none"
              />
              <button
                type="submit"
                data-testid="join-custom-instance-btn"
                className="inline-flex shrink-0 items-center justify-center rounded-xl bg-sky-400 px-2.5 py-1.5 text-center text-xs font-bold leading-none text-sky-950 hover:bg-sky-300"
              >
                Join
              </button>
            </form>
          </div>

          {/* 1. Nearby / Connected Visitors in Instance with 1-Click Friend & Safety Controls */}
          <div data-testid="nearby-visitors-section" className="flex flex-col gap-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-300">
              Visitors in Instance ({remoteVisitors.length})
            </h3>
            {remoteVisitors.length === 0 ? (
              <p className="rounded-xl bg-white/5 p-2.5 text-center text-xs text-emerald-200/75">
                No other visitors in this instance right now.
              </p>
            ) : (
              remoteVisitors.map((visitor) => {
                const pid = visitor.playerId ?? visitor.sessionId;
                const isFriend = social.friends.some((f) => f.playerId === pid);
                const isMuted = social.mutedPlayerIds.includes(pid);
                const isBlocked = social.blockedPlayerIds.includes(pid);

                return (
                  <div
                    key={visitor.sessionId}
                    data-testid={`social-visitor-row-${pid}`}
                    className="flex flex-col gap-2 rounded-2xl border border-white/15 bg-white/5 p-2.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: visitor.accentColor }}
                        />
                        <span className="text-xs font-bold text-white">{visitor.displayName}</span>
                      </div>
                      <span className="text-[10px] font-medium text-emerald-300">
                        {visitor.seatedOn ? 'Seated' : visitor.locomotionState}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-1.5 rounded-lg bg-black/30 px-2 py-1">
                      <code
                        data-testid={`visitor-player-id-${pid}`}
                        className="min-w-0 flex-1 truncate select-all cursor-text font-mono text-[10px] text-amber-200"
                      >
                        {pid}
                      </code>
                      <button
                        type="button"
                        data-testid={`copy-visitor-id-btn-${pid}`}
                        onClick={() => handleCopyText(pid, `visitor-${visitor.sessionId}`)}
                        className="inline-flex shrink-0 items-center justify-center rounded bg-white/15 px-1.5 py-0.5 text-[10px] font-bold leading-none text-amber-200 hover:bg-white/25"
                      >
                        {copiedIdKey === `visitor-${visitor.sessionId}` ? 'Copied!' : 'Copy ID'}
                      </button>
                    </div>

                    <div className="flex flex-wrap items-center justify-center gap-1.5">
                      {!isFriend && !isBlocked && (
                        <button
                          type="button"
                          data-testid={`send-friend-request-btn-${pid}`}
                          onClick={() => handleSendFriendRequest(pid, visitor.displayName)}
                          className="inline-flex items-center justify-center rounded-lg bg-emerald-500/30 px-2.5 py-1 text-center text-[11px] font-bold leading-none text-emerald-100 hover:bg-emerald-500/45"
                        >
                          + Add Friend
                        </button>
                      )}
                      <button
                        type="button"
                        data-testid={`mute-player-btn-${pid}`}
                        onClick={() => toggleMutePlayer(pid)}
                        className={`inline-flex items-center justify-center rounded-lg px-2.5 py-1 text-center text-[11px] font-bold leading-none ${
                          isMuted
                            ? 'bg-amber-400 text-emerald-950'
                            : 'bg-white/15 text-amber-200 hover:bg-white/25'
                        }`}
                      >
                        {isMuted ? 'Unmute' : 'Mute'}
                      </button>
                      <button
                        type="button"
                        data-testid={`block-player-btn-${pid}`}
                        onClick={() => handleToggleBlock(pid)}
                        className={`inline-flex items-center justify-center rounded-lg px-2.5 py-1 text-center text-[11px] font-bold leading-none ${
                          isBlocked
                            ? 'bg-rose-400 text-rose-950'
                            : 'bg-white/15 text-rose-200 hover:bg-white/25'
                        }`}
                      >
                        {isBlocked ? 'Unblock' : 'Block'}
                      </button>
                      <button
                        type="button"
                        data-testid={`open-report-modal-btn-${pid}`}
                        onClick={() =>
                          openReportModal({
                            playerId: pid,
                            sessionId: visitor.sessionId,
                            displayName: visitor.displayName
                          })
                        }
                        className="inline-flex items-center justify-center rounded-lg bg-rose-500/30 px-2.5 py-1 text-center text-[11px] font-bold leading-none text-rose-200 hover:bg-rose-500/45"
                      >
                        Report
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* 2. Friend Requests (Incoming + Direct Add by ID/Name) */}
          <div data-testid="friend-requests-section" className="flex flex-col gap-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-300">
              Friend Requests ({social.incomingRequests.length})
            </h3>
            <form onSubmit={handleDirectFriendRequest} className="flex items-center gap-1.5">
              <input
                type="text"
                data-testid="friend-target-input"
                data-ui-interactive="true"
                value={friendTargetInput}
                onChange={(e) => setFriendTargetInput(e.target.value)}
                onKeyDown={(e) => e.stopPropagation()}
                placeholder="Enter visitor ID or name..."
                className="min-w-0 flex-1 rounded-xl border border-white/20 bg-black/35 px-2.5 py-1.5 text-xs text-white placeholder-emerald-200/50 focus:border-emerald-400 focus:outline-none"
              />
              <button
                type="submit"
                data-testid="send-direct-friend-request-btn"
                className="inline-flex shrink-0 items-center justify-center rounded-xl bg-emerald-400 px-2.5 py-1.5 text-center text-xs font-bold leading-none text-emerald-950 hover:bg-emerald-300"
              >
                Request
              </button>
            </form>

            {social.incomingRequests.map((req) => (
              <div
                key={req.requestId}
                data-testid={`incoming-friend-request-${req.fromPlayerId}`}
                className="flex items-center justify-between gap-2 rounded-xl border border-amber-300/35 bg-amber-500/15 px-3 py-2"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-bold text-white">{req.fromDisplayName}</p>
                  <p className="text-[10px] text-amber-200">Sent you a friend request</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    data-testid={`accept-friend-request-btn-${req.requestId}`}
                    onClick={() => handleRespondFriendRequest(req.requestId, 'accept')}
                    className="inline-flex items-center justify-center rounded-lg bg-emerald-400 px-2.5 py-1 text-center text-[11px] font-bold leading-none text-emerald-950"
                  >
                    Accept
                  </button>
                  <button
                    type="button"
                    data-testid={`reject-friend-request-btn-${req.requestId}`}
                    onClick={() => handleRespondFriendRequest(req.requestId, 'reject')}
                    className="inline-flex items-center justify-center rounded-lg bg-white/15 px-2.5 py-1 text-center text-[11px] font-bold leading-none text-white"
                  >
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* 3. Confirmed Friends List with Live Online Status & Join Instance (FR-018 - FR-020) */}
          <div data-testid="friends-list-section" className="flex flex-col gap-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-300">
              Friends ({social.friends.length})
            </h3>
            {social.friends.length === 0 ? (
              <p className="rounded-xl bg-white/5 p-2.5 text-center text-xs text-emerald-200/75">
                No friends added yet. Send a friend request to visitors you meet!
              </p>
            ) : (
              social.friends.map((friend) => {
                const isSameRoom = friend.online && friend.roomId === multiplayer.roomId;
                return (
                  <div
                    key={friend.playerId}
                    data-testid={`friend-item-${friend.playerId}`}
                    className="flex flex-col gap-2 rounded-2xl border border-white/15 bg-white/5 p-2.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-white">{friend.displayName}</span>
                      <span
                        data-testid={`friend-status-${friend.playerId}`}
                        className={`inline-flex items-center justify-center gap-1 rounded-full px-2 py-0.5 text-center text-[10px] font-bold leading-none ${
                          friend.online
                            ? 'bg-emerald-500/25 text-emerald-200'
                            : 'bg-white/10 text-emerald-200/60'
                        }`}
                      >
                        <span
                          className={`inline-block h-1.5 w-1.5 rounded-full ${
                            friend.online ? 'bg-emerald-400' : 'bg-slate-400'
                          }`}
                        />
                        <span>
                          {friend.online
                            ? `Online • ${friend.zoneDisplayName ? `${friend.zoneDisplayName} (${friend.roomId})` : friend.roomId} (${friend.roomVisitorCount}/${friend.roomMaxPlayers})${friend.allowFriendJoin === false ? ' • Private' : ''}`
                            : 'Offline'}
                        </span>
                      </span>
                    </div>

                    <div className="flex items-center justify-end gap-1.5">
                      {friend.online && (
                        <button
                          type="button"
                          data-testid={`join-friend-btn-${friend.playerId}`}
                          onClick={() => handleJoinFriendInstance(friend.playerId)}
                          className="inline-flex items-center justify-center rounded-lg bg-sky-400 px-2.5 py-1 text-center text-[11px] font-bold leading-none text-sky-950 hover:bg-sky-300"
                        >
                          {isSameRoom ? 'In Same Instance' : 'Join Instance'}
                        </button>
                      )}
                      <button
                        type="button"
                        data-testid={`remove-friend-btn-${friend.playerId}`}
                        onClick={() => handleRemoveFriend(friend.playerId)}
                        className="inline-flex items-center justify-center rounded-lg bg-white/10 px-2.5 py-1 text-center text-[11px] font-semibold leading-none text-rose-200 hover:bg-rose-500/30"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Report Player Modal (FR-023, SC-008) */}
      {social.reportModalTarget && (
        <div
          data-testid="report-player-modal"
          data-ui-interactive="true"
          className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
        >
          <form
            onSubmit={handleSubmitReport}
            className="flex w-full max-w-md flex-col gap-3 rounded-3xl border border-white/25 bg-emerald-950 p-5 text-white shadow-2xl"
          >
            <h3 className="text-base font-extrabold text-white">
              Report Visitor: {social.reportModalTarget.displayName}
            </h3>
            <p className="text-xs text-emerald-200">
              Reports include visitor identity, instance ID, timestamp, and recent proximity chat context for moderation review.
            </p>

            <label className="flex flex-col gap-1 text-xs font-bold text-emerald-200">
              <span>Reason</span>
              <select
                data-testid="report-reason-select"
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value as ReportReason)}
                className="rounded-xl border border-white/20 bg-black/40 px-3 py-2 text-xs text-white focus:border-emerald-400 focus:outline-none"
              >
                <option value="inappropriate-chat">Inappropriate Chat</option>
                <option value="harassment-spam">Harassment or Spam</option>
                <option value="offensive-name">Offensive Display Name</option>
                <option value="other">Other Safety Concern</option>
              </select>
            </label>

            <label className="flex flex-col gap-1 text-xs font-bold text-emerald-200">
              <span>Additional Details (optional)</span>
              <textarea
                data-testid="report-details-input"
                value={reportDetails}
                maxLength={200}
                rows={3}
                onChange={(e) => setReportDetails(e.target.value)}
                onKeyDown={(e) => e.stopPropagation()}
                placeholder="Describe what happened..."
                className="rounded-xl border border-white/20 bg-black/40 px-3 py-2 text-xs text-white placeholder-emerald-200/40 focus:border-emerald-400 focus:outline-none"
              />
            </label>

            <div className="mt-1 flex items-center justify-end gap-2">
              <button
                type="button"
                data-testid="cancel-report-btn"
                onClick={() => closeReportModal()}
                className="inline-flex items-center justify-center rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-center text-xs font-bold leading-none text-white hover:bg-white/20"
              >
                Cancel
              </button>
              <button
                type="submit"
                data-testid="submit-report-btn"
                className="inline-flex items-center justify-center rounded-xl bg-rose-500 px-4 py-2 text-center text-xs font-bold leading-none text-white shadow hover:bg-rose-400"
              >
                Submit Report
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
};

