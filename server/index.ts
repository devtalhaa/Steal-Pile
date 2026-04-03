import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { RoomManager } from './RoomManager';
import { registerHandlers } from './socketHandlers';

const app = express();
app.use(cors());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',   // Allow LAN devices and any host — restrict this in production
    methods: ['GET', 'POST'],
  },
});

const roomManager = new RoomManager();
registerHandlers(io, roomManager);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`Khoti game server running on port ${PORT} (accessible on all network interfaces)`);
});
