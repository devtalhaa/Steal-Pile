'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/types/game';
import { PlayingCard } from '@/components/cards/PlayingCard';

interface MiddleCardsProps {
  cards: Card[];
  playableRank?: string; // Highlight middle cards matching this rank
}

export function MiddleCards({ cards, playableRank }: MiddleCardsProps) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Middle</div>

      <div className="flex flex-wrap gap-1 sm:gap-2 justify-center items-center min-h-[60px] min-w-[140px] sm:min-h-[84px] sm:min-w-[200px]
        rounded-xl p-1.5 sm:p-3"
        style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.08)' }}>
        {cards.length === 0 ? (
          <span className="text-gray-600 text-sm italic">No cards</span>
        ) : (
          <AnimatePresence mode="popLayout">
            {cards.map(card => (
              <motion.div
                layout
                key={card.id}
                layoutId={card.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.65, ease: [0.4, 0, 0.2, 1] }}>
                <PlayingCard
                  card={card}
                  size="sm"
                  className={playableRank === card.rank ? 'ring-2 ring-yellow-400' : ''}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
      <div className="text-xs text-gray-500">{cards.length} card{cards.length !== 1 ? 's' : ''}</div>
    </div>
  );
}
