import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { query } from '../database/connection';
import { logger } from '../utils/logger';

interface SocketAuth extends Socket {
  operatorId?: number;
}

export const setupSocketIO = (io: Server) => {
  // Authentication middleware
  io.use(async (socket: SocketAuth, next) => {
    try {
      const token = socket.handshake.auth.token;
      
      if (!token) {
        return next(new Error('Authentication error'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as any;
      socket.operatorId = decoded.operatorId;
      next();
    } catch (error) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', async (socket: SocketAuth) => {
    const operatorId = socket.operatorId;
    logger.info(`Operator ${operatorId} connected`);

    // Update operator status to online
    await query(
      'UPDATE operators SET status = $1 WHERE id = $2',
      ['online', operatorId]
    );

    // Join operator room
    socket.join(`operator:${operatorId}`);

    // Notify others
    io.emit('operator:status', { operatorId, status: 'online' });

    // Handle dialog assignment
    socket.on('dialog:join', async (data: { dialogId: number }) => {
      socket.join(`dialog:${data.dialogId}`);
    });

    socket.on('dialog:leave', async (data: { dialogId: number }) => {
      socket.leave(`dialog:${data.dialogId}`);
    });

    // Handle typing indicator
    socket.on('typing:start', (data: { dialogId: number }) => {
      socket.to(`dialog:${data.dialogId}`).emit('typing:start', {
        operatorId,
        dialogId: data.dialogId
      });
    });

    socket.on('typing:stop', (data: { dialogId: number }) => {
      socket.to(`dialog:${data.dialogId}`).emit('typing:stop', {
        operatorId,
        dialogId: data.dialogId
      });
    });

    // Handle disconnect
    socket.on('disconnect', async () => {
      logger.info(`Operator ${operatorId} disconnected`);
      
      // Update operator status to offline
      await query(
        'UPDATE operators SET status = $1 WHERE id = $2',
        ['offline', operatorId]
      );

      // Notify others
      io.emit('operator:status', { operatorId, status: 'offline' });
    });
  });
};
