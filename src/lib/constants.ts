import { Suit, Rank } from '@/types/game';

export const SUIT_SYMBOLS: Record<Suit, string> = {
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
  spades: '♠',
};

export const SUIT_COLORS: Record<Suit, string> = {
  hearts: '#DC2626',
  diamonds: '#DC2626',
  clubs: '#1a1a2e',
  spades: '#1a1a2e',
};

export const SUIT_COLORS_LIGHT: Record<Suit, string> = {
  hearts: '#ef4444',
  diamonds: '#f87171',
  clubs: '#374151',
  spades: '#4b5563',
};

export const CARD_POINTS: Record<Rank, number> = {
  '2': 0.5,
  '3': 0.5,
  '4': 0.5,
  '5': 0.5,
  '6': 0.5,
  '7': 0.5,
  '8': 0.5,
  '9': 0.5,
  '10': 1,
  'J': 1,
  'Q': 1,
  'K': 1,
  'A': 2,
};

export const RANK_DISPLAY: Record<Rank, string> = {
  '2': '2', '3': '3', '4': '4', '5': '5',
  '6': '6', '7': '7', '8': '8', '9': '9',
  '10': '10', 'J': 'J', 'Q': 'Q', 'K': 'K', 'A': 'A',
};

export const TEAM_COLORS = {
  A: { bg: 'bg-blue-600', text: 'text-blue-100', border: 'border-blue-400', hex: '#2563eb' },
  B: { bg: 'bg-red-600', text: 'text-red-100', border: 'border-red-400', hex: '#dc2626' },
};
