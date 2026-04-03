'use client';

import { io, Socket } from 'socket.io-client';
import { ServerToClientEvents, ClientToServerEvents } from '@/types/game';

type KhotiSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let socket: KhotiSocket | null = null;

function getSocketUrl(): string {
  // If an explicit URL is set (e.g. for production), use it
  if (process.env.NEXT_PUBLIC_SOCKET_URL) {
    return process.env.NEXT_PUBLIC_SOCKET_URL;
  }
  // In the browser, use the same host the page was loaded from, just port 3001.
  // This works for localhost AND for LAN access via IP (e.g. 192.168.x.x).
  if (typeof window !== 'undefined') {
    return `${window.location.protocol}//${window.location.hostname}:3001`;
  }
  return 'http://localhost:3001';
}

export function getSocket(): KhotiSocket {
  if (!socket) {
    socket = io(getSocketUrl(), {
      autoConnect: false,
      transports: ['websocket', 'polling'],
    });
  }
  return socket;
}

export function connectSocket(): KhotiSocket {
  const s = getSocket();
  if (!s.connected) s.connect();
  return s;
}

export function disconnectSocket(): void {
  if (socket?.connected) {
    socket.disconnect();
  }
}
