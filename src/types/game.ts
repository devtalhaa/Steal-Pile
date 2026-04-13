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
  isBot?: boolean;
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
  netOwing?: number;            // positive = Team B owes A, negative = A owes B
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
  'presence:online-users': (users: string[]) => void;
  'game:receive-invite': (data: { roomCode: string; fromName: string }) => void;
  'auth:success': () => void;
  'auth:error': (data: { message: string }) => void;
  'admin:kicked': () => void;
  'game:lenter-lock': (message: string) => void;
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
  'room:add-bot': (data: { code: string }) => void;
  'game:draw': () => void;
  'game:play-card': (data: { cardId: string }) => void;
  'game:next-round': () => void;
  'game:reconnect': (
    data: { code: string; playerName: string },
    callback: (res: { ok: true; room: RoomState; gameState?: ClientGameState } | { ok: false; error: string }) => void
  ) => void;
  'auth:authenticate': (data: { token: string }) => void;
  'game:invite': (data: { targetUid: string; fromName?: string | null }) => void;
  'admin:login': (
    data: { email: string; pass: string },
    callback: (res: { ok: true } | { ok: false; error: string }) => void
  ) => void;
  'admin:get-all-data': (
    callback: (res: { ok: true; users: any[]; rooms: any[] } | { ok: false; error: string }) => void
  ) => void;
  'admin:delete-user': (
    data: { uid: string },
    callback: (res: { ok: true } | { ok: false; error: string }) => void
  ) => void;
  'admin:kick-player': (
    data: { roomCode: string; playerId: string },
    callback: (res: { ok: true } | { ok: false; error: string }) => void
  ) => void;
  'admin:swap-player': (
    data: { roomCode: string; oldPlayerId: string; targetUid: string },
    callback: (res: { ok: true } | { ok: false; error: string }) => void
  ) => void;
  'admin:remove-friend': (
    data: { userUid: string; friendUid: string },
    callback: (res: { ok: true } | { ok: false; error: string }) => void
  ) => void;
  'social:send-request': (
    data: { targetShortId: string },
    callback: (res: { ok: true; username?: string; targetUid?: string } | { ok: false; error: string }) => void
  ) => void;
  'social:cancel-request': (
    data: { targetUid: string },
    callback: (res: { ok: true } | { ok: false; error: string }) => void
  ) => void;
  'social:accept-request': (
    data: { targetUid: string },
    callback: (res: { ok: true } | { ok: false; error: string }) => void
  ) => void;
  'social:decline-request': (
    data: { targetUid: string },
    callback: (res: { ok: true } | { ok: false; error: string }) => void
  ) => void;
  'social:unfriend': (
    data: { targetUid: string },
    callback: (res: { ok: true } | { ok: false; error: string }) => void
  ) => void;
}
