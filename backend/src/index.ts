import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { initializeDatabase } from './database/connection';
import { setupRoutes } from './routes';
import { setupSocketIO } from './socket/socketHandler';
import { logger } from './utils/logger';
import { TelegramPollingService } from './services/telegramPolling';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files
app.use('/uploads', express.static('uploads'));

// Initialize database
initializeDatabase()
  .then(() => {
    logger.info('Database connected successfully');
    
    // Setup routes
    setupRoutes(app);
    
    // Setup Socket.IO
    setupSocketIO(io);
    
    // Start server
    httpServer.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
      
      // Start Telegram polling if token is configured
      const telegramToken = process.env.TELEGRAM_BOT_TOKEN;
      if (telegramToken && process.env.NODE_ENV !== 'production') {
        const pollingService = new TelegramPollingService(telegramToken);
        pollingService.startPolling();
        logger.info('Telegram polling started (for local development)');
      }
    });
  })
  .catch((error) => {
    logger.error('Failed to initialize database:', error);
    process.exit(1);
  });

export { io };
