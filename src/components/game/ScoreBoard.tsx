'use client';

import React, { useState } from 'react';
import { ClientGameState, ClientPlayerView } from '@/types/game';
import { useGameStore } from '@/store/gameStore';

interface ScoreBoardProps {
  gameState: ClientGameState;
  myPlayerId: string;
  className?: string;
}

export function ScoreBoard({ gameState, myPlayerId, className }: ScoreBoardProps) {
  const [expanded, setExpanded] = useState(false);
  const { scores, teamScores, netOwing, roundNumber, targetScore, players } = gameState;

  const getPlayerName = (id: string) => players.find(p => p.id === id)?.name || id;

  const teamAScore = netOwing !== undefined ? netOwing : undefined;
  const teamBScore = netOwing !== undefined ? -netOwing : undefined;

  const scoreColor = (val: number) =>
    val > 0 ? '#4ade80' : val < 0 ? '#f87171' : '#d1d5db';

  return (
    <div className={`rounded-xl overflow-hidden transition-all max-w-[140px] sm:max-w-none ${className || ''}`}
      style={{
        background: 'rgba(0,0,0,0.5)',
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

      {/* Team game-standing scores */}
      {teamScores && teamAScore !== undefined && teamBScore !== undefined ? (
        <div className="px-3 pb-2">
          <div className="flex gap-2 mb-1">
            <div
              className="flex-1 text-center py-1 rounded text-xs font-bold"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: `1px solid ${scoreColor(teamAScore)}44`,
                color: scoreColor(teamAScore),
              }}>
              A: {teamAScore > 0 ? '+' : ''}{teamAScore.toFixed(1)}
            </div>
            <div
              className="flex-1 text-center py-1 rounded text-xs font-bold"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: `1px solid ${scoreColor(teamBScore)}44`,
                color: scoreColor(teamBScore),
              }}>
              B: {teamBScore > 0 ? '+' : ''}{teamBScore.toFixed(1)}
            </div>
          </div>
          {targetScore && (
            <div className="mt-1">
              <div className="text-xs text-gray-500 text-center mb-1">
                Defeat at ±{targetScore}
              </div>
              <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${Math.min(100, (Math.abs(netOwing || 0) / targetScore) * 100)}%`,
                    background: `linear-gradient(to right, ${netOwing && netOwing > 0 ? '#4ade80, #22c55e' : '#f87171, #ef4444'})`,
                  }} />
              </div>
            </div>
          )}
        </div>
      ) : teamScores ? (
        <div className="px-3 pb-2">
          <div className="flex gap-2 mb-1">
            <div className="flex-1 text-center py-1 rounded text-xs font-bold team-a">
              A: {teamScores.A.toFixed(1)}
            </div>
            <div className="flex-1 text-center py-1 rounded text-xs font-bold team-b">
              B: {teamScores.B.toFixed(1)}
            </div>
          </div>
        </div>
      ) : null}

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
