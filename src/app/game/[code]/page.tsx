'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { useSocket } from '@/hooks/useSocket';
import { useGameStore } from '@/store/gameStore';
import { useGameActions } from '@/hooks/useGameActions';
import { useAuthStore } from '@/store/authStore';
import { Lobby } from '@/components/lobby/Lobby';
import { GameTable } from '@/components/game/GameTable';
import { GameOverModal } from '@/components/game/GameOverModal';

export default function GamePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const router = useRouter();
  const socket = useSocket();

  const room = useGameStore(s => s.room);
  const gameState = useGameStore(s => s.gameState);
  const gameResult = useGameStore(s => s.gameResult);
  const roundResult = useGameStore(s => s.roundResult);
  const myPlayerId = useGameStore(s => s.myPlayerId);
  const isConnected = useGameStore(s => s.isConnected);
  const error = useGameStore(s => s.error);

  const { joinRoom } = useGameActions();
  const { user, guestName, isLoading: isAuthLoading } = useAuthStore();

  const [isJoining, setIsJoining] = useState(false);

  // 1. Auto-Join logic for invited players
  useEffect(() => {
    // Wait for auth to finish loading so we get the real name
    if (!isConnected || room || gameState || isJoining || isAuthLoading) return;

    const hasSession = typeof window !== 'undefined'
      && sessionStorage.getItem('khoti_room_code') === code
      && sessionStorage.getItem('khoti_player_name');

    if (!hasSession) {
      const name = user?.displayName || guestName || 'Player';
      setIsJoining(true);
      joinRoom(code, name).catch(() => {
        setIsJoining(false);
      });
    }
  }, [isConnected, room, gameState, code, user, guestName, isJoining, joinRoom, isAuthLoading]);

  // 2. Smart Redirection logic
  useEffect(() => {
    // Only redirect if we are connected and have a confirmed "Room not found" or similar error
    if (isConnected && error && (error.toLowerCase().includes('not found') || error.toLowerCase().includes('not in a game'))) {
      const timeout = setTimeout(() => {
          sessionStorage.removeItem('khoti_room_code');
          sessionStorage.removeItem('khoti_player_name');
          router.push('/');
      }, 2000);
      return () => clearTimeout(timeout);
    }
  }, [isConnected, error, router]);

  if (!room && !gameState) {
    const isConnecting = !isConnected;
    
    return (
      <div className="min-h-screen flex items-center justify-center p-6"
        style={{ background: '#000' }}>
        <div className="text-center max-w-xs">
          <div className="text-5xl mb-6 animate-bounce">🃏</div>
          
          <h2 className="gold-text text-xl font-bold mb-2 uppercase tracking-widest">
            {isConnecting ? 'Connection Lost' : isJoining ? 'Joining Room' : `Synchronizing`}
          </h2>
          
          <p className="text-gray-400 text-sm leading-relaxed">
            {isConnecting 
              ? 'Your internet seems to be down. Hanging tight until you’re back online...' 
              : isJoining 
                ? `Entering room ${code}...` 
                : error 
                  ? error
                  : 'Fetching the latest game state from the server...'}
          </p>

          {isConnecting && (
            <div className="mt-8 flex items-center justify-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse" />
              <span className="text-[10px] text-yellow-500/50 uppercase font-bold tracking-tighter">Retrying indefinitely</span>
            </div>
          )}

          {!isConnecting && error && (
            <button 
              onClick={() => router.push('/')}
              className="mt-8 text-xs text-white/40 underline hover:text-white transition-colors"
            >
              Back to Home
            </button>
          )}
        </div>
      </div>
    );
  }

  const isInGame = room?.status === 'in_game' && gameState !== null;

  if (!isInGame) {
    return <Lobby code={code} />;
  }

  return (
    <div className="h-screen overflow-hidden relative" style={{ touchAction: 'none' }}>
      <GameTable myPlayerId={myPlayerId!} />
      {(roundResult || gameResult) && (
        <GameOverModal />
      )}
    </div>
  );
}
