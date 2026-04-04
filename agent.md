# Agent Context - Khoti Card Game

## Project Overview
This project is an online multiplayer version of the traditional Pakistani card game "Khoti".
It consists of a **Next.js (App Router)** client and a **Socket.io + Express** Node backend. The entire project is written in TypeScript. 
When working on this project, carefully check this file to understand the architecture and game logic before proposing or making changes.

## Folder Structure
- **`src/` - Next.js client**
  - `app/` - React App Router pages. `page.tsx` handles the main lobby (creating/joining rooms), and `/game/[id]` handles the live game view.
  - `store/` - Zustand global state. Specifically, `gameStore.ts` reflects the server state.
  - `hooks/` - Custom hooks to bridge components with socket emit events (`useGameActions.ts`) and socket event listeners (`useSocket.ts`).
  - `lib/` - Utilities like the `socket.ts` initialization.
  - `components/` - Game components, rendering the board, hands, player piles, and middle cards.
- **`server/` - Node.js Express & Socket.io server**
  - `index.ts` - Entry point that sets up the Express server, CORS, and binds Socket.io.
  - `RoomManager.ts` - Handles creating socket rooms, joining tracking, and initializing `GameEngine` instances per room.
  - `GameEngine.ts` - Contains the pure game rules, evaluating moves, scores, stealing logic, and deriving round results.
  - `socketHandlers.ts` - Defines the socket paths (e.g., `play_card`, `draw_card`) orchestrating actions between sockets and `GameEngine`.
  - `Deck.ts` - Helper class representing 52-card decks containing reshuffle and draw methods.
  - `types.ts` - TypeScript shared definitions between engine and client responses.

## Technology Stack
- **Frontend**: Next.js 14+, React, Tailwind CSS v4, Zustand state manager, Framer Motion for animations.
- **Backend**: Express, Socket.io, NodeJS.
- **Scripts**: Controlled via `concurrently` in the root `package.json`. `npm run dev` will boot both frontend and backend.

---

## "Khoti" Game Logic & Rules

"Khoti" revolves around a core mechanic of matching ranks to steal piles from opponents.

### 1. Setup & Starting a Round
- The game can be played with **1 or 2 decks** (52 or 104 cards).
- It supports **2-8 max players**.
- Players optionally play in **Solo mode** or **Team mode** (Team A vs Team B).
- A round begins by placing **4 cards face-up in the middle**.
- Each player is dealt **4 cards to their hand**.

### 2. Turn Sequence
A player's turn consists of two phases: `draw` -> `play`.
1. **Draw Phase**: The player draws 1 card from the deck. *(Note: This phase is skipped entirely if the deck is empty).*
2. **Play Phase**: The player selects and plays a card from their hand. The played card's rank is then evaluated:

### 3. Matching & Stealing
The rank of the played card is compared to the `middleCards` and the **top card of each opponent's `pile`**.
- **Match Middle**: If the rank matches any card(s) in the middle, those cards are claimed.
- **Steal a Pile**: If the rank matches the top card of an opponent's pile, the active player **steals that entire pile**. (In Team Mode, players cannot steal from their teammates' piles).
- The player then takes the **played card + all matched middle cards + all stolen piles** and places them into their own pile.
- **Bonus Turn!**: If the player successfully matched or stole anything, they are granted a **Bonus Draw phase** and their turn continues.
- **No Match**: If no match or steal occurs, the played card simply goes into the middle, and the turn passes to the next player.

### 4. Round Completion
- The deck will eventually run out. Once empty, players only play from their hands without drawing.
- The round ends only when **the deck is empty AND every player's hand is completely empty**.
- When the round ends, the score is tallied based on the piles collected.

### 5. Scoring Mechanism
- Number cards (2 through 9) = **0.5 points**
- Face cards & Tens (10, J, Q, K) = **1 point**
- Aces (A) = **2 points**

In Team Mode, total points are combined per team. A "Net Owing" difference is calculated across multiple rounds. The game concludes entirely when the Net Owing points reach the predefined `targetScore`. In Solo mode, the highest scorer of the single round wins.

---

## AI Best Practices for this Project
1. **Always read this overview first** to understand the application scope.
2. The core truth for game rules exists inside `server/GameEngine.ts`. Do not modify client files for validation checks since the server has the final say.
3. The frontend relies heavily on aesthetics (vibrant colors, glassmorphism, dynamic animations), ensure all new UI respects this standard. Do not build minimal viable components. 
4. Types align closely. Check `server/types.ts` when sending/modifying data over Socket.io to ensure you are modifying both frontend mappings (in `gameStore.ts`) and backend payload limits.
