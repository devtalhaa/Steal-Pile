'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '@/store/gameStore';
import { useGameActions } from '@/hooks/useGameActions';
import { useRouter } from 'next/navigation';
import { Card } from '@/types/game';
import { SUIT_SYMBOLS, SUIT_COLORS } from '@/lib/constants';
import Image from 'next/image';

function MiniCard({ card }: { card: Card }) {
  const color = SUIT_COLORS[card.suit];
  const symbol = SUIT_SYMBOLS[card.suit];
  return (
    <div
      className="inline-flex flex-col items-center justify-center rounded shrink-0"
      style={{
        width: 32,
        height: 44,
        background: 'white',
        border: '1px solid rgba(0,0,0,0.15)',
        fontSize: 10,
        lineHeight: 1,
        color,
        fontWeight: 700,
        fontFamily: 'Georgia, serif',
      }}>
      <span>{card.rank}</span>
      <span style={{ fontSize: 12 }}>{symbol}</span>
    </div>
  );
}

function DefeatCinematic({ onComplete }: { onComplete: () => void }) {
  const [phase, setPhase] = useState<'image' | 'gyaa' | 'khoti' | 'done'>('image');

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('gyaa'), 1200);
    const t2 = setTimeout(() => setPhase('khoti'), 2400);
    const t3 = setTimeout(() => {
      setPhase('done');
      onComplete();
    }, 3800);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onComplete]);

  return (
    <motion.div
      className="fixed inset-0 flex flex-col items-center justify-center z-[60]"
      style={{ background: 'rgba(0,0,0,0.92)' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}>

      <motion.div
        initial={{ scale: 0, rotate: -10 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15, duration: 0.8 }}
        className="relative"
        style={{ width: 220, height: 260 }}>
        <Image
          src="/assets/khoti.png"
          alt="Khoti"
          fill
          style={{ objectFit: 'contain', filter: 'drop-shadow(0 0 40px rgba(255,0,0,0.3))' }}
          priority
        />
      </motion.div>

      <AnimatePresence mode="wait">
        {phase === 'gyaa' && (
          <motion.div
            key="gyaa"
            initial={{ opacity: 0, y: 30, scale: 0.5 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ type: 'spring', stiffness: 300, damping: 12 }}
            className="mt-6 text-center">
            <span style={{
              fontSize: 42,
              fontWeight: 900,
              color: '#ff4444',
              textShadow: '0 0 30px rgba(255,68,68,0.6), 0 4px 8px rgba(0,0,0,0.8)',
              letterSpacing: '0.05em',
              fontStyle: 'italic',
            }}>
              Gyaa ee 😭
            </span>
          </motion.div>
        )}

        {phase === 'khoti' && (
          <motion.div
            key="khoti"
            initial={{ opacity: 0, scale: 0.3 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 10 }}
            className="mt-6 text-center">
            <motion.span
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ repeat: 2, duration: 0.3 }}
              style={{
                fontSize: 56,
                fontWeight: 900,
                background: 'linear-gradient(135deg, #ff4444, #ff8800, #ff4444)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                filter: 'drop-shadow(0 0 20px rgba(255,68,68,0.5))',
                letterSpacing: '0.1em',
                display: 'block',
              }}>
              KHOTIII 🫏
            </motion.span>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function GameOverModal() {
  const router = useRouter();
  const { roundResult, gameResult, setRoundResult, setGameResult, gameState } = useGameStore();
  const { requestNextRound, leaveRoom } = useGameActions();
  const room = useGameStore(s => s.room);
  const myPlayerId = useGameStore(s => s.myPlayerId);
  const [expandedPlayer, setExpandedPlayer] = useState<string | null>(null);
  const [showCinematic, setShowCinematic] = useState(false);
  const [cinematicDone, setCinematicDone] = useState(false);

  const result = gameResult || roundResult;

  const isGameOver = !!gameResult;

  useEffect(() => {
    if (!result || !isGameOver) return;

    const isTeamMode = !!result.winnerTeam;
    let iAmLoser = false;

    if (isTeamMode && result.loserTeam) {
      const myPlayer = gameState?.players.find(p => p.id === myPlayerId);
      if (myPlayer?.team === result.loserTeam) {
        iAmLoser = true;
      }
    } else if (!isTeamMode && result.winnerPlayerId) {
      if (result.winnerPlayerId !== myPlayerId) {
        iAmLoser = true;
      }
    }

    if (iAmLoser) {
      setShowCinematic(true);
      setCinematicDone(false);
    } else {
      setCinematicDone(true);
    }
  }, [result, isGameOver, myPlayerId, gameState]);

  if (!result) return null;

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

  const hasPiles = result.playerPiles && Object.keys(result.playerPiles).length > 0;

  return (
    <>
      <AnimatePresence>
        {showCinematic && !cinematicDone && (
          <DefeatCinematic onComplete={() => {
            setCinematicDone(true);
            setShowCinematic(false);
          }} />
        )}
      </AnimatePresence>

      {(!showCinematic || cinematicDone) && (
        <motion.div
          className="fixed inset-0 flex items-center justify-center z-50"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}>

          <motion.div
            className="relative w-full mx-4 rounded-2xl p-6 overflow-y-auto"
            style={{
              background: 'linear-gradient(135deg, #0a0f1a, #0d1a0d)',
              border: '2px solid rgba(212,168,67,0.4)',
              boxShadow: '0 0 60px rgba(212,168,67,0.2)',
              maxWidth: hasPiles ? 560 : 448,
              maxHeight: '90vh',
            }}
            initial={{ scale: 0.7, y: 40 }}
            animate={{ scale: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 280, damping: 22 }}>

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

            {result.teamScores && (
              <div className="grid grid-cols-2 gap-3 mb-4">
                {(['A', 'B'] as const).map(team => {
                  const teamKey = `team-${team}`;
                  const isExpanded = expandedPlayer === teamKey;
                  const pileCards = result.teamPiles?.[team] || [];
                  return (
                    <div key={team}>
                      <div
                        className={`rounded-xl p-3 text-center cursor-pointer transition-all ${team === 'A' ? 'team-a' : 'team-b'}`}
                        style={{
                          background: team === 'A' ? 'rgba(29,78,216,0.3)' : 'rgba(185,28,28,0.3)',
                          border: `1px solid ${team === 'A' ? 'rgba(29,78,216,0.5)' : 'rgba(185,28,28,0.5)'}`,
                          ...(isExpanded ? { boxShadow: `0 0 12px ${team === 'A' ? 'rgba(29,78,216,0.4)' : 'rgba(185,28,28,0.4)'}` } : {}),
                        }}
                        onClick={() => setExpandedPlayer(isExpanded ? null : teamKey)}>
                        <div className="text-xs uppercase tracking-wider mb-1">Team {team}</div>
                        <div className="text-2xl font-bold">{result.teamScores![team].toFixed(1)}</div>
                        <div className="text-xs opacity-70">
                          {pileCards.length} card{pileCards.length !== 1 ? 's' : ''} {isExpanded ? '▲' : '▼'}
                        </div>
                      </div>
                      {isExpanded && pileCards.length > 0 && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          transition={{ duration: 0.25 }}
                          className="overflow-hidden">
                          <div className="flex flex-wrap gap-1 py-2 mt-1 rounded-lg justify-center"
                            style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.06)' }}>
                            {pileCards.map(card => (
                              <MiniCard key={card.id} card={card} />
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

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

            <div className="space-y-2 mb-6">
              <div className="text-xs text-gray-500 uppercase tracking-wider">Scores & Piles</div>
              {Object.entries(result.scores)
                .sort(([, a], [, b]) => b - a)
                .map(([pid, score], i) => {
                  const pileCards = result.playerPiles?.[pid] || [];
                  const isExpanded = expandedPlayer === pid;
                  return (
                    <div key={pid}>
                      <div
                        className="flex items-center justify-between rounded-lg px-3 py-2 cursor-pointer transition-colors"
                        style={{ background: isExpanded ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.04)' }}
                        onClick={() => setExpandedPlayer(isExpanded ? null : pid)}>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500 text-xs w-4">{i + 1}.</span>
                          <span className={`text-sm font-medium ${pid === myPlayerId ? 'text-yellow-300' : 'text-gray-200'}`}>
                            {getPlayerName(pid)}{pid === myPlayerId ? ' (you)' : ''}
                          </span>
                          {pileCards.length > 0 && (
                            <span className="text-[10px] text-gray-500">
                              ({pileCards.length} card{pileCards.length !== 1 ? 's' : ''})
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white">{score.toFixed(1)} pts</span>
                          {pileCards.length > 0 && (
                            <span className="text-gray-500 text-xs">{isExpanded ? '▲' : '▼'}</span>
                          )}
                        </div>
                      </div>
                      {isExpanded && pileCards.length > 0 && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          transition={{ duration: 0.25 }}
                          className="overflow-hidden">
                          <div className="flex flex-wrap gap-1 px-3 py-2 mt-1 rounded-lg"
                            style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.06)' }}>
                            {pileCards.map(card => (
                              <MiniCard key={card.id} card={card} />
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </div>
                  );
                })}
            </div>

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
      )}
    </>
  );
}
