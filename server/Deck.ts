import { Card, Suit, Rank } from './types';

const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
const RANKS: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

export function initializeDeck(numberOfDecks: 1 | 2): Card[] {
  const cards: Card[] = [];
  for (let d = 0; d < numberOfDecks; d++) {
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        cards.push({
          id: `${suit}-${rank}-${d}`,
          suit,
          rank,
          deckIndex: d,
        });
      }
    }
  }
  fisherYatesShuffle(cards);
  return cards;
}

function fisherYatesShuffle(cards: Card[]): void {
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = cards[i];
    cards[i] = cards[j];
    cards[j] = temp;
  }
}

export class Deck {
  private drawPile: Card[];
  readonly totalCards: number;

  constructor(deckCount: 1 | 2 = 1) {
    this.drawPile = initializeDeck(deckCount);
    this.totalCards = this.drawPile.length;
  }

  draw(count: number): Card[] {
    const drawn: Card[] = [];
    for (let i = 0; i < count && this.drawPile.length > 0; i++) {
      drawn.push(this.drawPile.pop()!);
    }
    return drawn;
  }

  drawOne(): Card | null {
    return this.drawPile.pop() ?? null;
  }

  remaining(): number {
    return this.drawPile.length;
  }

  isEmpty(): boolean {
    return this.drawPile.length === 0;
  }

  assertIntegrity(
    playerHands: Card[][],
    playArea: Card[],
    teamPiles: Card[][],
  ): void {
    const total =
      this.drawPile.length +
      playerHands.reduce((sum, h) => sum + h.length, 0) +
      playArea.length +
      teamPiles.reduce((sum, p) => sum + p.length, 0);

    if (total !== this.totalCards) {
      throw new Error(
        `Card integrity violation: expected ${this.totalCards} cards across all zones, found ${total}`,
      );
    }
  }
}
