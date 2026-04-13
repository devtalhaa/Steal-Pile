'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSocket } from '@/hooks/useSocket';
import { useGameActions } from '@/hooks/useGameActions';
import { useGameStore } from '@/store/gameStore';
import { useSettingsStore, CardBackStyle, TableThemeStyle } from '@/store/settingsStore';
import { connectSocket } from '@/lib/socket';
import { RoomSettings } from '@/types/game';
import { CardBack } from '@/components/cards/CardBack';
import { getTableThemeStyles } from '@/lib/constants';
import { WelcomeDialog } from '@/components/lobby/WelcomeDialog';
import { FriendsList } from '@/components/lobby/FriendsList';
import { ChangeNameModal } from '@/components/lobby/ChangeNameModal';
import { useAuthStore } from '@/store/authStore';
import { auth } from '@/lib/firebase';
import {
  EmailAuthProvider,
  GoogleAuthProvider,
  linkWithCredential,
  linkWithPopup,
  fetchSignInMethodsForEmail
} from 'firebase/auth';

const DEFAULT_SETTINGS: RoomSettings = {
  deckCount: 1,
  teamMode: false,
  targetScore: 30,
  maxPlayers: 4,
};

function FloatingCard({ suit, style }: { suit: string; style: React.CSSProperties }) {
  return (
    <div className="absolute pointer-events-none select-none" style={{ ...style, fontSize: 40, opacity: 0.05 }}>
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
  const tableTheme = useSettingsStore(s => s.tableTheme);
  const setTableTheme = useSettingsStore(s => s.setTableTheme);

  const [mode, setMode] = useState<'menu' | 'create' | 'join' | 'settings' | 'friends' | 'link-email'>('menu');
  const [joinCode, setJoinCode] = useState('');
  const [settings, setSettings] = useState<RoomSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(false);

  const [linkEmail, setLinkEmail] = useState('');
  const [linkPass, setLinkPass] = useState('');
  const [linkError, setLinkError] = useState<string | null>(null);
  const [linkLoading, setLinkLoading] = useState(false);

  const { user, isGuest, guestName, isLoading: isAuthLoading, setGuest, logout } = useAuthStore();
  const [guestInputName, setGuestInputName] = useState('');
  const [showEditName, setShowEditName] = useState(false);

  const playerName = user ? user.displayName : guestName;

  useEffect(() => {
    connectSocket();
  }, []);

  const handleCreate = async () => {
    if (!playerName?.trim()) { setError('Enter your name'); return; }
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
    if (!playerName?.trim()) { setError('Enter your name'); return; }
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

  const handleLinkEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;
    setLinkLoading(true);
    setLinkError(null);
    try {
      const credential = EmailAuthProvider.credential(linkEmail, linkPass);
      await linkWithCredential(auth.currentUser, credential);
      setMode('settings');
      setLinkEmail('');
      setLinkPass('');
    } catch (err: any) {
      setLinkError(err.message || 'Failed to link email session. Make sure the email is not already in use.');
    } finally {
      setLinkLoading(false);
    }
  };

  const handleLinkGoogle = async () => {
    if (!auth.currentUser) return;
    setLoading(true);
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      await linkWithPopup(auth.currentUser, provider);
    } catch (err: any) {
      setError(err.message || 'Failed to link Google account');
    } finally {
      setLoading(false);
    }
  };

  const avatarChar = user
    ? (user.displayName?.charAt(0).toUpperCase() || '?')
    : (guestName?.charAt(0).toUpperCase() || '');

  return (
    <div className="lobby-root">
      {!isAuthLoading && !user && !isGuest && <WelcomeDialog />}
      {showEditName && <ChangeNameModal onClose={() => setShowEditName(false)} />}

      <div className="lobby-bg-layer" />
      <FloatingCard suit="♠" style={{ top: '8%', left: '5%', transform: 'rotate(-15deg)' }} />
      <FloatingCard suit="♥" style={{ top: '15%', right: '8%', transform: 'rotate(20deg)' }} />
      <FloatingCard suit="♣" style={{ bottom: '20%', left: '10%', transform: 'rotate(10deg)' }} />
      <FloatingCard suit="♦" style={{ bottom: '12%', right: '6%', transform: 'rotate(-22deg)' }} />
      <FloatingCard suit="🃏" style={{ top: '45%', left: '3%', transform: 'rotate(35deg)' }} />

      {mode === 'menu' && (
        <div className="gl-layout">
          <header className="gl-topbar">
            <div className="gl-brand">
              <span className="gl-brand-icon">🃏</span>
              <h1 className="gl-brand-name">KHOTI</h1>
              <span className="gl-brand-sub">STEAL · MATCH · WIN</span>
            </div>
            <div className="gl-topbar-right">
              <div className={`gl-conn-dot ${isConnected ? 'online' : 'offline'}`} />
              <span className="gl-conn-text">{isConnected ? 'Online' : 'Connecting...'}</span>
            </div>
          </header>

          <aside className="gl-sidebar">
            <button className="gl-icon-btn" onClick={() => { setError(null); setMode('settings'); }}>
              <span className="gl-icon-btn-icon">⚙️</span>
              <span className="gl-icon-btn-label">Settings</span>
            </button>
            {user && (
              <button className="gl-icon-btn" onClick={() => { setError(null); setMode('friends'); }}>
                <span className="gl-icon-btn-icon">👥</span>
                <span className="gl-icon-btn-label">Friends</span>
              </button>
            )}
            {!user && (
              <button className="gl-icon-btn" onClick={() => router.push('/login')}>
                <span className="gl-icon-btn-icon">🔑</span>
                <span className="gl-icon-btn-label">Login</span>
              </button>
            )}
          </aside>

          <main className="gl-center">
            {!user && (
              <div className="gl-name-input-area">
                <input
                  suppressHydrationWarning
                  className="gl-name-field"
                  placeholder="Enter your name to play..."
                  value={guestInputName}
                  onChange={e => {
                    setGuestInputName(e.target.value);
                    setGuest(e.target.value);
                  }}
                  maxLength={20}
                  autoFocus
                />
              </div>
            )}

            <div className="gl-cards-row">
              <button
                suppressHydrationWarning
                className="gl-game-card gl-card-create"
                onClick={() => { setError(null); setMode('create'); }}
                disabled={!isConnected}>
                <div className="gl-card-art">
                  <span className="gl-card-main-icon">👑</span>
                  <div className="gl-card-suits">
                    <span style={{ color: '#f0f0f0' }}>♠</span>
                    <span style={{ color: '#ef4444' }}>♥</span>
                    <span style={{ color: '#ef4444' }}>♦</span>
                    <span style={{ color: '#f0f0f0' }}>♣</span>
                  </div>
                </div>
                <div className="gl-card-footer">Create Room</div>
              </button>

              <button
                suppressHydrationWarning
                className="gl-game-card gl-card-join"
                onClick={() => { setError(null); setMode('join'); }}
                disabled={!isConnected}>
                <div className="gl-card-art">
                  <span className="gl-card-main-icon">🎯</span>
                  <div className="gl-card-suits">
                    <span style={{ color: '#93c5fd' }}>♠</span>
                    <span style={{ color: '#f9a8d4' }}>♥</span>
                    <span style={{ color: '#f9a8d4' }}>♦</span>
                    <span style={{ color: '#93c5fd' }}>♣</span>
                  </div>
                </div>
                <div className="gl-card-footer">Join Room</div>
              </button>
            </div>

            {error && (
              <div className="lobby-error" style={{ width: '100%', maxWidth: 440 }}>{error}</div>
            )}
          </main>

          <footer className="gl-footer">
            <div className="gl-player-chip">
              <div className="gl-avatar">
                {avatarChar || '👤'}
              </div>
              <div className="gl-player-meta">
                {user ? (
                  <>
                    <span className="gl-player-name">{user.displayName}</span>
                    <span className="gl-player-id">#{user.shortId}</span>
                  </>
                ) : (
                  <span className="gl-player-name">{guestName || 'Guest'}</span>
                )}
              </div>
            </div>
            <div className="gl-footer-actions">
              {user ? (
                <button onClick={logout} className="gl-footer-btn gl-logout-btn">Logout</button>
              ) : (
                <button onClick={() => router.push('/login')} className="gl-footer-btn gl-login-btn">Log In</button>
              )}
            </div>
          </footer>
        </div>
      )}

      {mode === 'create' && (
        <div className="gl-layout-full">
          <header className="gl-topbar">
            <button className="gl-back-btn" onClick={() => { setMode('menu'); setError(null); }}>←</button>
            <div className="gl-brand">
              <h1 className="gl-brand-name" style={{ fontSize: '18px', letterSpacing: '0.1em' }}>CREATE ROOM</h1>
            </div>
            <div style={{ width: 38 }} />
          </header>

          <main className="gl-center gl-create-center">
            <div className="gl-setting-section">
              <div className="gl-setting-title">Players at Table</div>
              <div className="gl-player-num-row">
                {[2, 3, 4, 5, 6, 7, 8].map(n => (
                  <button suppressHydrationWarning key={n}
                    onClick={() => setSettings(s => ({ ...s, maxPlayers: n }))}
                    className={`gl-num-btn ${settings.maxPlayers === n ? 'active' : ''}`}>
                    <span className="gl-num-icon">👤</span>
                    <span className="gl-num-val">{n}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="gl-setting-section">
              <div className="gl-setting-title">Card Deck</div>
              <div className="gl-deck-pick-row">
                {([1, 2] as const).map(n => (
                  <button suppressHydrationWarning key={n}
                    onClick={() => setSettings(s => ({ ...s, deckCount: n }))}
                    className={`gl-deck-pick-btn ${settings.deckCount === n ? 'active' : ''}`}>
                    <span className="gl-deck-pick-icon">{n === 1 ? '🂠' : '🂠🂠'}</span>
                    <span className="gl-deck-pick-name">{n === 1 ? '1 Deck' : '2 Decks'}</span>
                    <span className="gl-deck-pick-count">{n === 1 ? '52 cards' : '104 cards'}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="gl-setting-section">
              <div className="gl-setting-title">Game Mode</div>
              <button
                suppressHydrationWarning
                className={`gl-mode-toggle-btn ${settings.teamMode ? 'active' : ''}`}
                onClick={() => setSettings(s => ({ ...s, teamMode: !s.teamMode }))}>
                <span className="gl-mode-icon">⚔️</span>
                <div className="gl-mode-info">
                  <span className="gl-mode-name">Team Mode</span>
                  <span className="gl-mode-desc">2v2 · 3v3 · 4v4</span>
                </div>
                <div className={`gl-mode-check ${settings.teamMode ? 'on' : ''}`}>✓</div>
              </button>
            </div>

            {settings.teamMode && (
              <div className="gl-setting-section">
                <div className="gl-setting-title">Target Score</div>
                <input suppressHydrationWarning
                  type="number"
                  className="gl-score-input"
                  value={settings.targetScore}
                  onChange={e => setSettings(s => ({ ...s, targetScore: Math.max(10, Number(e.target.value)) }))}
                  min={10} max={200}
                />
              </div>
            )}

            {error && <div className="lobby-error" style={{ width: '100%', maxWidth: 500 }}>{error}</div>}
          </main>

          <footer className="gl-footer">
            <div className="gl-player-chip">
              <div className="gl-avatar">{avatarChar || '👤'}</div>
              <div className="gl-player-meta">
                {user ? (
                  <><span className="gl-player-name">{user.displayName}</span><span className="gl-player-id">#{user.shortId}</span></>
                ) : (
                  <span className="gl-player-name">{guestName || 'Guest'}</span>
                )}
              </div>
            </div>
            <button suppressHydrationWarning
              onClick={handleCreate}
              disabled={loading || !isConnected || !playerName?.trim()}
              className="gl-start-btn">
              <span className="gl-start-btn-icon">🚀</span>
              <span>{loading ? 'Creating...' : 'START ROOM'}</span>
            </button>
          </footer>
        </div>
      )}

      {mode !== 'menu' && mode !== 'create' && (
        <div className="gl-panel-overlay">
          <div className="gl-panel-inner">

            {mode === 'friends' && (
              <div className="lobby-panel">
                <div className="lobby-panel-header">
                  <button className="lobby-back-btn" onClick={() => { setMode('menu'); setError(null); }}>←</button>
                  <h2 className="lobby-panel-title">Friends</h2>
                </div>
                <div className="w-full">
                  <FriendsList />
                </div>
              </div>
            )}

            {mode === 'settings' && (
              <div className="lobby-panel">
                <div className="lobby-panel-header">
                  <button className="lobby-back-btn" onClick={() => { setMode('menu'); setError(null); }}>←</button>
                  <h2 className="lobby-panel-title">Settings</h2>
                </div>

                {user ? (
                  <div className="lobby-setting-group border-b border-gray-700/50 pb-5 mb-5">
                    <label className="lobby-setting-label">Account Profile</label>
                    <div className="flex items-center justify-between bg-white/5 rounded-xl p-4 mt-2">
                      <div className="flex flex-col">
                        <span className="text-white font-semibold text-lg">{user.displayName}</span>
                        <span className="text-xs text-gray-400 font-medium">ID: {user.shortId}</span>
                      </div>
                      <button
                        onClick={() => setShowEditName(true)}
                        className="bg-yellow-600/20 text-yellow-500 hover:bg-yellow-500 hover:text-black font-semibold text-sm px-4 py-2 rounded-lg transition-all border border-yellow-600/30"
                      >
                        Change Name
                      </button>
                    </div>
                    <div className="mt-4">
                      <label className="text-[10px] uppercase tracking-wider text-gray-500 font-bold ml-1">Linked Accounts</label>
                      <div className="flex flex-col gap-2 mt-2">
                        {auth.currentUser?.providerData.map(p => (
                          <div key={p.providerId} className="flex items-center justify-between bg-white/5 px-4 py-3 rounded-xl border border-white/5">
                            <div className="flex items-center gap-3">
                              {p.providerId === 'google.com' ? (
                                <div className="bg-white p-1 rounded-full"><svg className="w-4 h-4" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg></div>
                              ) : (
                                <span className="text-lg">📧</span>
                              )}
                              <span className="text-sm text-white font-medium">{p.email || 'Connected'}</span>
                            </div>
                            <span className="text-[10px] text-green-500 font-bold bg-green-500/10 px-2 py-0.5 rounded-md border border-green-500/20 uppercase">Linked</span>
                          </div>
                        ))}
                        {!auth.currentUser?.providerData.find(p => p.providerId === 'password') && (
                          <button
                            onClick={() => setMode('link-email')}
                            className="flex items-center justify-between bg-yellow-600/10 hover:bg-yellow-600/20 px-4 py-3 rounded-xl border border-yellow-600/20 transition-all text-left"
                          >
                            <div className="flex items-center gap-3">
                              <span className="text-lg">📧</span>
                              <span className="text-sm text-yellow-500 font-bold">Add Email/Password</span>
                            </div>
                            <span className="text-white/40 text-sm">→</span>
                          </button>
                        )}
                        {!auth.currentUser?.providerData.find(p => p.providerId === 'google.com') && (
                          <button
                            onClick={handleLinkGoogle}
                            className="flex items-center justify-between bg-white/5 hover:bg-white/10 px-4 py-3 rounded-xl border border-white/10 transition-all text-left"
                          >
                            <div className="flex items-center gap-3">
                              <div className="bg-white p-1 rounded-full"><svg className="w-3.4 h-4" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg></div>
                              <span className="text-sm text-white font-bold">Link Google</span>
                            </div>
                            <span className="text-white/40 text-sm">→</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="lobby-setting-group border-b border-gray-700/50 pb-5 mb-5">
                    <label className="lobby-setting-label">Account</label>
                    <div className="flex items-center justify-between bg-white/5 rounded-xl p-4 mt-2">
                      <div className="flex flex-col">
                        <span className="text-white font-semibold text-lg">Playing as Guest</span>
                        <span className="text-xs text-gray-400 font-medium">Log in to add friends</span>
                      </div>
                      <button
                        onClick={() => router.push('/login')}
                        className="bg-yellow-600 border border-yellow-500 text-black hover:bg-yellow-500 font-bold text-sm px-4 py-2 rounded-lg transition-all"
                      >
                        Log In / Sign Up
                      </button>
                    </div>
                  </div>
                )}

                <div className="lobby-setting-group">
                  <label className="lobby-setting-label">Game Table Theme</label>
                  <p className="text-xs text-white/50 mb-3 leading-tight">Choose the background table style for the game room.</p>
                  <div
                    className="w-full h-32 rounded-2xl mb-4 relative overflow-hidden shadow-inner flex items-center justify-center border border-white/10"
                    style={{ backgroundColor: getTableThemeStyles(tableTheme).outerSpace }}
                  >
                    <div className="absolute inset-0 opacity-[0.15]" style={{ background: 'repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(0,0,0,0.5) 2px, rgba(0,0,0,0.5) 4px)' }} />
                    <div
                      className="w-[95%] h-[120%] rounded-[50%] relative flex items-center justify-center"
                      style={{ background: getTableThemeStyles(tableTheme).tableBg, boxShadow: `0 0 0 3px ${getTableThemeStyles(tableTheme).tableEdgeColor}, 0 0 0 6px ${getTableThemeStyles(tableTheme).tableEdgeColor}aa, 0 0 15px rgba(0,0,0,0.8)` }}
                    >
                      <div className="absolute inset-0 rounded-[50%] opacity-20" style={{ background: 'repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(0,0,0,0.5) 4px, rgba(0,0,0,0.5) 8px)' }} />
                      <div className="w-[12px] h-[16px] bg-white rounded-[2px] absolute top-[25px]" />
                      <div className="w-[12px] h-[16px] bg-white rounded-[2px] absolute left-[20px]" />
                      <div className="w-[12px] h-[16px] bg-white rounded-[2px] absolute right-[20px]" />
                      <div className="w-[12px] h-[16px] bg-white rounded-[2px] absolute bottom-[25px]" />
                      <div className="flex gap-1 shadow-2xl z-10 w-[14px] h-[20px] bg-white rounded-[2px]" />
                      <div className="flex gap-1 shadow-2xl z-10 w-[14px] h-[20px] bg-white rounded-[2px] ml-1" />
                    </div>
                  </div>
                  <div className="relative mt-2">
                    <select
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-yellow-500 transition-colors appearance-none cursor-pointer"
                      value={tableTheme}
                      onChange={(e) => setTableTheme(e.target.value as TableThemeStyle)}
                    >
                      <option value="classic-green" className="bg-[#111] text-white">Classic Green</option>
                      <option value="royal-burgundy" className="bg-[#111] text-white">Royal Burgundy</option>
                      <option value="midnight-blue" className="bg-[#111] text-white">Midnight Blue</option>
                      <option value="noir-black" className="bg-[#111] text-white">Noir Black (Dark)</option>
                      <option value="obsidian-hex" className="bg-[#111] text-white">Obsidian Hex (Dark)</option>
                      <option value="abyssal-carbon" className="bg-[#111] text-white">Abyssal Carbon (Dark)</option>
                      <option value="crimson-shadow" className="bg-[#111] text-white">Crimson Shadow (Dark)</option>
                      <option value="vintage-wood" className="bg-[#111] text-white">Vintage Wood 🪵</option>
                      <option value="cyberpunk-neon" className="bg-[#111] text-white">Cyberpunk Neon ⚡</option>
                      <option value="marble-highroller" className="bg-[#111] text-white">Marble Highroller 🏛️</option>
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 text-xs">▼</div>
                  </div>
                </div>

                <div className="lobby-setting-group mt-6">
                  <label className="lobby-setting-label">Card Back Design</label>
                  <p className="text-xs text-white/50 mb-3 leading-tight">Choose the back side of cards that you will see during the game.</p>
                  <div className="grid grid-cols-2 flex-wrap gap-4 justify-items-center mt-2">
                    {(['classic-blue', 'crimson-ruby', 'midnight-dragon', 'emerald-forest'] as CardBackStyle[]).map(styleId => (
                      <div key={styleId} className="flex flex-col items-center gap-2 w-full">
                        <div
                          className={`rounded-xl p-3 cursor-pointer transition-all w-full flex justify-center ${storedStyle === styleId ? 'bg-white/10 ring-2 ring-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.3)]' : 'bg-white/5 hover:bg-white/10'}`}
                          onClick={() => setCardBack(styleId)}>
                          <CardBack forceStyle={styleId} size="lg" clickable={false} />
                        </div>
                        <span className="text-[10px] uppercase tracking-wider text-white/70 font-semibold text-center">{styleId.split('-').join(' ')}</span>
                      </div>
                    ))}
                  </div>
                </div>
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
                  disabled={loading || !isConnected || joinCode.length !== 4 || !playerName?.trim()}
                  className="lobby-btn lobby-btn-primary lobby-btn-full">
                  <span className="lobby-btn-icon">🎮</span>
                  <div className="lobby-btn-text">
                    <span className="lobby-btn-label">{loading ? 'Joining...' : 'Join Game'}</span>
                  </div>
                </button>
              </div>
            )}

            {mode === 'link-email' && (
              <div className="lobby-panel">
                <div className="lobby-panel-header">
                  <button className="lobby-back-btn" onClick={() => { setMode('settings'); setLinkError(null); }}>←</button>
                  <h2 className="lobby-panel-title">Add Email login</h2>
                </div>

                <p className="text-xs text-gray-400 mb-6 px-1">
                  Adding an email/password login allows you to access your account without needing Google.
                </p>

                <form onSubmit={handleLinkEmail} className="flex flex-col gap-4">
                  <div>
                    <label className="text-[10px] uppercase font-bold text-gray-500 ml-1">Connect Email</label>
                    <input
                      type="email"
                      value={linkEmail}
                      onChange={e => setLinkEmail(e.target.value)}
                      placeholder="name@example.com"
                      className="w-full mt-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-yellow-500 transition-colors"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold text-gray-500 ml-1">New Password</label>
                    <input
                      type="password"
                      value={linkPass}
                      onChange={e => setLinkPass(e.target.value)}
                      placeholder="Min. 6 characters"
                      className="w-full mt-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-yellow-500 transition-colors"
                      required
                      minLength={6}
                    />
                  </div>
                  {linkError && (
                    <div className="text-xs text-red-400 bg-red-400/10 p-3 rounded-lg border border-red-400/20">{linkError}</div>
                  )}
                  <button
                    type="submit"
                    disabled={linkLoading}
                    className="w-full mt-4 bg-yellow-600 hover:bg-yellow-500 text-black font-bold py-3.5 rounded-xl transition-all shadow-lg hover:shadow-yellow-500/20 active:scale-95 disabled:opacity-50"
                  >
                    {linkLoading ? 'Linking...' : 'Connect Account'}
                  </button>
                </form>
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  );
}
