'use client';

import React from 'react';
import { Card } from '@/types/game';
import { PlayingCard } from './PlayingCard';
import { CardBack } from './CardBack';

interface CardStackProps {
  topCard: Card | null;
  count: number;
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  isMyPile?: boolean;
  isHighlighted?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export function CardStack({
  topCard,
  count,
  size = 'sm',
  label,
  isMyPile = false,
  isHighlighted = false,
  className = '',
  style,
}: CardStackProps) {
  const offsetCount = Math.min(count, 4);
  const offsetStep = 2;

  if (count === 0) {
    return (
      <div className={`flex flex-col items-center gap-1 ${className}`} style={style}>
        <div className="rounded-lg border-2 border-dashed opacity-30 flex items-center justify-center"
          style={{
            width: size === 'sm' ? 52 : size === 'md' ? 72 : 90,
            height: size === 'sm' ? 74 : size === 'md' ? 100 : 126,
            borderColor: 'rgba(255,255,255,0.3)',
          }}>
          <span className="text-gray-500 text-xs">Empty</span>
        </div>
        {label && <span className="text-xs text-gray-400 truncate max-w-[72px]">{label}</span>}
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center gap-1 ${className}`} style={style}>
      <div className="relative" style={{
        width: size === 'sm' ? 52 : size === 'md' ? 72 : 90,
        height: size === 'sm' ? 74 : size === 'md' ? 100 : 126,
      }}>
        {/* Stacked backs underneath */}
        {Array.from({ length: Math.min(offsetCount - 1, 3) }).map((_, i) => (
          <div
            key={i}
            className="absolute"
            style={{
              top: (offsetCount - 2 - i) * offsetStep,
              left: (i % 2 === 0 ? 1 : -1) * (i + 1) * 1,
              zIndex: i,
            }}>
            <CardBack size={size} />
          </div>
        ))}

        {/* Top card (face-up) */}
        {topCard && (
          <div className="absolute" style={{ top: 0, left: 0, zIndex: offsetCount }}>
            <PlayingCard
              card={topCard}
              size={size}
              className={isHighlighted ? 'ring-2 ring-yellow-400' : ''}
            />
          </div>
        )}

        {/* Glow for highlighted pile */}
        {isHighlighted && (
          <div className="absolute inset-0 rounded-lg pointer-events-none"
            style={{
              boxShadow: '0 0 20px rgba(255,215,0,0.6)',
              zIndex: offsetCount + 1,
            }} />
        )}
      </div>

      {/* Count badge + label */}
      <div className="flex flex-col items-center gap-0.5">
        <div className={`text-xs font-bold px-2 py-0.5 rounded-full ${isMyPile ? 'bg-green-700 text-green-100' : 'bg-gray-700 text-gray-200'}`}>
          {count} card{count !== 1 ? 's' : ''}
        </div>
        {label && <span className="text-xs text-gray-400 truncate max-w-[72px] text-center">{label}</span>}
      </div>
    </div>
  );
}
