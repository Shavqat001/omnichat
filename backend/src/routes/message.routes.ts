import { Router } from 'express';
import { query } from '../database/connection';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';
import { io } from '../index';
import multer from 'multer';
import path from 'path';
import * as fs from 'fs';
import { TelegramService } from '../services/telegramService';

const router = Router();

// Configure multer for file uploads
const uploadDir = process.env.UPLOAD_DIR || './uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req: any, _file: any, cb: any) => {
    cb(null, uploadDir);
  },
  filename: (_req: any, file: any, cb: any) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760') }
});

// Get messages for dialog
router.get('/dialog/:dialogId', authenticate, async (req: AuthRequest, res) => {
  try {
    const { dialogId } = req.params;

    const result = await query(
      `SELECT m.*, o.full_name as operator_name
       FROM messages m
       LEFT JOIN operators o ON m.operator_id = o.id
       WHERE m.dialog_id = $1 AND m.deleted = false
       ORDER BY m.created_at ASC`,
      [dialogId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Send message
router.post('/', authenticate, upload.single('file'), async (req: any, res) => {
  try {
    const { dialogId, content, contentType = 'text' } = req.body;
    const file = req.file;

    if (!dialogId || (!content && !file)) {
      return res.status(400).json({ error: 'Dialog ID and content or file required' });
    }

    // Проверяем, что operatorId установлен
    if (!req.operatorId) {
      console.error('operatorId not found in request');
      return res.status(401).json({ error: 'Operator ID not found' });
    }

    // Check if dialog exists and operator has access
    const dialogCheck = await query(
      `SELECT d.*, 
       EXISTS(SELECT 1 FROM dialog_participants WHERE dialog_id = d.id AND operator_id = $1 AND left_at IS NULL) as is_participant
       FROM dialogs d WHERE d.id = $2`,
      [req.operatorId, dialogId]
    );

    if (dialogCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Dialog not found' });
    }

    const dialog = dialogCheck.rows[0];
    
    // Разрешаем доступ если:
    // 1. Диалог назначен оператору, ИЛИ
    // 2. Оператор является участником, ИЛИ
    // 3. Диалог новый (не назначен никому) - любой оператор может взять его, ИЛИ
    // 4. Диалог закрыт, но был назначен оператору или оператор является участником
    const assignedOperatorId = dialog.assigned_operator_id ? parseInt(dialog.assigned_operator_id) : null;
    const operatorId = parseInt(req.operatorId as any);
    // PostgreSQL может вернуть boolean как строку 't'/'f' или true/false
    const isParticipant = dialog.is_participant === true || dialog.is_participant === 't' || dialog.is_participant === true;
    const isNewAndUnassigned = dialog.status === 'new' && !assignedOperatorId;
    const isClosedButAssigned = dialog.status === 'closed' && (assignedOperatorId === operatorId || isParticipant);
    const isClosedAndUnassigned = dialog.status === 'closed' && !assignedOperatorId;
    
    const hasAccess = 
      assignedOperatorId === operatorId || 
      isParticipant || 
      isNewAndUnassigned ||
      isClosedButAssigned ||
      isClosedAndUnassigned;

    if (!hasAccess) {
      console.error('Access denied for operator:', {
        operatorId,
        assignedOperatorId,
        isParticipant,
        dialogStatus: dialog.status,
        isNewAndUnassigned,
        dialogId: dialog.id
      });
      return res.status(403).json({ 
        error: 'Access denied. Dialog must be assigned to you, you must be a participant, or dialog must be new and unassigned.',
        details: {
          operatorId,
          assignedOperatorId,
          isParticipant,
          dialogStatus: dialog.status,
          isNewAndUnassigned
        }
      });
    }

    // Если диалог новый и не назначен, назначаем его текущему оператору
    const wasNewAndUnassigned = dialog.status === 'new' && !dialog.assigned_operator_id;
    if (wasNewAndUnassigned) {
      await query(
        `UPDATE dialogs 
         SET assigned_operator_id = $1, status = 'in_progress', 
             first_response_at = CURRENT_TIMESTAMP,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [req.operatorId, dialogId]
      );
    }

    // Если диалог закрыт, но оператор имеет доступ - открываем его обратно и назначаем оператору
    if (dialog.status === 'closed') {
      if (assignedOperatorId === operatorId || isParticipant) {
        // Диалог был назначен оператору - просто открываем
        await query(
          `UPDATE dialogs 
           SET status = 'in_progress', closed_at = NULL, updated_at = CURRENT_TIMESTAMP
           WHERE id = $1`,
          [dialogId]
        );
      } else if (!assignedOperatorId) {
        // Диалог закрыт и не назначен - назначаем текущему оператору и открываем
        await query(
          `UPDATE dialogs 
           SET assigned_operator_id = $1, status = 'in_progress', closed_at = NULL, updated_at = CURRENT_TIMESTAMP
           WHERE id = $2`,
          [req.operatorId, dialogId]
        );
      }
    }

    // Update dialog status and first response time (если диалог был назначен, но еще новый)
    if (dialog.status === 'new' && dialog.assigned_operator_id && !wasNewAndUnassigned) {
      await query(
        `UPDATE dialogs 
         SET status = 'in_progress', 
             first_response_at = COALESCE(first_response_at, CURRENT_TIMESTAMP),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [dialogId]
      );
    }

    const fileUrl = file ? `/uploads/${file.filename}` : null;
    const finalContentType = file ? 'file' : contentType;
    const messageContent = content || (file ? file.originalname : '');

    const result = await query(
      `INSERT INTO messages (dialog_id, operator_id, sender_type, content, content_type, file_url)
       VALUES ($1, $2, 'operator', $3, $4, $5)
       RETURNING *`,
      [dialogId, req.operatorId, messageContent, finalContentType, fileUrl]
    );

    const message = result.rows[0];

    // Emit to all participants
    io.emit(`dialog:${dialogId}:message`, message);

    // Отправляем сообщение в Telegram, если диалог из Telegram
    const dialogInfo = await query(
      `SELECT c.type, d.client_id 
       FROM dialogs d 
       JOIN channels c ON d.channel_id = c.id 
       WHERE d.id = $1`,
      [dialogId]
    );

    if (dialogInfo.rows.length > 0 && dialogInfo.rows[0].type === 'telegram') {
      const botToken = process.env.TELEGRAM_BOT_TOKEN;
      if (botToken) {
        const telegramService = new TelegramService(botToken);
        await telegramService.sendOperatorMessage(dialogId, messageContent);
      }
    }

    res.json(message);
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Edit message
router.put('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({ error: 'Content required' });
    }

    const result = await query(
      `UPDATE messages 
       SET content = $1, edited = true, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2 AND operator_id = $3 AND deleted = false
       RETURNING *`,
      [content, id, req.operatorId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Message not found or access denied' });
    }

    const message = result.rows[0];
    io.emit(`dialog:${message.dialog_id}:message:updated`, message);

    res.json(message);
  } catch (error) {
    console.error('Edit message error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete message (soft delete)
router.delete('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      `UPDATE messages 
       SET deleted = true, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND operator_id = $2
       RETURNING *`,
      [id, req.operatorId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Message not found or access denied' });
    }

    const message = result.rows[0];
    io.emit(`dialog:${message.dialog_id}:message:deleted`, { messageId: id });

    res.json({ message: 'Message deleted' });
  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
