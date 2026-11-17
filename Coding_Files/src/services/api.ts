import {
  User,
  Locker,
  Parcel,
  ReturnRequest,
  DashboardStatistics,
  UserRole
} from '../types';

const API_BASE = '/api';

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('parcel_hub_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers = {
    'Content-Type': 'application/json',
    ...getAuthHeader(),
    ...(options.headers || {})
  };

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers
  });

  const data = await response.json().catch(() => ({
    success: false,
    message: `Network response not valid JSON (status ${response.status})`
  }));

  if (!response.ok) {
    throw new Error(data.message || `Request failed with status ${response.status}`);
  }

  return data;
}

export const authAPI = {
  login: (email: string, password: string) =>
    request<{ success: boolean; token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    }),

  register: (payload: {
    name: string;
    email: string;
    password: string;
    phone: string;
    role: UserRole;
    vendor_company?: string;
  }) =>
    request<{ success: boolean; token: string; user: User }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),

  demoSwitch: (role: UserRole) =>
    request<{ success: boolean; token: string; user: User }>('/auth/demo-switch', {
      method: 'POST',
      body: JSON.stringify({ role })
    }),

  getMe: () =>
    request<{ success: boolean; user: User }>('/auth/me'),

  getUsers: () =>
    request<{ success: boolean; users: User[] }>('/auth/users')
};

export const parcelAPI = {
  getAll: (params?: { status?: string; search?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.append('status', params.status);
    if (params?.search) searchParams.append('search', params.search);
    const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
    return request<{ success: boolean; count: number; parcels: Parcel[] }>(`/parcels${query}`);
  },

  getById: (id: number | string) =>
    request<{ success: boolean; parcel: Parcel; history: any[] }>(`/parcels/${id}`),

  register: (payload: {
    customer_name: string;
    customer_email: string;
    customer_phone: string;
    description?: string;
    length_cm: number;
    width_cm: number;
    height_cm: number;
    weight_kg?: number;
    pickup_deadline_hours?: number;
  }) =>
    request<{
      success: boolean;
      message: string;
      parcel: Parcel;
      locker: Locker;
      allocation_details: {
        required_size: string;
        allocated_size: string;
        is_upgraded: boolean;
        notes?: string;
      };
      otp_code: string;
      sms_simulation: {
        recipient: string;
        message: string;
        dispatched_at: string;
      };
    }>('/parcels', {
      method: 'POST',
      body: JSON.stringify(payload)
    })
};

export const lockerAPI = {
  getAll: (params?: { bay?: string; status?: string; size?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.bay) searchParams.append('bay', params.bay);
    if (params?.status) searchParams.append('status', params.status);
    if (params?.size) searchParams.append('size', params.size);
    const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
    return request<{
      success: boolean;
      summary: {
        total: number;
        available: number;
        occupied: number;
        expired_hold: number;
        maintenance: number;
        occupancy_rate: number;
      };
      lockers: Locker[];
    }>(`/lockers${query}`);
  },

  add: (payload: { locker_code: string; size: string; bay_number?: string }) =>
    request<{ success: boolean; message: string; lockerId: number }>('/lockers', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),

  updateStatus: (id: number, payload: { status?: string; door_sensor_state?: string; is_active?: boolean }) =>
    request<{ success: boolean; message: string }>(`/lockers/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    }),

  getHistory: (id: number) =>
    request<{ success: boolean; history: any[] }>(`/lockers/${id}/history`)
};

export const pickupAPI = {
  verifyOTP: (identifier: string, otp_code: string) =>
    request<{
      success: boolean;
      message: string;
      parcel: Parcel;
      locker: { id: number; locker_code: string; bay_number: string; size: string };
      attemptsRemaining?: number;
    }>('/pickup/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ identifier, otp_code })
    }),

  confirmPickup: (payload: { parcel_id: number; locker_id: number; otp_code?: string }) =>
    request<{
      success: boolean;
      message: string;
      pickup_receipt: {
        tracking_number: string;
        customer_name: string;
        locker_code: string;
        bay_number: string;
        picked_up_at: string;
      };
    }>('/pickup/confirm', {
      method: 'POST',
      body: JSON.stringify(payload)
    })
};

export const returnAPI = {
  getAll: (params?: { status?: string }) => {
    const query = params?.status ? `?status=${params.status}` : '';
    return request<{ success: boolean; count: number; returns: ReturnRequest[] }>(`/returns${query}`);
  },

  initiate: (payload: { parcel_id: number; reason?: string }) =>
    request<{ success: boolean; message: string }>('/returns/initiate', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),

  clearLocker: (id: number, notes?: string) =>
    request<{ success: boolean; message: string }>(`/returns/${id}/clear`, {
      method: 'POST',
      body: JSON.stringify({ notes })
    }),

  scanExpiry: () =>
    request<{ success: boolean; message: string; details: any }>('/returns/scan-expiry', {
      method: 'POST'
    })
};

export const reportAPI = {
  getStatistics: () =>
    request<{ success: boolean; statistics: DashboardStatistics }>('/reports/statistics'),

  getExportData: () =>
    request<{ success: boolean; timestamp: string; parcels: any[]; lockers: any[] }>('/reports/export')
};
