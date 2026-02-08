import { Router } from 'express';
import { query } from '../database/connection';
import twilio from 'twilio';

const router = Router();

// Generate and send SMS code
router.post('/send-code', async (req, res) => {
  try {
    const { phoneNumber } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({ error: 'Phone number required' });
    }

    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Save verification code
    await query(
      `INSERT INTO sms_verifications (phone_number, code, expires_at)
       VALUES ($1, $2, $3)`,
      [phoneNumber, code, expiresAt]
    );

    // Send SMS via Twilio (if configured)
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      const client = twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
      );

      await client.messages.create({
        body: `Ваш код подтверждения: ${code}`,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: phoneNumber
      });
    } else {
      // In development, just log the code
      console.log(`SMS Code for ${phoneNumber}: ${code}`);
    }

    res.json({ message: 'Code sent' });
  } catch (error) {
    console.error('Send SMS code error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Verify SMS code
router.post('/verify-code', async (req, res) => {
  try {
    const { phoneNumber, code } = req.body;

    if (!phoneNumber || !code) {
      return res.status(400).json({ error: 'Phone number and code required' });
    }

    const result = await query(
      `SELECT * FROM sms_verifications
       WHERE phone_number = $1 AND code = $2 AND expires_at > NOW() AND verified = false
       ORDER BY created_at DESC
       LIMIT 1`,
      [phoneNumber, code]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired code' });
    }

    // Mark as verified
    await query(
      `UPDATE sms_verifications SET verified = true WHERE id = $1`,
      [result.rows[0].id]
    );

    res.json({ verified: true, message: 'Code verified successfully' });
  } catch (error) {
    console.error('Verify SMS code error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
