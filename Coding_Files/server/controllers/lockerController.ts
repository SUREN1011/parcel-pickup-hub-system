import { Response } from 'express';
import { db } from '../config/database.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { LOCKER_SPECS, LockerSize } from '../services/lockerAllocationService.js';

export function getLockers(req: AuthenticatedRequest, res: Response) {
  try {
    const { bay, status, size } = req.query;

    let query = `
      SELECT l.*,
             p.id as parcel_id, p.tracking_number, p.customer_name, p.customer_phone,
             p.pickup_deadline, p.stored_at, p.status as parcel_status,
             o.otp_code as current_otp
      FROM lockers l
      LEFT JOIN parcels p ON l.id = p.locker_id AND p.status IN ('READY_FOR_PICKUP', 'STORED', 'EXPIRED')
      LEFT JOIN otp_records o ON p.id = o.parcel_id AND o.status = 'ACTIVE'
      WHERE 1=1
    `;
    const params: any[] = [];

    if (bay && bay !== 'ALL') {
      query += ' AND l.bay_number = ?';
      params.push(bay);
    }
    if (status && status !== 'ALL') {
      query += ' AND l.status = ?';
      params.push(status);
    }
    if (size && size !== 'ALL') {
      query += ' AND l.size = ?';
      params.push(size);
    }

    query += ' ORDER BY l.bay_number ASC, l.locker_code ASC';

    const lockers = db.prepare(query).all(...params);

    // Compute stats
    const total = lockers.length;
    const available = lockers.filter((l: any) => l.status === 'AVAILABLE').length;
    const occupied = lockers.filter((l: any) => l.status === 'OCCUPIED').length;
    const expiredHold = lockers.filter((l: any) => l.status === 'EXPIRED_HOLD').length;
    const maintenance = lockers.filter((l: any) => l.status === 'MAINTENANCE').length;

    return res.json({
      success: true,
      summary: {
        total,
        available,
        occupied,
        expired_hold: expiredHold,
        maintenance,
        occupancy_rate: total > 0 ? Math.round(((occupied + expiredHold) / total) * 100) : 0
      },
      lockers
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export function addLocker(req: AuthenticatedRequest, res: Response) {
  try {
    const { locker_code, size, bay_number = 'Bay-A' } = req.body;

    if (!locker_code || !size) {
      return res.status(400).json({ success: false, message: 'Locker code and size are required.' });
    }

    const code = locker_code.trim().toUpperCase();
    const existing = db.prepare('SELECT id FROM lockers WHERE locker_code = ?').get(code);
    if (existing) {
      return res.status(409).json({ success: false, message: `Locker code "${code}" already exists.` });
    }

    const validSize = (size.toUpperCase() as LockerSize);
    const spec = LOCKER_SPECS[validSize];
    if (!spec) {
      return res.status(400).json({ success: false, message: 'Invalid size. Must be SMALL, MEDIUM, or LARGE.' });
    }

    const result = db.prepare(`
      INSERT INTO lockers (locker_code, size, max_length_cm, max_width_cm, max_height_cm, max_weight_kg, status, bay_number, door_sensor_state, is_active)
      VALUES (?, ?, ?, ?, ?, ?, 'AVAILABLE', ?, 'CLOSED', 1)
    `).run(code, validSize, spec.maxLength, spec.maxWidth, spec.maxHeight, spec.maxWeight, bay_number.trim());

    return res.status(201).json({
      success: true,
      message: `Locker ${code} (${validSize}) added successfully.`,
      lockerId: result.lastInsertRowid
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export function updateLockerStatus(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    const { status, door_sensor_state, is_active } = req.body;

    const locker = db.prepare('SELECT * FROM lockers WHERE id = ?').get(id) as any;
    if (!locker) {
      return res.status(404).json({ success: false, message: 'Locker not found.' });
    }

    // If changing to MAINTENANCE, verify no active parcel is inside
    if (status === 'MAINTENANCE' && (locker.status === 'OCCUPIED' || locker.status === 'EXPIRED_HOLD')) {
      return res.status(400).json({
        success: false,
        message: 'Cannot place locker in maintenance while it holds an active or expired parcel. Clear the parcel first.'
      });
    }

    const newStatus = status || locker.status;
    const newSensorState = door_sensor_state || locker.door_sensor_state;
    const newIsActive = is_active !== undefined ? (is_active ? 1 : 0) : locker.is_active;

    db.prepare(`
      UPDATE lockers
      SET status = ?, door_sensor_state = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(newStatus, newSensorState, newIsActive, id);

    // Audit log if status changed
    if (newStatus !== locker.status) {
      db.prepare(`
        INSERT INTO locker_allocation_history (locker_id, parcel_id, action, action_by_user_id, notes)
        VALUES (?, 0, 'MAINTENANCE_HOLD', ?, ?)
      `).run(id, req.user!.id, `Locker status updated to ${newStatus}`);
    }

    return res.json({ success: true, message: `Locker ${locker.locker_code} updated successfully.` });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export function getLockerHistory(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    const history = db.prepare(`
      SELECT h.*, p.tracking_number, p.customer_name, u.name as action_by_name
      FROM locker_allocation_history h
      LEFT JOIN parcels p ON h.parcel_id = p.id
      LEFT JOIN users u ON h.action_by_user_id = u.id
      WHERE h.locker_id = ?
      ORDER BY h.id DESC
      LIMIT 50
    `).all(id);

    return res.json({ success: true, history });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}
