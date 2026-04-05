'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSocket } from '@/hooks/useSocket';
import { useGameActions } from '@/hooks/useGameActions';
import { useGameStore } from '@/store/gameStore';
import { useSettingsStore, CardBackStyle } from '@/store/settingsStore';
import { connectSocket } from '@/lib/socket';
import { RoomSettings } from '@/types/game';
import { CardBack } from '@/components/cards/CardBack';

const DEFAULT_SETTINGS: RoomSettings = {
  deckCount: 1,
  teamMode: false,
  targetScore: 30,
  maxPlayers: 4,
};

function FloatingCard({ suit, style }: { suit: string; style: React.CSSProperties }) {
  return (
    <div className="absolute pointer-events-none select-none" style={{ ...style, fontSize: 40, opacity: 0.06 }}>
      {suit}
    </div>
  );
}

export default function Home() {
  const router = useRouter();
  useSocket();
  const { createRoom, joinRoom } = useGameActions();
  const isConnected = useGameStore(s => s.isConnected);
  const error = useGameStore(s => s.error);
  const setError = useGameStore(s => s.setError);
  
  const storedStyle = useSettingsStore(s => s.cardBack);
  const setCardBack = useSettingsStore(s => s.setCardBack);

  const [mode, setMode] = useState<'menu' | 'create' | 'join' | 'settings'>('menu');
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
    <div className="lobby-root">
      <div className="lobby-bg-layer" />

      <FloatingCard suit="♠" style={{ top: '8%', left: '5%', transform: 'rotate(-15deg)' }} />
      <FloatingCard suit="♥" style={{ top: '15%', right: '8%', transform: 'rotate(20deg)' }} />
      <FloatingCard suit="♣" style={{ bottom: '20%', left: '10%', transform: 'rotate(10deg)' }} />
      <FloatingCard suit="♦" style={{ bottom: '12%', right: '6%', transform: 'rotate(-22deg)' }} />
      <FloatingCard suit="🃏" style={{ top: '45%', left: '3%', transform: 'rotate(35deg)' }} />
      <FloatingCard suit="♠" style={{ top: '60%', right: '4%', transform: 'rotate(-10deg)' }} />

      <div className="lobby-content">
        <div className="lobby-logo-area">
          <div className="lobby-card-icon">
            <span>🃏</span>
          </div>
          <h1 className="lobby-title">KHOTI</h1>
          <p className="lobby-subtitle">STEAL · MATCH · WIN</p>
          <div className="lobby-suits">
            <span style={{ color: '#e8e8e8' }}>♠</span>
            <span style={{ color: '#ef4444' }}>♥</span>
            <span style={{ color: '#e8e8e8' }}>♣</span>
            <span style={{ color: '#ef4444' }}>♦</span>
          </div>
        </div>

        <div className="lobby-status">
          <div className={`lobby-status-dot ${isConnected ? 'online' : 'offline'}`} />
          <span>{isConnected ? 'Online' : 'Connecting...'}</span>
        </div>

        {mode === 'menu' && (
          <div className="lobby-menu-buttons">
            <div className="lobby-name-input-wrap">
              <input
                suppressHydrationWarning
                className="lobby-name-input"
                placeholder="Your Name"
                value={playerName}
                onChange={e => setPlayerName(e.target.value)}
                maxLength={20}
                autoFocus
              />
            </div>

            <button
              suppressHydrationWarning
              className="lobby-btn lobby-btn-primary"
              onClick={() => { setError(null); setMode('create'); }}
              disabled={!isConnected}>
              <span className="lobby-btn-icon">⚔️</span>
              <div className="lobby-btn-text">
                <span className="lobby-btn-label">Create Room</span>
                <span className="lobby-btn-desc">Host a new game</span>
              </div>
            </button>

            <button
              suppressHydrationWarning
              className="lobby-btn lobby-btn-secondary"
              onClick={() => { setError(null); setMode('join'); }}
              disabled={!isConnected}>
              <span className="lobby-btn-icon">🎯</span>
              <div className="lobby-btn-text">
                <span className="lobby-btn-label">Join Room</span>
                <span className="lobby-btn-desc">Enter a room code</span>
              </div>
            </button>

            <button
              suppressHydrationWarning
              className="lobby-btn lobby-btn-secondary"
              style={{ padding: '12px 20px' }}
              onClick={() => { setError(null); setMode('settings'); }}>
              <span className="lobby-btn-icon" style={{ fontSize: '20px' }}>⚙️</span>
              <div className="lobby-btn-text">
                <span className="lobby-btn-label">Settings</span>
                <span className="lobby-btn-desc">Customize your game</span>
              </div>
            </button>
          </div>
        )}

        {mode === 'settings' && (
          <div className="lobby-panel">
            <div className="lobby-panel-header">
              <button className="lobby-back-btn" onClick={() => { setMode('menu'); setError(null); }}>←</button>
              <h2 className="lobby-panel-title">Settings</h2>
            </div>

            <div className="lobby-setting-group">
              <label className="lobby-setting-label">Card Back Design</label>
              <p className="text-xs text-white/50 mb-3 leading-tight">Choose the back side of cards that you will see during the game.</p>
              
              <div className="grid grid-cols-2 flex-wrap gap-4 justify-items-center mt-2">
                {(['classic-blue', 'crimson-ruby', 'midnight-dragon', 'emerald-forest'] as CardBackStyle[]).map(styleId => (
                  <div key={styleId} className="flex flex-col items-center gap-2 w-full">
                    <div 
                      className={`rounded-xl p-3 cursor-pointer transition-all w-full flex justify-center ${
                        storedStyle === styleId ? 'bg-white/10 ring-2 ring-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.3)]' : 'bg-white/5 hover:bg-white/10'
                      }`}
                      onClick={() => setCardBack(styleId)}>
                      <CardBack forceStyle={styleId} size="lg" clickable={false} />
                    </div>
                    <span className="text-[10px] uppercase tracking-wider text-white/70 font-semibold text-center">
                      {styleId.split('-').join(' ')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {mode === 'create' && (
          <div className="lobby-panel">
            <div className="lobby-panel-header">
              <button className="lobby-back-btn" onClick={() => { setMode('menu'); setError(null); }}>←</button>
              <h2 className="lobby-panel-title">Create Room</h2>
            </div>

            <div className="lobby-setting-group">
              <label className="lobby-setting-label">Players</label>
              <div className="lobby-player-grid">
                {[2, 3, 4, 5, 6, 7, 8].map(n => (
                  <button suppressHydrationWarning key={n}
                    onClick={() => setSettings(s => ({ ...s, maxPlayers: n }))}
                    className={`lobby-player-btn ${settings.maxPlayers === n ? 'active' : ''}`}>
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <div className="lobby-setting-group">
              <label className="lobby-setting-label">Deck</label>
              <div className="lobby-deck-row">
                {([1, 2] as const).map(n => (
                  <button suppressHydrationWarning key={n}
                    onClick={() => setSettings(s => ({ ...s, deckCount: n }))}
                    className={`lobby-deck-btn ${settings.deckCount === n ? 'active' : ''}`}>
                    {n === 1 ? '1 Deck' : '2 Decks'}
                    <span className="lobby-deck-count">{n === 1 ? '52 cards' : '104 cards'}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="lobby-toggle-row">
              <div>
                <div className="lobby-toggle-label">Team Mode</div>
                <div className="lobby-toggle-hint">2v2 / 3v3 / 4v4</div>
              </div>
              <button suppressHydrationWarning
                onClick={() => setSettings(s => ({ ...s, teamMode: !s.teamMode }))}
                className={`lobby-toggle ${settings.teamMode ? 'on' : ''}`}>
                <span className="lobby-toggle-knob" />
              </button>
            </div>

            {settings.teamMode && (
              <div className="lobby-setting-group">
                <label className="lobby-setting-label">Target Score</label>
                <input suppressHydrationWarning
                  type="number"
                  className="lobby-code-input"
                  value={settings.targetScore}
                  onChange={e => setSettings(s => ({ ...s, targetScore: Math.max(10, Number(e.target.value)) }))}
                  min={10}
                  max={200}
                />
              </div>
            )}

            {error && <div className="lobby-error">{error}</div>}

            <button suppressHydrationWarning onClick={handleCreate} disabled={loading || !isConnected || !playerName.trim()} className="lobby-btn lobby-btn-primary lobby-btn-full">
              <span className="lobby-btn-icon">🚀</span>
              <div className="lobby-btn-text">
                <span className="lobby-btn-label">{loading ? 'Creating...' : 'Start Room'}</span>
              </div>
            </button>
          </div>
        )}

        {mode === 'join' && (
          <div className="lobby-panel">
            <div className="lobby-panel-header">
              <button className="lobby-back-btn" onClick={() => { setMode('menu'); setError(null); }}>←</button>
              <h2 className="lobby-panel-title">Join Room</h2>
            </div>

            <div className="lobby-setting-group">
              <label className="lobby-setting-label">Room Code</label>
              <input suppressHydrationWarning
                className="lobby-code-input"
                placeholder="0000"
                value={joinCode}
                onChange={e => setJoinCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
                onKeyDown={e => e.key === 'Enter' && handleJoin()}
                maxLength={4}
                autoFocus
              />
            </div>

            {error && <div className="lobby-error">{error}</div>}

            <button suppressHydrationWarning
              onClick={handleJoin}
              disabled={loading || !isConnected || joinCode.length !== 4 || !playerName.trim()}
              className="lobby-btn lobby-btn-primary lobby-btn-full">
              <span className="lobby-btn-icon">🎮</span>
              <div className="lobby-btn-text">
                <span className="lobby-btn-label">{loading ? 'Joining...' : 'Join Game'}</span>
              </div>
            </button>
          </div>
        )}

        <div className="lobby-footer">
          Share your 4-digit code with friends
        </div>
      </div>
    </div>
  );
}
