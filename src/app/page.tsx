'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSocket } from '@/hooks/useSocket';
import { useGameActions } from '@/hooks/useGameActions';
import { useGameStore } from '@/store/gameStore';
import { connectSocket } from '@/lib/socket';
import { RoomSettings } from '@/types/game';

const DEFAULT_SETTINGS: RoomSettings = {
  deckCount: 1,
  teamMode: false,
  targetScore: 30,
  maxPlayers: 4,
};

export default function Home() {
  const router = useRouter();
  useSocket();
  const { createRoom, joinRoom } = useGameActions();
  const isConnected = useGameStore(s => s.isConnected);
  const error = useGameStore(s => s.error);
  const setError = useGameStore(s => s.setError);

  const [tab, setTab] = useState<'create' | 'join'>('create');
  const [playerName, setPlayerName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [settings, setSettings] = useState<RoomSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    connectSocket();
  }, []);

  const handleCreate = async () => {
    if (!playerName.trim()) { setError('Enter your name'); return; }
    setLoading(true);
    setError(null);
    try {
      const code = await createRoom(playerName.trim(), settings);
      router.push(`/game/${code}`);
    } catch (e: unknown) {
      setError((e as Error).message);
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!playerName.trim()) { setError('Enter your name'); return; }
    if (!joinCode.trim()) { setError('Enter room code'); return; }
    setLoading(true);
    setError(null);
    try {
      await joinRoom(joinCode.trim(), playerName.trim());
      router.push(`/game/${joinCode.trim()}`);
    } catch (e: unknown) {
      setError((e as Error).message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-x-hidden overflow-y-auto py-8"
      style={{ background: 'radial-gradient(ellipse at center, #0d1117 0%, #000 100%)' }}>

      {/* Decorative background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 0 }}>
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #d4a843, transparent)', filter: 'blur(80px)' }} />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full opacity-8"
          style={{ background: 'radial-gradient(circle, #0d5016, transparent)', filter: 'blur(80px)' }} />
      </div>

      <div className="relative z-10 w-full max-w-md px-4">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-3 drop-shadow-lg">🃏</div>
          <h1 className="text-5xl font-bold gold-text mb-1" style={{ fontFamily: 'Georgia, serif', letterSpacing: '0.1em' }}>
            KHOTI
          </h1>
          <p className="text-gray-400 text-xs tracking-widest uppercase mb-3">Pakistani Card Game Online</p>
          <div className="flex justify-center gap-4 text-2xl">
            <span className="text-gray-200">♠</span>
            <span style={{ color: '#DC2626' }}>♥</span>
            <span className="text-gray-200">♣</span>
            <span style={{ color: '#DC2626' }}>♦</span>
          </div>
        </div>

        {/* Connection indicator */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-yellow-500'} transition-colors`}
            style={{ boxShadow: isConnected ? '0 0 6px #22c55e' : '0 0 6px #eab308' }} />
          <span className="text-xs text-gray-400">{isConnected ? 'Server Connected' : 'Connecting to server...'}</span>
        </div>

        {/* Main panel */}
        <div className="rounded-2xl p-6"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(212,168,67,0.2)',
            backdropFilter: 'blur(10px)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
          }}>

          {/* Tabs */}
          <div className="flex mb-6 rounded-lg overflow-hidden" style={{ background: 'rgba(0,0,0,0.3)' }}>
            <button
              onClick={() => { setTab('create'); setError(null); }}
              className={`flex-1 py-3 font-semibold text-sm transition-all ${tab === 'create' ? 'btn-gold' : 'btn-ghost'}`}>
              ✦ Create Room
            </button>
            <button
              onClick={() => { setTab('join'); setError(null); }}
              className={`flex-1 py-3 font-semibold text-sm transition-all ${tab === 'join' ? 'btn-gold' : 'btn-ghost'}`}>
              ✦ Join Room
            </button>
          </div>

          {/* Player name (shared) */}
          <div className="mb-4">
            <label className="block text-xs text-gray-400 mb-1 uppercase tracking-wider">Your Name</label>
            <input
              className="casino-input"
              placeholder="Enter your name"
              value={playerName}
              onChange={e => setPlayerName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (tab === 'join' ? handleJoin() : handleCreate())}
              maxLength={20}
              autoFocus
            />
          </div>

          {tab === 'create' ? (
            <div className="space-y-4">
              {/* Max players */}
              <div>
                <label className="block text-xs text-gray-400 mb-2 uppercase tracking-wider">
                  Players: <span className="gold-text font-bold">{settings.maxPlayers}</span>
                </label>
                <div className="grid grid-cols-7 gap-1">
                  {[2, 3, 4, 5, 6, 7, 8].map(n => (
                    <button key={n}
                      onClick={() => setSettings(s => ({ ...s, maxPlayers: n }))}
                      className={`py-2 rounded text-sm font-bold transition-all ${
                        settings.maxPlayers === n ? 'btn-gold' : 'btn-ghost'
                      }`}>
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              {/* Deck */}
              <div>
                <label className="block text-xs text-gray-400 mb-2 uppercase tracking-wider">Deck</label>
                <div className="flex gap-2">
                  {([1, 2] as const).map(n => (
                    <button key={n}
                      onClick={() => setSettings(s => ({ ...s, deckCount: n }))}
                      className={`flex-1 py-2 rounded text-sm font-semibold transition-all ${
                        settings.deckCount === n ? 'btn-gold' : 'btn-ghost'
                      }`}>
                      {n === 1 ? '1 Deck (52)' : '2 Decks (104)'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Team mode toggle */}
              <div className="flex items-center justify-between py-2">
                <div>
                  <div className="text-sm font-medium">Team Mode</div>
                  <div className="text-xs text-gray-500">Requires even number of players</div>
                </div>
                <button
                  onClick={() => setSettings(s => ({ ...s, teamMode: !s.teamMode }))}
                  className={`relative inline-flex h-6 w-12 items-center rounded-full transition-colors ${
                    settings.teamMode ? 'bg-green-600' : 'bg-gray-700'
                  }`}>
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                    settings.teamMode ? 'translate-x-7' : 'translate-x-1'
                  }`} />
                </button>
              </div>

              {/* Target score */}
              {settings.teamMode && (
                <div>
                  <label className="block text-xs text-gray-400 mb-1 uppercase tracking-wider">
                    Owing Target Score
                  </label>
                  <input
                    type="number"
                    className="casino-input"
                    value={settings.targetScore}
                    onChange={e => setSettings(s => ({ ...s, targetScore: Math.max(10, Number(e.target.value)) }))}
                    min={10}
                    max={200}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Game ends when net owing difference reaches this limit
                  </p>
                </div>
              )}

              {error && (
                <div className="bg-red-900/30 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm text-center">
                  {error}
                </div>
              )}

              <button onClick={handleCreate} disabled={loading || !isConnected} className="btn-gold w-full text-base py-3">
                {loading ? 'Creating Room...' : 'Create Room →'}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1 uppercase tracking-wider">4-Digit Room Code</label>
                <input
                  className="casino-input text-center text-3xl tracking-[0.4em] font-mono font-bold"
                  placeholder="0000"
                  value={joinCode}
                  onChange={e => setJoinCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  onKeyDown={e => e.key === 'Enter' && handleJoin()}
                  maxLength={4}
                />
              </div>

              {error && (
                <div className="bg-red-900/30 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm text-center">
                  {error}
                </div>
              )}

              <button
                onClick={handleJoin}
                disabled={loading || !isConnected || joinCode.length !== 4 || !playerName.trim()}
                className="btn-gold w-full text-base py-3">
                {loading ? 'Joining...' : 'Join Game →'}
              </button>
            </div>
          )}
        </div>

        <p className="text-center text-gray-600 text-xs mt-6">
          Share your 4-digit code with friends • Up to 8 players
        </p>
      </div>
    </div>
  );
}
