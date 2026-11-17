export type UserRole = 'ADMIN' | 'VENDOR' | 'CUSTOMER' | 'HUB_STAFF';

export interface User {
  id: number;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  vendor_company?: string | null;
  status: 'ACTIVE' | 'SUSPENDED';
  created_at?: string;
}

export type LockerSize = 'SMALL' | 'MEDIUM' | 'LARGE';
export type LockerStatus = 'AVAILABLE' | 'OCCUPIED' | 'EXPIRED_HOLD' | 'MAINTENANCE';
export type DoorSensorState = 'CLOSED' | 'OPEN';

export interface Locker {
  id: number;
  locker_code: string;
  size: LockerSize;
  max_length_cm: number;
  max_width_cm: number;
  max_height_cm: number;
  max_weight_kg: number;
  status: LockerStatus;
  bay_number: string;
  door_sensor_state: DoorSensorState;
  is_active: number;
  created_at: string;
  // Attached current parcel if occupied
  parcel_id?: number | null;
  tracking_number?: string | null;
  customer_name?: string | null;
  customer_phone?: string | null;
  pickup_deadline?: string | null;
  stored_at?: string | null;
  parcel_status?: string | null;
  current_otp?: string | null;
}

export type ParcelStatus =
  | 'REGISTERED'
  | 'STORED'
  | 'READY_FOR_PICKUP'
  | 'PICKED_UP'
  | 'EXPIRED'
  | 'RETURN_REQUESTED'
  | 'RETURNED';

export interface Parcel {
  id: number;
  tracking_number: string;
  vendor_id: number;
  vendor_name?: string;
  vendor_company?: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  customer_user_id?: number | null;
  description?: string;
  length_cm: number;
  width_cm: number;
  height_cm: number;
  weight_kg: number;
  required_size: LockerSize;
  locker_id?: number;
  locker_code?: string;
  bay_number?: string;
  locker_size?: LockerSize;
  status: ParcelStatus;
  pickup_deadline: string;
  stored_at: string;
  picked_up_at?: string | null;
  returned_at?: string | null;
  current_otp?: string;
  otp_status?: string;
}

export interface OTPRecord {
  id: number;
  parcel_id: number;
  otp_code: string;
  status: 'ACTIVE' | 'USED' | 'EXPIRED' | 'REVOKED';
  attempts_count: number;
  max_attempts: number;
  expires_at: string;
  used_at?: string | null;
}

export interface LockerAllocationHistory {
  id: number;
  locker_id: number;
  locker_code?: string;
  parcel_id: number;
  tracking_number?: string;
  customer_name?: string;
  action: 'ALLOCATED' | 'PICKED_UP' | 'EXPIRED_HOLD' | 'RELEASED' | 'MAINTENANCE_HOLD';
  action_by_user_id?: number;
  action_by_name?: string;
  notes?: string;
  action_time: string;
}

export interface ReturnRequest {
  id: number;
  parcel_id: number;
  locker_id: number;
  tracking_number: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  description?: string;
  pickup_deadline: string;
  stored_at: string;
  locker_code: string;
  bay_number: string;
  locker_size: LockerSize;
  reason: string;
  status: 'PENDING_CLEARANCE' | 'IN_TRANSIT' | 'COMPLETED' | 'CANCELLED';
  initiated_by_user_id: number;
  initiated_by_name?: string;
  locker_cleared_at?: string;
  cleared_by_user_id?: number;
  cleared_by_name?: string;
  completed_at?: string;
  notes?: string;
  created_at: string;
}

export interface DashboardStatistics {
  parcels: {
    total: number;
    stored: number;
    picked_up: number;
    expired: number;
    returned: number;
  };
  lockers: {
    total: number;
    available: number;
    occupied: number;
    expired_hold: number;
    maintenance: number;
    occupancy_rate: number;
    by_size: {
      small: { total: number; available: number };
      medium: { total: number; available: number };
      large: { total: number; available: number };
    };
  };
  performance: {
    avg_turnaround_hours: number;
    pending_returns: number;
  };
  recent_activity: LockerAllocationHistory[];
}
