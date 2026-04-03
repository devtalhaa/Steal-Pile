import { Deck } from './Deck';
import {
  Card, Rank, GamePhase, TurnPhase, RoomSettings,
  ClientGameState, ClientPlayerView, GameAction, StolenPileInfo,
  RoundResult, ServerPlayerState,
} from './types';

interface PlayerInit {
  id: string;
  name: string;
  team?: 'A' | 'B';
  seatIndex: number;
}

export class GameEngine {
  private phase: GamePhase = 'playing';
  private turnPhase: TurnPhase = 'draw';
  private deck!: Deck;
  private middleCards: Card[] = [];
  private players: Map<string, ServerPlayerState> = new Map();
  private turnOrder: string[] = [];
  private currentPlayerIndex: number = 0;
  private roundNumber: number = 1;
  private netOwing: number = 0; // positive = B owes A
  private settings: RoomSettings;
  private lastAction?: GameAction;

  constructor(playerInits: PlayerInit[], settings: RoomSettings) {
    this.settings = settings;
    // Sort by seatIndex to establish turn order
    const sorted = [...playerInits].sort((a, b) => a.seatIndex - b.seatIndex);
    for (const p of sorted) {
      this.players.set(p.id, {
        id: p.id,
        name: p.name,
        hand: [],
        pile: [],
        team: p.team,
        seatIndex: p.seatIndex,
        isConnected: true,
      });
      this.turnOrder.push(p.id);
    }
    this.startRound();
  }

  startRound(): void {
    this.deck = new Deck(this.settings.deckCount);
    this.middleCards = [];
    this.phase = 'playing';
    this.currentPlayerIndex = 0;
    this.turnPhase = 'draw';
    this.lastAction = undefined;

    // Clear all players' hands and piles
    for (const player of this.players.values()) {
      player.hand = [];
      player.pile = [];
    }

    // Deal 4 cards face-up to the middle
    this.middleCards = this.deck.draw(4);

    // Deal 4 cards to each player
    for (const playerId of this.turnOrder) {
      const player = this.players.get(playerId)!;
      player.hand = this.deck.draw(4);
    }
  }

  drawCard(playerId: string): { success: boolean; error?: string } {
    if (this.phase !== 'playing') {
      return { success: false, error: 'Game is not in playing phase' };
    }
    if (this.getCurrentPlayerId() !== playerId) {
      return { success: false, error: 'Not your turn' };
    }
    if (this.turnPhase !== 'draw' && this.turnPhase !== 'bonus_draw') {
      return { success: false, error: 'Not in draw phase' };
    }
    if (this.deck.isEmpty()) {
      // When deck is empty, skip draw and go straight to play
      this.turnPhase = this.turnPhase === 'draw' ? 'play' : 'bonus_play';
      return { success: false, error: 'Deck is empty, play a card from your hand' };
    }

    const card = this.deck.drawOne()!;
    const player = this.players.get(playerId)!;
    player.hand.push(card);

    this.lastAction = {
      type: 'draw',
      playerId,
      card,
    };

    this.turnPhase = this.turnPhase === 'draw' ? 'play' : 'bonus_play';
    return { success: true };
  }

