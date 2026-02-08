import { Router } from 'express';
import { query } from '../database/connection';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';

const router = Router();

// Get all operators
router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const { status, teamId } = req.query;

    let sql = 'SELECT id, login, full_name, phone_number, email, status, role, team_id FROM operators WHERE 1=1';
    const params: any[] = [];
    let paramCount = 0;

    if (status) {
      sql += ` AND status = $${++paramCount}`;
      params.push(status);
    }

    if (teamId) {
      sql += ` AND team_id = $${++paramCount}`;
      params.push(teamId);
    }

    sql += ' ORDER BY full_name';

    const result = await query(sql, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Get operators error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get operator statistics
router.get('/:id/statistics', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { startDate, endDate } = req.query;

    let sql = `
      SELECT 
        COUNT(DISTINCT d.id) as total_dialogs,
        COUNT(DISTINCT CASE WHEN d.status = 'closed' THEN d.id END) as closed_dialogs,
        COUNT(DISTINCT CASE WHEN d.status = 'new' THEN d.id END) as missed_dialogs,
        AVG(s.avg_response_time) as avg_response_time,
        AVG(d.rating) as avg_rating,
        SUM(CASE WHEN d.rating IS NOT NULL THEN 1 ELSE 0 END) as rating_count
      FROM operators o
      LEFT JOIN dialogs d ON d.assigned_operator_id = o.id
      LEFT JOIN statistics s ON s.operator_id = o.id
      WHERE o.id = $1
    `;

    const params: any[] = [id];
    let paramCount = 1;

    if (startDate) {
      sql += ` AND d.created_at >= $${++paramCount}`;
      params.push(startDate);
    }

    if (endDate) {
      sql += ` AND d.created_at <= $${++paramCount}`;
      params.push(endDate);
    }

    const result = await query(sql, params);
    res.json(result.rows[0] || {});
  } catch (error) {
    console.error('Get operator statistics error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
