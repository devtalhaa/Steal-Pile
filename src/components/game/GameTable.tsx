'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '@/store/gameStore';
import { useGameActions } from '@/hooks/useGameActions';
import { MiddleCards } from './MiddleCards';
import { DrawPile } from './DrawPile';
import { OpponentSeat } from './OpponentSeat';
import { PlayerHand } from './PlayerHand';
import { ScoreBoard } from './ScoreBoard';

interface GameTableProps {
  myPlayerId: string;
}

// Positions for N players around an oval — current player always at bottom
function getTablePositions(totalPlayers: number, myIndex: number) {
  const positions: { x: number; y: number }[] = [];

  for (let i = 0; i < totalPlayers; i++) {
    const offset = ((i - myIndex + totalPlayers) % totalPlayers);

    if (offset === 0) {
      positions.push({ x: 50, y: 88 });
      continue;
    }

    const arcStart = 15;
    const arcEnd = 165;
    const step = (arcEnd - arcStart) / (totalPlayers - 1);
    const angleDeg = arcStart + (offset - 1) * step;
    const radians = (angleDeg - 90) * (Math.PI / 180);
    const x = 50 + 42 * Math.cos(radians);
    const y = 42 + 33 * Math.sin(radians);
    positions.push({ x, y });
  }

  return positions;
}

