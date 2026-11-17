import React, { useState } from 'react';
import {
  Database,
  Table,
  Copy,
  CheckCircle2,
  Key,
  Link,
  ShieldCheck,
  FileCode,
  Layers,
  Sparkles
} from 'lucide-react';

export const DatabaseSchemaPage: React.FC = () => {
  const [copied, setCopied] = useState(false);
  const [activeTable, setActiveTable] = useState<string>('all');

  const schemaTables = [
    {
      name: 'users',
      purpose: 'User accounts with role-based access (ADMIN, VENDOR, CUSTOMER, HUB_STAFF) and bcrypt passwords.',
      columns: [
        { name: 'id', type: 'INT AUTO_INCREMENT', key: 'PRIMARY KEY', desc: 'Unique identifier' },
        { name: 'name', type: 'VARCHAR(100)', key: '', desc: 'Full legal/display name' },
        { name: 'email', type: 'VARCHAR(150)', key: 'UNIQUE', desc: 'Login email address' },
        { name: 'password_hash', type: 'VARCHAR(255)', key: '', desc: 'Bcrypt encrypted password (cost factor 10)' },
        { name: 'phone', type: 'VARCHAR(25)', key: '', desc: 'Mobile phone for SMS OTP dispatch' },
        { name: 'role', type: "ENUM('ADMIN','VENDOR','CUSTOMER','HUB_STAFF')", key: 'INDEX', desc: 'Role authorization tier' },
        { name: 'vendor_company', type: 'VARCHAR(120)', key: '', desc: 'Courier organization (if vendor)' },
        { name: 'status', type: "ENUM('ACTIVE','SUSPENDED')", key: '', desc: 'Account status' }
      ]
    },
    {
      name: 'lockers',
      purpose: 'Physical hardware compartments with size specs, sensor states, and hardware statuses.',
      columns: [
        { name: 'id', type: 'INT AUTO_INCREMENT', key: 'PRIMARY KEY', desc: 'Unique locker ID' },
        { name: 'locker_code', type: 'VARCHAR(20)', key: 'UNIQUE', desc: 'Door code e.g. L-101, L-102' },
        { name: 'size', type: "ENUM('SMALL','MEDIUM','LARGE')", key: 'INDEX', desc: 'Compartment size category' },
        { name: 'max_length_cm', type: 'DECIMAL(6,2)', key: '', desc: 'Max depth threshold (e.g. 15, 30, 50 cm)' },
        { name: 'max_width_cm', type: 'DECIMAL(6,2)', key: '', desc: 'Max width threshold (e.g. 20, 35, 50 cm)' },
        { name: 'max_height_cm', type: 'DECIMAL(6,2)', key: '', desc: 'Max height threshold (e.g. 30, 45, 60 cm)' },
        { name: 'max_weight_kg', type: 'DECIMAL(6,2)', key: '', desc: 'Weight limit (10kg, 20kg, 35kg)' },
        { name: 'status', type: "ENUM('AVAILABLE','OCCUPIED','EXPIRED_HOLD','MAINTENANCE')", key: 'INDEX', desc: 'Live operational state' },
        { name: 'bay_number', type: 'VARCHAR(20)', key: '', desc: 'Hardware location bay (Bay-A, Bay-B)' },
        { name: 'door_sensor_state', type: "ENUM('CLOSED','OPEN')", key: '', desc: 'Magnetic contact sensor feedback' }
      ]
    },
    {
      name: 'parcels',
      purpose: 'Shipments registered by vendors, allocated to lockers, and collected by recipients.',
      columns: [
        { name: 'id', type: 'INT AUTO_INCREMENT', key: 'PRIMARY KEY', desc: 'Unique parcel ID' },
        { name: 'tracking_number', type: 'VARCHAR(50)', key: 'UNIQUE', desc: 'Parcel tracking code (e.g. PKG-884129)' },
        { name: 'vendor_id', type: 'INT', key: 'FOREIGN KEY -> users(id)', desc: 'Vendor who inwarded the parcel' },
        { name: 'customer_name', type: 'VARCHAR(100)', key: '', desc: 'Recipient name' },
        { name: 'customer_email', type: 'VARCHAR(150)', key: '', desc: 'Recipient email' },
        { name: 'customer_phone', type: 'VARCHAR(25)', key: 'INDEX', desc: 'Recipient phone number' },
        { name: 'length_cm, width_cm, height_cm', type: 'DECIMAL(6,2)', key: '', desc: 'Physical parcel dimensions' },
        { name: 'required_size', type: "ENUM('SMALL','MEDIUM','LARGE')", key: '', desc: 'Smallest calculated suitable size' },
        { name: 'locker_id', type: 'INT', key: 'FOREIGN KEY -> lockers(id)', desc: 'Allocated locker compartment' },
        { name: 'status', type: 'ENUM(...)', key: 'INDEX', desc: 'READY_FOR_PICKUP, PICKED_UP, EXPIRED, RETURNED' },
        { name: 'pickup_deadline', type: 'DATETIME', key: 'INDEX', desc: 'Expirable pickup window' }
      ]
    },
    {
      name: 'otp_records',
      purpose: 'Secure 6-digit one-time pickup codes hashed with bcrypt and protected against brute-force.',
      columns: [
        { name: 'id', type: 'INT AUTO_INCREMENT', key: 'PRIMARY KEY', desc: 'Unique OTP record ID' },
        { name: 'parcel_id', type: 'INT', key: 'FOREIGN KEY -> parcels(id)', desc: 'Associated parcel' },
        { name: 'otp_code', type: 'VARCHAR(10)', key: '', desc: 'Raw OTP (demo mode / SMS generation)' },
        { name: 'otp_hash', type: 'VARCHAR(255)', key: '', desc: 'Bcrypt hashed representation' },
        { name: 'status', type: "ENUM('ACTIVE','USED','EXPIRED','REVOKED')", key: 'INDEX', desc: 'OTP lifecycle state' },
        { name: 'attempts_count', type: 'INT', key: '', desc: 'Failed attempt counter' },
        { name: 'max_attempts', type: 'INT', key: '', desc: 'Max allowed attempts before lockout (4)' },
        { name: 'expires_at', type: 'DATETIME', key: '', desc: 'OTP expiration timestamp' }
      ]
    },
    {
      name: 'locker_allocation_history',
      purpose: 'Complete audit trail of every compartment event, door unlock, and occupancy turnover.',
      columns: [
        { name: 'id', type: 'INT AUTO_INCREMENT', key: 'PRIMARY KEY', desc: 'History event ID' },
        { name: 'locker_id', type: 'INT', key: 'FOREIGN KEY -> lockers(id)', desc: 'Locker compartment' },
        { name: 'parcel_id', type: 'INT', key: 'FOREIGN KEY -> parcels(id)', desc: 'Associated package' },
        { name: 'action', type: "ENUM('ALLOCATED','PICKED_UP','EXPIRED_HOLD','RELEASED','MAINTENANCE_HOLD')", key: '', desc: 'Lifecycle event' },
        { name: 'action_by_user_id', type: 'INT', key: 'FOREIGN KEY -> users(id)', desc: 'User or system trigger' },
        { name: 'notes', type: 'VARCHAR(255)', key: '', desc: 'Event explanation or auto-upgrade reason' },
        { name: 'action_time', type: 'DATETIME', key: '', desc: 'Timestamp of event' }
      ]
    },
    {
      name: 'return_requests',
      purpose: 'Tracks overdue packages, ensuring lockers remain locked until physical retrieval by hub staff.',
      columns: [
        { name: 'id', type: 'INT AUTO_INCREMENT', key: 'PRIMARY KEY', desc: 'Return request ID' },
        { name: 'parcel_id', type: 'INT', key: 'FOREIGN KEY -> parcels(id)', desc: 'Expired parcel' },
        { name: 'locker_id', type: 'INT', key: 'FOREIGN KEY -> lockers(id)', desc: 'Held locker compartment' },
        { name: 'reason', type: 'VARCHAR(255)', key: '', desc: 'Overdue or damaged parcel reason' },
        { name: 'status', type: "ENUM('PENDING_CLEARANCE','IN_TRANSIT','COMPLETED','CANCELLED')", key: 'INDEX', desc: 'Physical clearance status' },
        { name: 'cleared_by_user_id', type: 'INT', key: 'FOREIGN KEY -> users(id)', desc: 'Hub Staff who emptied locker' },
        { name: 'locker_cleared_at', type: 'DATETIME', key: '', desc: 'Timestamp when door opened and item removed' }
      ]
    }
  ];

  const rawSchemaSQL = `-- ============================================================================
-- PARCEL PICKUP HUB SYSTEM - MySQL Relational Database Schema
-- Academic Project: Smart Parcel Locker Management System
-- ============================================================================

CREATE DATABASE IF NOT EXISTS \`parcel_pickup_hub\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE \`parcel_pickup_hub\`;

CREATE TABLE IF NOT EXISTS \`users\` (
  \`id\` INT AUTO_INCREMENT PRIMARY KEY,
  \`name\` VARCHAR(100) NOT NULL,
  \`email\` VARCHAR(150) NOT NULL UNIQUE,
  \`password_hash\` VARCHAR(255) NOT NULL,
  \`phone\` VARCHAR(25) NOT NULL,
  \`role\` ENUM('ADMIN', 'VENDOR', 'CUSTOMER', 'HUB_STAFF') NOT NULL DEFAULT 'CUSTOMER',
  \`vendor_company\` VARCHAR(120) NULL,
  \`status\` ENUM('ACTIVE', 'SUSPENDED') NOT NULL DEFAULT 'ACTIVE',
  \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX \`idx_users_role\` (\`role\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS \`lockers\` (
  \`id\` INT AUTO_INCREMENT PRIMARY KEY,
  \`locker_code\` VARCHAR(20) NOT NULL UNIQUE,
  \`size\` ENUM('SMALL', 'MEDIUM', 'LARGE') NOT NULL,
  \`max_length_cm\` DECIMAL(6,2) NOT NULL,
  \`max_width_cm\` DECIMAL(6,2) NOT NULL,
  \`max_height_cm\` DECIMAL(6,2) NOT NULL,
  \`max_weight_kg\` DECIMAL(6,2) NOT NULL DEFAULT 25.00,
  \`status\` ENUM('AVAILABLE', 'OCCUPIED', 'EXPIRED_HOLD', 'MAINTENANCE') NOT NULL DEFAULT 'AVAILABLE',
  \`bay_number\` VARCHAR(20) NOT NULL DEFAULT 'Bay-A',
  \`door_sensor_state\` ENUM('CLOSED', 'OPEN') NOT NULL DEFAULT 'CLOSED',
  \`is_active\` TINYINT(1) NOT NULL DEFAULT 1,
  INDEX \`idx_lockers_status\` (\`status\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS \`parcels\` (
  \`id\` INT AUTO_INCREMENT PRIMARY KEY,
  \`tracking_number\` VARCHAR(50) NOT NULL UNIQUE,
  \`vendor_id\` INT NOT NULL,
  \`customer_name\` VARCHAR(100) NOT NULL,
  \`customer_email\` VARCHAR(150) NOT NULL,
  \`customer_phone\` VARCHAR(25) NOT NULL,
  \`length_cm\` DECIMAL(6,2) NOT NULL,
  \`width_cm\` DECIMAL(6,2) NOT NULL,
  \`height_cm\` DECIMAL(6,2) NOT NULL,
  \`weight_kg\` DECIMAL(6,2) NOT NULL DEFAULT 1.00,
  \`required_size\` ENUM('SMALL', 'MEDIUM', 'LARGE') NOT NULL,
  \`locker_id\` INT NULL,
  \`status\` ENUM('REGISTERED', 'STORED', 'READY_FOR_PICKUP', 'PICKED_UP', 'EXPIRED', 'RETURN_REQUESTED', 'RETURNED') NOT NULL DEFAULT 'READY_FOR_PICKUP',
  \`pickup_deadline\` DATETIME NOT NULL,
  \`stored_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  \`picked_up_at\` DATETIME NULL,
  FOREIGN KEY (\`vendor_id\`) REFERENCES \`users\`(\`id\`),
  FOREIGN KEY (\`locker_id\`) REFERENCES \`lockers\`(\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS \`otp_records\` (
  \`id\` INT AUTO_INCREMENT PRIMARY KEY,
  \`parcel_id\` INT NOT NULL,
  \`otp_code\` VARCHAR(10) NOT NULL,
  \`otp_hash\` VARCHAR(255) NOT NULL,
  \`status\` ENUM('ACTIVE', 'USED', 'EXPIRED', 'REVOKED') NOT NULL DEFAULT 'ACTIVE',
  \`attempts_count\` INT NOT NULL DEFAULT 0,
  \`max_attempts\` INT NOT NULL DEFAULT 4,
  \`expires_at\` DATETIME NOT NULL,
  FOREIGN KEY (\`parcel_id\`) REFERENCES \`parcels\`(\`id\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS \`locker_allocation_history\` (
  \`id\` INT AUTO_INCREMENT PRIMARY KEY,
  \`locker_id\` INT NOT NULL,
  \`parcel_id\` INT NOT NULL,
  \`action\` ENUM('ALLOCATED', 'PICKED_UP', 'EXPIRED_HOLD', 'RELEASED', 'MAINTENANCE_HOLD') NOT NULL,
  \`action_by_user_id\` INT NULL,
  \`notes\` VARCHAR(255) NULL,
  \`action_time\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (\`locker_id\`) REFERENCES \`lockers\`(\`id\`),
  FOREIGN KEY (\`parcel_id\`) REFERENCES \`parcels\`(\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS \`return_requests\` (
  \`id\` INT AUTO_INCREMENT PRIMARY KEY,
  \`parcel_id\` INT NOT NULL,
  \`locker_id\` INT NOT NULL,
  \`initiated_by_user_id\` INT NOT NULL,
  \`reason\` VARCHAR(255) NOT NULL DEFAULT 'Pickup deadline exceeded (Unclaimed parcel)',
  \`status\` ENUM('PENDING_CLEARANCE', 'IN_TRANSIT', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'PENDING_CLEARANCE',
  \`locker_cleared_at\` DATETIME NULL,
  FOREIGN KEY (\`parcel_id\`) REFERENCES \`parcels\`(\`id\`),
  FOREIGN KEY (\`locker_id\`) REFERENCES \`lockers\`(\`id\`),
  FOREIGN KEY (\`initiated_by_user_id\`) REFERENCES \`users\`(\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`;

  const handleCopy = () => {
    navigator.clipboard.writeText(rawSchemaSQL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-1">
            <Database className="w-4 h-4" />
            <span>Relational Database Architecture</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">MySQL Schema & System Architecture</h1>
          <p className="text-xs text-slate-400">
            Fully normalized 3NF relational design with foreign key constraints, atomic transactions, and audit trails.
          </p>
        </div>

        <button
          onClick={handleCopy}
          className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-md transition-colors flex items-center gap-2 self-start"
        >
          {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
          <span>{copied ? 'Copied schema.sql!' : 'Copy schema.sql Script'}</span>
        </button>
      </div>

      {/* Architecture Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-xs space-y-2">
          <div className="w-8 h-8 rounded-lg bg-[#EFF6FF] text-[#2453D4] flex items-center justify-center mb-1">
            <Layers className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-bold text-[#172033]">Smallest-Fit Locker Allocation</h3>
          <p className="text-xs text-[#697586] leading-relaxed">
            Parcel dimensions (L, W, H, weight) are tested across 3D rotations against locker specs (Small, Medium, Large) to assign the smallest available compartment.
          </p>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-xs space-y-2">
          <div className="w-8 h-8 rounded-lg bg-[#DCFCE7] text-[#16A34A] flex items-center justify-center mb-1">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-bold text-[#172033]">Brute-Force Resilient OTPs</h3>
          <p className="text-xs text-[#697586] leading-relaxed">
            Every parcel generates a unique 6-digit cryptographic code stored with bcrypt hashing. Auto-lockout after 4 consecutive invalid attempts.
          </p>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-xs space-y-2">
          <div className="w-8 h-8 rounded-lg bg-[#FEE2E2] text-[#DC2626] flex items-center justify-center mb-1">
            <Sparkles className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-bold text-[#172033]">Physical Retention Rule</h3>
          <p className="text-xs text-[#697586] leading-relaxed">
            Expired packages transition compartments to <code>EXPIRED_HOLD</code>. Lockers are never released until physical retrieval is logged by staff.
          </p>
        </div>
      </div>

      {/* Relational Tables Explorer */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-[#172033] flex items-center gap-2">
            <Table className="w-4 h-4 text-[#2453D4]" />
            <span>Database Tables & Data Dictionary (schema.sql)</span>
          </h3>
          <span className="text-xs text-[#697586] font-mono">6 Normalized Tables</span>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {schemaTables.map(tbl => (
            <div key={tbl.name} className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-xs space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#E2E8F0] gap-2">
                <div className="flex items-center gap-2.5">
                  <span className="font-mono font-bold text-[#172033] text-base">`{tbl.name}`</span>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#F0F3F9] text-[#475569]">
                    {tbl.columns.length} Fields
                  </span>
                </div>
                <p className="text-xs text-[#697586]">{tbl.purpose}</p>
              </div>

              <div className="overflow-x-auto rounded-lg border border-[#E2E8F0]">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#EAF0F8] text-[#172033] font-semibold text-[11px]">
                    <tr>
                      <th className="py-2 px-3">Column Name</th>
                      <th className="py-2 px-3">SQL Data Type</th>
                      <th className="py-2 px-3">Constraint / Key</th>
                      <th className="py-2 px-3">Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0] text-[11px]">
                    {tbl.columns.map(col => (
                      <tr key={col.name} className="hover:bg-[#F8FAFC]">
                        <td className="py-2 px-3 font-bold text-[#2453D4] font-mono">{col.name}</td>
                        <td className="py-2 px-3 text-[#172033] font-mono">{col.type}</td>
                        <td className="py-2 px-3">
                          {col.key.includes('PRIMARY') ? (
                            <span className="text-amber-600 font-semibold flex items-center gap-1 font-mono">
                              <Key className="w-3 h-3" />
                              {col.key}
                            </span>
                          ) : col.key.includes('FOREIGN') ? (
                            <span className="text-sky-600 font-semibold flex items-center gap-1 font-mono">
                              <Link className="w-3 h-3" />
                              {col.key}
                            </span>
                          ) : col.key.includes('UNIQUE') ? (
                            <span className="text-emerald-600 font-semibold font-mono">{col.key}</span>
                          ) : (
                            <span className="text-[#697586] font-mono">{col.key || '—'}</span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-[#697586]">{col.desc}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Raw SQL Preview Block */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
          <div className="flex items-center gap-2">
            <FileCode className="w-4 h-4 text-[#2453D4]" />
            <h4 className="text-sm font-bold text-[#172033] font-mono">database/schema.sql Source</h4>
          </div>
          <button
            onClick={handleCopy}
            className="text-xs text-[#2453D4] hover:underline font-medium flex items-center gap-1"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>Copy SQL</span>
          </button>
        </div>

        <pre className="p-4 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] font-mono text-[11px] text-[#172033] overflow-x-auto max-h-96 leading-relaxed">
          {rawSchemaSQL}
        </pre>
      </div>
    </div>
  );
};
