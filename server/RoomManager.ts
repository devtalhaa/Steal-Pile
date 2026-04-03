import { GameEngine } from './GameEngine';
import { RoomSettings, RoomState, RoomPlayer } from './types';

interface Room {
  code: string;
  hostId: string;
  players: Map<string, { name: string; team?: 'A' | 'B' }>;
  settings: RoomSettings;
  status: 'lobby' | 'in_game';
  gameEngine: GameEngine | null;
}

export class RoomManager {
  private rooms: Map<string, Room> = new Map();
  private playerToRoom: Map<string, string> = new Map(); // socketId -> roomCode

  createRoom(hostId: string, hostName: string, settings: RoomSettings): string {
    const code = this.generateCode();
    const room: Room = {
      code,
      hostId,
      players: new Map([[hostId, { name: hostName }]]),
      settings,
      status: 'lobby',
      gameEngine: null,
    };
    this.rooms.set(code, room);
    this.playerToRoom.set(hostId, code);
    return code;
  }

  joinRoom(code: string, playerId: string, playerName: string): { success: boolean; error?: string } {
    const room = this.rooms.get(code);
    if (!room) return { success: false, error: 'Room not found' };
    if (room.status === 'in_game') return { success: false, error: 'Game already in progress' };
    if (room.players.size >= room.settings.maxPlayers) return { success: false, error: 'Room is full' };

    room.players.set(playerId, { name: playerName });
    this.playerToRoom.set(playerId, code);
    return { success: true };
  }

  leaveRoom(playerId: string): { code: string; isEmpty: boolean; newHostId?: string } | null {
    const code = this.playerToRoom.get(playerId);
    if (!code) return null;

    const room = this.rooms.get(code);
    if (!room) return null;

    room.players.delete(playerId);
    this.playerToRoom.delete(playerId);

    if (room.status === 'in_game' && room.gameEngine) {
      room.gameEngine.setPlayerConnected(playerId, false);
    }

    if (room.players.size === 0) {
      this.rooms.delete(code);
      return { code, isEmpty: true };
    }

    // Transfer host if needed
    let newHostId: string | undefined;
    if (room.hostId === playerId) {
      newHostId = room.players.keys().next().value!;
      room.hostId = newHostId;
    }

    return { code, isEmpty: false, newHostId };
  }

  updateSettings(code: string, playerId: string, settings: Partial<RoomSettings>): boolean {
    const room = this.rooms.get(code);
    if (!room || room.hostId !== playerId || room.status !== 'lobby') return false;

    room.settings = { ...room.settings, ...settings };

    // Validate team mode
    if (room.settings.teamMode && room.players.size % 2 !== 0) {
      // Don't apply team mode with odd players - but allow setting it
      // Validation will happen at game start
    }

    return true;
  }

  assignTeams(code: string, playerId: string, assignments: Record<string, 'A' | 'B'>): boolean {
    const room = this.rooms.get(code);
    if (!room || room.hostId !== playerId || room.status !== 'lobby') return false;

    for (const [pid, team] of Object.entries(assignments)) {
      const player = room.players.get(pid);
      if (player) player.team = team;
    }
    return true;
  }

  autoAssignTeams(code: string): void {
    const room = this.rooms.get(code);
    if (!room) return;

    const playerIds = [...room.players.keys()];
    // Alternate team assignment for proper seating
    for (let i = 0; i < playerIds.length; i++) {
      const player = room.players.get(playerIds[i])!;
      player.team = i % 2 === 0 ? 'A' : 'B';
    }
  }

  startGame(code: string, requesterId: string): { success: boolean; error?: string } {
    const room = this.rooms.get(code);
    if (!room) return { success: false, error: 'Room not found' };
    if (room.hostId !== requesterId) return { success: false, error: 'Only host can start' };
    if (room.players.size < 2) return { success: false, error: 'Need at least 2 players' };

    if (room.settings.teamMode) {
      if (room.players.size % 2 !== 0) {
        return { success: false, error: 'Team mode requires even number of players' };
      }
      // Auto-assign teams if not already assigned
      const hasTeams = [...room.players.values()].every(p => p.team);
      if (!hasTeams) {
        this.autoAssignTeams(code);
      }

      // Validate equal team sizes
      let teamA = 0, teamB = 0;
      for (const p of room.players.values()) {
        if (p.team === 'A') teamA++;
        else teamB++;
      }
      if (teamA !== teamB) {
        return { success: false, error: 'Teams must be equal size' };
      }
    }

    // Build player init list with proper seating
    const playerIds = [...room.players.keys()];
    const playerInits = this.arrangeSeatOrder(room, playerIds);

    room.gameEngine = new GameEngine(playerInits, room.settings);
    room.status = 'in_game';

    return { success: true };
  }

  private arrangeSeatOrder(room: Room, playerIds: string[]) {
    if (room.settings.teamMode) {
      // Alternate seating: A1, B1, A2, B2, ...
      const teamA: string[] = [];
      const teamB: string[] = [];
      for (const pid of playerIds) {
        const p = room.players.get(pid)!;
        if (p.team === 'A') teamA.push(pid);
        else teamB.push(pid);
      }

      const arranged: { id: string; name: string; team: 'A' | 'B'; seatIndex: number }[] = [];
      const maxLen = Math.max(teamA.length, teamB.length);
      let seatIdx = 0;
      for (let i = 0; i < maxLen; i++) {
        if (i < teamA.length) {
          arranged.push({
            id: teamA[i],
            name: room.players.get(teamA[i])!.name,
            team: 'A',
            seatIndex: seatIdx++,
          });
        }
        if (i < teamB.length) {
          arranged.push({
            id: teamB[i],
            name: room.players.get(teamB[i])!.name,
            team: 'B',
            seatIndex: seatIdx++,
          });
        }
      }
      return arranged;
    } else {
      // Shuffle seat order for solo
      const shuffled = [...playerIds].sort(() => Math.random() - 0.5);
      return shuffled.map((pid, i) => ({
        id: pid,
        name: room.players.get(pid)!.name,
        seatIndex: i,
      }));
    }
  }

  getRoomByCode(code: string): Room | undefined {
    return this.rooms.get(code);
  }

  getRoomByPlayerId(playerId: string): Room | undefined {
    const code = this.playerToRoom.get(playerId);
    if (!code) return undefined;
    return this.rooms.get(code);
  }

  getRoomCodeByPlayerId(playerId: string): string | undefined {
    return this.playerToRoom.get(playerId);
  }

  getRoomState(code: string): RoomState | null {
    const room = this.rooms.get(code);
    if (!room) return null;

    const players: RoomPlayer[] = [];
    for (const [pid, p] of room.players) {
      players.push({ id: pid, name: p.name, team: p.team });
    }

    return {
      code: room.code,
      hostId: room.hostId,
      players,
      settings: room.settings,
      status: room.status,
    };
  }

  private generateCode(): string {
    let code: string;
    do {
      code = Math.floor(1000 + Math.random() * 9000).toString();
    } while (this.rooms.has(code));
    return code;
  }
}
