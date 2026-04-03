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
    <div className={`flex flex-col items-center gap-2 p-2 rounded-xl transition-all ${
      isCurrentTurn ? 'seat-active' : ''
    }`}
      style={{
        background: isCurrentTurn
          ? 'rgba(255,215,0,0.06)'
          : 'rgba(0,0,0,0.3)',
        border: isCurrentTurn
          ? '1px solid rgba(255,215,0,0.3)'
          : '1px solid rgba(255,255,255,0.06)',
        minWidth: 80,
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

      {/* Player avatar */}
      <div className={`relative w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
        ${isCurrentTurn ? 'ring-2 ring-yellow-400' : 'ring-1 ring-gray-600'}`}
        style={{ background: teamColor ? teamColor.hex : '#374151' }}>
        {player.name.charAt(0).toUpperCase()}
        {!player.isConnected && (
          <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-red-500 border border-gray-900" />
        )}
      </div>

      {/* Name + team badge */}
      <div className="flex flex-col items-center gap-0.5">
        <span className="text-xs font-semibold truncate max-w-[80px] text-white">
          {player.name}
        </span>
        {player.team && (
          <span className={`text-[10px] px-1.5 py-0 rounded font-bold ${
            player.team === 'A' ? 'team-a' : 'team-b'
          }`}>
            Team {player.team}
          </span>
        )}
      </div>

      {/* Hand (face-down) */}
      <div className="flex gap-[-8px]">
        {Array.from({ length: Math.min(player.handCount, 5) }).map((_, i) => (
          <div key={i} style={{ marginLeft: i > 0 ? -12 : 0, zIndex: i }}>
            <CardBack size="sm" />
          </div>
        ))}
        {player.handCount === 0 && (
          <span className="text-gray-600 text-xs">No cards</span>
        )}
      </div>

      {/* Pile */}
      <CardStack
        topCard={player.pileTop}
        count={player.pileCount}
        size="sm"
        isHighlighted={pileHighlighted}
      />

      {/* Turn glow label */}
      {isCurrentTurn && (
        <div className="text-[10px] gold-text font-bold animate-pulse">PLAYING</div>
      )}
    </div>
  );
}
