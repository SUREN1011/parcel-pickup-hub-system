import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { db } from '../config/database.js';

export interface GeneratedOTP {
  code: string;
  hash: string;
  expiresAt: string;
}

export function generateOTP(expiresInHours: number = 48): GeneratedOTP {
  // Generate a cryptographically secure 6-digit numeric OTP
  const randomBuffer = crypto.randomBytes(4);
  const randomNumber = randomBuffer.readUInt32BE(0) % 900000 + 100000;
  const code = randomNumber.toString();
  const hash = bcrypt.hashSync(code, 10);

  const expiresAt = new Date(Date.now() + expiresInHours * 3600 * 1000).toISOString();
  return { code, hash, expiresAt };
}

export interface OTPVerificationResult {
  valid: boolean;
  message: string;
  parcel?: any;
  locker?: any;
  attemptsRemaining?: number;
}

export function verifyOTP(identifier: string, inputCode: string): OTPVerificationResult {
  // Identifier can be parcel tracking number OR customer phone number OR parcel id
  const trimmedCode = (inputCode || '').trim();
  const cleanId = (identifier || '').trim();

  if (!trimmedCode || !cleanId) {
    return { valid: false, message: 'Please provide both tracking number / phone and the 6-digit OTP.' };
  }

  // Lookup parcel and its active OTP record
  const parcel = db.prepare(`
    SELECT p.*, l.locker_code, l.bay_number, l.size as locker_size
    FROM parcels p
    LEFT JOIN lockers l ON p.locker_id = l.id
    WHERE (p.tracking_number = ? OR p.customer_phone = ? OR CAST(p.id AS TEXT) = ?)
    ORDER BY p.id DESC
    LIMIT 1
  `).get(cleanId, cleanId, cleanId) as any;

  if (!parcel) {
    return { valid: false, message: `No parcel found matching tracking or phone number "${cleanId}".` };
  }

  if (parcel.status === 'PICKED_UP') {
    return { valid: false, message: `Parcel ${parcel.tracking_number} has already been picked up on ${parcel.picked_up_at || 'earlier date'}.` };
  }

  if (parcel.status === 'RETURNED' || parcel.status === 'RETURN_REQUESTED') {
    return { valid: false, message: `Parcel ${parcel.tracking_number} has been returned or transferred. Please contact support.` };
  }

  if (parcel.status === 'EXPIRED') {
    return { valid: false, message: `Parcel ${parcel.tracking_number} pickup deadline expired on ${parcel.pickup_deadline}. The package is queued for return.` };
  }

  // Get OTP record
  const otpRecord = db.prepare(`
    SELECT * FROM otp_records
    WHERE parcel_id = ?
    ORDER BY id DESC
    LIMIT 1
  `).get(parcel.id) as any;

  if (!otpRecord) {
    return { valid: false, message: 'No OTP record exists for this parcel.' };
  }

  if (otpRecord.status === 'USED') {
    return { valid: false, message: 'This OTP has already been used.' };
  }

  if (otpRecord.status === 'REVOKED') {
    return { valid: false, message: 'This OTP has been revoked.' };
  }

  // Check attempt limit
  if (otpRecord.attempts_count >= otpRecord.max_attempts) {
    db.prepare("UPDATE otp_records SET status = 'REVOKED' WHERE id = ?").run(otpRecord.id);
    return {
      valid: false,
      message: 'Too many incorrect OTP attempts. For security reasons, this pickup code has been locked.'
    };
  }

  // Check expiration
  const now = new Date();
  const expiresAt = new Date(otpRecord.expires_at);
  if (now > expiresAt) {
    db.prepare("UPDATE otp_records SET status = 'EXPIRED' WHERE id = ?").run(otpRecord.id);
    return { valid: false, message: 'This pickup OTP has expired.' };
  }

  // Check code match (support direct comparison or bcrypt hash verify)
  const isMatch = (otpRecord.otp_code && otpRecord.otp_code === trimmedCode) ||
    bcrypt.compareSync(trimmedCode, otpRecord.otp_hash);

  if (!isMatch) {
    const newCount = otpRecord.attempts_count + 1;
    const remaining = otpRecord.max_attempts - newCount;
    db.prepare('UPDATE otp_records SET attempts_count = ? WHERE id = ?').run(newCount, otpRecord.id);

    if (remaining <= 0) {
      db.prepare("UPDATE otp_records SET status = 'REVOKED' WHERE id = ?").run(otpRecord.id);
      return {
        valid: false,
        attemptsRemaining: 0,
        message: 'Incorrect OTP. Maximum attempts exceeded. Pickup code is now locked.'
      };
    }

    return {
      valid: false,
      attemptsRemaining: remaining,
      message: `Invalid OTP code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`
    };
  }

  // Success
  return {
    valid: true,
    message: 'OTP successfully verified.',
    parcel,
    locker: {
      id: parcel.locker_id,
      locker_code: parcel.locker_code,
      bay_number: parcel.bay_number,
      size: parcel.locker_size
    }
  };
}
