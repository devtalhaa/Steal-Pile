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

export const getTableThemeStyles = (theme: string) => {
  switch (theme) {
    case 'vintage-wood':
      return {
        tableEdgeColor: '#3a1a08',
        tableBg: `radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0.1), rgba(0,0,0,0.8)), repeating-linear-gradient(90deg, #5c3116, #5c3116 2px, #42200b 2px, #42200b 16px)`,
        outerSpace: '#0c0501'
      };
    case 'cyberpunk-neon':
      return {
        tableEdgeColor: '#ec4899',
        tableBg: `radial-gradient(ellipse at center, rgba(147, 51, 234, 0.15) 0%, #000000 100%), repeating-linear-gradient(0deg, transparent, transparent 19px, rgba(236, 72, 153, 0.1) 19px, rgba(236, 72, 153, 0.1) 20px), repeating-linear-gradient(90deg, transparent, transparent 19px, rgba(14, 165, 233, 0.1) 19px, rgba(14, 165, 233, 0.1) 20px), #050010`,
        outerSpace: '#000000'
      };
    case 'marble-highroller':
      return {
        tableEdgeColor: '#eab308',
        tableBg: `radial-gradient(ellipse at 50% 40%, #e2e8f0 0%, #94a3b8 100%)`,
        outerSpace: '#1e293b'
      };
    case 'obsidian-hex':
      return {
        tableEdgeColor: '#171717',
        tableBg: `radial-gradient(ellipse at 50% 50%, #1a1a1a 0%, #050505 100%), repeating-linear-gradient(60deg, transparent, transparent 15px, rgba(255,255,255,0.03) 15px, rgba(255,255,255,0.03) 16px), repeating-linear-gradient(-60deg, transparent, transparent 15px, rgba(255,255,255,0.03) 15px, rgba(255,255,255,0.03) 16px)`,
        outerSpace: '#000000'
      };
    case 'abyssal-carbon':
      return {
        tableEdgeColor: '#1e293b',
        tableBg: `radial-gradient(ellipse at 50% 40%, rgba(30, 41, 59, 0.4) 0%, rgba(2, 6, 23, 0.9) 100%), repeating-linear-gradient(45deg, #020617, #020617 4px, #0b1120 4px, #0b1120 8px)`,
        outerSpace: '#01040f'
      };
    case 'crimson-shadow':
      return {
        tableEdgeColor: '#3a0000',
        tableBg: `radial-gradient(ellipse at 50% 40%, #200000 0%, #0a0000 50%, #000000 100%)`,
        outerSpace: '#050000'
      };
    case 'royal-burgundy':
      return {
        tableEdgeColor: '#3a0210',
        tableBg: 'radial-gradient(ellipse at 50% 40%, #9f1239 0%, #4c0519 50%, #22020b 100%)',
        outerSpace: '#120106'
      };
    case 'midnight-blue':
      return {
        tableEdgeColor: '#030b20',
        tableBg: 'radial-gradient(ellipse at 50% 40%, #1e3a8a 0%, #07132b 50%, #020617 100%)',
        outerSpace: '#01030a'
      };
    case 'noir-black':
      return {
        tableEdgeColor: '#111',
        tableBg: 'radial-gradient(ellipse at 50% 40%, #27272a 0%, #09090b 50%, #000000 100%)',
        outerSpace: '#000000'
      };
    case 'classic-green':
    default:
      return {
        tableEdgeColor: '#2d1a00',
        tableBg: 'radial-gradient(ellipse at 50% 40%, #166534 0%, #0d5016 50%, #052e0a 100%)',
        outerSpace: '#052e0a'
      };
  }
};
