import { Server as SocketIOServer } from 'socket.io';
import type { Server as HttpServer } from 'http';

let io: SocketIOServer | null = null;

export const initIO = (server: HttpServer, corsOrigin: string | string[] | boolean): SocketIOServer => {
  io = new SocketIOServer(server, {
    cors: { origin: corsOrigin, credentials: true },
    path: '/api/socket.io',
  });
  io.on('connection', (socket) => {
    socket.emit('hello', { ok: true, t: Date.now() });
  });
  return io;
};

export const getIO = (): SocketIOServer | null => io;
