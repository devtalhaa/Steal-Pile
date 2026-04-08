import { Deck } from './Deck';
import {
  Card, Rank, GamePhase, TurnPhase, RoomSettings,
  ClientGameState, ClientPlayerView, GameAction, StolenPileInfo,
  RoundResult, ServerPlayerState,
} from './types';

const TURN_TIMER_MS = 30_000;

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
  private netOwing: number = 0;
  private settings: RoomSettings;
  private lastAction?: GameAction;
  private lastRoundResult?: RoundResult;
  private teamAPile: Card[] = [];
  private teamBPile: Card[] = [];
  private turnTimer: ReturnType<typeof setTimeout> | null = null;
  private turnEndsAt: number | null = null;
  private onTurnTimeout: ((playerId: string) => void) | null = null;

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
    this.clearTurnTimer();
    this.deck = new Deck(this.settings.deckCount);
    this.phase = 'playing';
    this.currentPlayerIndex = 0;
    this.turnPhase = 'draw';
    this.lastAction = undefined;
    this.lastRoundResult = undefined;
    this.teamAPile = [];
    this.teamBPile = [];

    for (const player of this.players.values()) {
      player.hand = [];
      player.pile = [];
    }

    this.middleCards = this.deck.draw(4);

    for (const playerId of this.turnOrder) {
      const player = this.players.get(playerId)!;
      player.hand = this.deck.draw(4);
    }

    this.assertDeckIntegrity();
  }

  private getTeamPile(team: 'A' | 'B'): Card[] {
    return team === 'A' ? this.teamAPile : this.teamBPile;
  }

  private assertDeckIntegrity(): void {
    const playerHands = [...this.players.values()].map(p => p.hand);
    if (this.settings.teamMode) {
      this.deck.assertIntegrity(playerHands, this.middleCards, [this.teamAPile, this.teamBPile]);
    } else {
      const playerPiles = [...this.players.values()].map(p => p.pile);
      this.deck.assertIntegrity(playerHands, this.middleCards, playerPiles);
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
    this.assertDeckIntegrity();
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

    const matchedMiddle = this.findMiddleMatches(rank);
    const stealTargets = this.findPileStealTargets(rank, playerId);

    const myTeamPile = this.settings.teamMode && player.team
      ? this.getTeamPile(player.team)
      : player.pile;
    const matchedSelf = myTeamPile.length > 0 && myTeamPile[myTeamPile.length - 1].rank === rank;

    const hasMatch = matchedMiddle.length > 0 || stealTargets.length > 0 || matchedSelf;

    if (hasMatch) {
      for (const mc of matchedMiddle) {
        const idx = this.middleCards.findIndex(c => c.id === mc.id);
        if (idx !== -1) this.middleCards.splice(idx, 1);
      }

      // Remove stolen cards from the source pile (team pile in team mode, player pile in free-for-all)
      for (const target of stealTargets) {
        if (this.settings.teamMode && target.fromTeam) {
          const src = this.getTeamPile(target.fromTeam);
          src.splice(src.length - target.cards.length, target.cards.length);
        } else if (target.fromPlayerId) {
          const targetPlayer = this.players.get(target.fromPlayerId)!;
          targetPlayer.pile.splice(targetPlayer.pile.length - target.cards.length, target.cards.length);
        }
      }

      // Push won cards to shared team pile (team mode) or individual pile (free-for-all)
      const destPile = this.settings.teamMode && player.team
        ? this.getTeamPile(player.team)
        : player.pile;
      destPile.push(card);
      for (const mc of matchedMiddle) destPile.push(mc);
      for (const target of stealTargets) {
        for (const sc of target.cards) destPile.push(sc);
      }

      let actionType: GameAction['type'] = 'match_middle';
      if (matchedMiddle.length > 0 && stealTargets.length > 0) {
        actionType = 'match_and_steal';
      } else if (stealTargets.length > 0) {
        actionType = 'steal_pile';
      } else if (matchedMiddle.length === 0 && stealTargets.length === 0 && matchedSelf) {
        actionType = 'match_own';
      }

      const action: GameAction = {
        type: actionType,
        playerId,
        card,
        matchedMiddleCards: matchedMiddle.length > 0 ? matchedMiddle : undefined,
        stolenCards: stealTargets.length > 0 ? stealTargets : undefined,
      };
      this.lastAction = action;

      if (this.deck.isEmpty()) {
        this.advanceTurn();
      } else {
        this.turnPhase = 'bonus_draw';
      }

      this.assertDeckIntegrity();

      if (this.checkRoundOver()) {
        this.handleRoundOver();
      }

      return { success: true, action };
    } else {
      this.middleCards.push(card);

      const action: GameAction = {
        type: 'play_to_middle',
        playerId,
        card,
      };
      this.lastAction = action;

      this.advanceTurn();
      this.assertDeckIntegrity();

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
    const currentPlayer = this.players.get(excludePlayerId)!;

    if (this.settings.teamMode && currentPlayer.team) {
      const opponentTeam: 'A' | 'B' = currentPlayer.team === 'A' ? 'B' : 'A';
      const opponentPile = this.getTeamPile(opponentTeam);

      const stolen: Card[] = [];
      for (let i = opponentPile.length - 1; i >= 0; i--) {
        if (opponentPile[i].rank === rank) {
          stolen.push(opponentPile[i]);
        } else {
          break;
        }
      }

      return stolen.length > 0 ? [{ fromTeam: opponentTeam, cards: stolen }] : [];
    }

    const targets: StolenPileInfo[] = [];
    for (const [pid, player] of this.players) {
      if (pid === excludePlayerId || player.pile.length === 0) continue;

      const stolen: Card[] = [];
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
    this.clearTurnTimer();
    const scores = this.calculateScores();
    const result = this.calculateRoundResult(scores);
    this.lastRoundResult = result;

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
    if (this.settings.teamMode) {
      const scores: Record<string, number> = {};
      const teamAPoints = this.teamAPile.reduce((s, c) => s + this.getCardPoints(c), 0);
      const teamBPoints = this.teamBPile.reduce((s, c) => s + this.getCardPoints(c), 0);
      for (const [pid, player] of this.players) {
        scores[pid] = player.team === 'A' ? teamAPoints : teamBPoints;
      }
      return scores;
    }
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

      const roundDiff = teamScores.A - teamScores.B;
      this.netOwing += roundDiff;

      const isGameOver = Math.abs(this.netOwing) >= this.settings.targetScore;
      const winnerTeam = isGameOver ? (this.netOwing > 0 ? 'A' : 'B') : undefined;
      const loserTeam = isGameOver ? (this.netOwing > 0 ? 'B' : 'A') : undefined;

      return {
        scores,
        teamScores,
        netOwing: this.netOwing,
        roundNumber: this.roundNumber,
        isGameOver,
        winnerTeam,
        loserTeam,
        teamPiles: {
          A: [...this.teamAPile],
          B: [...this.teamBPile],
        },
      };
    } else {
      let maxScore = -1;
      let winnerId = '';
      for (const [pid, score] of Object.entries(scores)) {
        if (score > maxScore) {
          maxScore = score;
          winnerId = pid;
        }
      }

      const playerPiles: Record<string, Card[]> = {};
      for (const [pid, player] of this.players) {
        playerPiles[pid] = [...player.pile];
      }

      return {
        scores,
        roundNumber: this.roundNumber,
        isGameOver: true,
        winnerPlayerId: winnerId,
        playerPiles,
      };
    }
  }

  getRoundResult(): RoundResult {
    if (!this.lastRoundResult) {
      throw new Error('getRoundResult called before round has ended — lastRoundResult is undefined');
    }
    return this.lastRoundResult;
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
      teamAPileTop: this.settings.teamMode
        ? (this.teamAPile.length > 0 ? this.teamAPile[this.teamAPile.length - 1] : null)
        : undefined,
      teamAPileCount: this.settings.teamMode ? this.teamAPile.length : undefined,
      teamBPileTop: this.settings.teamMode
        ? (this.teamBPile.length > 0 ? this.teamBPile[this.teamBPile.length - 1] : null)
        : undefined,
      teamBPileCount: this.settings.teamMode ? this.teamBPile.length : undefined,
      turnEndsAt: this.turnEndsAt,
    };
  }

  getPlayerIds(): string[] {
    return [...this.turnOrder];
  }

  // ============ TURN TIMER ============

  setTurnTimeoutCallback(cb: (playerId: string) => void): void {
    this.onTurnTimeout = cb;
  }

  startTurnTimer(): void {
    this.clearTurnTimer();
    if (this.phase !== 'playing') return;

    const playerId = this.getCurrentPlayerId();
    const player = this.players.get(playerId);
    if (!player) return;

    // Don't start timer if player has no cards and can't draw
    if (player.hand.length === 0 && this.deck.isEmpty()) return;

    this.turnEndsAt = Date.now() + TURN_TIMER_MS;

    this.turnTimer = setTimeout(() => {
      this.turnTimer = null;
      this.turnEndsAt = null;
      if (this.onTurnTimeout) {
        this.onTurnTimeout(playerId);
      }
    }, TURN_TIMER_MS);
  }

  clearTurnTimer(): void {
    if (this.turnTimer) {
      clearTimeout(this.turnTimer);
      this.turnTimer = null;
    }
    this.turnEndsAt = null;
  }

  getRandomCardFromHand(playerId: string): string | null {
    const player = this.players.get(playerId);
    if (!player || player.hand.length === 0) return null;
    const randomIndex = Math.floor(Math.random() * player.hand.length);
    return player.hand[randomIndex].id;
  }

  skipCurrentPlayer(): void {
    if (this.phase !== 'playing') return;
    this.advanceTurn();
  }

  replacePlayerId(oldId: string, newId: string): boolean {
    const player = this.players.get(oldId);
    if (!player) return false;

    player.id = newId;
    player.isConnected = true;
    this.players.delete(oldId);
    this.players.set(newId, player);

    const turnIdx = this.turnOrder.indexOf(oldId);
    if (turnIdx !== -1) this.turnOrder[turnIdx] = newId;

    return true;
  }
}
