import { Router } from 'express';
import { query } from '../database/connection';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';

const router = Router();

// Get quick phrases
router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const { category, operatorId } = req.query;

    let sql = `
      SELECT * FROM quick_phrases 
      WHERE operator_id = $1 OR operator_id IS NULL
    `;
    const params: any[] = [operatorId || req.operatorId];
    let paramCount = 1;

    if (category) {
      sql += ` AND category = $${++paramCount}`;
      params.push(category);
    }

    sql += ' ORDER BY category, created_at';

    const result = await query(sql, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Get templates error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create quick phrase
router.post('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const { phrase, category } = req.body;

    if (!phrase) {
      return res.status(400).json({ error: 'Phrase required' });
    }

    const result = await query(
      `INSERT INTO quick_phrases (operator_id, category, phrase)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [req.operatorId, category || null, phrase]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Create template error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update quick phrase
router.put('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { phrase, category } = req.body;

    const result = await query(
      `UPDATE quick_phrases 
       SET phrase = $1, category = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3 AND operator_id = $4
       RETURNING *`,
      [phrase, category, id, req.operatorId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update template error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete quick phrase
router.delete('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    await query(
      'DELETE FROM quick_phrases WHERE id = $1 AND operator_id = $2',
      [id, req.operatorId]
    );

    res.json({ message: 'Template deleted' });
  } catch (error) {
    console.error('Delete template error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
