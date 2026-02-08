import { Router } from 'express';
import { query } from '../database/connection';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';
import ExcelJS from 'exceljs';

const router = Router();

// Get general statistics
router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const { startDate, endDate, period = 'daily' } = req.query;

    let dateFormat = "DATE(created_at)";
    if (period === 'monthly') {
      dateFormat = "DATE_TRUNC('month', created_at)";
    } else if (period === 'quarterly') {
      dateFormat = "DATE_TRUNC('quarter', created_at)";
    } else if (period === 'yearly') {
      dateFormat = "DATE_TRUNC('year', created_at)";
    }

    let sql = `
      SELECT 
        ${dateFormat} as period,
        COUNT(*) as total_dialogs,
        COUNT(CASE WHEN status = 'new' THEN 1 END) as new_dialogs,
        COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress_dialogs,
        COUNT(CASE WHEN status = 'closed' THEN 1 END) as closed_dialogs,
        COUNT(CASE WHEN status = 'spam' THEN 1 END) as spam_dialogs,
        AVG(rating) as avg_rating,
        COUNT(CASE WHEN rating IS NOT NULL THEN 1 END) as rated_dialogs
      FROM dialogs
      WHERE 1=1
    `;

    const params: any[] = [];
    let paramCount = 0;

    if (startDate) {
      sql += ` AND created_at >= $${++paramCount}`;
      params.push(startDate);
    }

    if (endDate) {
      sql += ` AND created_at <= $${++paramCount}`;
      params.push(endDate);
    }

    sql += ` GROUP BY ${dateFormat} ORDER BY period DESC`;

    const result = await query(sql, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Get statistics error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get channel statistics
router.get('/channels', authenticate, async (req: AuthRequest, res) => {
  try {
    const { startDate, endDate } = req.query;

    let sql = `
      SELECT 
        c.id,
        c.name,
        c.type,
        COUNT(d.id) as total_dialogs,
        COUNT(CASE WHEN d.status = 'closed' THEN 1 END) as closed_dialogs,
        AVG(d.rating) as avg_rating
      FROM channels c
      LEFT JOIN dialogs d ON d.channel_id = c.id
      WHERE 1=1
    `;

    const params: any[] = [];
    let paramCount = 0;

    if (startDate) {
      sql += ` AND d.created_at >= $${++paramCount}`;
      params.push(startDate);
    }

    if (endDate) {
      sql += ` AND d.created_at <= $${++paramCount}`;
      params.push(endDate);
    }

    sql += ` GROUP BY c.id, c.name, c.type ORDER BY total_dialogs DESC`;

    const result = await query(sql, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Get channel statistics error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Export statistics to Excel
router.get('/export', authenticate, async (req: AuthRequest, res) => {
  try {
    const { startDate, endDate, period = 'daily' } = req.query;

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Statistics');

    // Get statistics data
    let dateFormat = "DATE(created_at)";
    if (period === 'monthly') {
      dateFormat = "DATE_TRUNC('month', created_at)";
    } else if (period === 'quarterly') {
      dateFormat = "DATE_TRUNC('quarter', created_at)";
    } else if (period === 'yearly') {
      dateFormat = "DATE_TRUNC('year', created_at)";
    }

    let sql = `
      SELECT 
        ${dateFormat} as period,
        COUNT(*) as total_dialogs,
        COUNT(CASE WHEN status = 'closed' THEN 1 END) as closed_dialogs,
        COUNT(CASE WHEN status = 'new' THEN 1 END) as new_dialogs,
        AVG(rating) as avg_rating
      FROM dialogs
      WHERE 1=1
    `;

    const params: any[] = [];
    let paramCount = 0;

    if (startDate) {
      sql += ` AND created_at >= $${++paramCount}`;
      params.push(startDate);
    }

    if (endDate) {
      sql += ` AND created_at <= $${++paramCount}`;
      params.push(endDate);
    }

    sql += ` GROUP BY ${dateFormat} ORDER BY period`;

    const result = await query(sql, params);

    // Set headers
    worksheet.columns = [
      { header: 'Period', key: 'period', width: 20 },
      { header: 'Total Dialogs', key: 'total_dialogs', width: 15 },
      { header: 'Closed Dialogs', key: 'closed_dialogs', width: 15 },
      { header: 'New Dialogs', key: 'new_dialogs', width: 15 },
      { header: 'Average Rating', key: 'avg_rating', width: 15 }
    ];

    // Add data
    result.rows.forEach(row => {
      worksheet.addRow(row);
    });

    // Set response headers
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=statistics.xlsx');

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Export statistics error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
