import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import * as authCtrl from '../controllers/authController.js';
import * as parcelCtrl from '../controllers/parcelController.js';
import * as lockerCtrl from '../controllers/lockerController.js';
import * as pickupCtrl from '../controllers/pickupController.js';
import * as returnCtrl from '../controllers/returnController.js';
import * as reportCtrl from '../controllers/reportController.js';

const router = Router();

// ==========================================
// Authentication Routes
// ==========================================
router.post('/auth/login', authCtrl.login);
router.post('/auth/register', authCtrl.register);
router.post('/auth/demo-switch', authCtrl.demoSwitchUser);
router.get('/auth/me', authenticate, authCtrl.getMe);
router.get('/auth/users', authenticate, authorize(['ADMIN', 'HUB_STAFF']), authCtrl.getAllUsers);

// ==========================================
// Parcel Management & Allocation Routes
// ==========================================
router.post('/parcels', authenticate, authorize(['ADMIN', 'VENDOR']), parcelCtrl.registerParcel);
router.get('/parcels', authenticate, parcelCtrl.getParcels);
router.get('/parcels/:id', authenticate, parcelCtrl.getParcelById);

// ==========================================
// Smart Locker Hub & Wall Routes
// ==========================================
router.get('/lockers', authenticate, lockerCtrl.getLockers);
router.post('/lockers', authenticate, authorize(['ADMIN']), lockerCtrl.addLocker);
router.patch('/lockers/:id/status', authenticate, authorize(['ADMIN', 'HUB_STAFF']), lockerCtrl.updateLockerStatus);
router.get('/lockers/:id/history', authenticate, authorize(['ADMIN', 'HUB_STAFF']), lockerCtrl.getLockerHistory);

// ==========================================
// Kiosk / Customer Pickup Routes (Open for kiosk or authenticated)
// ==========================================
router.post('/pickup/verify-otp', pickupCtrl.verifyPickupOTP);
router.post('/pickup/confirm', pickupCtrl.confirmPickup);

// ==========================================
// Expiry & Return Management Routes
// ==========================================
router.get('/returns', authenticate, authorize(['ADMIN', 'HUB_STAFF', 'VENDOR']), returnCtrl.getReturnRequests);
router.post('/returns/initiate', authenticate, authorize(['ADMIN', 'HUB_STAFF', 'VENDOR']), returnCtrl.initiateReturn);
router.post('/returns/:id/clear', authenticate, authorize(['ADMIN', 'HUB_STAFF']), returnCtrl.clearLockerAndComplete);
router.post('/returns/scan-expiry', authenticate, authorize(['ADMIN', 'HUB_STAFF']), returnCtrl.triggerExpiryCheck);

// ==========================================
// Analytics & Reports Routes
// ==========================================
router.get('/reports/statistics', authenticate, reportCtrl.getDashboardStatistics);
router.get('/reports/export', authenticate, authorize(['ADMIN', 'HUB_STAFF', 'VENDOR']), reportCtrl.getFullExportReport);

export default router;
