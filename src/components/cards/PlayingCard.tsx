'use client';

import React from 'react';
import { Card, Suit, Rank } from '@/types/game';
import { SUIT_SYMBOLS, SUIT_COLORS } from '@/lib/constants';

interface PlayingCardProps {
  card: Card;
  size?: 'sm' | 'md' | 'lg';
  selected?: boolean;
  playable?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  onDoubleClick?: () => void;
  className?: string;
  style?: React.CSSProperties;
}

const SIZES = {
  sm: { width: 52, height: 74, rankSize: 11, suitSize: 14, centerSize: 22 },
  md: { width: 72, height: 100, rankSize: 14, suitSize: 18, centerSize: 30 },
  lg: { width: 90, height: 126, rankSize: 16, suitSize: 22, centerSize: 38 },
};

// Pip layout positions for 2-10 (as % of card height/width, center = 50/50)
const PIP_POSITIONS: Record<string, { x: number; y: number }[]> = {
  '2': [{ x: 50, y: 28 }, { x: 50, y: 72 }],
  '3': [{ x: 50, y: 22 }, { x: 50, y: 50 }, { x: 50, y: 78 }],
  '4': [{ x: 30, y: 28 }, { x: 70, y: 28 }, { x: 30, y: 72 }, { x: 70, y: 72 }],
  '5': [{ x: 30, y: 28 }, { x: 70, y: 28 }, { x: 50, y: 50 }, { x: 30, y: 72 }, { x: 70, y: 72 }],
  '6': [{ x: 30, y: 26 }, { x: 70, y: 26 }, { x: 30, y: 50 }, { x: 70, y: 50 }, { x: 30, y: 74 }, { x: 70, y: 74 }],
  '7': [{ x: 30, y: 24 }, { x: 70, y: 24 }, { x: 50, y: 38 }, { x: 30, y: 50 }, { x: 70, y: 50 }, { x: 30, y: 72 }, { x: 70, y: 72 }],
  '8': [{ x: 30, y: 22 }, { x: 70, y: 22 }, { x: 50, y: 35 }, { x: 30, y: 50 }, { x: 70, y: 50 }, { x: 50, y: 65 }, { x: 30, y: 76 }, { x: 70, y: 76 }],
  '9': [{ x: 30, y: 20 }, { x: 70, y: 20 }, { x: 30, y: 38 }, { x: 70, y: 38 }, { x: 50, y: 50 }, { x: 30, y: 62 }, { x: 70, y: 62 }, { x: 30, y: 80 }, { x: 70, y: 80 }],
  '10': [{ x: 30, y: 18 }, { x: 70, y: 18 }, { x: 50, y: 30 }, { x: 30, y: 42 }, { x: 70, y: 42 }, { x: 30, y: 58 }, { x: 70, y: 58 }, { x: 50, y: 70 }, { x: 30, y: 82 }, { x: 70, y: 82 }],
};

function SuitPip({ suit, size, rotate }: { suit: Suit; size: number; rotate?: boolean }) {
  return (
    <text
      fontSize={size}
      fill={SUIT_COLORS[suit]}
      textAnchor="middle"
      dominantBaseline="central"
      style={{ transform: rotate ? 'rotate(180deg)' : undefined, transformOrigin: 'center', userSelect: 'none' }}>
      {SUIT_SYMBOLS[suit]}
    </text>
  );
}

export function PlayingCard({
  card,
  size = 'md',
  selected = false,
  playable = false,
  disabled = false,
  onClick,
  onDoubleClick,
  className = '',
  style,
}: PlayingCardProps) {
  const { width, height, rankSize, suitSize, centerSize } = SIZES[size];
  const { suit, rank } = card;
  const color = SUIT_COLORS[suit];
  const symbol = SUIT_SYMBOLS[suit];
  const isRed = suit === 'hearts' || suit === 'diamonds';

  const classNames = [
    'playing-card',
    selected ? 'selected' : '',
    playable && !selected ? 'playable' : '',
    disabled ? 'disabled' : '',
    className,
  ].filter(Boolean).join(' ');

  const faceCards = ['J', 'Q', 'K'] as Rank[];
  const isFaceCard = faceCards.includes(rank);
  const isAce = rank === 'A';
  const pips = PIP_POSITIONS[rank];

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={classNames}
      onClick={disabled ? undefined : onClick}
      onDoubleClick={disabled ? undefined : onDoubleClick}
      style={style}
      role={onClick ? 'button' : undefined}
      aria-label={`${rank} of ${suit}`}>

      {/* Card background */}
      <rect x="0" y="0" width={width} height={height} rx="6" ry="6" fill="white" />

      {/* Top-left rank + suit */}
      <text x="5" y={rankSize + 2} fontSize={rankSize} fill={color} fontWeight="bold" fontFamily="Georgia, serif">
        {rank}
      </text>
      <text x="5" y={rankSize + suitSize + 2} fontSize={suitSize} fill={color} textAnchor="start" fontFamily="Arial">
        {symbol}
      </text>

      {/* Bottom-right rank + suit (rotated) */}
      <g transform={`translate(${width}, ${height}) rotate(180)`}>
        <text x="5" y={rankSize + 2} fontSize={rankSize} fill={color} fontWeight="bold" fontFamily="Georgia, serif">
          {rank}
        </text>
        <text x="5" y={rankSize + suitSize + 2} fontSize={suitSize} fill={color} textAnchor="start" fontFamily="Arial">
          {symbol}
        </text>
      </g>

      {/* Center content */}
      {isAce && (
        <text
          x={width / 2}
          y={height / 2}
          fontSize={centerSize * 1.5}
          fill={color}
          textAnchor="middle"
          dominantBaseline="central"
          fontFamily="Arial">
          {symbol}
        </text>
      )}

      {isFaceCard && (
        <>
          {/* Face card: decorative letter in center */}
          <rect x={width * 0.2} y={height * 0.2} width={width * 0.6} height={height * 0.6}
            rx="4" fill={isRed ? '#fef2f2' : '#f8fafc'} stroke={color} strokeWidth="1.5" />
          <text
            x={width / 2}
            y={height / 2}
            fontSize={centerSize * 1.2}
            fill={color}
            textAnchor="middle"
            dominantBaseline="central"
            fontWeight="bold"
            fontFamily="Georgia, serif">
            {rank}
          </text>
          <text
            x={width / 2}
            y={height * 0.28}
            fontSize={suitSize}
            fill={color}
            textAnchor="middle"
            dominantBaseline="central"
            fontFamily="Arial">
            {symbol}
          </text>
          <text
            x={width / 2}
            y={height * 0.72}
            fontSize={suitSize}
            fill={color}
            textAnchor="middle"
            dominantBaseline="central"
            fontFamily="Arial">
            {symbol}
          </text>
        </>
      )}

      {pips && pips.map((pos, i) => (
        <g key={i} transform={`translate(${width * pos.x / 100}, ${height * pos.y / 100})`}>
          <text
            fontSize={suitSize - 2}
            fill={color}
            textAnchor="middle"
            dominantBaseline="central"
            fontFamily="Arial">
            {symbol}
          </text>
        </g>
      ))}

      {/* Selected highlight */}
      {selected && (
        <rect x="1" y="1" width={width - 2} height={height - 2} rx="5" ry="5"
          fill="none" stroke="#ffd700" strokeWidth="3" opacity="0.8" />
      )}
    </svg>
  );
}
