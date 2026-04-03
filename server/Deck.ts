import { Card, Suit, Rank } from './types';

const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
const RANKS: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

export class Deck {
  private cards: Card[] = [];

  constructor(deckCount: 1 | 2 = 1) {
    for (let d = 0; d < deckCount; d++) {
      for (const suit of SUITS) {
        for (const rank of RANKS) {
          this.cards.push({
            id: `${suit}-${rank}-${d}`,
            suit,
            rank,
            deckIndex: d,
          });
        }
      }
    }
    this.shuffle();
  }

  shuffle(): void {
    // Fisher-Yates shuffle
    for (let i = this.cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
    }
  }

  draw(count: number): Card[] {
    const drawn: Card[] = [];
    for (let i = 0; i < count && this.cards.length > 0; i++) {
      drawn.push(this.cards.pop()!);
    }
    return drawn;
  }

  drawOne(): Card | null {
    return this.cards.pop() || null;
  }

  remaining(): number {
    return this.cards.length;
  }

  isEmpty(): boolean {
    return this.cards.length === 0;
  }
}
