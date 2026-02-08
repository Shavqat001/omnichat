import { Express } from 'express';
import authRoutes from './auth.routes';
import dialogRoutes from './dialog.routes';
import messageRoutes from './message.routes';
import operatorRoutes from './operator.routes';
import statisticsRoutes from './statistics.routes';
import templateRoutes from './template.routes';
import channelRoutes from './channel.routes';
import adminRoutes from './admin.routes';
import botRoutes from './bot.routes';
import smsRoutes from './sms.routes';
import telegramRoutes from './telegram.routes';

export const setupRoutes = (app: Express) => {
  app.use('/api/auth', authRoutes);
  app.use('/api/dialogs', dialogRoutes);
  app.use('/api/messages', messageRoutes);
  app.use('/api/operators', operatorRoutes);
  app.use('/api/statistics', statisticsRoutes);
  app.use('/api/templates', templateRoutes);
  app.use('/api/channels', channelRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/bot', botRoutes);
  app.use('/api/sms', smsRoutes);
  app.use('/api/telegram', telegramRoutes);
  
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });
};
