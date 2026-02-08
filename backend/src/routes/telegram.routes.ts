import { Router, Request, Response } from 'express';
import { TelegramService } from '../services/telegramService';
import { logger } from '../utils/logger';

const router = Router();

// Инициализация Telegram сервиса
let telegramService: TelegramService | null = null;

const initTelegramService = () => {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (botToken) {
    telegramService = new TelegramService(botToken);
    logger.info('Telegram service initialized');
  } else {
    logger.warn('TELEGRAM_BOT_TOKEN not found in environment variables');
  }
};

// Инициализируем при загрузке модуля
initTelegramService();

/**
 * Webhook endpoint для получения сообщений от Telegram
 * Telegram будет отправлять сюда все входящие сообщения
 */
router.post('/webhook', async (req: Request, res: Response) => {
  try {
    if (!telegramService) {
      return res.status(503).json({ error: 'Telegram service not configured' });
    }

    const update = req.body;

    // Telegram отправляет обновления в формате { message: {...}, update_id: ... }
    if (update.message) {
      await telegramService.handleIncomingMessage(update.message);
    }

    // Всегда отвечаем OK, чтобы Telegram знал, что мы получили обновление
    res.status(200).json({ ok: true });
  } catch (error) {
    logger.error('Telegram webhook error:', error);
    res.status(200).json({ ok: true }); // Все равно отвечаем OK
  }
});

/**
 * Endpoint для отправки тестового сообщения
 */
router.post('/test', async (req: Request, res: Response) => {
  try {
    if (!telegramService) {
      return res.status(503).json({ error: 'Telegram service not configured' });
    }

    const { chatId, message } = req.body;

    if (!chatId || !message) {
      return res.status(400).json({ error: 'chatId and message required' });
    }

    const success = await telegramService.sendMessage(chatId, message);
    res.json({ success });
  } catch (error) {
    logger.error('Telegram test error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Настройка webhook
 */
router.post('/setup-webhook', async (req: Request, res: Response) => {
  try {
    if (!telegramService) {
      return res.status(503).json({ error: 'Telegram service not configured' });
    }

    const { webhookUrl } = req.body;
    if (!webhookUrl) {
      return res.status(400).json({ error: 'webhookUrl required' });
    }

    const success = await telegramService.setWebhook(webhookUrl);
    res.json({ success, message: success ? 'Webhook set successfully' : 'Failed to set webhook' });
  } catch (error) {
    logger.error('Telegram setup webhook error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
