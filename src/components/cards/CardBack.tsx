import React, { useEffect, useState } from 'react';
import { useSettingsStore, CardBackStyle } from '@/store/settingsStore';

interface CardBackProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
  clickable?: boolean;
  forceStyle?: CardBackStyle; // Used for preview in settings
}

const SIZES = {
  sm: { width: 52, height: 74 },
  md: { width: 72, height: 100 },
  lg: { width: 90, height: 126 },
};

export function CardBack({ size = 'md', className = '', style, onClick, clickable, forceStyle }: CardBackProps) {
  const { width, height } = SIZES[size];
  const storedStyle = useSettingsStore(s => s.cardBack);
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  // Use classic-blue before hydration to avoid hydration mismatch, then apply real style
  const activeStyle = forceStyle || (mounted ? storedStyle : 'classic-blue');

  // Define color palettes based on style
  const palettes: Record<CardBackStyle, { bg: string; border: string; accent: string; pattern: string; centerSuit: string }> = {
    'classic-blue': {
      bg: '#1e3a5f',
      border: 'rgba(212,168,67,0.5)',
      accent: 'rgba(212,168,67,0.6)',
      pattern: 'rgba(255,255,255,0.07)',
      centerSuit: '♠'
    },
    'crimson-ruby': {
      bg: '#5f1e1e',
      border: 'rgba(255,215,0,0.5)',
      accent: 'rgba(255,215,0,0.6)',
      pattern: 'rgba(255,0,0,0.1)',
      centerSuit: '♥'
    },
    'midnight-dragon': {
      bg: '#0f172a',
      border: 'rgba(125,211,252,0.5)',
      accent: 'rgba(168,85,247,0.7)',
      pattern: 'rgba(45,212,191,0.15)',
      centerSuit: '♣'
    },
    'emerald-forest': {
      bg: '#14532d',
      border: 'rgba(167,243,208,0.4)',
      accent: 'rgba(52,211,153,0.7)',
      pattern: 'rgba(255,255,255,0.06)',
      centerSuit: '♦'
    }
  };

  const p = palettes[activeStyle];

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={`playing-card card-size-${size} ${clickable ? 'cursor-pointer hover:scale-105 transition-transform' : ''} ${className}`}
      onClick={onClick}
      style={style}>

      {/* Card base */}
      <rect x="0" y="0" width={width} height={height} rx="6" ry="6" fill={p.bg} />

      {/* Inner border */}
      <rect x="3" y="3" width={width - 6} height={height - 6} rx="4" ry="4"
        fill="none" stroke={p.border} strokeWidth="1" />

      {/* Cross-hatch pattern */}
      <defs>
        {activeStyle === 'midnight-dragon' ? (
          <pattern id={`pattern-${size}-${activeStyle}`} x="0" y="0" width="12" height="12" patternUnits="userSpaceOnUse">
             <path d="M0,6 Q3,0 6,6 T12,6 M0,12 Q3,6 6,12 T12,12" fill="none" stroke={p.pattern} strokeWidth="1" />
          </pattern>
        ) : activeStyle === 'emerald-forest' ? (
           <pattern id={`pattern-${size}-${activeStyle}`} x="0" y="0" width="10" height="10" patternUnits="userSpaceOnUse">
             <circle cx="5" cy="5" r="3" fill="none" stroke={p.pattern} strokeWidth="0.8" />
             <circle cx="0" cy="0" r="1.5" fill={p.pattern} />
             <circle cx="10" cy="10" r="1.5" fill={p.pattern} />
             <circle cx="10" cy="0" r="1.5" fill={p.pattern} />
             <circle cx="0" cy="10" r="1.5" fill={p.pattern} />
           </pattern>
        ) : activeStyle === 'crimson-ruby' ? (
          <pattern id={`pattern-${size}-${activeStyle}`} x="0" y="0" width="10" height="10" patternUnits="userSpaceOnUse">
             <path d="M5,0 L10,5 L5,10 L0,5 Z" fill="none" stroke={p.pattern} strokeWidth="1" />
          </pattern>
        ) : (
          <pattern id={`pattern-${size}-${activeStyle}`} x="0" y="0" width="8" height="8" patternUnits="userSpaceOnUse">
            <path d="M0,0 L8,8 M8,0 L0,8" stroke={p.pattern} strokeWidth="0.8" />
          </pattern>
        )}
        <clipPath id={`clip-${size}`}>
          <rect x="4" y="4" width={width - 8} height={height - 8} rx="3" />
        </clipPath>
      </defs>
      <rect x="4" y="4" width={width - 8} height={height - 8} fill={`url(#pattern-${size}-${activeStyle})`} clipPath={`url(#clip-${size})`} />

      {/* Center detail */}
      <g transform={`translate(${width / 2}, ${height / 2})`}>
        <polygon
          points={`0,-${height * 0.2} ${width * 0.15},0 0,${height * 0.2} -${width * 0.15},0`}
          fill="none"
          stroke={p.accent}
          strokeWidth="1.5"
        />
        <polygon
          points={`0,-${height * 0.12} ${width * 0.09},0 0,${height * 0.12} -${width * 0.09},0`}
          fill="rgba(255,255,255,0.05)"
          stroke={p.border}
          strokeWidth="1"
        />
        {/* Center suit */}
        <text
          fontSize={width * 0.18}
          fill={p.border}
          textAnchor="middle"
          dominantBaseline="central"
          fontFamily="Arial">
          {p.centerSuit}
        </text>
      </g>

      {/* Corner suits */}
      {[
        { x: 9, y: 9 },
        { x: width - 9, y: 9 },
        { x: 9, y: height - 9 },
        { x: width - 9, y: height - 9 },
      ].map((pos, i) => (
        <text key={i} x={pos.x} y={pos.y} fontSize={width * 0.12}
          fill={p.border} style={{ opacity: 0.6 }} textAnchor="middle" dominantBaseline="central"
          fontFamily="Arial">
          {p.centerSuit}
        </text>
      ))}

      {/* Outer glow effect */}
      <rect x="0" y="0" width={width} height={height} rx="6" ry="6"
        fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
    </svg>
  );
}
