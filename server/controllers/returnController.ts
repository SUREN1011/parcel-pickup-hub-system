import { Response } from 'express';
import { db } from '../config/database.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { processExpiredParcels, clearLockerAndProcessReturn } from '../services/expiryService.js';

export function getReturnRequests(req: AuthenticatedRequest, res: Response) {
  try {
    const { status } = req.query;

    let query = `
      SELECT r.*,
             p.tracking_number, p.customer_name, p.customer_phone, p.customer_email,
             p.description, p.pickup_deadline, p.stored_at,
             l.locker_code, l.bay_number, l.size as locker_size,
             u1.name as initiated_by_name,
             u2.name as cleared_by_name
      FROM return_requests r
      JOIN parcels p ON r.parcel_id = p.id
      JOIN lockers l ON r.locker_id = l.id
      LEFT JOIN users u1 ON r.initiated_by_user_id = u1.id
      LEFT JOIN users u2 ON r.cleared_by_user_id = u2.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (status && status !== 'ALL') {
      query += ' AND r.status = ?';
      params.push(status);
    }

    query += ' ORDER BY r.id DESC';

    const returns = db.prepare(query).all(...params);
    return res.json({ success: true, count: returns.length, returns });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export function initiateReturn(req: AuthenticatedRequest, res: Response) {
  try {
    const { parcel_id, reason } = req.body;
    const user = req.user!;

    if (!parcel_id) {
      return res.status(400).json({ success: false, message: 'Parcel ID is required.' });
    }

    const parcel = db.prepare('SELECT * FROM parcels WHERE id = ?').get(parcel_id) as any;
    if (!parcel) {
      return res.status(404).json({ success: false, message: 'Parcel not found.' });
    }

    if (parcel.status === 'PICKED_UP') {
      return res.status(400).json({ success: false, message: 'Cannot return a parcel that has already been picked up.' });
    }
    if (parcel.status === 'RETURNED') {
      return res.status(400).json({ success: false, message: 'This parcel has already been returned.' });
    }

    const lockerId = parcel.locker_id;
    if (!lockerId) {
      return res.status(400).json({ success: false, message: 'No locker assigned to this parcel.' });
    }

    // Check if return already in progress
    const existing = db.prepare("SELECT id FROM return_requests WHERE parcel_id = ? AND status != 'CANCELLED'").get(parcel_id);
    if (existing) {
      return res.status(409).json({ success: false, message: 'A return request is already active for this parcel.' });
    }

    const returnReason = reason || 'Pickup window exceeded / Customer requested return';

    const executeReturnInit = db.transaction(() => {
      db.prepare(`
        UPDATE parcels
        SET status = 'RETURN_REQUESTED', updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(parcel_id);

      db.prepare(`
        UPDATE lockers
        SET status = 'EXPIRED_HOLD', updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(lockerId);

      db.prepare(`
        INSERT INTO return_requests (parcel_id, locker_id, initiated_by_user_id, reason, status)
        VALUES (?, ?, ?, ?, 'PENDING_CLEARANCE')
      `).run(parcel_id, lockerId, user.id, returnReason);

      db.prepare(`
        INSERT INTO locker_allocation_history (locker_id, parcel_id, action, action_by_user_id, notes)
        VALUES (?, ?, 'EXPIRED_HOLD', ?, ?)
      `).run(lockerId, parcel_id, user.id, `Return initiated: ${returnReason}. Compartment held for clearance.`);
    });

    executeReturnInit();

    return res.status(201).json({
      success: true,
      message: 'Return request created. Locker is held until Hub Staff physically removes the parcel.'
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export function clearLockerAndComplete(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    const { notes } = req.body;
    const user = req.user!;

    const result = clearLockerAndProcessReturn(parseInt(id, 10), user.id, notes);
    return res.json(result);
  } catch (err: any) {
    return res.status(400).json({ success: false, message: err.message });
  }
}

export function triggerExpiryCheck(req: AuthenticatedRequest, res: Response) {
  try {
    const result = processExpiredParcels();
    return res.json({
      success: true,
      message: `Expiry monitor completed. Processed ${result.expiredCount} newly expired parcel(s).`,
      details: result
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}
