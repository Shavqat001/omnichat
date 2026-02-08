import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../database/connection';
import { authenticate, AuthRequest, requireAdmin } from '../middleware/auth.middleware';

const router = Router();

// All routes require admin access
router.use(authenticate);
router.use(requireAdmin);

// Create operator
router.post('/operators', async (req: AuthRequest, res) => {
  try {
    const { login, password, fullName, phoneNumber, email, role, teamId } = req.body;

    if (!login || !password || !fullName) {
      return res.status(400).json({ error: 'Login, password and full name required' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const result = await query(
      `INSERT INTO operators (login, password_hash, full_name, phone_number, email, role, team_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, login, full_name, phone_number, email, role, status`,
      [login, passwordHash, fullName, phoneNumber || null, email || null, role || 'operator', teamId || null]
    );

    res.json(result.rows[0]);
  } catch (error: any) {
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Login already exists' });
    }
    console.error('Create operator error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update operator
router.put('/operators/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { login, fullName, phoneNumber, email, role, teamId } = req.body;

    const updates: string[] = [];
    const params: any[] = [];
    let paramCount = 0;

    if (login) {
      updates.push(`login = $${++paramCount}`);
      params.push(login);
    }
    if (fullName) {
      updates.push(`full_name = $${++paramCount}`);
      params.push(fullName);
    }
    if (phoneNumber !== undefined) {
      updates.push(`phone_number = $${++paramCount}`);
      params.push(phoneNumber);
    }
    if (email !== undefined) {
      updates.push(`email = $${++paramCount}`);
      params.push(email);
    }
    if (role) {
      updates.push(`role = $${++paramCount}`);
      params.push(role);
    }
    if (teamId !== undefined) {
      updates.push(`team_id = $${++paramCount}`);
      params.push(teamId);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    params.push(id);

    const result = await query(
      `UPDATE operators 
       SET ${updates.join(', ')}
       WHERE id = $${++paramCount}
       RETURNING id, login, full_name, phone_number, email, role, status, team_id`,
      params
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Operator not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update operator error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete operator
router.delete('/operators/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    if (id === req.operatorId?.toString()) {
      return res.status(400).json({ error: 'Cannot delete yourself' });
    }

    await query('DELETE FROM operators WHERE id = $1', [id]);
    res.json({ message: 'Operator deleted' });
  } catch (error) {
    console.error('Delete operator error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create team
router.post('/teams', async (req: AuthRequest, res) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Team name required' });
    }

    const result = await query(
      `INSERT INTO teams (name, description)
       VALUES ($1, $2)
       RETURNING *`,
      [name, description || null]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Create team error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all teams
router.get('/teams', async (req: AuthRequest, res) => {
  try {
    const result = await query('SELECT * FROM teams ORDER BY name');
    res.json(result.rows);
  } catch (error) {
    console.error('Get teams error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
