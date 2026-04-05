'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { useSocket } from '@/hooks/useSocket';
import { useGameStore } from '@/store/gameStore';
import { Lobby } from '@/components/lobby/Lobby';
import { GameTable } from '@/components/game/GameTable';
import { GameOverModal } from '@/components/game/GameOverModal';

export default function GamePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const router = useRouter();
  useSocket();

  const room = useGameStore(s => s.room);
  const gameState = useGameStore(s => s.gameState);
  const gameResult = useGameStore(s => s.gameResult);
  const roundResult = useGameStore(s => s.roundResult);
  const myPlayerId = useGameStore(s => s.myPlayerId);
  const isConnected = useGameStore(s => s.isConnected);

  const [waitingForReconnect, setWaitingForReconnect] = useState(true);

  useEffect(() => {
    const hasSession = typeof window !== 'undefined'
      && sessionStorage.getItem('khoti_room_code') === code
      && sessionStorage.getItem('khoti_player_name');

    if (!hasSession) {
      setWaitingForReconnect(false);
      return;
    }

    const timeout = setTimeout(() => {
      setWaitingForReconnect(false);
    }, 5000);

    return () => clearTimeout(timeout);
  }, [code]);

  useEffect(() => {
    if (room || gameState) {
      setWaitingForReconnect(false);
    }
  }, [room, gameState]);

  useEffect(() => {
    if (waitingForReconnect) return;

    const timeout = setTimeout(() => {
      if (!room && !gameState) {
        sessionStorage.removeItem('khoti_room_code');
        sessionStorage.removeItem('khoti_player_name');
        router.push('/');
      }
    }, 3000);
    return () => clearTimeout(timeout);
  }, [room, gameState, router, waitingForReconnect]);

  if (!room && !gameState) {
    return (
      <div className="min-h-screen flex items-center justify-center"
        style={{ background: '#000' }}>
        <div className="text-center">
          <div className="text-4xl mb-4 animate-pulse">🃏</div>
          <p className="gold-text text-lg">
            {waitingForReconnect ? 'Reconnecting...' : `Loading room ${code}...`}
          </p>
          <p className="text-gray-500 text-sm mt-2">
            {waitingForReconnect ? 'Restoring your game session' : 'Redirecting to home if not found...'}
          </p>
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
