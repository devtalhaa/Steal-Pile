import { Server } from 'socket.io';
import { GameEngine } from './GameEngine';
import { Card, Rank, RoomPlayer } from './types';
import { RoomManager } from './RoomManager';

export class BotEngine {
  static RANK_VALUES: Record<Rank, number> = {
    '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, 
    '8': 8, '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14
  };

  static async takeTurn(io: Server, roomManager: RoomManager, roomCode: string, gameEngine: GameEngine) {
    const targetPlayerId = gameEngine.getCurrentPlayerId();
    const player = gameEngine.getPlayerState(targetPlayerId);

    if (!player || !player.isBot) return;

    const phase = gameEngine.getPhase();
    if (phase !== 'playing') return;

    // Simulate thinking delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Ensure it's still their turn and the game is active
    if (gameEngine.getPhase() !== 'playing' || gameEngine.getCurrentPlayerId() !== targetPlayerId) {
      return; 
    }

    const turnPhase = gameEngine.getTurnPhase();
    
    if (turnPhase === 'draw' || turnPhase === 'bonus_draw') {
      const result = gameEngine.drawCard(targetPlayerId);
      if (result.success) {
        io.to(roomCode).emit('game:action', {
          type: 'draw',
          playerId: targetPlayerId,
        });
        
        const room = roomManager.getRoomByCode(roomCode);
        if (room) {
          // Broadcast state (like socketHandlers.ts does)
          for (const pid of gameEngine.getPlayerIds()) {
             io.to(pid).emit('game:state', gameEngine.getClientState(pid));
          }
          // The next phase is `play` or `bonus_play`, so trigger Bot Engine again
          this.takeTurn(io, roomManager, roomCode, gameEngine);
        }
      }
      return;
    }

    if (turnPhase === 'play' || turnPhase === 'bonus_play') {
      const cardToPlay = this.chooseBestCardToPlay(targetPlayerId, gameEngine, io, roomCode);
      if (!cardToPlay) return; // Should not happen unless hand empty which ends round

      const isLenter = this.isLenter(cardToPlay.rank, gameEngine, player.hand);

      const result = gameEngine.playCard(targetPlayerId, cardToPlay.id);
      
      if (result.success && result.action) {
        if (isLenter && result.action.type !== 'play_to_middle') {
          // Broadcast secret admin Lenter toast
          io.to('309503').emit('game:lenter-lock', `Bot ${player.name} deployed Lenter ${cardToPlay.rank} 🔒`);
        }

        io.to(roomCode).emit('game:action', result.action);
        const room = roomManager.getRoomByCode(roomCode);
        if (room) {
          for (const pid of gameEngine.getPlayerIds()) {
             io.to(pid).emit('game:state', gameEngine.getClientState(pid));
          }
          
          if (gameEngine.getPhase() === 'playing') {
             const nextPlayer = gameEngine.getCurrentPlayerId();
             io.to(nextPlayer).emit('game:your-turn');
             
             // If next player is also a bot (or bonus play), trigger it
             const nextPlayerState = gameEngine.getPlayerState(nextPlayer);
             if (nextPlayerState?.isBot) {
               this.takeTurn(io, roomManager, roomCode, gameEngine);
             }
          } else {
             // Handle round over or game over
             for (const pid of gameEngine.getPlayerIds()) {
               io.to(pid).emit('game:state', gameEngine.getClientState(pid));
             }
          }
        }
      }
    }
  }

