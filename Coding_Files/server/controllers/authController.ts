import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../config/database.js';
import { generateToken, AuthenticatedRequest } from '../middleware/auth.js';

export function login(req: Request, res: Response) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.trim().toLowerCase()) as any;
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials. User not found.' });
    }

    if (user.status !== 'ACTIVE') {
      return res.status(403).json({ success: false, message: 'Account is currently suspended.' });
    }

    const isMatch = bcrypt.compareSync(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials. Incorrect password.' });
    }

    const safeUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      vendor_company: user.vendor_company
    };

    const token = generateToken(safeUser);
    return res.json({
      success: true,
      message: 'Login successful.',
      token,
      user: safeUser
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message || 'Server login error.' });
  }
}

export function register(req: Request, res: Response) {
  try {
    const { name, email, password, phone, role, vendor_company } = req.body;

    if (!name || !email || !password || !phone) {
      return res.status(400).json({ success: false, message: 'Please provide all required fields.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(normalizedEmail);
    if (existing) {
      return res.status(409).json({ success: false, message: 'An account with this email already exists.' });
    }

    const allowedRoles = ['ADMIN', 'VENDOR', 'CUSTOMER', 'HUB_STAFF'];
    const chosenRole = allowedRoles.includes(role) ? role : 'CUSTOMER';

    const hash = bcrypt.hashSync(password, 10);
    const result = db.prepare(`
      INSERT INTO users (name, email, password_hash, phone, role, vendor_company)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(name.trim(), normalizedEmail, hash, phone.trim(), chosenRole, chosenRole === 'VENDOR' ? (vendor_company || name) : null);

    const safeUser = {
      id: Number(result.lastInsertRowid),
      name: name.trim(),
      email: normalizedEmail,
      role: chosenRole,
      phone: phone.trim(),
      vendor_company: chosenRole === 'VENDOR' ? (vendor_company || name) : null
    };

    const token = generateToken(safeUser as any);
    return res.status(201).json({
      success: true,
      message: 'Account registered successfully.',
      token,
      user: safeUser
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message || 'Registration failed.' });
  }
}

export function demoSwitchUser(req: Request, res: Response) {
  try {
    const { role } = req.body;
    let user: any;

    if (role) {
      user = db.prepare("SELECT * FROM users WHERE role = ? AND status = 'ACTIVE' ORDER BY id ASC LIMIT 1").get(role);
    }

    if (!user) {
      user = db.prepare("SELECT * FROM users WHERE role = 'ADMIN' LIMIT 1").get();
    }

    if (!user) {
      return res.status(404).json({ success: false, message: 'No demo account available for that role.' });
    }

    const safeUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      vendor_company: user.vendor_company
    };

    const token = generateToken(safeUser);
    return res.json({
      success: true,
      message: `Switched to ${safeUser.name} (${safeUser.role})`,
      token,
      user: safeUser
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message || 'Demo switch error.' });
  }
}

export function getMe(req: AuthenticatedRequest, res: Response) {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Not authenticated.' });
  }
  return res.json({ success: true, user: req.user });
}

export function getAllUsers(req: AuthenticatedRequest, res: Response) {
  try {
    const users = db.prepare('SELECT id, name, email, phone, role, vendor_company, status, created_at FROM users ORDER BY id ASC').all();
    return res.json({ success: true, users });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}
