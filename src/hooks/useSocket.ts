'use client';

import { useEffect, useCallback } from 'react';
import { connectSocket, getSocket, disconnectSocket } from '@/lib/socket';
import { useGameStore } from '@/store/gameStore';

export function useSocket() {
  const {
    setConnected, setMyPlayer, setRoom, setGameState,
    setMyTurn, setPendingAction, setRoundResult, setGameResult, setError,
  } = useGameStore();

  const setupListeners = useCallback(() => {
    const socket = getSocket();

    socket.on('connect', () => {
      setConnected(true);
      setMyPlayer(socket.id!, useGameStore.getState().myPlayerName || 'Player');
    });

    socket.on('disconnect', () => {
      setConnected(false);
    });

    socket.on('room:state', (room) => {
      setRoom(room);
    });

    socket.on('room:error', (data) => {
      setError(data.message);
    });

    socket.on('game:state', (state) => {
      setGameState(state);
    });

    socket.on('game:action', (action) => {
      setPendingAction(action);
    });

    socket.on('game:your-turn', () => {
      setMyTurn(true);
    });

    socket.on('game:round-over', (result) => {
      setRoundResult(result);
    });

    socket.on('game:over', (result) => {
      setGameResult(result);
    });

    socket.on('game:error', (data) => {
      setError(data.message);
    });

    socket.on('player:disconnected', (data) => {
      console.log(`${data.name} disconnected`);
    });

    socket.on('player:reconnected', (data) => {
      console.log(`${data.name} reconnected`);
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('room:state');
      socket.off('room:error');
      socket.off('game:state');
      socket.off('game:action');
      socket.off('game:your-turn');
      socket.off('game:round-over');
      socket.off('game:over');
      socket.off('game:error');
      socket.off('player:disconnected');
      socket.off('player:reconnected');
    };
  }, [setConnected, setMyPlayer, setRoom, setGameState, setMyTurn, setPendingAction, setRoundResult, setGameResult, setError]);

  useEffect(() => {
    const socket = connectSocket();
    // Update id once connected
    if (socket.connected) {
      setConnected(true);
      setMyPlayer(socket.id!, useGameStore.getState().myPlayerName || 'Player');
    }
    const cleanup = setupListeners();
    return cleanup;
  }, [setupListeners, setConnected, setMyPlayer]);

  return getSocket();
}
