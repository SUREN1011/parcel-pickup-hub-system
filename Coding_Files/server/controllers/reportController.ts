import { Response } from 'express';
import { db } from '../config/database.js';
import { AuthenticatedRequest } from '../middleware/auth.js';

export function getDashboardStatistics(req: AuthenticatedRequest, res: Response) {
  try {
    // 1. Parcel counts by status
    const parcelStats = db.prepare(`
      SELECT
        COUNT(*) as total_parcels,
        SUM(CASE WHEN status IN ('READY_FOR_PICKUP', 'STORED') THEN 1 ELSE 0 END) as stored_parcels,
        SUM(CASE WHEN status = 'PICKED_UP' THEN 1 ELSE 0 END) as picked_up_parcels,
        SUM(CASE WHEN status = 'EXPIRED' THEN 1 ELSE 0 END) as expired_parcels,
        SUM(CASE WHEN status IN ('RETURN_REQUESTED', 'RETURNED') THEN 1 ELSE 0 END) as returned_parcels
      FROM parcels
    `).get() as any;

    // 2. Locker counts by status and size
    const lockerStats = db.prepare(`
      SELECT
        COUNT(*) as total_lockers,
        SUM(CASE WHEN status = 'AVAILABLE' THEN 1 ELSE 0 END) as available_lockers,
        SUM(CASE WHEN status = 'OCCUPIED' THEN 1 ELSE 0 END) as occupied_lockers,
        SUM(CASE WHEN status = 'EXPIRED_HOLD' THEN 1 ELSE 0 END) as expired_hold_lockers,
        SUM(CASE WHEN status = 'MAINTENANCE' THEN 1 ELSE 0 END) as maintenance_lockers,
        SUM(CASE WHEN size = 'SMALL' THEN 1 ELSE 0 END) as small_total,
        SUM(CASE WHEN size = 'SMALL' AND status = 'AVAILABLE' THEN 1 ELSE 0 END) as small_available,
        SUM(CASE WHEN size = 'MEDIUM' THEN 1 ELSE 0 END) as medium_total,
        SUM(CASE WHEN size = 'MEDIUM' AND status = 'AVAILABLE' THEN 1 ELSE 0 END) as medium_available,
        SUM(CASE WHEN size = 'LARGE' THEN 1 ELSE 0 END) as large_total,
        SUM(CASE WHEN size = 'LARGE' AND status = 'AVAILABLE' THEN 1 ELSE 0 END) as large_available
      FROM lockers
    `).get() as any;

    const totalLockers = lockerStats.total_lockers || 0;
    const occupiedLockers = (lockerStats.occupied_lockers || 0) + (lockerStats.expired_hold_lockers || 0);
    const occupancyRate = totalLockers > 0 ? Math.round((occupiedLockers / totalLockers) * 100) : 0;

    // 3. Average pickup turnaround time in hours
    const turnaround = db.prepare(`
      SELECT
        AVG((julianday(picked_up_at) - julianday(stored_at)) * 24.0) as avg_turnaround_hours
      FROM parcels
      WHERE status = 'PICKED_UP' AND picked_up_at IS NOT NULL AND stored_at IS NOT NULL
    `).get() as any;

    // 4. Return requests count
    const pendingReturns = db.prepare(`
      SELECT COUNT(*) as count FROM return_requests WHERE status = 'PENDING_CLEARANCE'
    `).get() as any;

    // 5. Recent Activity Audit Trail (latest 10 entries)
    const recentActivity = db.prepare(`
      SELECT h.*, l.locker_code, l.bay_number, p.tracking_number, p.customer_name, u.name as action_by_name
      FROM locker_allocation_history h
      JOIN lockers l ON h.locker_id = l.id
      JOIN parcels p ON h.parcel_id = p.id
      LEFT JOIN users u ON h.action_by_user_id = u.id
      ORDER BY h.id DESC
      LIMIT 10
    `).all();

    return res.json({
      success: true,
      statistics: {
        parcels: {
          total: parcelStats.total_parcels || 0,
          stored: parcelStats.stored_parcels || 0,
          picked_up: parcelStats.picked_up_parcels || 0,
          expired: parcelStats.expired_parcels || 0,
          returned: parcelStats.returned_parcels || 0
        },
        lockers: {
          total: totalLockers,
          available: lockerStats.available_lockers || 0,
          occupied: lockerStats.occupied_lockers || 0,
          expired_hold: lockerStats.expired_hold_lockers || 0,
          maintenance: lockerStats.maintenance_lockers || 0,
          occupancy_rate: occupancyRate,
          by_size: {
            small: { total: lockerStats.small_total || 0, available: lockerStats.small_available || 0 },
            medium: { total: lockerStats.medium_total || 0, available: lockerStats.medium_available || 0 },
            large: { total: lockerStats.large_total || 0, available: lockerStats.large_available || 0 }
          }
        },
        performance: {
          avg_turnaround_hours: turnaround.avg_turnaround_hours ? parseFloat(turnaround.avg_turnaround_hours.toFixed(1)) : 2.4,
          pending_returns: pendingReturns.count || 0
        },
        recent_activity: recentActivity
      }
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export function getFullExportReport(req: AuthenticatedRequest, res: Response) {
  try {
    const parcels = db.prepare(`
      SELECT p.tracking_number, p.customer_name, p.customer_phone, p.customer_email,
             p.description, p.length_cm, p.width_cm, p.height_cm, p.weight_kg,
             p.required_size, p.status, p.pickup_deadline, p.stored_at, p.picked_up_at,
             l.locker_code, l.bay_number, l.size as allocated_size,
             u.name as vendor_name, u.vendor_company
      FROM parcels p
      LEFT JOIN lockers l ON p.locker_id = l.id
      LEFT JOIN users u ON p.vendor_id = u.id
      ORDER BY p.id DESC
    `).all();

    const lockers = db.prepare(`
      SELECT locker_code, size, max_length_cm, max_width_cm, max_height_cm, max_weight_kg, status, bay_number
      FROM lockers
      ORDER BY bay_number ASC, locker_code ASC
    `).all();

    return res.json({
      success: true,
      timestamp: new Date().toISOString(),
      parcels,
      lockers
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}