  playCard(playerId: string, cardId: string): { success: boolean; action?: GameAction; error?: string } {
    if (this.phase !== 'playing') {
      return { success: false, error: 'Game is not in playing phase' };
    }
    if (this.getCurrentPlayerId() !== playerId) {
      return { success: false, error: 'Not your turn' };
    }
    if (this.turnPhase !== 'play' && this.turnPhase !== 'bonus_play') {
      return { success: false, error: 'Not in play phase' };
    }

    const player = this.players.get(playerId)!;
    const cardIndex = player.hand.findIndex(c => c.id === cardId);
    if (cardIndex === -1) {
      return { success: false, error: 'Card not in your hand' };
    }

    const card = player.hand.splice(cardIndex, 1)[0];
    const rank = card.rank;

    // Find all matching middle cards
    const matchedMiddle = this.findMiddleMatches(rank);

    // Find all opponent pile steal targets
    const stealTargets = this.findPileStealTargets(rank, playerId);

    // Also check teammate piles in non-team mode (steal from anyone except yourself)
    // In team mode, you can still steal from teammates if their pile top matches
    // Actually, re-reading the rules - you steal from opponent piles only
    // But let's keep it as: steal from anyone who isn't you

    const hasMatch = matchedMiddle.length > 0 || stealTargets.length > 0;

    if (hasMatch) {
      // Remove matched cards from middle
      for (const mc of matchedMiddle) {
        const idx = this.middleCards.findIndex(c => c.id === mc.id);
        if (idx !== -1) this.middleCards.splice(idx, 1);
      }

      // Remove stolen cards from opponent piles
      for (const target of stealTargets) {
        const targetPlayer = this.players.get(target.fromPlayerId)!;
        // Remove from top of pile (end of array)
        targetPlayer.pile.splice(targetPlayer.pile.length - target.cards.length, target.cards.length);
      }

      // Add everything to player's pile: played card + matched middle + stolen cards
      player.pile.push(card);
      for (const mc of matchedMiddle) {
        player.pile.push(mc);
      }
      for (const target of stealTargets) {
        for (const sc of target.cards) {
          player.pile.push(sc);
        }
      }

      // Determine action type
      let actionType: GameAction['type'] = 'match_middle';
      if (matchedMiddle.length > 0 && stealTargets.length > 0) {
        actionType = 'match_and_steal';
      } else if (stealTargets.length > 0) {
        actionType = 'steal_pile';
      }

      const action: GameAction = {
        type: actionType,
        playerId,
        card,
        matchedMiddleCards: matchedMiddle.length > 0 ? matchedMiddle : undefined,
        stolenCards: stealTargets.length > 0 ? stealTargets : undefined,
      };
      this.lastAction = action;

      // Check if deck is empty - if so, no bonus draw, turn ends
      if (this.deck.isEmpty()) {
        this.advanceTurn();
      } else {
        // Bonus draw!
        this.turnPhase = 'bonus_draw';
      }

      // Check round over
      if (this.checkRoundOver()) {
        this.handleRoundOver();
      }

      return { success: true, action };
    } else {
      // No match - card goes to middle
      this.middleCards.push(card);

      const action: GameAction = {
        type: 'play_to_middle',
        playerId,
        card,
      };
      this.lastAction = action;

      this.advanceTurn();

      // Check round over
      if (this.checkRoundOver()) {
        this.handleRoundOver();
      }

      return { success: true, action };
    }
  }

  private findMiddleMatches(rank: Rank): Card[] {
    return this.middleCards.filter(c => c.rank === rank);
  }

  private findPileStealTargets(rank: Rank, excludePlayerId: string): StolenPileInfo[] {
    const targets: StolenPileInfo[] = [];

    for (const [pid, player] of this.players) {
      if (pid === excludePlayerId || player.pile.length === 0) continue;

      // In team mode, only steal from opponents (different team)
      const currentPlayer = this.players.get(excludePlayerId)!;
      if (this.settings.teamMode && player.team === currentPlayer.team) continue;

      const stolen: Card[] = [];
      // Scan from top (end of array) downward for consecutive matching cards
      for (let i = player.pile.length - 1; i >= 0; i--) {
        if (player.pile[i].rank === rank) {
          stolen.push(player.pile[i]);
        } else {
          break;
        }
      }

      if (stolen.length > 0) {
        targets.push({ fromPlayerId: pid, cards: stolen });
      }
    }

    return targets;
  }

  private advanceTurn(): void {
    this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.turnOrder.length;
    // Skip disconnected players
    let attempts = 0;
    while (!this.players.get(this.turnOrder[this.currentPlayerIndex])!.isConnected && attempts < this.turnOrder.length) {
      this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.turnOrder.length;
      attempts++;
    }

    if (this.deck.isEmpty()) {
      // When deck is empty, go directly to play phase (no draw)
      this.turnPhase = 'play';
    } else {
      this.turnPhase = 'draw';
    }
  }

  private checkRoundOver(): boolean {
    if (!this.deck.isEmpty()) return false;

    // Round ends when deck is empty AND all players have empty hands
    for (const player of this.players.values()) {
      if (player.hand.length > 0) return false;
    }
    return true;
  }

  private handleRoundOver(): void {
    const scores = this.calculateScores();
    const result = this.calculateRoundResult(scores);

    if (result.isGameOver) {
      this.phase = 'game_over';
    } else {
      this.phase = 'round_over';
    }

    this.lastAction = {
      type: result.isGameOver ? 'game_over' : 'round_over',
      playerId: '',
    };
  }

