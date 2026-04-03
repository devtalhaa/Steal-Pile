'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '@/store/gameStore';
import { useGameActions } from '@/hooks/useGameActions';
import { useRouter } from 'next/navigation';
import { TEAM_COLORS } from '@/lib/constants';
import { RoomPlayer } from '@/types/game';

interface LobbyProps {
  code: string;
}

export function Lobby({ code }: LobbyProps) {
  const router = useRouter();
  const room = useGameStore(s => s.room);
  const myPlayerId = useGameStore(s => s.myPlayerId);
  const error = useGameStore(s => s.error);
  const setError = useGameStore(s => s.setError);

  const { startGame, leaveRoom, updateSettings, assignTeams } = useGameActions();
  const [startLoading, setStartLoading] = useState(false);

  if (!room) {
    return (
      <div className="min-h-screen flex items-center justify-center felt-bg overflow-y-auto">
        <div className="text-center">
          <div className="text-4xl animate-pulse mb-4">🃏</div>
          <p className="gold-text text-lg">Loading lobby...</p>
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
    <div className="min-h-screen felt-bg flex flex-col items-center py-8 px-4 overflow-y-auto">

      {/* Header */}
      <div className="text-center mb-8">
        <div className="text-5xl mb-2">🃏</div>
        <h1 className="text-4xl font-bold gold-text mb-1" style={{ fontFamily: 'Georgia, serif' }}>KHOTI</h1>
        <p className="text-gray-400 text-sm">Game Lobby</p>
      </div>

      <div className="w-full max-w-2xl space-y-4">
        {/* Room code card */}
        <div className="rounded-2xl p-5 text-center"
          style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(212,168,67,0.3)' }}>
          <p className="text-xs text-gray-400 uppercase tracking-widest mb-2">Room Code — Share with friends</p>
          <div className="room-code">{code}</div>
          <button
            onClick={() => navigator.clipboard.writeText(code)}
            className="mt-2 text-xs text-gray-500 hover:text-gray-300 transition-colors">
            📋 Copy code
          </button>
        </div>

        {/* Players grid */}
        <div className="rounded-2xl p-5"
          style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-sm uppercase tracking-wider gold-text">
              Players ({players.length}/{settings.maxPlayers})
            </h2>
            {isHost && settings.teamMode && players.length >= 2 && (
              <button onClick={handleAutoAssignTeams} className="text-xs btn-ghost py-1 px-3">
                Auto-assign teams
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <AnimatePresence>
              {players.map((player, i) => (
                <motion.div
                  key={player.id}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => togglePlayerTeam(player)}
                  className={`rounded-xl p-3 text-center transition-all ${
                    isHost && settings.teamMode ? 'cursor-pointer hover:brightness-110' : ''
                  }`}
                  style={{
                    background: player.team
                      ? player.team === 'A'
                        ? 'rgba(29,78,216,0.25)'
                        : 'rgba(185,28,28,0.25)'
                      : 'rgba(255,255,255,0.06)',
                    border: `1px solid ${
                      player.id === myPlayerId
                        ? 'rgba(212,168,67,0.5)'
                        : player.team
                          ? player.team === 'A' ? 'rgba(29,78,216,0.4)' : 'rgba(185,28,28,0.4)'
                          : 'rgba(255,255,255,0.1)'
                    }`,
                  }}>

                  {/* Avatar */}
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-2
                    ${player.team === 'A' ? 'team-a' : player.team === 'B' ? 'team-b' : 'bg-gray-600 text-white'}`}>
                    {player.name.charAt(0).toUpperCase()}
                  </div>

                  <div className="text-sm font-semibold truncate">{player.name}</div>

                  <div className="flex items-center justify-center gap-1 mt-1">
                    {player.id === room.hostId && (
                      <span className="text-[10px] gold-text">👑 Host</span>
                    )}
                    {player.id === myPlayerId && (
                      <span className="text-[10px] text-gray-400">(you)</span>
                    )}
                  </div>

                  {settings.teamMode && (
                    <div className={`mt-1 text-[11px] font-bold px-2 py-0.5 rounded ${
                      player.team === 'A' ? 'team-a' : player.team === 'B' ? 'team-b' : 'bg-gray-700 text-gray-400'
                    }`}>
                      {player.team ? `Team ${player.team}` : 'No team'}
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Empty slots */}
            {Array.from({ length: settings.maxPlayers - players.length }).map((_, i) => (
              <div key={i} className="rounded-xl p-3 text-center"
                style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.1)' }}>
                <div className="w-10 h-10 rounded-full bg-gray-800 mx-auto mb-2 flex items-center justify-center">
                  <span className="text-gray-600 text-xl">+</span>
                </div>
                <span className="text-gray-600 text-xs">Waiting...</span>
              </div>
            ))}
          </div>

          {/* Team summary */}
          {settings.teamMode && (teamA.length > 0 || teamB.length > 0) && (
            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="rounded-lg p-3" style={{ background: 'rgba(29,78,216,0.15)', border: '1px solid rgba(29,78,216,0.3)' }}>
                <div className="text-xs font-bold team-a inline-block px-2 py-0.5 rounded mb-2">Team A</div>
                {teamA.map(p => (
                  <div key={p.id} className="text-xs text-gray-300">{p.name}</div>
                ))}
                {teamA.length === 0 && <div className="text-xs text-gray-600">None yet</div>}
              </div>
              <div className="rounded-lg p-3" style={{ background: 'rgba(185,28,28,0.15)', border: '1px solid rgba(185,28,28,0.3)' }}>
                <div className="text-xs font-bold team-b inline-block px-2 py-0.5 rounded mb-2">Team B</div>
                {teamB.map(p => (
                  <div key={p.id} className="text-xs text-gray-300">{p.name}</div>
                ))}
                {teamB.length === 0 && <div className="text-xs text-gray-600">None yet</div>}
              </div>
            </div>
          )}
        </div>

        {/* Settings (host only can edit) */}
        {isHost && (
          <div className="rounded-2xl p-5"
            style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <h2 className="font-bold text-sm uppercase tracking-wider gold-text mb-4">Game Settings</h2>

            <div className="space-y-4">
              {/* Deck */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-300">Deck</span>
                <div className="flex gap-2">
                  {([1, 2] as const).map(n => (
                    <button key={n}
                      onClick={() => updateSettings({ deckCount: n })}
                      className={`py-1 px-3 rounded text-sm font-semibold transition-all ${
                        settings.deckCount === n ? 'btn-gold' : 'btn-ghost'
                      }`}>
                      {n === 1 ? '1 Deck' : '2 Decks'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Max players */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-300">Max Players</span>
                <div className="flex gap-1">
                  {[2, 3, 4, 5, 6, 7, 8].map(n => (
                    <button key={n}
                      onClick={() => updateSettings({ maxPlayers: n })}
                      className={`w-7 h-7 rounded text-sm font-bold transition-all ${
                        settings.maxPlayers === n ? 'btn-gold' : 'btn-ghost'
                      }`}>
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              {/* Team mode */}
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm text-gray-300">Team Mode</span>
                  {settings.teamMode && !hasEvenPlayers && (
                    <p className="text-xs text-yellow-500">⚠ Need even number of players</p>
                  )}
                </div>
                <button
                  onClick={() => updateSettings({ teamMode: !settings.teamMode })}
                  className={`relative inline-flex h-6 w-12 items-center rounded-full transition-colors ${
                    settings.teamMode ? 'bg-green-600' : 'bg-gray-700'
                  }`}>
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                    settings.teamMode ? 'translate-x-7' : 'translate-x-1'
                  }`} />
                </button>
              </div>

              {settings.teamMode && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-300">Target Score</span>
                  <div className="flex items-center gap-2">
                    <button onClick={() => updateSettings({ targetScore: Math.max(10, settings.targetScore - 5) })}
                      className="btn-ghost py-1 px-2 text-sm">−</button>
                    <span className="font-bold gold-text w-8 text-center">{settings.targetScore}</span>
                    <button onClick={() => updateSettings({ targetScore: settings.targetScore + 5 })}
                      className="btn-ghost py-1 px-2 text-sm">+</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Non-host settings view */}
        {!isHost && (
          <div className="rounded-2xl p-4"
            style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex gap-4 text-sm text-gray-400 justify-center">
              <span>🃏 {settings.deckCount === 1 ? '1 Deck (52)' : '2 Decks (104)'}</span>
              <span>👥 Max {settings.maxPlayers} players</span>
              {settings.teamMode && <span>⚔ Team Mode</span>}
              {settings.teamMode && <span>🎯 Target: {settings.targetScore}</span>}
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="rounded-xl p-3 text-sm text-red-400 text-center"
            style={{ background: 'rgba(127,29,29,0.3)', border: '1px solid rgba(239,68,68,0.3)' }}>
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          {isHost ? (
            <button
              onClick={handleStart}
              disabled={startLoading || players.length < 2 || (settings.teamMode && !hasEvenPlayers)}
              className="btn-gold flex-1 text-base py-3">
              {startLoading ? 'Starting...' : `Start Game (${players.length} players)`}
            </button>
          ) : (
            <div className="flex-1 text-center py-3 text-sm text-gray-400 rounded-xl"
              style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.06)' }}>
              ⏳ Waiting for host to start...
            </div>
          )}
          <button onClick={handleLeave} className="btn-ghost">
            Leave
          </button>
        </div>
      </div>
    </div>
  );
}
