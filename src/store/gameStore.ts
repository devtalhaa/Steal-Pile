'use client';

import { create } from 'zustand';
import { ClientGameState, RoomState, GameAction, RoundResult } from '@/types/game';

interface GameStore {
  // Identity
  myPlayerId: string | null;
  myPlayerName: string | null;
  isConnected: boolean;

  // Room
  room: RoomState | null;

  // Game
  gameState: ClientGameState | null;
  isMyTurn: boolean;

  // Animations
  pendingAction: GameAction | null;
  isAnimating: boolean;

  // Round results
  roundResult: RoundResult | null;
  gameResult: RoundResult | null;

  // Error
  error: string | null;

  // Actions
  setMyPlayer: (id: string, name: string) => void;
  setConnected: (connected: boolean) => void;
  setRoom: (room: RoomState | null) => void;
  setGameState: (state: ClientGameState) => void;
  setMyTurn: (isMyTurn: boolean) => void;
  setPendingAction: (action: GameAction | null) => void;
  setAnimating: (animating: boolean) => void;
  setRoundResult: (result: RoundResult | null) => void;
  setGameResult: (result: RoundResult | null) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

const initialState = {
  myPlayerId: null,
  myPlayerName: null,
  isConnected: false,
  room: null,
  gameState: null,
  isMyTurn: false,
  pendingAction: null,
  isAnimating: false,
  roundResult: null,
  gameResult: null,
  error: null,
};

export const useGameStore = create<GameStore>((set) => ({
  ...initialState,

  setMyPlayer: (id, name) => set({ myPlayerId: id, myPlayerName: name }),
  setConnected: (connected) => set({ isConnected: connected }),
  setRoom: (room) => set({ room }),
  setGameState: (state) => set({ gameState: state }),
  setMyTurn: (isMyTurn) => set({ isMyTurn }),
  setPendingAction: (action) => set({ pendingAction: action }),
  setAnimating: (animating) => set({ isAnimating: animating }),
  setRoundResult: (result) => set({ roundResult: result }),
  setGameResult: (result) => set({ gameResult: result }),
  setError: (error) => set({ error }),
  reset: () => set(initialState),
}));
