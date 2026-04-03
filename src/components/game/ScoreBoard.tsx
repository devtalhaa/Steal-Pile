'use client';

import React, { useState } from 'react';
import { ClientGameState, ClientPlayerView } from '@/types/game';
import { useGameStore } from '@/store/gameStore';

interface ScoreBoardProps {
  gameState: ClientGameState;
  myPlayerId: string;
}

export function ScoreBoard({ gameState, myPlayerId }: ScoreBoardProps) {
  const [expanded, setExpanded] = useState(false);
  const { scores, teamScores, netOwing, roundNumber, targetScore, players } = gameState;

  const getPlayerName = (id: string) => players.find(p => p.id === id)?.name || id;

  return (
    <div className="rounded-xl overflow-hidden"
      style={{
        background: 'rgba(0,0,0,0.6)',
        border: '1px solid rgba(212,168,67,0.2)',
        backdropFilter: 'blur(8px)',
        minWidth: 160,
      }}>

      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-3 py-2">
        <span className="text-xs gold-text font-bold uppercase tracking-wider">
          Round {roundNumber}
        </span>
        <span className="text-gray-500 text-xs">{expanded ? '▲' : '▼'}</span>
      </button>

      {/* Team scores / owing */}
      {teamScores && (
        <div className="px-3 pb-2">
          <div className="flex gap-2 mb-1">
            <div className="flex-1 text-center py-1 rounded text-xs font-bold team-a">
              A: {teamScores.A.toFixed(1)}
            </div>
            <div className="flex-1 text-center py-1 rounded text-xs font-bold team-b">
              B: {teamScores.B.toFixed(1)}
            </div>
          </div>
          {netOwing !== undefined && (
            <div className="text-center text-xs text-gray-400">
              Net: <span className={`font-bold ${netOwing > 0 ? 'text-blue-400' : netOwing < 0 ? 'text-red-400' : 'text-gray-300'}`}>
                {netOwing > 0 ? `B owes A ${netOwing.toFixed(1)}` : netOwing < 0 ? `A owes B ${Math.abs(netOwing).toFixed(1)}` : 'Even'}
              </span>
            </div>
          )}
          {targetScore && (
            <div className="mt-1">
              <div className="text-xs text-gray-500 text-center mb-1">Target: {targetScore}</div>
              <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-yellow-600 to-yellow-400 rounded-full transition-all"
                  style={{ width: `${Math.min(100, (Math.abs(netOwing || 0) / targetScore) * 100)}%` }} />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Individual scores (expanded) */}
      {expanded && (
        <div className="border-t border-gray-700 px-3 py-2 space-y-1">
          {Object.entries(scores).sort(([, a], [, b]) => b - a).map(([pid, score]) => (
            <div key={pid} className={`flex items-center justify-between text-xs ${pid === myPlayerId ? 'text-yellow-300 font-semibold' : 'text-gray-300'}`}>
              <span className="truncate max-w-[80px]">{getPlayerName(pid)}{pid === myPlayerId ? ' (you)' : ''}</span>
              <span className="font-bold">{score.toFixed(1)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
