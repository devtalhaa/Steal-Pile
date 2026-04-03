'use client';

import { useEffect, use } from 'react';
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

  // Redirect if not in a room (e.g. page refresh)
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!room && !gameState) {
        router.push('/');
      }
    }, 3000);
    return () => clearTimeout(timeout);
  }, [room, gameState, router]);

  if (!room && !gameState) {
    return (
      <div className="min-h-screen flex items-center justify-center"
        style={{ background: '#000' }}>
        <div className="text-center">
          <div className="text-4xl mb-4 animate-pulse">🃏</div>
          <p className="gold-text text-lg">Loading room {code}...</p>
          <p className="text-gray-500 text-sm mt-2">Redirecting to home if not found...</p>
        </div>
      </div>
    );
  }

  const isInGame = room?.status === 'in_game' && gameState !== null;

  if (!isInGame) {
    return <Lobby code={code} />;
  }

  return (
    <div className="h-screen overflow-hidden relative">
      <GameTable myPlayerId={myPlayerId!} />
      {(roundResult || gameResult) && (
        <GameOverModal />
      )}
    </div>
  );
}
