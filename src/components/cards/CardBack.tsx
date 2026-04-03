'use client';

import React from 'react';

interface CardBackProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
  clickable?: boolean;
}

const SIZES = {
  sm: { width: 52, height: 74 },
  md: { width: 72, height: 100 },
  lg: { width: 90, height: 126 },
};

export function CardBack({ size = 'md', className = '', style, onClick, clickable }: CardBackProps) {
  const { width, height } = SIZES[size];

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={`playing-card ${clickable ? 'cursor-pointer' : ''} ${className}`}
      onClick={onClick}
      style={style}>

      {/* Card base */}
      <rect x="0" y="0" width={width} height={height} rx="6" ry="6" fill="#1e3a5f" />

      {/* Inner border */}
      <rect x="3" y="3" width={width - 6} height={height - 6} rx="4" ry="4"
        fill="none" stroke="rgba(212,168,67,0.5)" strokeWidth="1" />

      {/* Cross-hatch pattern */}
      <defs>
        <pattern id={`hatch-${size}`} x="0" y="0" width="8" height="8" patternUnits="userSpaceOnUse">
          <path d="M0,0 L8,8 M8,0 L0,8" stroke="rgba(255,255,255,0.07)" strokeWidth="0.8" />
        </pattern>
        <clipPath id={`clip-${size}`}>
          <rect x="4" y="4" width={width - 8} height={height - 8} rx="3" />
        </clipPath>
      </defs>
      <rect x="4" y="4" width={width - 8} height={height - 8} fill={`url(#hatch-${size})`} clipPath={`url(#clip-${size})`} />

      {/* Center diamond */}
      <g transform={`translate(${width / 2}, ${height / 2})`}>
        <polygon
          points={`0,-${height * 0.2} ${width * 0.15},0 0,${height * 0.2} -${width * 0.15},0`}
          fill="none"
          stroke="rgba(212,168,67,0.6)"
          strokeWidth="1.5"
        />
        <polygon
          points={`0,-${height * 0.12} ${width * 0.09},0 0,${height * 0.12} -${width * 0.09},0`}
          fill="rgba(212,168,67,0.15)"
          stroke="rgba(212,168,67,0.4)"
          strokeWidth="1"
        />
        {/* Center suit */}
        <text
          fontSize={width * 0.18}
          fill="rgba(212,168,67,0.7)"
          textAnchor="middle"
          dominantBaseline="central"
          fontFamily="Arial">
          ♠
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
          fill="rgba(212,168,67,0.4)" textAnchor="middle" dominantBaseline="central"
          fontFamily="Arial">
          ♦
        </text>
      ))}

      {/* Outer glow effect */}
      <rect x="0" y="0" width={width} height={height} rx="6" ry="6"
        fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
    </svg>
  );
}
