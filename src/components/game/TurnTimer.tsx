'use client';

import React, { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';

interface TurnTimerProps {
  isMyTurn: boolean;
  currentPlayerId: string;
  roundNumber: number;
  turnPhase: string;
}

const TURN_DURATION = 20;

export function TurnTimer({ isMyTurn, currentPlayerId, roundNumber, turnPhase }: TurnTimerProps) {
  const [timeLeft, setTimeLeft] = useState(TURN_DURATION);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    startTimeRef.current = Date.now();
    setTimeLeft(TURN_DURATION);

    if (intervalRef.current) clearInterval(intervalRef.current);

    intervalRef.current = setInterval(() => {
      const elapsed = (Date.now() - startTimeRef.current) / 1000;
      const remaining = Math.max(0, TURN_DURATION - elapsed);
      setTimeLeft(remaining);

      if (remaining <= 0 && intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }, 50);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [currentPlayerId, roundNumber]);

  const progress = timeLeft / TURN_DURATION;
  const circumference = 2 * Math.PI * 18;
  const strokeDashoffset = circumference * (1 - progress);

  const isUrgent = timeLeft <= 5;
  const isCritical = timeLeft <= 3;

  const strokeColor = isCritical
    ? '#ef4444'
    : isUrgent
      ? '#f59e0b'
      : isMyTurn
        ? '#22c55e'
        : '#60a5fa';

  const bgColor = isCritical
    ? 'rgba(239,68,68,0.15)'
    : isUrgent
      ? 'rgba(245,158,11,0.1)'
      : 'rgba(0,0,0,0.5)';

  return (
    <motion.div
      className="flex items-center gap-1.5 px-2 py-1 rounded-full"
      style={{
        background: bgColor,
        border: `1px solid ${isCritical ? 'rgba(239,68,68,0.4)' : isUrgent ? 'rgba(245,158,11,0.3)' : 'rgba(255,255,255,0.1)'}`,
      }}
      animate={isCritical ? { scale: [1, 1.05, 1] } : {}}
      transition={isCritical ? { duration: 0.5, repeat: Infinity } : {}}
    >
      <svg width="22" height="22" viewBox="0 0 40 40" className="flex-shrink-0">
        <circle
          cx="20" cy="20" r="18"
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth="3"
        />
        <circle
          cx="20" cy="20" r="18"
          fill="none"
          stroke={strokeColor}
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          transform="rotate(-90 20 20)"
          style={{ transition: 'stroke-dashoffset 0.1s linear, stroke 0.3s ease' }}
        />
      </svg>
      <span
        className="text-xs font-bold tabular-nums min-w-[20px] text-center"
        style={{ color: strokeColor }}
      >
        {Math.ceil(timeLeft)}
      </span>
    </motion.div>
  );
}
