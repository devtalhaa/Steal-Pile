import { Server, Socket } from 'socket.io';
import { RoomManager } from './RoomManager';
import { RoomSettings } from './types';
import { admin } from './firebaseAdmin';
import { BotEngine } from './BotEngine';

// Maps socket.id -> uid
const socketToUid = new Map<string, string>();
// Maps uid -> socket.id
const uidToSocket = new Map<string, string>();
// Track admin sockets
const adminSockets = new Set<string>();

const ADMIN_EMAIL = 'admin@talha.com';
const ADMIN_PASS = 'talhabutt77';

function broadcastOnlineUsers(io: Server) {
  const onlineUids = Array.from(uidToSocket.keys());
  io.emit('presence:online-users', onlineUids);
}

export function registerHandlers(io: Server, roomManager: RoomManager): void {
  io.on('connection', (socket: Socket) => {
    console.log(`Player connected: ${socket.id}`);

    // ============ ADMIN EVENTS ============
    socket.on('admin:login', (data: { email: string; pass: string }, callback) => {
      if (data.email === ADMIN_EMAIL && data.pass === ADMIN_PASS) {
        adminSockets.add(socket.id);
        callback({ ok: true });
      } else {
        callback({ ok: false, error: 'Invalid admin credentials' });
      }
    });

    socket.on('admin:get-all-data', async (callback) => {
      if (!adminSockets.has(socket.id)) return callback({ ok: false, error: 'Unauthorized' });
      
      let users: any[] = [];
      let rooms: any[] = [];
      let firestoreError = null;

      try {
        // Fetch Rooms (Self-contained in memory, should always work)
        rooms = roomManager.getAllRooms().map(r => ({
          code: r.code,
          players: Array.from(r.players.entries()).map(([id, p]) => ({ id, name: p.name })),
          hostId: r.hostId,
          gameState: r.gameEngine ? r.gameEngine.getPhase() : 'lobby'
        }));
      } catch (err) {
        console.error("ADMIN ROOMS FETCH ERROR:", err);
      }

      try {
        // Fetch all users (Requires Service Account authentication)
        const usersSnap = await admin.firestore().collection('users').get();
        users = usersSnap.docs.map(d => ({ uid: d.id, ...d.data() }));
      } catch (err: any) {
        console.error("ADMIN FIRESTORE ERROR (Likely missing service account):", err.message);
        firestoreError = err.message;
      }

      callback({ 
        ok: true, 
        users, 
        rooms, 
        warning: firestoreError ? `Firestore failed: ${firestoreError}` : null 
      });
    });

    socket.on('admin:delete-user', async (data: { uid: string }, callback) => {
      if (!adminSockets.has(socket.id)) return callback({ ok: false, error: 'Unauthorized' });

      try {
        // 1. Delete from Firebase Auth
        await admin.auth().deleteUser(data.uid).catch(e => console.log("User might not exist in Auth", e));
        
        // 2. Delete from Firestore
        await admin.firestore().collection('users').doc(data.uid).delete();
        
        callback({ ok: true });
      } catch (err) {
        callback({ ok: false, error: 'Failed to delete user' });
      }
    });

    socket.on('admin:kick-player', (data: { roomCode: string; playerId: string }, callback) => {
      if (!adminSockets.has(socket.id)) return callback({ ok: false, error: 'Unauthorized' });

      try {
        const targetSocket = io.sockets.sockets.get(data.playerId);
        if (targetSocket) {
          handleLeave(targetSocket, io, roomManager);
          targetSocket.emit('admin:kicked');
        }
        callback({ ok: true });
      } catch (err) {
        callback({ ok: false, error: 'Failed to kick player' });
      }
    });

    socket.on('admin:swap-player', async (data: { roomCode: string; oldPlayerId: string; targetUid: string }, callback) => {
      if (!adminSockets.has(socket.id)) return callback({ ok: false, error: 'Unauthorized' });

      try {
        const newSocketId = uidToSocket.get(data.targetUid);
        // Player MUST be online to be swapped
        if (!newSocketId) return callback({ ok: false, error: 'Target user is not currently online. They must be online to be swapped into a game.' });

        // Fetch their user name
        const userSnap = await admin.firestore().collection('users').doc(data.targetUid).get();
        if (!userSnap.exists) return callback({ ok: false, error: 'Target user not found in database' });
        const targetName = userSnap.data()?.username || 'Player';

        const result = roomManager.swapPlayer(data.roomCode, data.oldPlayerId, newSocketId, targetName);
        if (!result.success) return callback({ ok: false, error: result.error });

        // Kick old player contextually
        const oldSocket = io.sockets.sockets.get(data.oldPlayerId);
        if (oldSocket) {
             oldSocket.leave(data.roomCode);
             oldSocket.emit('admin:kicked');
        }

        // Add new player to room
        const newSocket = io.sockets.sockets.get(newSocketId);
        if (newSocket) {
            newSocket.join(data.roomCode);
        }

        const roomState = roomManager.getRoomState(data.roomCode);
        if (roomState) io.to(data.roomCode).emit('room:state', roomState);

        const room = roomManager.getRoomByCode(data.roomCode);
        if (room && room.gameEngine) {
            if (newSocket) {
                const gameState = room.gameEngine.getClientState(newSocketId);
                newSocket.emit('game:state', gameState);
            }
            broadcastGameState(io, room);
            
            if (room.gameEngine.getPhase() === 'playing' && room.gameEngine.getCurrentPlayerId() === newSocketId) {
                if (newSocket) newSocket.emit('game:your-turn');
            }
        }

        callback({ ok: true });
      } catch (err) {
        callback({ ok: false, error: 'Failed to swap player' });
      }
    });


    socket.on('admin:remove-friend', async (data: { userUid: string; friendUid: string }, callback) => {
      if (!adminSockets.has(socket.id)) return callback({ ok: false, error: 'Unauthorized' });

      try {
        const batch = admin.firestore().batch();
        batch.update(admin.firestore().collection('users').doc(data.userUid), {
          friends: admin.firestore.FieldValue.arrayRemove(data.friendUid)
        });
        batch.update(admin.firestore().collection('users').doc(data.friendUid), {
          friends: admin.firestore.FieldValue.arrayRemove(data.userUid)
        });
        await batch.commit();
        callback({ ok: true });
      } catch (err: any) {
        callback({ ok: false, error: err.message });
      }
    });

    // ============ AUTH EVENTS ============
    socket.on('auth:authenticate', async (data: { token: string }) => {
      try {
        const decodedToken = await admin.auth().verifyIdToken(data.token);
        const uid = decodedToken.uid;
        
        socketToUid.set(socket.id, uid);
        uidToSocket.set(uid, socket.id);
        
        socket.emit('auth:success');
        broadcastOnlineUsers(io);
      } catch (err) {
        socket.emit('auth:error', { message: 'Invalid authentication token.' });
      }
    });

    socket.on('game:invite', (data: { targetUid: string, fromName?: string | null }) => {
      const targetSocketId = uidToSocket.get(data.targetUid);
      const code = roomManager.getRoomCodeByPlayerId(socket.id);
      
      if (targetSocketId && code) {
        io.to(targetSocketId).emit('game:receive-invite', {
          roomCode: code,
          fromName: data.fromName || 'A friend',
        });
      }
    });

    // ============ SOCIAL EVENTS ============
    socket.on('social:send-request', async (data: { targetShortId: string }, callback) => {
      const uid = socketToUid.get(socket.id);
      if (!uid) return callback({ ok: false, error: 'Unauthorized' });

      try {
        const usersRef = admin.firestore().collection('users');
        const q = await usersRef.where('shortId', '==', data.targetShortId).get();

        if (q.empty) return callback({ ok: false, error: 'User not found' });
        
        const targetDoc = q.docs[0];
        const targetUid = targetDoc.id;

        if (targetUid === uid) return callback({ ok: false, error: 'You cannot add yourself' });

        const targetData = targetDoc.data();
        if ((targetData.friends || []).includes(uid)) {
          return callback({ ok: false, error: 'Already friends' });
        }
        if ((targetData.incomingRequests || []).includes(uid)) {
          return callback({ ok: false, error: 'Request already pending' });
        }

        const batch = admin.firestore().batch();
        // 1. Add to target's incoming
        batch.update(usersRef.doc(targetUid), {
          incomingRequests: admin.firestore.FieldValue.arrayUnion(uid)
        });
        // 2. Add to sender's outgoing
        batch.update(usersRef.doc(uid), {
          outgoingRequests: admin.firestore.FieldValue.arrayUnion(targetUid)
        });

        await batch.commit();
        callback({ ok: true, username: targetData.username, targetUid });
      } catch (err: any) {
        callback({ ok: false, error: err.message });
      }
    });

    socket.on('social:cancel-request', async (data: { targetUid: string }, callback) => {
      const uid = socketToUid.get(socket.id);
      if (!uid) return callback({ ok: false, error: 'Unauthorized' });

      try {
        const batch = admin.firestore().batch();
        batch.update(admin.firestore().collection('users').doc(data.targetUid), {
          incomingRequests: admin.firestore.FieldValue.arrayRemove(uid)
        });
        batch.update(admin.firestore().collection('users').doc(uid), {
          outgoingRequests: admin.firestore.FieldValue.arrayRemove(data.targetUid)
        });
        await batch.commit();
        callback({ ok: true });
      } catch (err: any) {
        callback({ ok: false, error: err.message });
      }
    });

    socket.on('social:accept-request', async (data: { targetUid: string }, callback) => {
      const uid = socketToUid.get(socket.id);
      if (!uid) return callback({ ok: false, error: 'Unauthorized' });

      try {
        const batch = admin.firestore().batch();
        // 1. Add to both friends lists
        batch.update(admin.firestore().collection('users').doc(uid), {
          friends: admin.firestore.FieldValue.arrayUnion(data.targetUid),
          incomingRequests: admin.firestore.FieldValue.arrayRemove(data.targetUid)
        });
        batch.update(admin.firestore().collection('users').doc(data.targetUid), {
          friends: admin.firestore.FieldValue.arrayUnion(uid),
          outgoingRequests: admin.firestore.FieldValue.arrayRemove(uid)
        });
        await batch.commit();
        callback({ ok: true });
      } catch (err: any) {
        callback({ ok: false, error: err.message });
      }
    });

    socket.on('social:decline-request', async (data: { targetUid: string }, callback) => {
      const uid = socketToUid.get(socket.id);
      if (!uid) return callback({ ok: false, error: 'Unauthorized' });

      try {
        const batch = admin.firestore().batch();
        batch.update(admin.firestore().collection('users').doc(uid), {
          incomingRequests: admin.firestore.FieldValue.arrayRemove(data.targetUid)
        });
        batch.update(admin.firestore().collection('users').doc(data.targetUid), {
          outgoingRequests: admin.firestore.FieldValue.arrayRemove(uid)
        });
        await batch.commit();
        callback({ ok: true });
      } catch (err: any) {
        callback({ ok: false, error: err.message });
      }
    });

    socket.on('social:unfriend', async (data: { targetUid: string }, callback) => {
      const uid = socketToUid.get(socket.id);
      if (!uid) return callback({ ok: false, error: 'Unauthorized' });

      try {
        const batch = admin.firestore().batch();
        batch.update(admin.firestore().collection('users').doc(uid), {
          friends: admin.firestore.FieldValue.arrayRemove(data.targetUid)
        });
        batch.update(admin.firestore().collection('users').doc(data.targetUid), {
          friends: admin.firestore.FieldValue.arrayRemove(uid)
        });
        await batch.commit();
        callback({ ok: true });
      } catch (err: any) {
        callback({ ok: false, error: err.message });
      }
    });

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

    socket.on('room:add-bot', (data: { code: string }) => {
      const code = roomManager.getRoomCodeByPlayerId(socket.id);
      if (code !== data.code) return; // Only someone in the room can add a bot
      const room = roomManager.getRoomByCode(code);
      if (room?.hostId !== socket.id) return; // Only host can add bots

      const result = roomManager.addBot(code);
      if (result.success) {
        const roomState = roomManager.getRoomState(code);
        if (roomState) io.to(code).emit('room:state', roomState);
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

      // Register turn timeout callback
      room.gameEngine.setTurnTimeoutCallback((playerId: string) => {
        handleTurnTimeout(io, roomManager, playerId);
      });

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

      // Start the turn timer for the first player
      room.gameEngine.startTurnTimer();

      // Trigger bot if first player is a bot
      const firstPlayerState = room.gameEngine.getPlayerState(firstPlayer);
      if (firstPlayerState?.isBot) {
        BotEngine.takeTurn(io, roomManager, code, room.gameEngine);
      }
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

      // Send updated state to all players (no timer restart — draw is part of the same turn)
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
          // Start/reset timer for next player or bonus turn
          room.gameEngine.startTurnTimer();
          const currentPlayer = room.gameEngine.getCurrentPlayerId();
          io.to(currentPlayer).emit('game:your-turn');

          const currentPlayerState = room.gameEngine.getPlayerState(currentPlayer);
          if (currentPlayerState?.isBot) {
            BotEngine.takeTurn(io, roomManager, room.code, room.gameEngine);
          }
        }
      }, 100);
    });

    socket.on('game:next-round', () => {
      const room = roomManager.getRoomByPlayerId(socket.id);
      if (!room || !room.gameEngine) return;

      if (room.hostId !== socket.id) return;

      room.gameEngine.nextRound();

      // Re-register timeout callback (cleared during startRound)
      room.gameEngine.setTurnTimeoutCallback((playerId: string) => {
        handleTurnTimeout(io, roomManager, playerId);
      });

      broadcastGameState(io, room);

      const currentPlayer = room.gameEngine.getCurrentPlayerId();
      io.to(currentPlayer).emit('game:your-turn');

      // Start timer for first player of new round
      room.gameEngine.startTurnTimer();

      const firstPlayerState = room.gameEngine.getPlayerState(currentPlayer);
      if (firstPlayerState?.isBot) {
        BotEngine.takeTurn(io, roomManager, room.code, room.gameEngine);
      }
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
            // Restart timer for reconnected current player
            room.gameEngine.startTurnTimer();
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
      
      const uid = socketToUid.get(socket.id);
      if (uid) {
        socketToUid.delete(socket.id);
        if (uidToSocket.get(uid) === socket.id) {
          uidToSocket.delete(uid);
          broadcastOnlineUsers(io);
        }
      }

      const result = roomManager.disconnectPlayer(socket.id);
      if (!result) return;

      if (result.wasInGame) {
        const room = roomManager.getRoomByCode(result.code);
        if (room && room.gameEngine) {
          // If the disconnected player was the current player, skip their turn
          if (room.gameEngine.getPhase() === 'playing' && room.gameEngine.getCurrentPlayerId() === socket.id) {
            room.gameEngine.clearTurnTimer();
            room.gameEngine.skipCurrentPlayer();
          }

          io.to(result.code).emit('player:disconnected', {
            id: socket.id,
            name: 'Player',
          });
          broadcastGameState(io, room);

          // Start timer for the new current player (if we skipped)
          if (room.gameEngine.getPhase() === 'playing') {
            room.gameEngine.startTurnTimer();
            const currentPlayer = room.gameEngine.getCurrentPlayerId();
            io.to(currentPlayer).emit('game:your-turn');
          }
        }
      } else {
        const roomState = roomManager.getRoomState(result.code);
        if (roomState) io.to(result.code).emit('room:state', roomState);
      }
    });
  });
}

