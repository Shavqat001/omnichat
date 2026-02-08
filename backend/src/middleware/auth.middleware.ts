import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { query } from '../database/connection';

export interface AuthRequest extends Request {
  operatorId?: number;
  operatorRole?: string;
}

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as any;
    
    // Verify operator still exists
    const result = await query(
      'SELECT id, role FROM operators WHERE id = $1',
      [decoded.operatorId]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    req.operatorId = decoded.operatorId;
    req.operatorRole = result.rows[0].role;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

export const requireAdmin = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  if (req.operatorRole !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};
