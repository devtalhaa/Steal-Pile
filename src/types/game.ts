// ============ CARD TYPES ============
export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';

export interface Card {
  id: string;         // Unique: "hearts-7-0" (suit-rank-deckIndex)
  suit: Suit;
  rank: Rank;
  deckIndex: number;  // 0 for single deck, 0|1 for double
}

// ============ ROOM TYPES ============
export interface RoomSettings {
  deckCount: 1 | 2;
  teamMode: boolean;
  targetScore: number;    // Team mode: score limit (e.g., 30)
  maxPlayers: number;     // 2-8
}

export interface RoomPlayer {
  id: string;
  name: string;
  team?: 'A' | 'B';
}

export interface RoomState {
  code: string;
  hostId: string;
  players: RoomPlayer[];
  settings: RoomSettings;
  status: 'lobby' | 'in_game';
}

// ============ GAME STATE TYPES ============
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
  netOwing?: number;            // positive = Team B owes A, negative = A owes B
  roundNumber: number;
  targetScore?: number;
  lastAction?: GameAction;
  deckEmpty: boolean;
}

export interface GameAction {
  type: 'draw' | 'play_to_middle' | 'match_middle' | 'steal_pile' | 'match_and_steal' | 'round_over' | 'game_over';
  playerId: string;
  card?: Card;
  matchedMiddleCards?: Card[];
  stolenCards?: StolenPileInfo[];
  targetPlayerId?: string;
}

export interface StolenPileInfo {
  fromPlayerId: string;
  cards: Card[];
}

export interface RoundResult {
  scores: Record<string, number>;
  teamScores?: { A: number; B: number };
  netOwing?: number;
  roundNumber: number;
  isGameOver: boolean;
  winnerTeam?: 'A' | 'B';
  winnerPlayerId?: string;
}

// ============ SOCKET EVENT TYPES ============
export interface ServerToClientEvents {
  'room:state': (room: RoomState) => void;
  'room:error': (data: { message: string }) => void;
  'game:state': (state: ClientGameState) => void;
  'game:action': (action: GameAction) => void;
  'game:your-turn': () => void;
  'game:round-over': (result: RoundResult) => void;
  'game:over': (result: RoundResult) => void;
  'game:error': (data: { message: string }) => void;
  'player:disconnected': (data: { id: string; name: string }) => void;
  'player:reconnected': (data: { id: string; name: string }) => void;
}

export interface ClientToServerEvents {
  'room:create': (
    data: { playerName: string; settings: RoomSettings },
    callback: (res: { ok: true; code: string } | { ok: false; error: string }) => void
  ) => void;
  'room:join': (
    data: { code: string; playerName: string },
    callback: (res: { ok: true; room: RoomState } | { ok: false; error: string }) => void
  ) => void;
  'room:update-settings': (data: { settings: Partial<RoomSettings> }) => void;
  'room:assign-teams': (data: { assignments: Record<string, 'A' | 'B'> }) => void;
  'room:start': (
    callback: (res: { ok: true } | { ok: false; error: string }) => void
  ) => void;
  'room:leave': () => void;
  'game:draw': () => void;
  'game:play-card': (data: { cardId: string }) => void;
  'game:next-round': () => void;
}
