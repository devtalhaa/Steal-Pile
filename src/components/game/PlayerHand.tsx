'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/types/game';
import { PlayingCard } from '@/components/cards/PlayingCard';
import { CardStack } from '@/components/cards/CardStack';

interface PlayerHandProps {
  hand: Card[];
  pileTop: Card | null;
  pileCount: number;
  playerName: string;
  team?: 'A' | 'B';
  isMyTurn: boolean;
  turnPhase: string;
  canPlay: boolean;
  onPlayCard: (cardId: string) => void;
  drawPileEmpty: boolean;
  isDrawing: boolean;
}

export function PlayerHand({
  hand,
  pileTop,
  pileCount,
  playerName,
  team,
  isMyTurn,
  turnPhase,
  canPlay,
  onPlayCard,
  drawPileEmpty,
  isDrawing,
}: PlayerHandProps) {

  const handleDoubleClick = (card: Card) => {
    if (!canPlay) return;
    onPlayCard(card.id);
  };

  // Status line: one message at a time, no duplicates
  let statusMsg: string | null = null;
  let statusColor: 'yellow' | 'green' = 'yellow';
  if (isMyTurn) {
    if (isDrawing) {
      statusMsg = '🃏 Drawing card from deck...';
      statusColor = 'yellow';
    } else if (canPlay) {
      statusMsg = '↑ Double-click a card to throw it';
      statusColor = 'green';
    } else if (!drawPileEmpty && (turnPhase === 'draw' || turnPhase === 'bonus_draw')) {
      statusMsg = '🃏 Drawing card from deck...';
      statusColor = 'yellow';
    }
  }

  return (
    <div className="flex flex-col items-center gap-3">

      {/* Player info bar */}
      <div className="flex items-center gap-3 px-4 py-2 rounded-full"
        style={{ background: 'rgba(0,0,0,0.55)', border: '1px solid rgba(255,255,255,0.1)' }}>
        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold
          ${team === 'A' ? 'team-a' : team === 'B' ? 'team-b' : 'bg-gray-600 text-white'}`}>
          {playerName.charAt(0).toUpperCase()}
        </div>
        <span className="font-semibold text-sm">{playerName}</span>
        {team && (
          <span className={`text-xs px-2 py-0.5 rounded font-bold ${team === 'A' ? 'team-a' : 'team-b'}`}>
            Team {team}
          </span>
        )}
        {isMyTurn && (
          <motion.span
            className="text-xs gold-text font-bold"
            animate={{ opacity: [1, 0.4, 1] }}
            transition={{ duration: 1, repeat: Infinity }}>
            YOUR TURN
          </motion.span>
        )}
      </div>

      <div className="flex items-end gap-6">

        {/* My pile */}
        <div className="flex flex-col items-center gap-1">
          <span className="text-xs text-gray-400">Your Pile</span>
          <CardStack topCard={pileTop} count={pileCount} size="md" isMyPile />
        </div>

        {/* Hand area */}
        <div className="flex flex-col items-center gap-2">

          {/* Single status line */}
          <div style={{ minHeight: 28 }}>
            <AnimatePresence mode="wait">
              {statusMsg && (
                <motion.div
                  key={statusMsg}
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 6 }}
                  transition={{ duration: 0.2 }}
                  className="text-xs px-3 py-1 rounded-full font-semibold"
                  style={{
                    background: statusColor === 'green'
                      ? 'rgba(34,197,94,0.15)'
                      : 'rgba(234,179,8,0.15)',
                    border: `1px solid ${statusColor === 'green' ? 'rgba(34,197,94,0.4)' : 'rgba(234,179,8,0.4)'}`,
                    color: statusColor === 'green' ? '#86efac' : '#fde68a',
                  }}>
                  {statusMsg}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Fanned cards */}
          <div className="relative flex items-end" style={{ minHeight: 140 }}>
            <AnimatePresence mode="popLayout">
              {hand.map((card, i) => {
                const totalCards = hand.length;
                const centerIndex = (totalCards - 1) / 2;
                const offset = i - centerIndex;
                const rotation = offset * 5;
                const translateY = Math.abs(offset) * 3;
                const translateX = offset * (totalCards > 4 ? 46 : 54);

                return (
                  <motion.div
                    key={card.id}
                    initial={{ scale: 0.5, y: 60, opacity: 0 }}
                    animate={{
                      scale: 1,
                      y: 0,
                      opacity: 1,   // always full opacity — never dim your own cards
                      rotate: rotation,
                      translateY,
                      translateX,
                    }}
                    exit={{ scale: 0.6, y: -30, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 260, damping: 22 }}
                    style={{
                      position: 'absolute',
                      left: '50%',
                      bottom: 0,
                      transformOrigin: 'bottom center',
                      zIndex: i,
                    }}
                    // Hover lift available whenever it's my turn (draw phase or play phase)
                    whileHover={isMyTurn ? { y: -14, scale: 1.06, zIndex: 30 } : {}}>
                    <PlayingCard
                      card={card}
                      size="lg"
                      // playable glow only when actually able to throw
                      playable={canPlay}
                      // NEVER disable own cards — just block double-click when not playable
                      disabled={false}
                      onDoubleClick={() => handleDoubleClick(card)}
                    />
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {hand.length === 0 && !isDrawing && (
              <div className="text-gray-500 text-sm italic px-10">No cards in hand</div>
            )}
          </div>
        </div>
      </div>

      {/* Subtle hint below hand */}
      {canPlay && hand.length > 0 && (
        <div className="text-[11px] text-gray-500">
          Double-click any card to play it
        </div>
      )}
    </div>
  );
}
