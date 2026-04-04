'use client';

import { useCallback } from 'react';
import { getSocket } from '@/lib/socket';
import { useGameStore } from '@/store/gameStore';
import { RoomSettings } from '@/types/game';

export function useGameActions() {
  const { setMyPlayer, setMyTurn, setError, setRoom, setGameState, setGameResult, setRoundResult } = useGameStore();

  const clearStaleGameData = useCallback(() => {
    setRoom(null);
    setGameState(null as any); // We can safely assume state is null here for reset purposes although type might complain if we don't cast or use union. Wait! 
    // Wait, ClientGameState | null is the correct type.
    setGameState(null as any); 
    setGameResult(null);
    setRoundResult(null);
    setError(null);
  }, [setRoom, setGameState, setGameResult, setRoundResult, setError]);

  const createRoom = useCallback((playerName: string, settings: RoomSettings): Promise<string> => {
    return new Promise((resolve, reject) => {
      clearStaleGameData();
      const socket = getSocket();
      setMyPlayer(socket.id!, playerName);
      socket.emit('room:create', { playerName, settings }, (res: any) => {
        if (res.ok) {
          resolve(res.code);
        } else {
          reject(new Error(res.error));
        }
      });
    });
  }, [clearStaleGameData, setMyPlayer]);

  const joinRoom = useCallback((code: string, playerName: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      clearStaleGameData();
      const socket = getSocket();
      setMyPlayer(socket.id!, playerName);
      socket.emit('room:join', { code, playerName }, (res: any) => {
        if (res.ok) {
          resolve();
        } else {
          reject(new Error(res.error));
        }
      });
    });
  }, [clearStaleGameData, setMyPlayer]);

  const updateSettings = useCallback((settings: Partial<RoomSettings>) => {
    const socket = getSocket();
    socket.emit('room:update-settings', { settings });
  }, []);

  const assignTeams = useCallback((assignments: Record<string, 'A' | 'B'>) => {
    const socket = getSocket();
    socket.emit('room:assign-teams', { assignments });
  }, []);

  const startGame = useCallback((): Promise<void> => {
    return new Promise((resolve, reject) => {
      const socket = getSocket();
      socket.emit('room:start', (res: any) => {
        if (res.ok) {
          resolve();
        } else {
          reject(new Error(res.error));
        }
      });
    });
  }, []);

  const leaveRoom = useCallback(() => {
    clearStaleGameData();
    const socket = getSocket();
    socket.emit('room:leave');
  }, [clearStaleGameData]);

  const drawCard = useCallback(() => {
    const socket = getSocket();
    setMyTurn(false);
    socket.emit('game:draw');
  }, [setMyTurn]);

  const playCard = useCallback((cardId: string) => {
    const socket = getSocket();
    setError(null);
    socket.emit('game:play-card', { cardId });
  }, [setError]);

  const requestNextRound = useCallback(() => {
    const socket = getSocket();
    socket.emit('game:next-round');
  }, []);

  return {
    createRoom,
    joinRoom,
    updateSettings,
    assignTeams,
    startGame,
    leaveRoom,
    drawCard,
    playCard,
    requestNextRound,
  };
}
