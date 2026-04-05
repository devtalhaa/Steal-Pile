'use client';

import { useEffect, useCallback } from 'react';
import { connectSocket, getSocket } from '@/lib/socket';
import { useGameStore } from '@/store/gameStore';

export function useSocket() {
  const {
    setConnected, setMyPlayer, setRoom, setGameState,
    setMyTurn, setPendingAction, setRoundResult, setGameResult, setError,
  } = useGameStore();

  const setupListeners = useCallback(() => {
    const socket = getSocket();

    const onConnect = () => {
      setConnected(true);
      const storedName = useGameStore.getState().myPlayerName || 'Player';
      setMyPlayer(socket.id!, storedName);

      const sessionCode = typeof window !== 'undefined' ? sessionStorage.getItem('khoti_room_code') : null;
      const sessionName = typeof window !== 'undefined' ? sessionStorage.getItem('khoti_player_name') : null;

      if (sessionCode && sessionName) {
        socket.emit('game:reconnect', { code: sessionCode, playerName: sessionName }, (res: any) => {
          if (res.ok) {
            setMyPlayer(socket.id!, sessionName);
            if (res.room) setRoom(res.room);
            if (res.gameState) {
              setGameState(res.gameState);
              if (res.gameState.phase === 'playing') {
                setRoundResult(null);
                setGameResult(null);
              }
            }
          } else {
            sessionStorage.removeItem('khoti_room_code');
            sessionStorage.removeItem('khoti_player_name');
          }
        });
      }
    };
    const onDisconnect = () => setConnected(false);
    const onRoomState = (room: any) => setRoom(room);
    const onRoomError = (data: any) => setError(data.message);
    const onGameState = (state: any) => {
      setGameState(state);
      if (state.phase === 'playing') {
        setRoundResult(null);
        setGameResult(null);
      }
    };
    const onGameAction = (action: any) => setPendingAction(action);
    const onYourTurn = () => setMyTurn(true);
    const onRoundOver = (result: any) => setRoundResult(result);
    const onGameOver = (result: any) => setGameResult(result);
    const onGameError = (data: any) => setError(data.message);
    const onPlayerDisconnected = (data: any) => console.log(`${data.name} disconnected`);
    const onPlayerReconnected = (data: any) => console.log(`${data.name} reconnected`);

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('room:state', onRoomState);
    socket.on('room:error', onRoomError);
    socket.on('game:state', onGameState);
    socket.on('game:action', onGameAction);
    socket.on('game:your-turn', onYourTurn);
    socket.on('game:round-over', onRoundOver);
    socket.on('game:over', onGameOver);
    socket.on('game:error', onGameError);
    socket.on('player:disconnected', onPlayerDisconnected);
    socket.on('player:reconnected', onPlayerReconnected);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('room:state', onRoomState);
      socket.off('room:error', onRoomError);
      socket.off('game:state', onGameState);
      socket.off('game:action', onGameAction);
      socket.off('game:your-turn', onYourTurn);
      socket.off('game:round-over', onRoundOver);
      socket.off('game:over', onGameOver);
      socket.off('game:error', onGameError);
      socket.off('player:disconnected', onPlayerDisconnected);
      socket.off('player:reconnected', onPlayerReconnected);
    };
  }, [setConnected, setMyPlayer, setRoom, setGameState, setMyTurn, setPendingAction, setRoundResult, setGameResult, setError]);

  useEffect(() => {
    const socket = connectSocket();
    if (socket.connected) {
      setConnected(true);
      setMyPlayer(socket.id!, useGameStore.getState().myPlayerName || 'Player');
    }
    const cleanup = setupListeners();
    return cleanup;
  }, [setupListeners, setConnected, setMyPlayer]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        const socket = getSocket();
        if (!socket.connected) {
          socket.connect();
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  return getSocket();
}
