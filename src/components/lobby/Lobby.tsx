'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '@/store/gameStore';
import { useGameActions } from '@/hooks/useGameActions';
import { useRouter } from 'next/navigation';
import { RoomPlayer } from '@/types/game';

interface LobbyProps {
  code: string;
}

function FloatingCard({ suit, style }: { suit: string; style: React.CSSProperties }) {
  return (
    <div className="absolute pointer-events-none select-none" style={{ ...style, fontSize: 40, opacity: 0.06 }}>
      {suit}
    </div>
  );
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
      <div className="lobby-root">
        <div className="lobby-bg-layer" />
        <div className="text-center z-10">
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
    <div className="lobby-root justify-start" style={{ padding: '20px 0' }}>
      <div className="lobby-bg-layer" />
      
      <FloatingCard suit="♠" style={{ top: '8%', left: '5%', transform: 'rotate(-15deg)' }} />
      <FloatingCard suit="♥" style={{ top: '15%', right: '8%', transform: 'rotate(20deg)' }} />
      <FloatingCard suit="♣" style={{ bottom: '20%', left: '10%', transform: 'rotate(10deg)' }} />
      <FloatingCard suit="♦" style={{ bottom: '12%', right: '6%', transform: 'rotate(-22deg)' }} />

      <div className="lobby-content" style={{ width: '100%', maxWidth: '440px', paddingTop: 32, paddingBottom: 32 }}>
        
        {/* Header (Smaller than main menu) */}
        <div className="text-center mb-2">
          <h1 className="text-2xl font-bold gold-text" style={{ letterSpacing: '0.1em' }}>WAITING ROOM</h1>
          <p className="text-gray-400 text-xs uppercase tracking-widest mt-1">Get ready to play</p>
        </div>

        {/* Room code card */}
        <div className="lobby-panel" style={{ padding: '16px', alignItems: 'center' }}>
          <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-1">Room Code — Share with friends</p>
          <div className="room-code text-4xl">{code}</div>
          <button
            onClick={() => navigator.clipboard.writeText(code)}
            className="mt-2 px-3 py-1 text-xs text-gray-400 bg-white/5 rounded-full hover:bg-white/10 hover:text-white transition-all border border-white/10">
            📋 Copy Code
          </button>
        </div>

        {/* Players grid */}
        <div className="lobby-panel flex flex-col gap-3">
          <div className="flex items-center justify-between pb-2 border-b border-white/5">
            <h2 className="font-bold text-xs uppercase tracking-widest gold-text">
              Players ({players.length}/{settings.maxPlayers})
            </h2>
            {isHost && settings.teamMode && players.length >= 2 && (
              <button onClick={handleAutoAssignTeams} className="text-[10px] text-white/60 hover:text-white uppercase tracking-wider bg-white/5 px-2 py-1 rounded border border-white/10 transition-colors">
                Auto-assign 
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <AnimatePresence>
              {players.map((player, i) => (
                <motion.div
                  key={player.id}
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => togglePlayerTeam(player)}
                  className={`relative p-3 rounded-xl border flex flex-col items-center gap-1 transition-all ${
                    isHost && settings.teamMode ? 'cursor-pointer hover:bg-white/10' : ''
                  }`}
                  style={{
                    background: player.team
                      ? player.team === 'A'
                        ? 'rgba(29,78,216,0.15)'
                        : 'rgba(185,28,28,0.15)'
                      : 'rgba(255,255,255,0.04)',
                    borderColor: player.id === myPlayerId
                        ? 'rgba(212,168,67,0.4)'
                        : player.team
                          ? player.team === 'A' ? 'rgba(29,78,216,0.25)' : 'rgba(185,28,28,0.25)'
                          : 'rgba(255,255,255,0.08)',
                  }}>
                  
                  {/* Avatar */}
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold shadow-inner ${
                    player.team === 'A' ? 'bg-blue-600/80 text-white border-2 border-blue-400/50' 
                    : player.team === 'B' ? 'bg-red-600/80 text-white border-2 border-red-400/50' 
                    : 'bg-white/10 text-white border border-white/20'
                  }`}>
                    {player.name.charAt(0).toUpperCase()}
                  </div>

                  <div className="text-sm font-semibold truncate text-center w-full mt-1 text-white">{player.name}</div>

                  <div className="flex items-center gap-1">
                    {player.id === room.hostId && <span className="text-[9px] uppercase tracking-wider text-yellow-400 font-bold bg-yellow-400/10 px-1.5 py-0.5 rounded">Host</span>}
                    {player.id === myPlayerId && <span className="text-[9px] uppercase tracking-wider text-white/50">(You)</span>}
                  </div>

                  {settings.teamMode && (
                    <div className="absolute top-2 right-2 text-[9px] font-bold">
                      {player.team === 'A' ? <span className="text-blue-400">TEAM A</span> 
                      : player.team === 'B' ? <span className="text-red-400">TEAM B</span> 
                      : <span className="text-gray-500">?</span>}
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Empty slots */}
            {Array.from({ length: settings.maxPlayers - players.length }).map((_, i) => (
              <div key={i} className="p-3 rounded-xl border border-dashed border-white/15 bg-white/5 flex flex-col items-center justify-center gap-2 opacity-50">
                <div className="w-10 h-10 rounded-full border border-dashed border-white/20 flex flex-col justify-center items-center">
                  <span className="text-white/40 text-lg leading-none">+</span>
                </div>
                <span className="text-[11px] text-white/40 uppercase tracking-wider">Empty</span>
              </div>
            ))}
          </div>
          
          {/* Team summary inside same panel */}
          {settings.teamMode && (teamA.length > 0 || teamB.length > 0) && (
            <div className="grid grid-cols-2 gap-3 mt-2 border-t border-white/5 pt-4">
              <div className="bg-blue-900/20 border border-blue-500/20 rounded-lg p-3">
                <div className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-2">Team A</div>
                <div className="flex flex-col gap-1">
                  {teamA.length > 0 ? teamA.map(p => <div key={p.id} className="text-xs text-blue-100 truncate">{p.name}</div>) : <div className="text-xs text-blue-400/40 italic">Empty</div>}
                </div>
              </div>
              <div className="bg-red-900/20 border border-red-500/20 rounded-lg p-3">
                <div className="text-[10px] font-bold text-red-400 uppercase tracking-widest mb-2">Team B</div>
                <div className="flex flex-col gap-1">
                  {teamB.length > 0 ? teamB.map(p => <div key={p.id} className="text-xs text-red-100 truncate">{p.name}</div>) : <div className="text-xs text-red-400/40 italic">Empty</div>}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Settings (host only can edit) */}
        {isHost ? (
          <div className="lobby-panel flex flex-col gap-4">
            <h2 className="font-bold text-xs uppercase tracking-widest text-white/50 border-b border-white/5 pb-2">Game Settings</h2>

            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-white/80">Deck Size</span>
                <div className="flex gap-2 bg-white/5 p-1 rounded-lg border border-white/10">
                  {([1, 2] as const).map(n => (
                    <button key={n}
                      onClick={() => updateSettings({ deckCount: n })}
                      className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                        settings.deckCount === n ? 'bg-gradient-to-br from-[#b8860b] to-[#d4a843] text-[#1a0e00]' : 'text-white/60 hover:bg-white/10'
                      }`}>
                      {n === 1 ? '1 Deck' : '2 Decks'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-white/80">Max Players</span>
                <div className="flex bg-white/5 p-1 rounded-lg border border-white/10">
                  {[2, 3, 4, 5, 6, 7, 8].map(n => (
                    <button key={n}
                      onClick={() => updateSettings({ maxPlayers: n })}
                      className={`w-7 h-7 flex items-center justify-center rounded text-xs font-bold transition-all ${
                        settings.maxPlayers === n ? 'bg-gradient-to-br from-[#b8860b] to-[#d4a843] text-[#1a0e00] shadow-md' : 'text-white/60 hover:bg-white/10'
                      }`}>
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-white/5">
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-white/80">Team Mode</span>
                  {settings.teamMode && !hasEvenPlayers && (
                    <span className="text-[10px] text-yellow-500 uppercase tracking-wider mt-0.5">⚠ Need even players</span>
                  )}
                </div>
                <button
                  onClick={() => updateSettings({ teamMode: !settings.teamMode })}
                  className={`lobby-toggle ${settings.teamMode ? 'on' : ''}`}>
                  <span className="lobby-toggle-knob" />
                </button>
              </div>

              {settings.teamMode && (
                <div className="flex items-center justify-between pt-1 opacity-90 transition-opacity">
                  <span className="text-sm font-semibold text-white/80">Target Owing Score</span>
                  <div className="flex items-center bg-white/5 rounded border border-white/10 p-0.5">
                    <button onClick={() => updateSettings({ targetScore: Math.max(10, settings.targetScore - 5) })}
                      className="w-8 h-8 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 rounded-l transition-colors">−</button>
                    <span className="font-bold gold-text text-sm w-10 text-center">{settings.targetScore}</span>
                    <button onClick={() => updateSettings({ targetScore: settings.targetScore + 5 })}
                      className="w-8 h-8 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 rounded-r transition-colors">+</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="lobby-panel p-4 flex flex-wrap gap-2 justify-center">
            <span className="bg-white/10 border border-white/20 text-white/80 px-3 py-1.5 rounded-full text-xs font-bold">
              🃏 {settings.deckCount === 1 ? '1 Deck' : '2 Decks'}
            </span>
            <span className="bg-white/10 border border-white/20 text-white/80 px-3 py-1.5 rounded-full text-xs font-bold">
              👥 Max {settings.maxPlayers}
            </span>
            {settings.teamMode && (
              <span className="bg-gradient-to-r from-blue-900/40 to-red-900/40 border border-yellow-500/30 text-yellow-500 px-3 py-1.5 rounded-full text-xs font-bold shadow-[0_0_10px_rgba(234,179,8,0.2)]">
                ⚔ Team Mode (Target: {settings.targetScore})
              </span>
            )}
          </div>
        )}

        {/* Error */}
        {error && <div className="lobby-error w-full">{error}</div>}

        {/* Action Buttons */}
        <div className="flex flex-col gap-3 w-full mt-2">
          {isHost ? (
            <button
              onClick={handleStart}
              disabled={startLoading || players.length < 2 || (settings.teamMode && !hasEvenPlayers)}
              className="lobby-btn lobby-btn-primary lobby-btn-full">
              <span className="lobby-btn-icon">▶</span>
              <div className="lobby-btn-text">
                <span className="lobby-btn-label">{startLoading ? 'Starting...' : 'Start Game'}</span>
                <span className="lobby-btn-desc">{players.length} Players connected</span>
              </div>
            </button>
          ) : (
            <div className="flex flex-col items-center justify-center py-4 px-6 bg-white/5 border border-white/10 rounded-2xl gap-2">
              <span className="animate-spin text-xl opacity-70">⏳</span>
              <div className="text-sm font-semibold text-white/70">Waiting for host to start...</div>
            </div>
          )}
          
          <button onClick={handleLeave} className="lobby-btn lobby-btn-secondary lobby-btn-full opacity-80 hover:opacity-100">
            <span className="lobby-btn-icon text-xl">🚪</span>
            <div className="lobby-btn-text">
              <span className="lobby-btn-label">Leave Room</span>
            </div>
          </button>
        </div>

      </div>
    </div>
  );
}
