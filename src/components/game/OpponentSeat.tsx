'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ClientPlayerView } from '@/types/game';
import { CardBack } from '@/components/cards/CardBack';
import { CardStack } from '@/components/cards/CardStack';
import { TEAM_COLORS } from '@/lib/constants';

interface OpponentSeatProps {
  player: ClientPlayerView;
  isCurrentTurn: boolean;
  isStealTarget?: boolean; // Highlighted when current player can steal from them
  pileHighlighted?: boolean;
}

export function OpponentSeat({ player, isCurrentTurn, pileHighlighted }: OpponentSeatProps) {
  const teamColor = player.team ? TEAM_COLORS[player.team] : null;

  return (
    <div className={`flex flex-row items-center gap-2 p-1.5 sm:gap-3 sm:p-2 rounded-xl transition-all ${
      isCurrentTurn ? 'seat-active' : ''
    }`}
      style={{
        background: isCurrentTurn
          ? 'rgba(255,215,0,0.06)'
          : 'rgba(0,0,0,0.3)',
        border: isCurrentTurn
          ? '1px solid rgba(255,215,0,0.3)'
          : '1px solid rgba(255,255,255,0.06)',
        minWidth: 'auto',
      }}>

      {/* Turn indicator ring */}
      {isCurrentTurn && (
        <motion.div
          className="absolute inset-0 rounded-xl pointer-events-none"
          animate={{ opacity: [0.3, 0.8, 0.3] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          style={{ border: '2px solid rgba(255,215,0,0.5)' }}
        />
      )}

      {/* Info Group (Avatar + Name) */}
      <div className="flex flex-col items-center gap-0.5">
        <div className={`relative w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold
          ${isCurrentTurn ? 'ring-2 ring-yellow-400' : 'ring-1 ring-gray-600'}`}
          style={{ background: teamColor ? teamColor.hex : '#374151' }}>
          {player.name.charAt(0).toUpperCase()}
          {!player.isConnected && (
            <div className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-red-500 border border-gray-900" />
          )}
        </div>

        <div className="flex flex-col items-center">
          <span className="text-[10px] font-semibold truncate max-w-[60px] text-white">
            {player.name}
          </span>
          {player.team && (
            <span className={`text-[8px] px-1 py-0 rounded font-bold ${
              player.team === 'A' ? 'team-a' : 'team-b'
            }`}>
              Team {player.team}
            </span>
          )}
        </div>
      </div>

      {/* Pile (hide in team mode) */}
      {!player.team && (
        <div className="flex-shrink-0">
          <CardStack
            topCard={player.pileTop}
            count={player.pileCount}
            size="sm"
            isHighlighted={pileHighlighted}
          />
        </div>
      )}

      {/* Turn glow label */}
      {isCurrentTurn && (
        <div className="absolute -bottom-3 text-[9px] gold-text font-bold animate-pulse">PLAYING</div>
      )}
    </div>
  );
}
