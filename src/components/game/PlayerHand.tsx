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
  matchingRanks: string[];
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
  matchingRanks,
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


      <div className="flex items-end gap-6">

        {/* My pile (only shown in free-for-all, team mode puts it in center) */}
        {!team && (
          <div className="flex flex-col items-center gap-1">
            <span className="text-xs text-gray-400">Your Pile</span>
            <CardStack topCard={pileTop} count={pileCount} size="md" isMyPile />
          </div>
        )}

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

          {/* Squeezed hand with negative margins to overlap cards on mobile */}
          <div className="relative flex items-end justify-center mt-2 sm:mt-4 max-sm:scale-[0.7] max-sm:origin-bottom" style={{ minHeight: 120 }}>
            <AnimatePresence mode="popLayout">
              {hand.map((card, i) => {
                const overlapClass = i > 0 ? '-ml-12 sm:-ml-6 lg:-ml-2' : '';
                return (
                  <motion.div
                    layout
                    key={card.id}
                    className={overlapClass}
                    layoutId={card.id}
                    initial={{ scale: 0.85, opacity: 0 }}
                    animate={{
                      scale: 1,
                      y: 0,
                      opacity: 1,
                    }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.65, ease: [0.4, 0, 0.2, 1] }}
                    style={{ zIndex: i }}
                    // Hover lift available whenever it's my turn (draw phase or play phase)
                    whileHover={isMyTurn ? { y: -14, scale: 1.06, zIndex: 30 } : {}}>
                    <PlayingCard
                      card={card}
                      size="lg"
                      // playable glow only when actually able to throw AND matches (unless absolutely nothing matches)
                      playable={canPlay && (matchingRanks.length === 0 || matchingRanks.includes(card.rank))}
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

    </div>
  );
}
