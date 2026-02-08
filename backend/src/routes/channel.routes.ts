import { Router } from 'express';
import { query } from '../database/connection';
import { authenticate, AuthRequest, requireAdmin } from '../middleware/auth.middleware';

const router = Router();

// Get all channels
router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const result = await query(
      'SELECT * FROM channels WHERE enabled = true ORDER BY name'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Get channels error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create channel (admin only)
router.post('/', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { name, type, apiConfig } = req.body;

    if (!name || !type) {
      return res.status(400).json({ error: 'Name and type required' });
    }

    const result = await query(
      `INSERT INTO channels (name, type, api_config)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [name, type, JSON.stringify(apiConfig || {})]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Create channel error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update channel (admin only)
router.put('/:id', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { name, type, apiConfig, enabled } = req.body;

    const result = await query(
      `UPDATE channels 
       SET name = COALESCE($1, name),
           type = COALESCE($2, type),
           api_config = COALESCE($3, api_config),
           enabled = COALESCE($4, enabled)
       WHERE id = $5
       RETURNING *`,
      [name, type, apiConfig ? JSON.stringify(apiConfig) : null, enabled, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Channel not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update channel error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
