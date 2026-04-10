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

  const [mode, setMode] = useState<'menu' | 'create' | 'join' | 'settings' | 'friends' | 'link-email'>('menu');
  const [joinCode, setJoinCode] = useState('');
  const [settings, setSettings] = useState<RoomSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(false);

  // Link Email Form State
  const [linkEmail, setLinkEmail] = useState('');
  const [linkPass, setLinkPass] = useState('');
  const [linkError, setLinkError] = useState<string | null>(null);
  const [linkLoading, setLinkLoading] = useState(false);

  const { user, isGuest, guestName, isLoading: isAuthLoading, setGuest, logout } = useAuthStore();
  const [guestInputName, setGuestInputName] = useState('');
  const [showEditName, setShowEditName] = useState(false);

  // The actual player name to use in-game
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

  return (
    <div className="lobby-root">
      {/* Show Welcome Dialog if they are not logged in AND not explicitly a guest, and not loading auth */}
      {!isAuthLoading && !user && !isGuest && <WelcomeDialog />}
      {showEditName && <ChangeNameModal onClose={() => setShowEditName(false)} />}

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
            {/* If they are a guest but haven't entered a name yet, prompt them. If user, just show welcome */}
            <div className="lobby-name-input-wrap text-center">
              {user ? (
                <div className="flex flex-col items-center gap-2 mb-4">
                  <div className="text-xl font-bold text-white">
                    Welcome, {user.displayName}
                  </div>
                  <div className="text-sm font-semibold text-yellow-500 bg-yellow-500/10 px-3 py-1 rounded-full border border-yellow-500/20">
                    ID: {user.shortId}
                  </div>
                  <button onClick={logout} className="text-xs text-gray-400 hover:text-white underline mt-1">Logout</button>
                </div>
              ) : (
                <input
                  suppressHydrationWarning
                  className="lobby-name-input"
                  placeholder="Your Name (Guest)"
                  value={guestInputName}
                  onChange={e => {
                    setGuestInputName(e.target.value);
                    setGuest(e.target.value);
                  }}
                  maxLength={20}
                  autoFocus
                />
              )}
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

            {user && (
              <button
                suppressHydrationWarning
                className="lobby-btn lobby-btn-secondary"
                style={{ padding: '12px 20px' }}
                onClick={() => { setError(null); setMode('friends'); }}>
                <span className="lobby-btn-icon" style={{ fontSize: '20px' }}>👥</span>
                <div className="lobby-btn-text">
                  <span className="lobby-btn-label">Friends</span>
                  <span className="lobby-btn-desc">Add and invite friends</span>
                </div>
              </button>
            )}

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
                    {/* Check which providers are linked */}
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

                    {/* Show add options if not linked */}
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

            <button suppressHydrationWarning onClick={handleCreate} disabled={loading || !isConnected || !playerName?.trim()} className="lobby-btn lobby-btn-primary lobby-btn-full">
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
                <div className="text-xs text-red-400 bg-red-400/10 p-3 rounded-lg border border-red-400/20">
                  {linkError}
                </div>
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

        <div className="lobby-footer">
          Share your 4-digit code with friends
        </div>
      </div>
    </div>
  );
}
