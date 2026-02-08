import { Router } from 'express';
import { query } from '../database/connection';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';
import { io } from '../index';

const router = Router();

// Get all dialogs with filters
router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const {
      status,
      channelId,
      type,
      startDate,
      endDate,
      rating,
      assignedTo,
      view = 'all'
    } = req.query;

    let sql = `
      SELECT d.*, c.name as channel_name, c.type as channel_type,
             o.full_name as operator_name,
             (SELECT COUNT(*) FROM messages WHERE dialog_id = d.id) as message_count
      FROM dialogs d
      LEFT JOIN channels c ON d.channel_id = c.id
      LEFT JOIN operators o ON d.assigned_operator_id = o.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramCount = 0;

    // Filter by view (incoming/my/all)
    if (view === 'incoming') {
      sql += ` AND d.status = 'new'`;
    } else if (view === 'my') {
      sql += ` AND d.assigned_operator_id = $${++paramCount}`;
      params.push(req.operatorId);
    }

    if (status) {
      sql += ` AND d.status = $${++paramCount}`;
      params.push(status);
    }

    if (channelId) {
      sql += ` AND d.channel_id = $${++paramCount}`;
      params.push(channelId);
    }

    if (startDate) {
      sql += ` AND d.created_at >= $${++paramCount}`;
      params.push(startDate);
    }

    if (endDate) {
      sql += ` AND d.created_at <= $${++paramCount}`;
      params.push(endDate);
    }

    if (rating) {
      sql += ` AND d.rating = $${++paramCount}`;
      params.push(rating);
    }

    if (assignedTo) {
      sql += ` AND d.assigned_operator_id = $${++paramCount}`;
      params.push(assignedTo);
    }

    sql += ` ORDER BY d.created_at DESC LIMIT 100`;

    const result = await query(sql, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Get dialogs error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single dialog
router.get('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const dialogResult = await query(
      `SELECT d.*, c.name as channel_name, c.type as channel_type,
              o.full_name as operator_name
       FROM dialogs d
       LEFT JOIN channels c ON d.channel_id = c.id
       LEFT JOIN operators o ON d.assigned_operator_id = o.id
       WHERE d.id = $1`,
      [id]
    );

    if (dialogResult.rows.length === 0) {
      return res.status(404).json({ error: 'Dialog not found' });
    }

    // Get participants
    const participantsResult = await query(
      `SELECT op.id, op.full_name, op.status, dp.joined_at
       FROM dialog_participants dp
       JOIN operators op ON dp.operator_id = op.id
       WHERE dp.dialog_id = $1 AND dp.left_at IS NULL`,
      [id]
    );

    const dialog = dialogResult.rows[0];
    dialog.participants = participantsResult.rows;

    res.json(dialog);
  } catch (error) {
    console.error('Get dialog error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Assign dialog to operator
router.post('/:id/assign', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { operatorId } = req.body;

    await query(
      `UPDATE dialogs 
       SET assigned_operator_id = $1, status = 'in_progress', updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [operatorId || req.operatorId, id]
    );

    io.emit('dialog:assigned', { dialogId: id, operatorId: operatorId || req.operatorId });
    res.json({ message: 'Dialog assigned' });
  } catch (error) {
    console.error('Assign dialog error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Transfer dialog to another operator
router.post('/:id/transfer', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { operatorId } = req.body;

    if (!operatorId) {
      return res.status(400).json({ error: 'Operator ID required' });
    }

    await query(
      `UPDATE dialogs 
       SET assigned_operator_id = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [operatorId, id]
    );

    io.emit('dialog:transferred', { dialogId: id, operatorId });
    res.json({ message: 'Dialog transferred' });
  } catch (error) {
    console.error('Transfer dialog error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Invite operator to dialog
router.post('/:id/invite', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { operatorId } = req.body;

    if (!operatorId) {
      return res.status(400).json({ error: 'Operator ID required' });
    }

    await query(
      `INSERT INTO dialog_participants (dialog_id, operator_id, invited_by)
       VALUES ($1, $2, $3)
       ON CONFLICT DO NOTHING`,
      [id, operatorId, req.operatorId]
    );

    io.emit('dialog:invited', { dialogId: id, operatorId, invitedBy: req.operatorId });
    res.json({ message: 'Operator invited' });
  } catch (error) {
    console.error('Invite operator error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Mark dialog as spam
router.post('/:id/spam', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    await query(
      `UPDATE dialogs SET status = 'spam', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [id]
    );

    res.json({ message: 'Dialog marked as spam' });
  } catch (error) {
    console.error('Mark spam error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Close dialog
router.post('/:id/close', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    await query(
      `UPDATE dialogs 
       SET status = 'closed', closed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [id]
    );

    io.emit('dialog:closed', { dialogId: id });
    res.json({ message: 'Dialog closed' });
  } catch (error) {
    console.error('Close dialog error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Rate dialog
router.post('/:id/rate', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { rating } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    await query(
      `UPDATE dialogs SET rating = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [rating, id]
    );

    res.json({ message: 'Rating saved' });
  } catch (error) {
    console.error('Rate dialog error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
