import { Router } from 'express';
import { query } from '../database/connection';

const router = Router();

// Get bot topics
router.get('/topics', async (req, res) => {
  try {
    // This would typically come from a configuration or database
    const topics = [
      { id: 'disable_package', title: 'Отключить пакеты', description: 'Управление пакетами услуг' },
      { id: 'support', title: 'Техническая поддержка', description: 'Помощь с техническими вопросами' },
      { id: 'billing', title: 'Биллинг', description: 'Вопросы по оплате и счетам' },
      { id: 'other', title: 'Другое', description: 'Связаться с оператором' }
    ];

    res.json(topics);
  } catch (error) {
    console.error('Get bot topics error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Handle bot interaction
router.post('/interaction', async (req, res) => {
  try {
    const { dialogId, choice, clientPhone } = req.body;

    if (!choice) {
      return res.status(400).json({ error: 'Choice required' });
    }

    // Handle different bot choices
    let response = '';

    if (choice === 'disable_package') {
      // This would require authentication
      response = 'Для отключения пакета необходимо авторизоваться. Пожалуйста, введите номер телефона для получения SMS-кода.';
    } else if (choice === 'support') {
      response = 'Соединяю вас с оператором технической поддержки...';
    } else if (choice === 'billing') {
      response = 'Соединяю вас с оператором по вопросам биллинга...';
    } else {
      response = 'Соединяю вас с оператором...';
    }

    // Save bot interaction
    if (dialogId) {
      await query(
        `INSERT INTO bot_interactions (dialog_id, client_choice, bot_response)
         VALUES ($1, $2, $3)`,
        [dialogId, choice, response]
      );
    }

    res.json({ response });
  } catch (error) {
    console.error('Bot interaction error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