export function GameTable({ myPlayerId }: GameTableProps) {
  const gameState = useGameStore(s => s.gameState);
  const pendingAction = useGameStore(s => s.pendingAction);
  const setPendingAction = useGameStore(s => s.setPendingAction);

  const { drawCard, playCard } = useGameActions();

  // Track whether auto-draw is pending so we can show a spinner
  const [isDrawing, setIsDrawing] = useState(false);
  // Prevent double-triggering auto-draw for the same phase snapshot
  const lastAutoDrawKey = useRef<string>('');

  // AUTO-DRAW: when it's my turn in draw phase, pull a card automatically
  useEffect(() => {
    if (!gameState) return;

    const isMe = gameState.currentPlayerId === myPlayerId;
    const needsDraw =
      isMe &&
      (gameState.turnPhase === 'draw' || gameState.turnPhase === 'bonus_draw') &&
      !gameState.deckEmpty;

    // Unique key for this draw opportunity — prevents double-firing
    const key = `${gameState.currentPlayerId}-${gameState.turnPhase}-${gameState.roundNumber}`;

    if (!needsDraw || lastAutoDrawKey.current === key) return;

    lastAutoDrawKey.current = key;
    setIsDrawing(true);

    const t = setTimeout(() => {
      drawCard();
      setIsDrawing(false);
    }, 500);

    return () => {
      clearTimeout(t);
      setIsDrawing(false);
    };
  }, [gameState?.turnPhase, gameState?.currentPlayerId, gameState?.deckEmpty, gameState?.roundNumber, myPlayerId, drawCard]);

  // Clear pending action banner after a short delay
  useEffect(() => {
    if (pendingAction) {
      const t = setTimeout(() => setPendingAction(null), 2000);
      return () => clearTimeout(t);
    }
  }, [pendingAction, setPendingAction]);

  if (!gameState) {
    return (
      <div className="h-screen flex items-center justify-center felt-bg">
        <div className="text-center">
          <div className="text-4xl animate-spin mb-4">🃏</div>
          <p className="gold-text">Loading game...</p>
        </div>
      </div>
    );
  }

  const { players, middleCards, drawPileCount, turnPhase, currentPlayerId, deckEmpty } = gameState;
  const myPlayer = players.find(p => p.id === myPlayerId);
  const myIndex = players.findIndex(p => p.id === myPlayerId);
  const opponents = players.filter(p => p.id !== myPlayerId);

  const positions = getTablePositions(players.length, myIndex);
  const isCurrentPlayerMe = currentPlayerId === myPlayerId;
  const canPlay = isCurrentPlayerMe && (turnPhase === 'play' || turnPhase === 'bonus_play');

  return (
    <div className="h-screen w-full felt-bg relative overflow-hidden">

      {/* Oval table */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div
          className="table-edge"
          style={{
            width: '85vw',
            maxWidth: 900,
            height: '70vh',
            maxHeight: 540,
            borderRadius: '50%',
            background: 'radial-gradient(ellipse at 50% 40%, #166534 0%, #0d5016 50%, #052e0a 100%)',
            position: 'relative',
          }}>
          <div className="absolute inset-0 rounded-full"
            style={{
              background: 'repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(0,0,0,0.03) 4px, rgba(0,0,0,0.03) 8px)',
            }} />
          <div className="absolute"
            style={{
              top: '50%', left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '30%', height: '40%',
              borderRadius: '50%',
              border: '1px solid rgba(212,168,67,0.12)',
            }} />
        </div>
      </div>

      {/* Opponents around the table */}
      <div className="absolute inset-0 pointer-events-none">
        {opponents.map((opponent) => {
          const opIdx = players.findIndex(p => p.id === opponent.id);
          const pos = positions[opIdx];
          if (!pos) return null;

          return (
            <div
              key={opponent.id}
              className="absolute pointer-events-auto"
              style={{
                left: `${pos.x}%`,
                top: `${pos.y}%`,
                transform: 'translate(-50%, -50%)',
              }}>
              <OpponentSeat
                player={opponent}
                isCurrentTurn={currentPlayerId === opponent.id}
                pileHighlighted={canPlay && opponent.pileTop !== null}
              />
            </div>
          );
        })}
      </div>

      {/* Center: middle cards + draw pile */}
      <div className="absolute pointer-events-none"
        style={{
          top: '50%', left: '50%',
          transform: 'translate(-50%, -52%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 10,
        }}>
        <MiddleCards cards={middleCards} />
        <DrawPile
          count={drawPileCount}
          canDraw={false}        // drawing is now fully automatic
          isEmpty={deckEmpty}
          onDraw={() => {}}
          isAutoDrawing={isDrawing && isCurrentPlayerMe}
        />
      </div>

      {/* Action banner */}
      <AnimatePresence>
        {pendingAction && pendingAction.type !== 'draw' && (
          <motion.div
            className="absolute z-30 pointer-events-none"
            style={{ top: '33%', left: '50%', transform: 'translateX(-50%)' }}
            initial={{ scale: 0, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: -20 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}>
            <div className="px-6 py-3 rounded-2xl text-center font-bold text-lg whitespace-nowrap"
              style={{
                background: (pendingAction.type === 'steal_pile' || pendingAction.type === 'match_and_steal')
                  ? 'linear-gradient(135deg, rgba(185,28,28,0.92), rgba(127,29,29,0.92))'
                  : 'linear-gradient(135deg, rgba(21,128,61,0.92), rgba(22,163,74,0.92))',
                border: '2px solid rgba(255,255,255,0.2)',
                backdropFilter: 'blur(8px)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                color: 'white',
              }}>
              {pendingAction.type === 'steal_pile' && '🔥 STEAL!'}
              {pendingAction.type === 'match_middle' && '✅ MATCH!'}
              {pendingAction.type === 'match_and_steal' && '⚡ MATCH & STEAL!'}
              {pendingAction.type === 'play_to_middle' && '→ No match — card to middle'}
              {(pendingAction.type === 'round_over' || pendingAction.type === 'game_over') && '🃏 Round Over'}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Score board — top left */}
      <div className="absolute top-3 left-3 z-20">
        <ScoreBoard gameState={gameState} myPlayerId={myPlayerId} />
      </div>

      {/* Deck-empty badge — top right */}
      {deckEmpty && (
        <div className="absolute top-3 right-3 z-20 px-3 py-1.5 rounded-xl text-xs font-bold"
          style={{
            background: 'rgba(127,29,29,0.85)',
            border: '1px solid rgba(239,68,68,0.4)',
            color: '#fca5a5',
          }}>
          🃏 Deck Empty — 1 card/turn
        </div>
      )}

      {/* My hand — bottom */}
      {myPlayer && (
        <div className="absolute bottom-0 left-0 right-0 pb-3 flex flex-col items-center z-20 pointer-events-auto">
          <PlayerHand
            hand={gameState.myHand}
            pileTop={myPlayer.pileTop}
            pileCount={myPlayer.pileCount}
            playerName={myPlayer.name}
            team={myPlayer.team}
            isMyTurn={isCurrentPlayerMe}
            turnPhase={turnPhase}
            canPlay={canPlay}
            onPlayCard={playCard}
            drawPileEmpty={deckEmpty}
            isDrawing={isDrawing && isCurrentPlayerMe}
          />
        </div>
      )}

      {/* Waiting indicator — when it's someone else's turn */}
      {!isCurrentPlayerMe && (
        <div className="absolute top-1/2 right-3 -translate-y-1/2 z-20">
          <div className="px-3 py-2 rounded-xl text-xs text-center"
            style={{
              background: 'rgba(0,0,0,0.65)',
              border: '1px solid rgba(212,168,67,0.2)',
            }}>
            <div className="gold-text font-bold mb-0.5">WAITING</div>
            <div className="text-gray-400 truncate max-w-20">
              {players.find(p => p.id === currentPlayerId)?.name}
            </div>
            <div className="text-gray-600 text-[10px]">is playing</div>
          </div>
        </div>
      )}
    </div>
  );
}