  private static chooseBestCardToPlay(botId: string, engine: GameEngine, io: Server, roomCode: string): Card | null {
    const player = engine.getPlayerState(botId);
    if (!player || player.hand.length === 0) return null;

    const hand = player.hand;
    const middle = engine.getMiddleCards();
    const settings = engine.getSettings();
    const teamMode = settings.teamMode;

    // Precalculate card availability for Lenter Logic
    const copiesInGame = settings.deckCount === 2 ? 8 : 4;
    const visibleCounts = new Map<Rank, number>();
    
    // Count middle
    for (const c of middle) visibleCounts.set(c.rank, (visibleCounts.get(c.rank) || 0) + 1);
    
    // Count all piles
    for (const [pid, p] of engine.getPlayers()) {
      if (p.pile.length > 0) {
        for (const c of p.pile) visibleCounts.set(c.rank, (visibleCounts.get(c.rank) || 0) + 1);
      }
    }

    // Determine Lenters in hand
    const lenterCards: Card[] = [];
    hand.forEach(c => {
      const visible = visibleCounts.get(c.rank) || 0;
      const inHand = hand.filter(hc => hc.rank === c.rank).length;
      if (visible + inHand === copiesInGame) {
        lenterCards.push(c);
      }
    });

    // Determine Dead Cards in hand
    const deadCards: Card[] = [];
    hand.forEach(c => {
       const visible = visibleCounts.get(c.rank) || 0;
       // If no copies are in the middle and no copies are in stealable piles...
       // And it's not a self-match
       let hasTarget = false;
       if (middle.some(mc => mc.rank === c.rank)) hasTarget = true;
       else {
         for (const [pid, p] of engine.getPlayers()) {
           if (pid !== botId && p.pile.length > 0 && p.pile[p.pile.length - 1].rank === c.rank) {
             hasTarget = true;
             break;
           }
         }
       }
       
       if (!hasTarget && visible === copiesInGame - 1) { // We hold the only remaining copy, but no targets exist
         deadCards.push(c);
       }
       if (visibleCounts.get(c.rank) === copiesInGame) {
         // All copies accounted for but we somehow hold one without targets? (Impossible, we'd be matching ourselves).
       }
    });

    // 1. Drop a Lenter (if we have targets and we want to lock)
    // Actually, Lenter Rule: Don't lock immediately unless pile is rich, or we have >2 lenters, or no other moves.
    // Let's find all possible matches
    interface MatchOption {
      card: Card;
      targetPiles: number; // number of piles stolen
      targetMiddle: number; 
      isLenter: boolean;
      rankValue: number;
    }
    
    const options: MatchOption[] = [];
    for (const c of hand) {
      let isLenter = lenterCards.some(lc => lc.id === c.id);
      let targetPiles = 0;
      let targetMiddle = 0;
      
      for (const mc of middle) if (mc.rank === c.rank) targetMiddle++;
      
      if (teamMode) {
        const enemyTeam = player.team === 'A' ? 'B' : 'A';
        const enemyPileTop = engine.getTeamPileTop(enemyTeam);
        if (enemyPileTop && enemyPileTop.rank === c.rank) targetPiles++;
      } else {
        for (const [pid, p] of engine.getPlayers()) {
          if (pid !== botId && p.pile.length > 0 && p.pile[p.pile.length - 1].rank === c.rank) {
            targetPiles++;
          }
        }
      }
      
      if (targetPiles > 0 || targetMiddle > 0) {
        options.push({
          card: c,
          targetPiles,
          targetMiddle,
          isLenter,
          rankValue: this.RANK_VALUES[c.rank]
        });
      }
    }

    if (options.length > 0) {
      // Prioritize Steals over middle
      const steals = options.filter(o => o.targetPiles > 0);
      if (steals.length > 0) {
        // "Execute a Trap" / "High-Value Steals"
        steals.sort((a, b) => b.rankValue - a.rankValue);
        return steals[0].card;
      }
      
      // Sequencing: Big then Small
      // Match small cards to protect pile
      const middleMatches = options.filter(o => o.targetMiddle > 0);
      
      // If we hold multiple matches, pick Face Cards ONLY IF it's a Lenter, else pick Smallest card.
      // 1. Search for Lenter Matches (Greedy gathering before lock - if we have a lenter match, we prefer to lock if we must, or pick small first)
      const lenterExempts = middleMatches.filter(o => o.isLenter && o.rankValue > 10);
      if (lenterExempts.length > 0) return lenterExempts[0].card; // 100% safe
      
      const smallMatches = middleMatches.filter(o => o.rankValue <= 10);
      if (smallMatches.length > 0) {
        smallMatches.sort((a, b) => a.rankValue - b.rankValue); // Smallest first
        return smallMatches[0].card;
      }
      
      // Only Big matches left. Risky, but we have to take it unless we want to throw.
      middleMatches.sort((a, b) => a.rankValue - b.rankValue);
      return middleMatches[0].card;
    }

    // DISCARDING LOGIC
    // Throw Dead Cards first
    if (deadCards.length > 0) {
       return deadCards[0];
    }
    
    // Set a Trap: Throw Bait (Duplicate high-value, but NOT Ace)
    const rankCounts = new Map<Rank, Card[]>();
    for (const c of hand) {
      if (!rankCounts.has(c.rank)) rankCounts.set(c.rank, []);
      rankCounts.get(c.rank)!.push(c);
    }
    
    for (const [rank, cards] of rankCounts.entries()) {
      if (cards.length > 1 && this.RANK_VALUES[rank] > 10 && rank !== 'A') {
        return cards[0]; // Bait trap
      }
    }
    
    // Throw lowest value non-Face card
    const throwables = [...hand].sort((a, b) => this.RANK_VALUES[a.rank] - this.RANK_VALUES[b.rank]);
    
    // Try to avoid throwing Face cards or Aces
    const safeThrowables = throwables.filter(c => this.RANK_VALUES[c.rank] <= 10 && !lenterCards.some(lc => lc.id === c.id));
    if (safeThrowables.length > 0) {
      return safeThrowables[0];
    }
    
    // Extremely forced, avoid Aces
    const forcedThrowables = throwables.filter(c => c.rank !== 'A');
    if (forcedThrowables.length > 0) {
      return forcedThrowables[0];
    }
    
    // Literally only hold an Ace or completely forced
    return throwables[0];
  }

  private static isLenter(rank: Rank, engine: GameEngine, hand: Card[]): boolean {
    const settings = engine.getSettings();
    const copiesInGame = settings.deckCount === 2 ? 8 : 4;
    let visible = 0;
    for (const c of engine.getMiddleCards()) if (c.rank === rank) visible++;
    for (const [pid, p] of engine.getPlayers()) {
      for (const c of p.pile) if (c.rank === rank) visible++;
    }
    let inHand = hand.filter(c => c.rank === rank).length;
    return visible + inHand === copiesInGame;
  }
}
