import { Response } from 'express';
import crypto from 'crypto';
import { db } from '../config/database.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { allocateSmallestSuitableLocker } from '../services/lockerAllocationService.js';
import { generateOTP } from '../services/otpService.js';

export function registerParcel(req: AuthenticatedRequest, res: Response) {
  try {
    const user = req.user!;
    const {
      customer_name,
      customer_email,
      customer_phone,
      description,
      length_cm,
      width_cm,
      height_cm,
      weight_kg,
      pickup_deadline_hours = 48
    } = req.body;

    if (!customer_name || !customer_email || !customer_phone) {
      return res.status(400).json({ success: false, message: 'Customer name, email, and phone are required.' });
    }

    const pLength = parseFloat(length_cm);
    const pWidth = parseFloat(width_cm);
    const pHeight = parseFloat(height_cm);
    const pWeight = parseFloat(weight_kg || '1.0');

    if (isNaN(pLength) || isNaN(pWidth) || isNaN(pHeight) || pLength <= 0 || pWidth <= 0 || pHeight <= 0) {
      return res.status(400).json({ success: false, message: 'Please provide valid positive dimensions (Length, Width, Height).' });
    }

    // 1. Run Automatic Locker Allocation
    const allocation = allocateSmallestSuitableLocker(pLength, pWidth, pHeight, pWeight);
    if (!allocation.success || !allocation.locker) {
      return res.status(409).json({
        success: false,
        message: allocation.message || 'No suitable locker available currently.',
        allocation
      });
    }

    // 2. Prepare tracking number & deadlines
    const trackingNumber = `PKG-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    const deadlineHours = Math.max(1, parseInt(pickup_deadline_hours, 10) || 48);
    const pickupDeadline = new Date(Date.now() + deadlineHours * 3600 * 1000).toISOString();

    // 3. Generate unique OTP
    const otp = generateOTP(deadlineHours);

    // 4. Try to link existing customer account if email/phone matches
    const customerUser = db.prepare('SELECT id FROM users WHERE email = ? OR phone = ? LIMIT 1').get(customer_email.trim().toLowerCase(), customer_phone.trim()) as any;
    const customerUserId = customerUser ? customerUser.id : null;

    // 5. Execute Atomic Database Transaction
    let insertedParcelId: number | bigint = 0;

    const executeAllocation = db.transaction(() => {
      // Re-verify locker status inside transaction
      const currentLocker = db.prepare('SELECT status FROM lockers WHERE id = ?').get(allocation.locker!.id) as any;
      if (!currentLocker || currentLocker.status !== 'AVAILABLE') {
        throw new Error('Selected locker compartment was just claimed by another process. Please retry.');
      }

      // Insert parcel record
      const parcelStmt = db.prepare(`
        INSERT INTO parcels (
          tracking_number, vendor_id, customer_name, customer_email, customer_phone,
          customer_user_id, description, length_cm, width_cm, height_cm, weight_kg,
          required_size, locker_id, status, pickup_deadline
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'READY_FOR_PICKUP', ?)
      `);

      const result = parcelStmt.run(
        trackingNumber,
        user.id,
        customer_name.trim(),
        customer_email.trim().toLowerCase(),
        customer_phone.trim(),
        customerUserId,
        description ? description.trim() : null,
        pLength,
        pWidth,
        pHeight,
        pWeight,
        allocation.requiredSize,
        allocation.locker!.id,
        pickupDeadline
      );

      insertedParcelId = result.lastInsertRowid;

      // Update locker status to OCCUPIED
      db.prepare(`
        UPDATE lockers
        SET status = 'OCCUPIED', door_sensor_state = 'CLOSED', updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(allocation.locker!.id);

      // Insert OTP record
      db.prepare(`
        INSERT INTO otp_records (parcel_id, otp_code, otp_hash, status, expires_at)
        VALUES (?, ?, ?, 'ACTIVE', ?)
      `).run(insertedParcelId, otp.code, otp.hash, otp.expiresAt);

      // Record allocation history
      db.prepare(`
        INSERT INTO locker_allocation_history (locker_id, parcel_id, action, action_by_user_id, notes)
        VALUES (?, ?, 'ALLOCATED', ?, ?)
      `).run(
        allocation.locker!.id,
        insertedParcelId,
        user.id,
        allocation.isUpgraded
          ? `Auto-upgraded to ${allocation.allocatedSize} locker ${allocation.locker!.locker_code} (Required: ${allocation.requiredSize})`
          : `Allocated optimal ${allocation.allocatedSize} locker ${allocation.locker!.locker_code}`
      );
    });

    executeAllocation();

    // Simulated SMS dispatch content
    const smsSimulation = {
      recipient: customer_phone.trim(),
      message: `[Smart Locker Hub] Package ${trackingNumber} is ready for pickup at Locker ${allocation.locker!.locker_code} (${allocation.locker!.bay_number}). Your 6-digit pickup OTP is: ${otp.code}. Collect before ${new Date(pickupDeadline).toLocaleString()}.`,
      dispatched_at: new Date().toISOString()
    };

    return res.status(201).json({
      success: true,
      message: 'Parcel registered successfully and locker allocated.',
      parcel: {
        id: insertedParcelId,
        tracking_number: trackingNumber,
        customer_name,
        customer_phone,
        customer_email,
        description,
        length_cm: pLength,
        width_cm: pWidth,
        height_cm: pHeight,
        weight_kg: pWeight,
        required_size: allocation.requiredSize,
        allocated_size: allocation.allocatedSize,
        pickup_deadline: pickupDeadline,
        status: 'READY_FOR_PICKUP'
      },
      locker: allocation.locker,
      allocation_details: {
        required_size: allocation.requiredSize,
        allocated_size: allocation.allocatedSize,
        is_upgraded: allocation.isUpgraded,
        notes: allocation.message
      },
      otp_code: otp.code, // Returned for simulated UI & development review
      sms_simulation: smsSimulation
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message || 'Parcel registration failed.' });
  }
}

