import { db } from '../config/database.js';

export interface ExpiryCheckResult {
  expiredCount: number;
  expiredParcels: Array<{
    id: number;
    tracking_number: string;
    locker_id: number;
    pickup_deadline: string;
  }>;
}

/**
 * Checks for uncollected parcels that exceeded their pickup deadlines.
 * Critical Business Rule: A locker does NOT become available automatically when expired;
 * it enters 'EXPIRED_HOLD' until Hub Staff physically removes the parcel.
 */
export function processExpiredParcels(): ExpiryCheckResult {
  const now = new Date().toISOString();

  // Find parcels where deadline has passed and still in READY_FOR_PICKUP / STORED state
  const overdueParcels = db.prepare(`
    SELECT id, tracking_number, locker_id, pickup_deadline, customer_name
    FROM parcels
    WHERE status IN ('READY_FOR_PICKUP', 'STORED')
      AND pickup_deadline < ?
  `).all(now) as any[];

  if (overdueParcels.length === 0) {
    return { expiredCount: 0, expiredParcels: [] };
  }

  const updateParcel = db.prepare(`
    UPDATE parcels
    SET status = 'EXPIRED', updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `);

  const updateLocker = db.prepare(`
    UPDATE lockers
    SET status = 'EXPIRED_HOLD', updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `);

  const expireOTP = db.prepare(`
    UPDATE otp_records
    SET status = 'EXPIRED'
    WHERE parcel_id = ? AND status = 'ACTIVE'
  `);

  const insertHistory = db.prepare(`
    INSERT INTO locker_allocation_history (locker_id, parcel_id, action, notes)
    VALUES (?, ?, 'EXPIRED_HOLD', 'Pickup deadline exceeded. Compartment held until staff physical retrieval.')
  `);

  const insertReturnRequest = db.prepare(`
    INSERT INTO return_requests (parcel_id, locker_id, initiated_by_user_id, reason, status, notes)
    VALUES (?, ?, 1, 'Pickup deadline exceeded (Uncollected parcel)', 'PENDING_CLEARANCE', 'Auto-created by expiry monitor. Awaiting physical hub staff clearance.')
  `);

  const runBatch = db.transaction(() => {
    for (const p of overdueParcels) {
      updateParcel.run(p.id);
      if (p.locker_id) {
        updateLocker.run(p.locker_id);
        insertHistory.run(p.locker_id, p.id);

        // Check if return request already exists
        const existing = db.prepare('SELECT id FROM return_requests WHERE parcel_id = ?').get(p.id);
        if (!existing) {
          insertReturnRequest.run(p.id, p.locker_id);
        }
      }
      expireOTP.run(p.id);
    }
  });

  runBatch();

  return {
    expiredCount: overdueParcels.length,
    expiredParcels: overdueParcels
  };
}

/**
 * Handles physical locker clearance by Hub Staff / Admin.
 * When staff physically removes the package from the compartment,
 * the locker is marked AVAILABLE and return status is advanced.
 */
export function clearLockerAndProcessReturn(
  returnRequestId: number,
  userId: number,
  notes?: string
) {
  const returnReq = db.prepare(`
    SELECT r.*, p.tracking_number, p.customer_name, l.locker_code
    FROM return_requests r
    JOIN parcels p ON r.parcel_id = p.id
    JOIN lockers l ON r.locker_id = l.id
    WHERE r.id = ?
  `).get(returnRequestId) as any;

  if (!returnReq) {
    throw new Error('Return request not found.');
  }

  if (returnReq.status === 'COMPLETED') {
    throw new Error('This return request has already been cleared and completed.');
  }

  const now = new Date().toISOString();

  const executeClearance = db.transaction(() => {
    // 1. Release locker back to AVAILABLE
    db.prepare(`
      UPDATE lockers
      SET status = 'AVAILABLE', door_sensor_state = 'CLOSED', updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(returnReq.locker_id);

    // 2. Update parcel to RETURNED
    db.prepare(`
      UPDATE parcels
      SET status = 'RETURNED', returned_at = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(now, returnReq.parcel_id);

    // 3. Update return request to COMPLETED
    db.prepare(`
      UPDATE return_requests
      SET status = 'COMPLETED',
          locker_cleared_at = ?,
          cleared_by_user_id = ?,
          completed_at = ?,
          notes = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      now,
      userId,
      now,
      notes || `Physical package removed from Locker ${returnReq.locker_code} by staff member. Locker returned to active rotation.`,
      returnRequestId
    );

    // 4. Record history
    db.prepare(`
      INSERT INTO locker_allocation_history (locker_id, parcel_id, action, action_by_user_id, notes)
      VALUES (?, ?, 'RELEASED', ?, ?)
    `).run(
      returnReq.locker_id,
      returnReq.parcel_id,
      userId,
      `Parcel physically cleared for return to vendor. Locker ${returnReq.locker_code} released.`
    );
  });

  executeClearance();

  return {
    success: true,
    message: `Locker ${returnReq.locker_code} successfully cleared and released. Parcel ${returnReq.tracking_number} marked as RETURNED.`
  };
}
