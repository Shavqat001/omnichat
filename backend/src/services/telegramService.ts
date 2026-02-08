import axios from 'axios';
import { query } from '../database/connection';
import { io } from '../index';
import { logger } from '../utils/logger';

const TELEGRAM_API_URL = 'https://api.telegram.org/bot';

export class TelegramService {
  private botToken: string;
  private apiUrl: string;

  constructor(botToken: string) {
    this.botToken = botToken;
    this.apiUrl = `${TELEGRAM_API_URL}${botToken}`;
  }

  /**
   * Отправка сообщения в Telegram
   */
  async sendMessage(chatId: string | number, text: string): Promise<boolean> {
    try {
      const response = await axios.post(`${this.apiUrl}/sendMessage`, {
        chat_id: chatId,
        text: text,
        parse_mode: 'HTML'
      });
      return response.data.ok;
    } catch (error: any) {
      logger.error('Telegram send message error:', error.response?.data || error.message);
      return false;
    }
  }

  /**
   * Получение информации о пользователе
   */
  async getUserInfo(chatId: string | number): Promise<any> {
    try {
      const response = await axios.get(`${this.apiUrl}/getChat`, {
        params: { chat_id: chatId }
      });
      return response.data.result;
    } catch (error: any) {
      logger.error('Telegram get user info error:', error.response?.data || error.message);
      return null;
    }
  }

  /**
   * Обработка входящего сообщения от Telegram
   */
  async handleIncomingMessage(telegramMessage: any): Promise<void> {
    try {
      const chatId = telegramMessage.chat.id.toString();
      const messageText = telegramMessage.text || telegramMessage.caption || '';
      const messageId = telegramMessage.message_id;
      const from = telegramMessage.from;

      // Получаем или создаем канал Telegram
      let channel = await query(
        'SELECT id FROM channels WHERE type = $1 LIMIT 1',
        ['telegram']
      );

      let channelId: number;
      if (channel.rows.length === 0) {
        // Создаем канал если его нет
        const newChannel = await query(
          `INSERT INTO channels (name, type, api_config, enabled)
           VALUES ($1, $2, $3, true)
           RETURNING id`,
          ['Telegram', 'telegram', JSON.stringify({ bot_token: this.botToken })]
        );
        channelId = newChannel.rows[0].id;
      } else {
        channelId = channel.rows[0].id;
      }

      // Получаем информацию о пользователе
      const userInfo = await this.getUserInfo(chatId);
      const clientName = userInfo?.first_name 
        ? `${userInfo.first_name}${userInfo.last_name ? ' ' + userInfo.last_name : ''}`
        : from?.first_name || 'Telegram User';
      const username = from?.username || null;

      // Ищем существующий диалог
      let dialog = await query(
        `SELECT id, status FROM dialogs 
         WHERE channel_id = $1 AND client_id = $2 
         ORDER BY created_at DESC LIMIT 1`,
        [channelId, chatId]
      );

      let dialogId: number;
      let isNewDialog = false;

      if (dialog.rows.length === 0 || dialog.rows[0].status === 'closed') {
        // Создаем новый диалог
        const newDialog = await query(
          `INSERT INTO dialogs (channel_id, client_id, client_name, status, metadata)
           VALUES ($1, $2, $3, 'new', $4)
           RETURNING id`,
          [
            channelId,
            chatId,
            clientName,
            JSON.stringify({
              username,
              telegram_chat_id: chatId,
              telegram_message_id: messageId
            })
          ]
        );
        dialogId = newDialog.rows[0].id;
        isNewDialog = true;
      } else {
        dialogId = dialog.rows[0].id;
      }

      // Сохраняем сообщение в базу
      await query(
        `INSERT INTO messages (dialog_id, sender_type, content, content_type)
         VALUES ($1, 'client', $2, 'text')
         RETURNING *`,
        [dialogId, messageText]
      );

      // Обновляем диалог
      await query(
        `UPDATE dialogs SET updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [dialogId]
      );

      // Отправляем уведомление через WebSocket
      io.emit('dialog:new', { dialogId, channelId, isNew: isNewDialog });
      io.emit(`dialog:${dialogId}:message`, {
        dialogId,
        content: messageText,
        sender_type: 'client',
        created_at: new Date().toISOString()
      });

      logger.info(`Telegram message received: chatId=${chatId}, dialogId=${dialogId}`);

      // Если это новый диалог, отправляем приветствие (если бот включен)
      if (isNewDialog && process.env.BOT_ENABLED === 'true') {
        const greeting = process.env.BOT_GREETING_MESSAGE || 
          'Добро пожаловать! Ваше сообщение получено, оператор свяжется с вами в ближайшее время.';
        await this.sendMessage(chatId, greeting);
      }
    } catch (error) {
      logger.error('Error handling Telegram message:', error);
    }
  }

  /**
   * Отправка сообщения оператора в Telegram
   * ВАЖНО: Сообщение уже сохранено в БД и отправлено через WebSocket в message.routes.ts
   * Эта функция только отправляет сообщение в Telegram
   */
  async sendOperatorMessage(dialogId: number, message: string): Promise<boolean> {
    try {
      // Получаем диалог и его метаданные
      const dialog = await query(
        `SELECT d.client_id, d.metadata, c.type
         FROM dialogs d
         JOIN channels c ON d.channel_id = c.id
         WHERE d.id = $1 AND c.type = 'telegram'`,
        [dialogId]
      );

      if (dialog.rows.length === 0) {
        logger.error(`Dialog ${dialogId} not found or not a Telegram dialog`);
        return false;
      }

      const clientId = dialog.rows[0].client_id;

      // Отправляем сообщение в Telegram (сообщение уже сохранено в БД в message.routes.ts)
      const success = await this.sendMessage(clientId, message);

      return success;
    } catch (error) {
      logger.error('Error sending operator message to Telegram:', error);
      return false;
    }
  }

  /**
   * Настройка webhook для Telegram
   */
  async setWebhook(webhookUrl: string): Promise<boolean> {
    try {
      const response = await axios.post(`${this.apiUrl}/setWebhook`, {
        url: webhookUrl
      });
      return response.data.ok;
    } catch (error: any) {
      logger.error('Telegram set webhook error:', error.response?.data || error.message);
      return false;
    }
  }

  /**
   * Удаление webhook (для использования polling)
   */
  async deleteWebhook(): Promise<boolean> {
    try {
      const response = await axios.post(`${this.apiUrl}/deleteWebhook`);
      return response.data.ok;
    } catch (error: any) {
      logger.error('Telegram delete webhook error:', error.response?.data || error.message);
      return false;
    }
  }
}
