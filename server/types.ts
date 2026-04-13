// Re-export shared types for server use
export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';

export interface Card {
  id: string;
  suit: Suit;
  rank: Rank;
  deckIndex: number;
}

export interface RoomSettings {
  deckCount: 1 | 2;
  teamMode: boolean;
  targetScore: number;
  maxPlayers: number;
}

export interface RoomPlayer {
  id: string;
  name: string;
  team?: 'A' | 'B';
  isBot?: boolean;
}

export interface RoomState {
  code: string;
  hostId: string;
  players: RoomPlayer[];
  settings: RoomSettings;
  status: 'lobby' | 'in_game';
}

export type GamePhase = 'playing' | 'round_over' | 'game_over';
export type TurnPhase = 'draw' | 'play' | 'bonus_draw' | 'bonus_play' | 'ended';

export interface ClientPlayerView {
  id: string;
  name: string;
  handCount: number;
  pileTop: Card | null;
  pileCount: number;
  team?: 'A' | 'B';
  isConnected: boolean;
  seatIndex: number;
  isBot?: boolean;
}

export interface ClientGameState {
  phase: GamePhase;
  turnPhase: TurnPhase;
  currentPlayerId: string;
  myHand: Card[];
  players: ClientPlayerView[];
  middleCards: Card[];
  drawPileCount: number;
  scores: Record<string, number>;
  teamScores?: { A: number; B: number };
  netOwing?: number;
  roundNumber: number;
  targetScore?: number;
  lastAction?: GameAction;
  deckEmpty: boolean;
  teamAPileTop?: Card | null;
  teamAPileCount?: number;
  teamBPileTop?: Card | null;
  teamBPileCount?: number;
  turnEndsAt: number | null;
}

export interface GameAction {
  type: 'draw' | 'play_to_middle' | 'match_middle' | 'steal_pile' | 'match_and_steal' | 'match_own' | 'round_over' | 'game_over';
  playerId: string;
  card?: Card;
  matchedMiddleCards?: Card[];
  stolenCards?: StolenPileInfo[];
  targetPlayerId?: string;
  autoPlayed?: boolean;
}

export interface StolenPileInfo {
  fromPlayerId?: string;
  fromTeam?: 'A' | 'B';
  cards: Card[];
}

export interface RoundResult {
  scores: Record<string, number>;
  teamScores?: { A: number; B: number };
  netOwing?: number;
  roundNumber: number;
  isGameOver: boolean;
  winnerTeam?: 'A' | 'B';
  loserTeam?: 'A' | 'B';
  winnerPlayerId?: string;
  playerPiles?: Record<string, Card[]>;
  teamPiles?: { A: Card[]; B: Card[] };
}

// Server-only types
export interface ServerPlayerState {
  id: string;
  name: string;
  hand: Card[];
  pile: Card[];
  team?: 'A' | 'B';
  seatIndex: number;
  isConnected: boolean;
  socketId?: string; // missing in previous or added now for bots it's empty
  isBot?: boolean;
}

