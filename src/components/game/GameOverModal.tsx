'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '@/store/gameStore';
import { useGameActions } from '@/hooks/useGameActions';
import { useRouter } from 'next/navigation';

export function GameOverModal() {
  const router = useRouter();
  const { roundResult, gameResult, setRoundResult, setGameResult, gameState } = useGameStore();
  const { requestNextRound, leaveRoom } = useGameActions();
  const room = useGameStore(s => s.room);
  const myPlayerId = useGameStore(s => s.myPlayerId);

  const result = gameResult || roundResult;
  if (!result) return null;

  const isGameOver = !!gameResult;
  const isHost = room?.hostId === myPlayerId;

  const handleNextRound = () => {
    setRoundResult(null);
    requestNextRound();
  };

  const handleLeave = () => {
    leaveRoom();
    router.push('/');
  };

  const players = gameState?.players || [];
  const getPlayerName = (id: string) => players.find(p => p.id === id)?.name || id;

  return (
    <motion.div
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}>

      <motion.div
        className="relative max-w-md w-full mx-4 rounded-2xl p-6"
        style={{
          background: 'linear-gradient(135deg, #0a0f1a, #0d1a0d)',
          border: '2px solid rgba(212,168,67,0.4)',
          boxShadow: '0 0 60px rgba(212,168,67,0.2)',
        }}
        initial={{ scale: 0.7, y: 40 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 280, damping: 22 }}>

        {/* Header */}
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">{isGameOver ? '🏆' : '🃏'}</div>
          <h2 className="text-2xl font-bold gold-text">
            {isGameOver ? 'Game Over!' : `Round ${result.roundNumber} Complete`}
          </h2>
          {isGameOver && result.winnerTeam && (
            <p className="text-lg mt-1">
              <span className={`font-bold px-2 py-0.5 rounded ${result.winnerTeam === 'A' ? 'team-a' : 'team-b'}`}>
                Team {result.winnerTeam}
              </span>
              {' '}
              <span className="text-gray-300">wins!</span>
            </p>
          )}
          {isGameOver && result.winnerPlayerId && !result.winnerTeam && (
            <p className="text-lg mt-1 text-gray-300">
              Winner: <span className="font-bold text-yellow-300">{getPlayerName(result.winnerPlayerId)}</span>
            </p>
          )}
        </div>

        {/* Team scores */}
        {result.teamScores && (
          <div className="grid grid-cols-2 gap-3 mb-4">
            {(['A', 'B'] as const).map(team => (
              <div key={team} className={`rounded-xl p-3 text-center ${team === 'A' ? 'team-a' : 'team-b'}`}
                style={{ background: team === 'A' ? 'rgba(29,78,216,0.3)' : 'rgba(185,28,28,0.3)', border: `1px solid ${team === 'A' ? 'rgba(29,78,216,0.5)' : 'rgba(185,28,28,0.5)'}` }}>
                <div className="text-xs uppercase tracking-wider mb-1">Team {team}</div>
                <div className="text-2xl font-bold">{result.teamScores![team].toFixed(1)}</div>
                <div className="text-xs opacity-70">points</div>
              </div>
            ))}
          </div>
        )}

        {/* Owing status */}
        {result.netOwing !== undefined && (
          <div className="rounded-xl p-3 mb-4 text-center"
            style={{ background: 'rgba(212,168,67,0.08)', border: '1px solid rgba(212,168,67,0.2)' }}>
            <div className="text-xs text-gray-400 mb-1">Net Owing</div>
            <div className="font-bold text-lg">
              {result.netOwing === 0
                ? <span className="text-gray-300">Even</span>
                : result.netOwing > 0
                  ? <span className="text-blue-400">Team B owes Team A {result.netOwing.toFixed(1)}</span>
                  : <span className="text-red-400">Team A owes Team B {Math.abs(result.netOwing).toFixed(1)}</span>
              }
            </div>
          </div>
        )}

        {/* Individual scores */}
        <div className="space-y-2 mb-6">
          <div className="text-xs text-gray-500 uppercase tracking-wider">Round Scores</div>
          {Object.entries(result.scores)
            .sort(([, a], [, b]) => b - a)
            .map(([pid, score], i) => (
              <div key={pid} className="flex items-center justify-between rounded-lg px-3 py-2"
                style={{ background: 'rgba(255,255,255,0.04)' }}>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 text-xs w-4">{i + 1}.</span>
                  <span className={`text-sm font-medium ${pid === myPlayerId ? 'text-yellow-300' : 'text-gray-200'}`}>
                    {getPlayerName(pid)}{pid === myPlayerId ? ' (you)' : ''}
                  </span>
                </div>
                <span className="font-bold text-white">{score.toFixed(1)} pts</span>
              </div>
            ))}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          {!isGameOver && isHost && (
            <button onClick={handleNextRound} className="btn-gold flex-1">
              Next Round →
            </button>
          )}
          {!isGameOver && !isHost && (
            <div className="flex-1 text-center text-sm text-gray-400 py-3">
              Waiting for host to start next round...
            </div>
          )}
          <button onClick={handleLeave} className={`btn-ghost ${isGameOver ? 'flex-1' : ''}`}>
            Leave Game
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
