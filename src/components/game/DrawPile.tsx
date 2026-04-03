'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { CardBack } from '@/components/cards/CardBack';

interface DrawPileProps {
  count: number;
  canDraw: boolean;
  isEmpty: boolean;
  onDraw: () => void;
  isAutoDrawing?: boolean;
}

export function DrawPile({ count, isEmpty, isAutoDrawing }: DrawPileProps) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Draw Pile</div>

      <div className="relative">
        {/* Stacked depth effect */}
        {!isEmpty && (
          <>
            <div className="absolute" style={{ top: 4, left: 3, opacity: 0.5 }}>
              <CardBack size="md" />
            </div>
            <div className="absolute" style={{ top: 2, left: 1, opacity: 0.75 }}>
              <CardBack size="md" />
            </div>
          </>
        )}

        {isEmpty ? (
          <div className="w-18 h-25 rounded-lg border-2 border-dashed border-gray-600
            flex items-center justify-center">
            <span className="text-gray-600 text-xs text-center">Deck<br />Empty</span>
          </div>
        ) : (
          <div className="relative">
            <CardBack size="md" />
            {/* Pulse glow when auto-drawing */}
            {isAutoDrawing && (
              <motion.div
                className="absolute inset-0 rounded-lg pointer-events-none"
                animate={{ boxShadow: ['0 0 0 0 rgba(255,215,0,0)', '0 0 0 6px rgba(255,215,0,0.7)', '0 0 0 0 rgba(255,215,0,0)'] }}
                transition={{ duration: 0.5, repeat: Infinity }}
              />
            )}
          </div>
        )}
      </div>

      <div className="flex flex-col items-center gap-0.5">
        <div className={`text-xs font-bold px-2 py-0.5 rounded-full ${
          isEmpty ? 'bg-red-900 text-red-300' : 'bg-gray-700 text-gray-200'
        }`}>
          {isEmpty ? 'Empty' : `${count} left`}
        </div>
        {isAutoDrawing && (
          <span className="text-xs text-yellow-400 animate-pulse">Drawing...</span>
        )}
      </div>
    </div>
  );
}