  nextRound(): void {
    if (this.phase !== 'round_over') return;
    this.roundNumber++;
    this.startRound();
  }

  private calculateScores(): Record<string, number> {
    const scores: Record<string, number> = {};
    for (const [pid, player] of this.players) {
      let score = 0;
      for (const card of player.pile) {
        score += this.getCardPoints(card);
      }
      scores[pid] = score;
    }
    return scores;
  }

  private getCardPoints(card: Card): number {
    const rank = card.rank;
    if (['2', '3', '4', '5', '6', '7', '8', '9'].includes(rank)) return 0.5;
    if (['10', 'J', 'Q', 'K'].includes(rank)) return 1;
    if (rank === 'A') return 2;
    return 0;
  }

  private calculateRoundResult(scores: Record<string, number>): RoundResult {
    if (this.settings.teamMode) {
      const teamScores: { A: number; B: number } = { A: 0, B: 0 };
      for (const [pid, score] of Object.entries(scores)) {
        const player = this.players.get(pid)!;
        if (player.team === 'A') teamScores.A += score;
        else if (player.team === 'B') teamScores.B += score;
      }

      // Update owing: positive = B owes A
      this.netOwing += (teamScores.A - teamScores.B);

      const isGameOver = Math.abs(this.netOwing) >= this.settings.targetScore;
      const winnerTeam = isGameOver ? (this.netOwing > 0 ? 'A' : 'B') : undefined;

      return {
        scores,
        teamScores,
        netOwing: this.netOwing,
        roundNumber: this.roundNumber,
        isGameOver,
        winnerTeam,
      };
    } else {
      // Solo mode - just find highest scorer
      let maxScore = -1;
      let winnerId = '';
      for (const [pid, score] of Object.entries(scores)) {
        if (score > maxScore) {
          maxScore = score;
          winnerId = pid;
        }
      }

      return {
        scores,
        roundNumber: this.roundNumber,
        isGameOver: true, // Solo is always single round
        winnerPlayerId: winnerId,
      };
    }
  }

  getRoundResult(): RoundResult {
    const scores = this.calculateScores();
    return this.calculateRoundResult(scores);
  }

  getCurrentPlayerId(): string {
    return this.turnOrder[this.currentPlayerIndex];
  }

  getPhase(): GamePhase {
    return this.phase;
  }

  getTurnPhase(): TurnPhase {
    return this.turnPhase;
  }

  setPlayerConnected(playerId: string, connected: boolean): void {
    const player = this.players.get(playerId);
    if (player) player.isConnected = connected;
  }

  getClientState(forPlayerId: string): ClientGameState {
    const players: ClientPlayerView[] = [];
    for (const [pid, player] of this.players) {
      players.push({
        id: pid,
        name: player.name,
        handCount: player.hand.length,
        pileTop: player.pile.length > 0 ? player.pile[player.pile.length - 1] : null,
        pileCount: player.pile.length,
        team: player.team,
        isConnected: player.isConnected,
        seatIndex: player.seatIndex,
      });
    }

    const myPlayer = this.players.get(forPlayerId);
    const scores = this.calculateScores();

    let teamScores: { A: number; B: number } | undefined;
    if (this.settings.teamMode) {
      teamScores = { A: 0, B: 0 };
      for (const [pid, score] of Object.entries(scores)) {
        const p = this.players.get(pid)!;
        if (p.team === 'A') teamScores.A += score;
        else if (p.team === 'B') teamScores.B += score;
      }
    }

    return {
      phase: this.phase,
      turnPhase: this.turnPhase,
      currentPlayerId: this.getCurrentPlayerId(),
      myHand: myPlayer ? [...myPlayer.hand] : [],
      players,
      middleCards: [...this.middleCards],
      drawPileCount: this.deck.remaining(),
      scores,
      teamScores,
      netOwing: this.settings.teamMode ? this.netOwing : undefined,
      roundNumber: this.roundNumber,
      targetScore: this.settings.teamMode ? this.settings.targetScore : undefined,
      lastAction: this.lastAction,
      deckEmpty: this.deck.isEmpty(),
    };
  }

  getPlayerIds(): string[] {
    return [...this.turnOrder];
  }
}