// ============ TURN TIMEOUT HANDLER ============

function handleTurnTimeout(io: Server, roomManager: RoomManager, playerId: string): void {
  const room = roomManager.getRoomByPlayerId(playerId);
  if (!room || !room.gameEngine) return;

  const engine = room.gameEngine;

  // Guard: verify this player is still the current player and game is active
  if (engine.getCurrentPlayerId() !== playerId) return;
  if (engine.getPhase() !== 'playing') return;

  const turnPhase = engine.getTurnPhase();

  // If in draw phase, auto-draw first
  if (turnPhase === 'draw' || turnPhase === 'bonus_draw') {
    engine.drawCard(playerId);
    broadcastGameState(io, room);
  }

  // Auto-play a random card
  const cardId = engine.getRandomCardFromHand(playerId);
  if (!cardId) return; // Empty hand — shouldn't happen but guard against it

  const result = engine.playCard(playerId, cardId);
  if (!result.success) return;

  // Mark action as auto-played
  if (result.action) {
    result.action.autoPlayed = true;
    io.to(room.code).emit('game:action', result.action);
  }

  // Same 100ms animation delay as normal play-card handler
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
      // Start timer for next player or bonus turn
      room.gameEngine.startTurnTimer();
      const currentPlayer = room.gameEngine.getCurrentPlayerId();
      io.to(currentPlayer).emit('game:your-turn');
    }
  }, 100);
}

// ============ HELPERS ============

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
