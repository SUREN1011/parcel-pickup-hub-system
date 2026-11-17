-- ============================================================================
-- PARCEL PICKUP HUB SYSTEM - MySQL Relational Database Schema
-- Academic Project: Smart Parcel Locker Management System
-- ============================================================================

CREATE DATABASE IF NOT EXISTS `parcel_pickup_hub` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `parcel_pickup_hub`;

-- 1. Users Table (Role-based access: ADMIN, VENDOR, CUSTOMER, HUB_STAFF)
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `email` VARCHAR(150) NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL,
  `phone` VARCHAR(25) NOT NULL,
  `role` ENUM('ADMIN', 'VENDOR', 'CUSTOMER', 'HUB_STAFF') NOT NULL DEFAULT 'CUSTOMER',
  `vendor_company` VARCHAR(120) NULL,
  `status` ENUM('ACTIVE', 'SUSPENDED') NOT NULL DEFAULT 'ACTIVE',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_users_role` (`role`),
  INDEX `idx_users_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Lockers Table (Physical locker hardware units)
-- Sizes: S (Small: 15x20x30 cm), M (Medium: 30x35x45 cm), L (Large: 50x50x60 cm)
-- Status: AVAILABLE, OCCUPIED, EXPIRED_HOLD, MAINTENANCE
CREATE TABLE IF NOT EXISTS `lockers` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `locker_code` VARCHAR(20) NOT NULL UNIQUE,
  `size` ENUM('SMALL', 'MEDIUM', 'LARGE') NOT NULL,
  `max_length_cm` DECIMAL(6,2) NOT NULL,
  `max_width_cm` DECIMAL(6,2) NOT NULL,
  `max_height_cm` DECIMAL(6,2) NOT NULL,
  `max_weight_kg` DECIMAL(6,2) NOT NULL DEFAULT 25.00,
  `status` ENUM('AVAILABLE', 'OCCUPIED', 'EXPIRED_HOLD', 'MAINTENANCE') NOT NULL DEFAULT 'AVAILABLE',
  `bay_number` VARCHAR(20) NOT NULL DEFAULT 'Bay-A',
  `door_pin` VARCHAR(10) NULL,
  `door_sensor_state` ENUM('CLOSED', 'OPEN') NOT NULL DEFAULT 'CLOSED',
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_lockers_status` (`status`),
  INDEX `idx_lockers_size` (`size`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Parcels Table
-- Status: REGISTERED, STORED, READY_FOR_PICKUP, PICKED_UP, EXPIRED, RETURN_REQUESTED, RETURNED
CREATE TABLE IF NOT EXISTS `parcels` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `tracking_number` VARCHAR(50) NOT NULL UNIQUE,
  `vendor_id` INT NOT NULL,
  `customer_name` VARCHAR(100) NOT NULL,
  `customer_email` VARCHAR(150) NOT NULL,
  `customer_phone` VARCHAR(25) NOT NULL,
  `customer_user_id` INT NULL,
  `description` VARCHAR(255) NULL,
  `length_cm` DECIMAL(6,2) NOT NULL,
  `width_cm` DECIMAL(6,2) NOT NULL,
  `height_cm` DECIMAL(6,2) NOT NULL,
  `weight_kg` DECIMAL(6,2) NOT NULL DEFAULT 1.00,
  `required_size` ENUM('SMALL', 'MEDIUM', 'LARGE') NOT NULL,
  `locker_id` INT NULL,
  `status` ENUM('REGISTERED', 'STORED', 'READY_FOR_PICKUP', 'PICKED_UP', 'EXPIRED', 'RETURN_REQUESTED', 'RETURNED') NOT NULL DEFAULT 'READY_FOR_PICKUP',
  `pickup_deadline` DATETIME NOT NULL,
  `stored_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `picked_up_at` DATETIME NULL,
  `returned_at` DATETIME NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`vendor_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT,
  FOREIGN KEY (`customer_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`locker_id`) REFERENCES `lockers`(`id`) ON DELETE SET NULL,
  INDEX `idx_parcels_status` (`status`),
  INDEX `idx_parcels_tracking` (`tracking_number`),
  INDEX `idx_parcels_customer_phone` (`customer_phone`),
  INDEX `idx_parcels_deadline` (`pickup_deadline`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. OTP Records Table (Unique secure verification codes per parcel)
CREATE TABLE IF NOT EXISTS `otp_records` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `parcel_id` INT NOT NULL,
  `otp_code` VARCHAR(10) NOT NULL,
  `otp_hash` VARCHAR(255) NOT NULL,
  `status` ENUM('ACTIVE', 'USED', 'EXPIRED', 'REVOKED') NOT NULL DEFAULT 'ACTIVE',
  `attempts_count` INT NOT NULL DEFAULT 0,
  `max_attempts` INT NOT NULL DEFAULT 4,
  `expires_at` DATETIME NOT NULL,
  `used_at` DATETIME NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`parcel_id`) REFERENCES `parcels`(`id`) ON DELETE CASCADE,
  INDEX `idx_otp_parcel` (`parcel_id`),
  INDEX `idx_otp_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Locker Allocation History Table (Audit trail for locker compartments)
CREATE TABLE IF NOT EXISTS `locker_allocation_history` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `locker_id` INT NOT NULL,
  `parcel_id` INT NOT NULL,
  `action` ENUM('ALLOCATED', 'PICKED_UP', 'EXPIRED_HOLD', 'RELEASED', 'MAINTENANCE_HOLD') NOT NULL,
  `action_by_user_id` INT NULL,
  `notes` VARCHAR(255) NULL,
  `action_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`locker_id`) REFERENCES `lockers`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`parcel_id`) REFERENCES `parcels`(`id`) ON DELETE CASCADE,
  INDEX `idx_history_locker` (`locker_id`),
  INDEX `idx_history_parcel` (`parcel_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Return Requests Table (Management of expired or uncollected parcels)
CREATE TABLE IF NOT EXISTS `return_requests` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `parcel_id` INT NOT NULL,
  `locker_id` INT NOT NULL,
  `initiated_by_user_id` INT NOT NULL,
  `reason` VARCHAR(255) NOT NULL DEFAULT 'Pickup deadline exceeded (Unclaimed parcel)',
  `status` ENUM('PENDING_CLEARANCE', 'IN_TRANSIT', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'PENDING_CLEARANCE',
  `locker_cleared_at` DATETIME NULL,
  `cleared_by_user_id` INT NULL,
  `completed_at` DATETIME NULL,
  `notes` TEXT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`parcel_id`) REFERENCES `parcels`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`locker_id`) REFERENCES `lockers`(`id`) ON DELETE RESTRICT,
  FOREIGN KEY (`initiated_by_user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT,
  FOREIGN KEY (`cleared_by_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  INDEX `idx_returns_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- SEED DATA
-- Default Passwords for seed users: "Password123!" (bcrypt hashed)
-- ============================================================================

INSERT INTO `users` (`id`, `name`, `email`, `password_hash`, `phone`, `role`, `vendor_company`, `status`) VALUES
(1, 'System Administrator', 'admin@hub.local', '$2a$10$2u1c8kYvM8zMvd8aQo0h..O6vJ1.TfqB.2bO/j3YF9oE84Y.l5.7C', '+15550100001', 'ADMIN', NULL, 'ACTIVE'),
(2, 'Apex Logistics (Vendor)', 'apex@vendor.local', '$2a$10$2u1c8kYvM8zMvd8aQo0h..O6vJ1.TfqB.2bO/j3YF9oE84Y.l5.7C', '+15550100002', 'VENDOR', 'Apex Express Logistics', 'ACTIVE'),
(3, 'FastTrack Couriers (Vendor)', 'fasttrack@vendor.local', '$2a$10$2u1c8kYvM8zMvd8aQo0h..O6vJ1.TfqB.2bO/j3YF9oE84Y.l5.7C', '+15550100003', 'VENDOR', 'FastTrack Couriers LLC', 'ACTIVE'),
(4, 'Sarah Jenkins (Customer)', 'sarah@customer.local', '$2a$10$2u1c8kYvM8zMvd8aQo0h..O6vJ1.TfqB.2bO/j3YF9oE84Y.l5.7C', '+15550100004', 'CUSTOMER', NULL, 'ACTIVE'),
(5, 'David Chen (Customer)', 'david@customer.local', '$2a$10$2u1c8kYvM8zMvd8aQo0h..O6vJ1.TfqB.2bO/j3YF9oE84Y.l5.7C', '+15550100005', 'CUSTOMER', NULL, 'ACTIVE'),
(6, 'Elena Rostova (Hub Staff)', 'staff@hub.local', '$2a$10$2u1c8kYvM8zMvd8aQo0h..O6vJ1.TfqB.2bO/j3YF9oE84Y.l5.7C', '+15550100006', 'HUB_STAFF', NULL, 'ACTIVE');

-- Seed Lockers (Grid of Small, Medium, Large lockers across Bay-A and Bay-B)
INSERT INTO `lockers` (`id`, `locker_code`, `size`, `max_length_cm`, `max_width_cm`, `max_height_cm`, `max_weight_kg`, `status`, `bay_number`, `door_sensor_state`) VALUES
(1, 'L-101', 'SMALL', 15.00, 20.00, 30.00, 10.00, 'AVAILABLE', 'Bay-A', 'CLOSED'),
(2, 'L-102', 'SMALL', 15.00, 20.00, 30.00, 10.00, 'AVAILABLE', 'Bay-A', 'CLOSED'),
(3, 'L-103', 'SMALL', 15.00, 20.00, 30.00, 10.00, 'AVAILABLE', 'Bay-A', 'CLOSED'),
(4, 'L-104', 'SMALL', 15.00, 20.00, 30.00, 10.00, 'AVAILABLE', 'Bay-A', 'CLOSED'),
(5, 'L-105', 'MEDIUM', 30.00, 35.00, 45.00, 20.00, 'AVAILABLE', 'Bay-A', 'CLOSED'),
(6, 'L-106', 'MEDIUM', 30.00, 35.00, 45.00, 20.00, 'AVAILABLE', 'Bay-A', 'CLOSED'),
(7, 'L-107', 'MEDIUM', 30.00, 35.00, 45.00, 20.00, 'AVAILABLE', 'Bay-B', 'CLOSED'),
(8, 'L-108', 'MEDIUM', 30.00, 35.00, 45.00, 20.00, 'AVAILABLE', 'Bay-B', 'CLOSED'),
(9, 'L-109', 'LARGE', 50.00, 50.00, 60.00, 35.00, 'AVAILABLE', 'Bay-B', 'CLOSED'),
(10, 'L-110', 'LARGE', 50.00, 50.00, 60.00, 35.00, 'AVAILABLE', 'Bay-B', 'CLOSED'),
(11, 'L-111', 'LARGE', 50.00, 50.00, 60.00, 35.00, 'AVAILABLE', 'Bay-B', 'CLOSED'),
(12, 'L-112', 'SMALL', 15.00, 20.00, 30.00, 10.00, 'MAINTENANCE', 'Bay-B', 'CLOSED');
