'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '@/store/gameStore';
import { useGameActions } from '@/hooks/useGameActions';
import { useRouter } from 'next/navigation';
import { RoomPlayer } from '@/types/game';
import { useAuthStore } from '@/store/authStore';
import { FriendsList } from './FriendsList';
import { getSocket } from '@/lib/socket';

interface LobbyProps {
  code: string;
}

export function Lobby({ code }: LobbyProps) {
  const router = useRouter();
  const room = useGameStore(s => s.room);
  const myPlayerId = useGameStore(s => s.myPlayerId);
  const error = useGameStore(s => s.error);
  const setError = useGameStore(s => s.setError);
  const { user } = useAuthStore();

  const { startGame, leaveRoom, updateSettings, assignTeams, addBot, kickPlayer } = useGameActions();
  const [startLoading, setStartLoading] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);

  useEffect(() => {
    const socket = getSocket();
    const handleKicked = () => {
      leaveRoom();
      router.push('/');
    };
    const handleDissolved = () => {
      leaveRoom();
      router.push('/');
    };
    socket.on('room:kicked', handleKicked);
    socket.on('room:dissolved', handleDissolved);
    return () => {
      socket.off('room:kicked', handleKicked);
      socket.off('room:dissolved', handleDissolved);
    };
  }, [leaveRoom, router]);

  if (!room) {
    return (
      <div className="gl-layout-full">
        <div className="lobby-bg-layer" />
        <div style={{ gridArea: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
          <div style={{ fontSize: 48 }} className="animate-pulse">🃏</div>
          <p className="gold-text" style={{ fontSize: 16, letterSpacing: '0.08em' }}>Loading lobby...</p>
        </div>
      </div>
    );
  }

  const isHost = room.hostId === myPlayerId;
  const { settings, players } = room;

  const handleStart = async () => {
    if (!isHost) return;
    setStartLoading(true);
    setError(null);
    try {
      await startGame();
    } catch (e: unknown) {
      setError((e as Error).message);
      setStartLoading(false);
    }
  };

  const handleLeave = () => {
    leaveRoom();
    router.push('/');
  };

  const handleAutoAssignTeams = () => {
    const assignments: Record<string, 'A' | 'B'> = {};
    players.forEach((p, i) => {
      assignments[p.id] = i % 2 === 0 ? 'A' : 'B';
    });
    assignTeams(assignments);
  };

  const togglePlayerTeam = (player: RoomPlayer) => {
    if (!isHost || !settings.teamMode) return;
    const currentTeam = player.team || 'A';
    const newTeam: 'A' | 'B' = currentTeam === 'A' ? 'B' : 'A';
    assignTeams({ [player.id]: newTeam });
  };

  const teamA = players.filter(p => p.team === 'A');
  const teamB = players.filter(p => p.team === 'B');
  const hasEvenPlayers = players.length % 2 === 0 && players.length >= 2;

  return (
    <div className="gl-layout-full">
      <div className="lobby-bg-layer" />

      {/* Top Bar */}
      <header className="gl-topbar">
        <button className="gl-back-btn" onClick={handleLeave}>←</button>
        <div className="gl-brand">
          <h1 className="gl-brand-name" style={{ fontSize: '17px', letterSpacing: '0.1em' }}>WAITING ROOM</h1>
        </div>
        <div className="gl-topbar-right">
          <span className="gl-conn-text" style={{ fontSize: 11, color: 'rgba(212,168,67,0.8)', fontWeight: 700, letterSpacing: '0.18em' }}>{code}</span>
        </div>
      </header>

      {/* Center Scrollable Content */}
      <main className="wr-center">

        {/* Room Code + Share Row */}
        <div className="wr-code-row">
          <div className="wr-code-block">
            <span className="wr-code-label">Room Code</span>
            <span className="wr-code-val">{code}</span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => navigator.clipboard.writeText(code)}
              className="wr-action-pill">
              📋 Copy
            </button>
            <button
              onClick={() => setShowInviteModal(true)}
              className="wr-action-pill wr-action-pill-gold">
              👥 Invite
            </button>
          </div>
        </div>

        {/* Players Grid */}
        <div className="wr-section">
          <div className="wr-section-header">
            <span className="wr-section-title">Players ({players.length}/{settings.maxPlayers})</span>
            {isHost && settings.teamMode && players.length >= 2 && (
              <button onClick={handleAutoAssignTeams} className="wr-action-pill" style={{ fontSize: 9 }}>
                Auto-assign
              </button>
            )}
          </div>

          <div className="wr-players-grid">
            <AnimatePresence>
              {players.map((player, i) => (
                <motion.div
                  key={player.id}
                  initial={{ scale: 0.88, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.88, opacity: 0 }}
                  transition={{ delay: i * 0.05, type: 'spring', stiffness: 300, damping: 22 }}
                  className={`wr-player-card ${player.team === 'A' ? 'team-a-card' : player.team === 'B' ? 'team-b-card' : ''} ${player.id === myPlayerId ? 'me-card' : ''}`}
                  onClick={() => settings.teamMode && isHost ? togglePlayerTeam(player) : undefined}
                  style={{ cursor: isHost && settings.teamMode ? 'pointer' : 'default' }}
                >
                  <div className={`wr-avatar ${player.team === 'A' ? 'wr-avatar-a' : player.team === 'B' ? 'wr-avatar-b' : ''}`}>
                    {player.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="wr-player-name">
                    {player.isBot && <span>🤖</span>}
                    {player.name}
                  </div>
                  <div className="wr-player-badges">
                    {player.id === room.hostId && <span className="wr-badge-host">HOST</span>}
                    {player.id === myPlayerId && <span className="wr-badge-you">YOU</span>}
                  </div>
                  {settings.teamMode && (
                    <div className="wr-team-tag">
                      {player.team === 'A' && <span style={{ color: '#60a5fa' }}>A</span>}
                      {player.team === 'B' && <span style={{ color: '#f87171' }}>B</span>}
                      {!player.team && <span style={{ color: 'rgba(255,255,255,0.25)' }}>?</span>}
                    </div>
                  )}
                  {isHost && player.id !== myPlayerId && (
                    <button
                      onClick={(e) => { e.stopPropagation(); kickPlayer(player.id); }}
                      className="wr-kick-btn"
                      title="Kick player">
                      ✕
                    </button>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Empty slots */}
            {Array.from({ length: settings.maxPlayers - players.length }).map((_, i) => (
              <div key={i} className="wr-empty-slot group">
                <div className="wr-empty-avatar">+</div>
                <span className="wr-empty-label">Empty</span>
                {isHost && (
                  <button onClick={() => addBot()} className="wr-add-bot-overlay">
                    <span style={{ fontSize: 20 }}>🤖</span>
                    <span className="wr-add-bot-label">Add Bot</span>
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Team summary */}
          {settings.teamMode && (teamA.length > 0 || teamB.length > 0) && (
            <div className="wr-teams-row">
              <div className="wr-team-panel wr-team-a">
                <div className="wr-team-label">Team A</div>
                {teamA.length > 0 ? teamA.map(p => <div key={p.id} className="wr-team-member">{p.name}</div>) : <div className="wr-team-empty">Empty</div>}
              </div>
              <div className="wr-team-panel wr-team-b">
                <div className="wr-team-label">Team B</div>
                {teamB.length > 0 ? teamB.map(p => <div key={p.id} className="wr-team-member">{p.name}</div>) : <div className="wr-team-empty">Empty</div>}
              </div>
            </div>
          )}
        </div>

        {/* Settings */}
        {isHost ? (
          <div className="wr-section">
            <div className="wr-section-header">
              <span className="wr-section-title">Game Settings</span>
            </div>

            <div className="wr-settings-list">
              <div className="wr-setting-row">
                <span className="wr-setting-name">Deck Size</span>
                <div className="wr-toggle-group">
                  {([1, 2] as const).map(n => (
                    <button key={n}
                      onClick={() => updateSettings({ deckCount: n })}
                      className={`wr-toggle-opt ${settings.deckCount === n ? 'active' : ''}`}>
                      {n === 1 ? '1 Deck' : '2 Decks'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="wr-setting-row">
                <span className="wr-setting-name">Max Players</span>
                <div className="wr-toggle-group">
                  {[2, 3, 4, 5, 6, 7, 8].map(n => (
                    <button key={n}
                      onClick={() => updateSettings({ maxPlayers: n })}
                      className={`wr-toggle-opt wr-toggle-opt-sm ${settings.maxPlayers === n ? 'active' : ''}`}>
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              <div className="wr-setting-row" style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 12, marginTop: 4 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span className="wr-setting-name">Team Mode</span>
                  {settings.teamMode && !hasEvenPlayers && (
                    <span style={{ fontSize: 9, color: '#eab308', textTransform: 'uppercase', letterSpacing: '0.06em' }}>⚠ Need even players</span>
                  )}
                </div>
                <button
                  onClick={() => updateSettings({ teamMode: !settings.teamMode })}
                  className={`lobby-toggle ${settings.teamMode ? 'on' : ''}`}>
                  <span className="lobby-toggle-knob" />
                </button>
              </div>

              {settings.teamMode && (
                <div className="wr-setting-row">
                  <span className="wr-setting-name">Target Score</span>
                  <div className="wr-stepper">
                    <button onClick={() => updateSettings({ targetScore: Math.max(10, settings.targetScore - 5) })} className="wr-stepper-btn">−</button>
                    <span className="wr-stepper-val gold-text">{settings.targetScore}</span>
                    <button onClick={() => updateSettings({ targetScore: settings.targetScore + 5 })} className="wr-stepper-btn">+</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="wr-section">
            <div className="wr-section-header">
              <span className="wr-section-title">Game Settings</span>
              <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Host controls</span>
            </div>
            <div className="wr-settings-list">
              <div className="wr-setting-row">
                <span className="wr-setting-name">Deck Size</span>
                <div className="wr-toggle-group">
                  {([1, 2] as const).map(n => (
                    <div key={n} className={`wr-toggle-opt ${settings.deckCount === n ? 'active' : ''}`} style={{ cursor: 'default', pointerEvents: 'none' }}>
                      {n === 1 ? '1 Deck' : '2 Decks'}
                    </div>
                  ))}
                </div>
              </div>
              <div className="wr-setting-row">
                <span className="wr-setting-name">Max Players</span>
                <div className="wr-toggle-group">
                  {[2, 3, 4, 5, 6, 7, 8].map(n => (
                    <div key={n} className={`wr-toggle-opt wr-toggle-opt-sm ${settings.maxPlayers === n ? 'active' : ''}`} style={{ cursor: 'default', pointerEvents: 'none' }}>
                      {n}
                    </div>
                  ))}
                </div>
              </div>
              <div className="wr-setting-row" style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 12, marginTop: 4 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span className="wr-setting-name">Team Mode</span>
                  {settings.teamMode && !hasEvenPlayers && (
                    <span style={{ fontSize: 9, color: '#eab308', textTransform: 'uppercase', letterSpacing: '0.06em' }}>⚠ Need even players</span>
                  )}
                </div>
                <div className={`lobby-toggle ${settings.teamMode ? 'on' : ''}`} style={{ pointerEvents: 'none', opacity: 0.75 }}>
                  <span className="lobby-toggle-knob" />
                </div>
              </div>
              {settings.teamMode && (
                <div className="wr-setting-row">
                  <span className="wr-setting-name">Target Score</span>
                  <div className="wr-stepper">
                    <div className="wr-stepper-btn" style={{ pointerEvents: 'none', opacity: 0.4 }}>−</div>
                    <span className="wr-stepper-val gold-text">{settings.targetScore}</span>
                    <div className="wr-stepper-btn" style={{ pointerEvents: 'none', opacity: 0.4 }}>+</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {error && <div className="lobby-error" style={{ width: '100%' }}>{error}</div>}
      </main>

      {/* Footer Actions */}
      <footer className="gl-footer">
        {isHost ? (
          <button
            onClick={handleStart}
            disabled={startLoading || players.length < 2 || (settings.teamMode && !hasEvenPlayers)}
            className="gl-start-btn" style={{ flex: 1, maxWidth: 340 }}>
            <span className="gl-start-btn-icon">▶</span>
            <span>{startLoading ? 'Starting...' : `START GAME · ${players.length}P`}</span>
          </button>
        ) : (
          <div className="wr-waiting-pill">
            <span style={{ animation: 'spin 2s linear infinite', display: 'inline-block' }}>⏳</span>
            <span>Waiting for host to start...</span>
          </div>
        )}
        <button onClick={handleLeave} className="gl-footer-btn gl-logout-btn" style={{ flexShrink: 0 }}>
          🚪 Leave
        </button>
      </footer>

      {/* Invite Modal */}
      <AnimatePresence>
        {showInviteModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowInviteModal(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-sm bg-gray-900 border border-white/10 rounded-3xl overflow-hidden shadow-2xl"
              style={{ maxHeight: '80vh' }}
            >
              <div className="p-5 border-b border-white/5 flex items-center justify-between">
                <h2 className="text-xl font-bold gold-text">Invite Friends</h2>
                <button onClick={() => setShowInviteModal(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 text-gray-400 hover:text-white transition-colors">✕</button>
              </div>
              <div className="p-4 overflow-y-auto" style={{ maxHeight: '60vh' }}>
                <FriendsList />
              </div>
              <div className="p-4 bg-white/5 border-t border-white/5 text-center">
                <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  Players will receive an invite notification
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
