import { Request, Response } from 'express';
import { db } from '../config/database.js';
import { verifyOTP } from '../services/otpService.js';
import { AuthenticatedRequest } from '../middleware/auth.js';

export function verifyPickupOTP(req: Request, res: Response) {
  try {
    const { identifier, otp_code } = req.body;

    if (!identifier || !otp_code) {
      return res.status(400).json({
        success: false,
        message: 'Please provide tracking number (or phone number) and the 6-digit OTP.'
      });
    }

    const result = verifyOTP(identifier, otp_code);
    if (!result.valid) {
      return res.status(400).json({
        success: false,
        message: result.message,
        attemptsRemaining: result.attemptsRemaining
      });
    }

    return res.json({
      success: true,
      message: 'OTP verified successfully! Locker compartment unlocked.',
      parcel: result.parcel,
      locker: result.locker
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message || 'OTP verification error.' });
  }
}

export function confirmPickup(req: AuthenticatedRequest, res: Response) {
  try {
    const { parcel_id, locker_id, otp_code } = req.body;

    if (!parcel_id || !locker_id) {
      return res.status(400).json({ success: false, message: 'Parcel ID and Locker ID are required.' });
    }

    const parcel = db.prepare('SELECT * FROM parcels WHERE id = ?').get(parcel_id) as any;
    if (!parcel) {
      return res.status(404).json({ success: false, message: 'Parcel record not found.' });
    }

    if (parcel.status === 'PICKED_UP') {
      return res.status(400).json({ success: false, message: 'This parcel has already been picked up.' });
    }

    const locker = db.prepare('SELECT * FROM lockers WHERE id = ?').get(locker_id) as any;
    if (!locker) {
      return res.status(404).json({ success: false, message: 'Locker record not found.' });
    }

    const now = new Date().toISOString();
    const currentUserId = req.user ? req.user.id : (parcel.customer_user_id || null);

    // Database Transaction: update parcel, release locker, mark OTP used, log history
    const executePickup = db.transaction(() => {
      // 1. Update parcel
      db.prepare(`
        UPDATE parcels
        SET status = 'PICKED_UP', picked_up_at = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(now, parcel.id);

      // 2. Release locker back to AVAILABLE (sensor door cycles open -> closed)
      db.prepare(`
        UPDATE lockers
        SET status = 'AVAILABLE', door_sensor_state = 'CLOSED', updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(locker.id);

      // 3. Mark OTP as USED
      db.prepare(`
        UPDATE otp_records
        SET status = 'USED', used_at = ?
        WHERE parcel_id = ? AND status = 'ACTIVE'
      `).run(now, parcel.id);

      // 4. Audit history
      db.prepare(`
        INSERT INTO locker_allocation_history (locker_id, parcel_id, action, action_by_user_id, notes)
        VALUES (?, ?, 'PICKED_UP', ?, ?)
      `).run(
        locker.id,
        parcel.id,
        currentUserId,
        `Customer successfully verified OTP and retrieved package ${parcel.tracking_number}. Compartment released.`
      );
    });

    executePickup();

    return res.json({
      success: true,
      message: `Pickup confirmed! Locker door ${locker.locker_code} has been opened, package retrieved, and compartment safely released.`,
      pickup_receipt: {
        tracking_number: parcel.tracking_number,
        customer_name: parcel.customer_name,
        locker_code: locker.locker_code,
        bay_number: locker.bay_number,
        picked_up_at: now
      }
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message || 'Pickup confirmation error.' });
  }
}
