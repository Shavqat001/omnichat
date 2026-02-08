import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../database/connection';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';

const router = Router();

// Login
router.post('/login', async (req, res) => {
  try {
    const { login, password } = req.body;

    if (!login || !password) {
      return res.status(400).json({ error: 'Login and password required' });
    }

    const result = await query(
      'SELECT id, login, password_hash, full_name, role, status FROM operators WHERE login = $1',
      [login]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const operator = result.rows[0];
    const isValid = await bcrypt.compare(password, operator.password_hash);

    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const secret: string = process.env.JWT_SECRET || 'secret';
    const expiresIn: string = process.env.JWT_EXPIRES_IN || '24h';
    
    const token = jwt.sign(
      { operatorId: operator.id, role: operator.role },
      secret,
      { expiresIn } as jwt.SignOptions
    );

    res.json({
      token,
      operator: {
        id: operator.id,
        login: operator.login,
        fullName: operator.full_name,
        role: operator.role,
        status: operator.status
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get current operator
router.get('/me', authenticate, async (req: AuthRequest, res) => {
  try {
    const result = await query(
      'SELECT id, login, full_name, phone_number, email, role, status, team_id FROM operators WHERE id = $1',
      [req.operatorId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Operator not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get operator error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update operator status
router.put('/status', authenticate, async (req: AuthRequest, res) => {
  try {
    const { status } = req.body;

    if (!['online', 'offline', 'break'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    await query(
      'UPDATE operators SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [status, req.operatorId]
    );

    res.json({ message: 'Status updated' });
  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
