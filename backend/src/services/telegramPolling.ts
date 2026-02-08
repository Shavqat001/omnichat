import axios from 'axios';
import { TelegramService } from './telegramService';
import { logger } from '../utils/logger';

const TELEGRAM_API_URL = 'https://api.telegram.org/bot';

/**
 * Polling сервис для получения обновлений от Telegram
 * Используется вместо webhook для локальной разработки
 */
export class TelegramPollingService {
  private botToken: string;
  private apiUrl: string;
  private telegramService: TelegramService;
  private updateId: number = 0;
  private isPolling: boolean = false;
  private pollingInterval: NodeJS.Timeout | null = null;

  constructor(botToken: string) {
    this.botToken = botToken;
    this.apiUrl = `${TELEGRAM_API_URL}${botToken}`;
    this.telegramService = new TelegramService(botToken);
  }

  /**
   * Начать polling обновлений
   */
  async startPolling() {
    if (this.isPolling) {
      logger.warn('Telegram polling already started');
      return;
    }

    this.isPolling = true;
    logger.info('Starting Telegram polling...');

    // Удаляем webhook если он был установлен
    try {
      await axios.post(`${this.apiUrl}/deleteWebhook`);
      logger.info('Webhook deleted, using polling mode');
    } catch (error) {
      logger.warn('Failed to delete webhook:', error);
    }

    // Начинаем polling
    this.poll();
  }

  /**
   * Остановить polling
   */
  stopPolling() {
    this.isPolling = false;
    if (this.pollingInterval) {
      clearTimeout(this.pollingInterval);
      this.pollingInterval = null;
    }
    logger.info('Telegram polling stopped');
  }

  /**
   * Получение обновлений от Telegram
   */
  private async poll() {
    if (!this.isPolling) {
      return;
    }

    try {
      const response = await axios.get(`${this.apiUrl}/getUpdates`, {
        params: {
          offset: this.updateId + 1,
          timeout: 30, // Long polling - ждем до 30 секунд
          allowed_updates: ['message']
        }
      });

      if (response.data.ok && response.data.result) {
        const updates = response.data.result;

        for (const update of updates) {
          this.updateId = Math.max(this.updateId, update.update_id);

          if (update.message) {
            await this.telegramService.handleIncomingMessage(update.message);
          }
        }
      }
    } catch (error: any) {
      logger.error('Telegram polling error:', error.response?.data || error.message);
      // Продолжаем polling даже при ошибке
    }

    // Продолжаем polling
    this.pollingInterval = setTimeout(() => this.poll(), 1000);
  }
}
