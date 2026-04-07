import { Server, Socket } from 'socket.io';
import { RoomManager } from './RoomManager';
import { RoomSettings } from './types';


export function registerHandlers(io: Server, roomManager: RoomManager): void {
  io.on('connection', (socket: Socket) => {
    console.log(`Player connected: ${socket.id}`);

    // ============ ROOM EVENTS ============

    socket.on('room:create', (data: { playerName: string; settings: RoomSettings }, callback) => {
      try {
        const code = roomManager.createRoom(socket.id, data.playerName, data.settings);
        socket.join(code);
        callback({ ok: true, code });

        const roomState = roomManager.getRoomState(code);
        if (roomState) io.to(code).emit('room:state', roomState);
      } catch (err) {
        callback({ ok: false, error: 'Failed to create room' });
      }
    });

    socket.on('room:join', (data: { code: string; playerName: string }, callback) => {
      try {
        const result = roomManager.joinRoom(data.code, socket.id, data.playerName);
        if (!result.success) {
          callback({ ok: false, error: result.error || 'Failed to join' });
          return;
        }

        socket.join(data.code);
        const roomState = roomManager.getRoomState(data.code);
        if (roomState) {
          callback({ ok: true, room: roomState });
          io.to(data.code).emit('room:state', roomState);
        }
      } catch (err) {
        callback({ ok: false, error: 'Failed to join room' });
      }
    });

    socket.on('room:update-settings', (data: { settings: Partial<RoomSettings> }) => {
      const code = roomManager.getRoomCodeByPlayerId(socket.id);
      if (!code) return;

      roomManager.updateSettings(code, socket.id, data.settings);
      const roomState = roomManager.getRoomState(code);
      if (roomState) io.to(code).emit('room:state', roomState);
    });

    socket.on('room:assign-teams', (data: { assignments: Record<string, 'A' | 'B'> }) => {
      const code = roomManager.getRoomCodeByPlayerId(socket.id);
      if (!code) return;

      roomManager.assignTeams(code, socket.id, data.assignments);
      const roomState = roomManager.getRoomState(code);
      if (roomState) io.to(code).emit('room:state', roomState);
    });

    socket.on('room:start', (callback) => {
      const code = roomManager.getRoomCodeByPlayerId(socket.id);
      if (!code) {
        callback({ ok: false, error: 'Not in a room' });
        return;
      }

      const result = roomManager.startGame(code, socket.id);
      if (!result.success) {
        callback({ ok: false, error: result.error || 'Failed to start' });
        return;
      }

      callback({ ok: true });

      const room = roomManager.getRoomByCode(code);
      if (!room || !room.gameEngine) return;

      // Send room state update
      const roomState = roomManager.getRoomState(code);
      if (roomState) io.to(code).emit('room:state', roomState);

      // Send individual game states to each player
      for (const pid of room.gameEngine.getPlayerIds()) {
        const state = room.gameEngine.getClientState(pid);
        io.to(pid).emit('game:state', state);
      }

      const firstPlayer = room.gameEngine.getCurrentPlayerId();
      io.to(firstPlayer).emit('game:your-turn');
    });

    socket.on('room:leave', () => {
      handleLeave(socket, io, roomManager);
    });

    // ============ GAME EVENTS ============

    socket.on('game:draw', () => {
      const room = roomManager.getRoomByPlayerId(socket.id);
      if (!room || !room.gameEngine) {
        socket.emit('game:error', { message: 'Not in a game' });
        return;
      }

      const result = room.gameEngine.drawCard(socket.id);
      if (!result.success) {
        socket.emit('game:error', { message: result.error || 'Cannot draw' });
        return;
      }

      // Send updated state to all players
      broadcastGameState(io, room);
    });

    socket.on('game:play-card', (data: { cardId: string }) => {
      const room = roomManager.getRoomByPlayerId(socket.id);
      if (!room || !room.gameEngine) {
        socket.emit('game:error', { message: 'Not in a game' });
        return;
      }

      const result = room.gameEngine.playCard(socket.id, data.cardId);
      if (!result.success) {
        socket.emit('game:error', { message: result.error || 'Cannot play card' });
        return;
      }

      // Broadcast action for animations
      if (result.action) {
        io.to(room.code).emit('game:action', result.action);
      }

      // Small delay then send updated state
      setTimeout(() => {
        if (!room.gameEngine) return;

        const phase = room.gameEngine.getPhase();

        if (phase === 'round_over') {
          const roundResult = room.gameEngine.getRoundResult();
          io.to(room.code).emit('game:round-over', roundResult);
        } else if (phase === 'game_over') {
          const roundResult = room.gameEngine.getRoundResult();
          io.to(room.code).emit('game:over', roundResult);
        }

        broadcastGameState(io, room);

        if (phase === 'playing') {
          const currentPlayer = room.gameEngine.getCurrentPlayerId();
          io.to(currentPlayer).emit('game:your-turn');
        }
      }, 100);
    });

    socket.on('game:next-round', () => {
      const room = roomManager.getRoomByPlayerId(socket.id);
      if (!room || !room.gameEngine) return;

      if (room.hostId !== socket.id) return;

      room.gameEngine.nextRound();
      broadcastGameState(io, room);

      const currentPlayer = room.gameEngine.getCurrentPlayerId();
      io.to(currentPlayer).emit('game:your-turn');
    });

    socket.on('game:reconnect', (data: { code: string; playerName: string }, callback) => {
      try {
        const result = roomManager.reconnectPlayer(data.code, data.playerName, socket.id);
        if (!result.success) {
          callback({ ok: false, error: result.error || 'Cannot reconnect' });
          return;
        }

        socket.join(data.code);

        const roomState = roomManager.getRoomState(data.code);
        if (roomState) {
          io.to(data.code).emit('room:state', roomState);
        }

        const room = roomManager.getRoomByCode(data.code);
        if (room && room.gameEngine) {
          const gameState = room.gameEngine.getClientState(socket.id);
          callback({ ok: true, room: roomState, gameState });

          io.to(data.code).emit('player:reconnected', {
            id: socket.id,
            name: data.playerName,
          });

          broadcastGameState(io, room);

          if (room.gameEngine.getPhase() === 'playing' && room.gameEngine.getCurrentPlayerId() === socket.id) {
            io.to(socket.id).emit('game:your-turn');
          }
        } else {
          callback({ ok: true, room: roomState });
        }
      } catch (err) {
        callback({ ok: false, error: 'Reconnect failed' });
      }
    });

    socket.on('disconnect', () => {
      console.log(`Player disconnected: ${socket.id}`);
      const result = roomManager.disconnectPlayer(socket.id);
      if (!result) return;

      if (result.wasInGame) {
        const room = roomManager.getRoomByCode(result.code);
        if (room && room.gameEngine) {
          io.to(result.code).emit('player:disconnected', {
            id: socket.id,
            name: 'Player',
          });
          broadcastGameState(io, room);
        }
      } else {
        const roomState = roomManager.getRoomState(result.code);
        if (roomState) io.to(result.code).emit('room:state', roomState);
      }
    });
  });
}

function handleLeave(socket: Socket, io: Server, roomManager: RoomManager): void {
  const result = roomManager.leaveRoom(socket.id);
  if (!result) return;

  const { code, isEmpty } = result;
  socket.leave(code);

  if (isEmpty) {
    return;
  }

  const roomState = roomManager.getRoomState(code);
  if (roomState) io.to(code).emit('room:state', roomState);

  const room = roomManager.getRoomByCode(code);
  if (room && room.gameEngine) {
    io.to(code).emit('player:disconnected', {
      id: socket.id,
      name: 'Player',
    });
    broadcastGameState(io, room);
  }
}

function broadcastGameState(io: Server, room: { code: string; gameEngine: any }): void {
  if (!room.gameEngine) return;

  for (const pid of room.gameEngine.getPlayerIds()) {
    const state = room.gameEngine.getClientState(pid);
    io.to(pid).emit('game:state', state);
  }
}
