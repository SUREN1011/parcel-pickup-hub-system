import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';

const dbDir = path.resolve(process.cwd(), 'database');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'parcel_hub.sqlite');
export const db = new Database(dbPath);

// Enforce foreign key constraints
db.pragma('foreign_keys = ON');

export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      phone TEXT NOT NULL,
      role TEXT CHECK(role IN ('ADMIN', 'VENDOR', 'CUSTOMER', 'HUB_STAFF')) NOT NULL DEFAULT 'CUSTOMER',
      vendor_company TEXT,
      status TEXT CHECK(status IN ('ACTIVE', 'SUSPENDED')) NOT NULL DEFAULT 'ACTIVE',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS lockers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      locker_code TEXT NOT NULL UNIQUE,
      size TEXT CHECK(size IN ('SMALL', 'MEDIUM', 'LARGE')) NOT NULL,
      max_length_cm REAL NOT NULL,
      max_width_cm REAL NOT NULL,
      max_height_cm REAL NOT NULL,
      max_weight_kg REAL NOT NULL DEFAULT 25.0,
      status TEXT CHECK(status IN ('AVAILABLE', 'OCCUPIED', 'EXPIRED_HOLD', 'MAINTENANCE')) NOT NULL DEFAULT 'AVAILABLE',
      bay_number TEXT NOT NULL DEFAULT 'Bay-A',
      door_pin TEXT,
      door_sensor_state TEXT CHECK(door_sensor_state IN ('CLOSED', 'OPEN')) NOT NULL DEFAULT 'CLOSED',
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS parcels (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tracking_number TEXT NOT NULL UNIQUE,
      vendor_id INTEGER NOT NULL REFERENCES users(id),
      customer_name TEXT NOT NULL,
      customer_email TEXT NOT NULL,
      customer_phone TEXT NOT NULL,
      customer_user_id INTEGER REFERENCES users(id),
      description TEXT,
      length_cm REAL NOT NULL,
      width_cm REAL NOT NULL,
      height_cm REAL NOT NULL,
      weight_kg REAL NOT NULL DEFAULT 1.0,
      required_size TEXT CHECK(required_size IN ('SMALL', 'MEDIUM', 'LARGE')) NOT NULL,
      locker_id INTEGER REFERENCES lockers(id),
      status TEXT CHECK(status IN ('REGISTERED', 'STORED', 'READY_FOR_PICKUP', 'PICKED_UP', 'EXPIRED', 'RETURN_REQUESTED', 'RETURNED')) NOT NULL DEFAULT 'READY_FOR_PICKUP',
      pickup_deadline DATETIME NOT NULL,
      stored_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      picked_up_at DATETIME,
      returned_at DATETIME,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS otp_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      parcel_id INTEGER NOT NULL REFERENCES parcels(id) ON DELETE CASCADE,
      otp_code TEXT NOT NULL,
      otp_hash TEXT NOT NULL,
      status TEXT CHECK(status IN ('ACTIVE', 'USED', 'EXPIRED', 'REVOKED')) NOT NULL DEFAULT 'ACTIVE',
      attempts_count INTEGER NOT NULL DEFAULT 0,
      max_attempts INTEGER NOT NULL DEFAULT 4,
      expires_at DATETIME NOT NULL,
      used_at DATETIME,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS locker_allocation_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      locker_id INTEGER NOT NULL REFERENCES lockers(id) ON DELETE CASCADE,
      parcel_id INTEGER NOT NULL REFERENCES parcels(id) ON DELETE CASCADE,
      action TEXT CHECK(action IN ('ALLOCATED', 'PICKED_UP', 'EXPIRED_HOLD', 'RELEASED', 'MAINTENANCE_HOLD')) NOT NULL,
      action_by_user_id INTEGER REFERENCES users(id),
      notes TEXT,
      action_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS return_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      parcel_id INTEGER NOT NULL REFERENCES parcels(id) ON DELETE CASCADE,
      locker_id INTEGER NOT NULL REFERENCES lockers(id),
      initiated_by_user_id INTEGER NOT NULL REFERENCES users(id),
      reason TEXT NOT NULL DEFAULT 'Pickup deadline exceeded (Unclaimed parcel)',
      status TEXT CHECK(status IN ('PENDING_CLEARANCE', 'IN_TRANSIT', 'COMPLETED', 'CANCELLED')) NOT NULL DEFAULT 'PENDING_CLEARANCE',
      locker_cleared_at DATETIME,
      cleared_by_user_id INTEGER REFERENCES users(id),
      completed_at DATETIME,
      notes TEXT,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_lockers_status ON lockers(status);
    CREATE INDEX IF NOT EXISTS idx_parcels_status ON parcels(status);
    CREATE INDEX IF NOT EXISTS idx_parcels_tracking ON parcels(tracking_number);
    CREATE INDEX IF NOT EXISTS idx_otp_parcel ON otp_records(parcel_id);
  `);

  seedInitialData();
}

function seedInitialData() {
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
  if (userCount.count === 0) {
    const defaultPassword = 'Password123!';
    const hash = bcrypt.hashSync(defaultPassword, 10);

    const insertUser = db.prepare(`
      INSERT INTO users (name, email, password_hash, phone, role, vendor_company)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    insertUser.run('System Administrator', 'admin@hub.local', hash, '+15550100001', 'ADMIN', null);
    insertUser.run('Apex Logistics', 'apex@vendor.local', hash, '+15550100002', 'VENDOR', 'Apex Express Logistics');
    insertUser.run('FastTrack Couriers', 'fasttrack@vendor.local', hash, '+15550100003', 'VENDOR', 'FastTrack Couriers LLC');
    insertUser.run('Sarah Jenkins', 'sarah@customer.local', hash, '+15550100004', 'CUSTOMER', null);
    insertUser.run('David Chen', 'david@customer.local', hash, '+15550100005', 'CUSTOMER', null);
    insertUser.run('Elena Rostova', 'staff@hub.local', hash, '+15550100006', 'HUB_STAFF', null);
  }

  const lockerCount = db.prepare('SELECT COUNT(*) as count FROM lockers').get() as { count: number };
  if (lockerCount.count === 0) {
    const insertLocker = db.prepare(`
      INSERT INTO lockers (locker_code, size, max_length_cm, max_width_cm, max_height_cm, max_weight_kg, status, bay_number, door_sensor_state)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // Bay-A: 6 lockers
    insertLocker.run('L-101', 'SMALL', 15.0, 20.0, 30.0, 10.0, 'AVAILABLE', 'Bay-A', 'CLOSED');
    insertLocker.run('L-102', 'SMALL', 15.0, 20.0, 30.0, 10.0, 'AVAILABLE', 'Bay-A', 'CLOSED');
    insertLocker.run('L-103', 'SMALL', 15.0, 20.0, 30.0, 10.0, 'AVAILABLE', 'Bay-A', 'CLOSED');
    insertLocker.run('L-104', 'SMALL', 15.0, 20.0, 30.0, 10.0, 'AVAILABLE', 'Bay-A', 'CLOSED');
    insertLocker.run('L-105', 'MEDIUM', 30.0, 35.0, 45.0, 20.0, 'AVAILABLE', 'Bay-A', 'CLOSED');
    insertLocker.run('L-106', 'MEDIUM', 30.0, 35.0, 45.0, 20.0, 'AVAILABLE', 'Bay-A', 'CLOSED');

    // Bay-B: 6 lockers
    insertLocker.run('L-107', 'MEDIUM', 30.0, 35.0, 45.0, 20.0, 'AVAILABLE', 'Bay-B', 'CLOSED');
    insertLocker.run('L-108', 'MEDIUM', 30.0, 35.0, 45.0, 20.0, 'AVAILABLE', 'Bay-B', 'CLOSED');
    insertLocker.run('L-109', 'LARGE', 50.0, 50.0, 60.0, 35.0, 'AVAILABLE', 'Bay-B', 'CLOSED');
    insertLocker.run('L-110', 'LARGE', 50.0, 50.0, 60.0, 35.0, 'AVAILABLE', 'Bay-B', 'CLOSED');
    insertLocker.run('L-111', 'LARGE', 50.0, 50.0, 60.0, 35.0, 'AVAILABLE', 'Bay-B', 'CLOSED');
    insertLocker.run('L-112', 'SMALL', 15.0, 20.0, 30.0, 10.0, 'MAINTENANCE', 'Bay-B', 'CLOSED');
  }

  // Seed sample demonstration parcels if empty
  const parcelCount = db.prepare('SELECT COUNT(*) as count FROM parcels').get() as { count: number };
  if (parcelCount.count === 0) {
    const now = new Date();
    const futureDeadline = new Date(now.getTime() + 48 * 3600 * 1000).toISOString();
    const pastDeadline = new Date(now.getTime() - 12 * 3600 * 1000).toISOString(); // Expired 12 hours ago

    // Parcel 1: Ready for pickup in Locker L-101 for Sarah Jenkins
    const parcel1 = db.prepare(`
      INSERT INTO parcels (tracking_number, vendor_id, customer_name, customer_email, customer_phone, customer_user_id, description, length_cm, width_cm, height_cm, weight_kg, required_size, locker_id, status, pickup_deadline)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run('PKG-884129', 2, 'Sarah Jenkins', 'sarah@customer.local', '+15550100004', 4, 'Noise Cancelling Headphones', 12.0, 18.0, 22.0, 0.8, 'SMALL', 1, 'READY_FOR_PICKUP', futureDeadline);

    // Mark locker L-101 occupied
    db.prepare("UPDATE lockers SET status = 'OCCUPIED' WHERE id = 1").run();

    // OTP for Parcel 1: 582914
    const otpHash1 = bcrypt.hashSync('582914', 10);
    db.prepare(`
      INSERT INTO otp_records (parcel_id, otp_code, otp_hash, status, expires_at)
      VALUES (?, ?, ?, 'ACTIVE', ?)
    `).run(parcel1.lastInsertRowid, '582914', otpHash1, futureDeadline);

    db.prepare(`
      INSERT INTO locker_allocation_history (locker_id, parcel_id, action, notes)
      VALUES (1, ?, 'ALLOCATED', 'Auto-allocated to Small Locker L-101')
    `).run(parcel1.lastInsertRowid);

    // Parcel 2: Expired parcel in Locker L-105 for David Chen (for return workflow testing)
    const parcel2 = db.prepare(`
      INSERT INTO parcels (tracking_number, vendor_id, customer_name, customer_email, customer_phone, customer_user_id, description, length_cm, width_cm, height_cm, weight_kg, required_size, locker_id, status, pickup_deadline)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run('PKG-772901', 3, 'David Chen', 'david@customer.local', '+15550100005', 5, 'Mechanical Keyboard & Desk Mat', 28.0, 32.0, 38.0, 2.5, 'MEDIUM', 5, 'EXPIRED', pastDeadline);

    // Mark locker L-105 as EXPIRED_HOLD
    db.prepare("UPDATE lockers SET status = 'EXPIRED_HOLD' WHERE id = 5").run();

    const otpHash2 = bcrypt.hashSync('918234', 10);
    db.prepare(`
      INSERT INTO otp_records (parcel_id, otp_code, otp_hash, status, expires_at)
      VALUES (?, ?, ?, 'EXPIRED', ?)
    `).run(parcel2.lastInsertRowid, '918234', otpHash2, pastDeadline);

    db.prepare(`
      INSERT INTO locker_allocation_history (locker_id, parcel_id, action, notes)
      VALUES (5, ?, 'EXPIRED_HOLD', 'Pickup window expired; held awaiting staff physical return')
    `).run(parcel2.lastInsertRowid);

    // Return request for Parcel 2
    db.prepare(`
      INSERT INTO return_requests (parcel_id, locker_id, initiated_by_user_id, reason, status, notes)
      VALUES (?, 5, 1, 'Pickup deadline exceeded (Unclaimed parcel after 48h)', 'PENDING_CLEARANCE', 'Parcel awaits physical removal by Hub Staff')
    `).run(parcel2.lastInsertRowid);
  }
}
