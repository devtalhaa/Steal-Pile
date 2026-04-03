'use client';

import { useCallback } from 'react';
import { getSocket } from '@/lib/socket';
import { useGameStore } from '@/store/gameStore';
import { RoomSettings } from '@/types/game';

export function useGameActions() {
  const { setMyPlayer, setMyTurn, setError } = useGameStore();

  const createRoom = useCallback((playerName: string, settings: RoomSettings): Promise<string> => {
    return new Promise((resolve, reject) => {
      const socket = getSocket();
      setMyPlayer(socket.id!, playerName);
      socket.emit('room:create', { playerName, settings }, (res) => {
        if (res.ok) {
          resolve(res.code);
        } else {
          reject(new Error(res.error));
        }
      });
    });
  }, [setMyPlayer]);

  const joinRoom = useCallback((code: string, playerName: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      const socket = getSocket();
      setMyPlayer(socket.id!, playerName);
      socket.emit('room:join', { code, playerName }, (res) => {
        if (res.ok) {
          resolve();
        } else {
          reject(new Error(res.error));
        }
      });
    });
  }, [setMyPlayer]);

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
      socket.emit('room:start', (res) => {
        if (res.ok) {
          resolve();
        } else {
          reject(new Error(res.error));
        }
      });
    });
  }, []);

  const leaveRoom = useCallback(() => {
    const socket = getSocket();
    socket.emit('room:leave');
  }, []);

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
