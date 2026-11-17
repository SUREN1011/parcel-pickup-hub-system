import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { authAPI } from '../services/api';

export interface SimulatedSMS {
  id: string;
  recipient: string;
  message: string;
  timestamp: string;
  read: boolean;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  register: (payload: any) => Promise<void>;
  logout: () => void;
  switchRole: (role: UserRole) => Promise<void>;
  simulatedSMSList: SimulatedSMS[];
  addSimulatedSMS: (sms: { recipient: string; message: string }) => void;
  markSMSRead: (id: string) => void;
  clearSMS: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('parcel_hub_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [simulatedSMSList, setSimulatedSMSList] = useState<SimulatedSMS[]>(() => {
    try {
      const saved = localStorage.getItem('parcel_hub_sms');
      return saved ? JSON.parse(saved) : [
        {
          id: 'sms-demo-1',
          recipient: '+15550100004',
          message: '[Smart Locker Hub] Package PKG-884129 is ready for pickup at Locker L-101 (Bay-A). Your 6-digit pickup OTP is: 582914.',
          timestamp: new Date().toISOString(),
          read: false
        }
      ];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('parcel_hub_sms', JSON.stringify(simulatedSMSList));
  }, [simulatedSMSList]);

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('parcel_hub_token');
      if (!storedToken) {
        // Automatically login as ADMIN for easy evaluation demo
        try {
          const res = await authAPI.demoSwitch('ADMIN');
          if (res.success) {
            localStorage.setItem('parcel_hub_token', res.token);
            setToken(res.token);
            setUser(res.user);
          }
        } catch (err) {
          console.error('Failed to init demo user:', err);
        }
        setIsLoading(false);
        return;
      }

      try {
        const res = await authAPI.getMe();
        if (res.success) {
          setUser(res.user);
        } else {
          localStorage.removeItem('parcel_hub_token');
          setToken(null);
          setUser(null);
        }
      } catch {
        localStorage.removeItem('parcel_hub_token');
        setToken(null);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (email: string, pass: string) => {
    const res = await authAPI.login(email, pass);
    if (res.success) {
      localStorage.setItem('parcel_hub_token', res.token);
      setToken(res.token);
      setUser(res.user);
    }
  };

  const register = async (payload: any) => {
    const res = await authAPI.register(payload);
    if (res.success) {
      localStorage.setItem('parcel_hub_token', res.token);
      setToken(res.token);
      setUser(res.user);
    }
  };

  const logout = () => {
    localStorage.removeItem('parcel_hub_token');
    setToken(null);
    setUser(null);
  };

  const switchRole = async (role: UserRole) => {
    setIsLoading(true);
    try {
      const res = await authAPI.demoSwitch(role);
      if (res.success) {
        localStorage.setItem('parcel_hub_token', res.token);
        setToken(res.token);
        setUser(res.user);
      }
    } catch (err) {
      console.error('Switch role failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const addSimulatedSMS = (sms: { recipient: string; message: string }) => {
    const newEntry: SimulatedSMS = {
      id: `sms-${Date.now()}`,
      recipient: sms.recipient,
      message: sms.message,
      timestamp: new Date().toISOString(),
      read: false
    };
    setSimulatedSMSList(prev => [newEntry, ...prev]);
  };

  const markSMSRead = (id: string) => {
    setSimulatedSMSList(prev => prev.map(s => s.id === id ? { ...s, read: true } : s));
  };

  const clearSMS = () => {
    setSimulatedSMSList([]);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        register,
        logout,
        switchRole,
        simulatedSMSList,
        addSimulatedSMS,
        markSMSRead,
        clearSMS
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