export function getParcels(req: AuthenticatedRequest, res: Response) {
  try {
    const user = req.user!;
    const { status, search } = req.query;

    let query = `
      SELECT p.*,
             l.locker_code, l.bay_number, l.size as locker_size,
             u.name as vendor_name, u.vendor_company,
             o.otp_code as current_otp, o.status as otp_status
      FROM parcels p
      LEFT JOIN lockers l ON p.locker_id = l.id
      LEFT JOIN users u ON p.vendor_id = u.id
      LEFT JOIN (
        SELECT parcel_id, otp_code, status, MAX(id) as max_id
        FROM otp_records
        GROUP BY parcel_id
      ) o ON p.id = o.parcel_id
      WHERE 1=1
    `;
    const params: any[] = [];

    // Role-based scoping
    if (user.role === 'VENDOR') {
      query += ' AND p.vendor_id = ?';
      params.push(user.id);
    } else if (user.role === 'CUSTOMER') {
      query += ' AND (p.customer_email = ? OR p.customer_phone = ? OR p.customer_user_id = ?)';
      params.push(user.email, user.phone, user.id);
    }

    if (status && status !== 'ALL') {
      query += ' AND p.status = ?';
      params.push(status);
    }

    if (search) {
      query += ' AND (p.tracking_number LIKE ? OR p.customer_name LIKE ? OR p.customer_phone LIKE ? OR p.description LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term, term, term);
    }

    query += ' ORDER BY p.id DESC';

    const parcels = db.prepare(query).all(...params);
    return res.json({ success: true, count: parcels.length, parcels });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export function getParcelById(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    const parcel = db.prepare(`
      SELECT p.*,
             l.locker_code, l.bay_number, l.size as locker_size, l.max_length_cm, l.max_width_cm, l.max_height_cm,
             u.name as vendor_name, u.vendor_company,
             o.otp_code as active_otp, o.status as otp_status, o.expires_at as otp_expires_at, o.attempts_count
      FROM parcels p
      LEFT JOIN lockers l ON p.locker_id = l.id
      LEFT JOIN users u ON p.vendor_id = u.id
      LEFT JOIN otp_records o ON p.id = o.parcel_id AND o.status = 'ACTIVE'
      WHERE p.id = ? OR p.tracking_number = ?
    `).get(id, id) as any;

    if (!parcel) {
      return res.status(404).json({ success: false, message: 'Parcel not found.' });
    }

    // Allocation history
    const history = db.prepare(`
      SELECT h.*, u.name as action_by_name
      FROM locker_allocation_history h
      LEFT JOIN users u ON h.action_by_user_id = u.id
      WHERE h.parcel_id = ?
      ORDER BY h.id ASC
    `).all(parcel.id);

    return res.json({ success: true, parcel, history });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}
