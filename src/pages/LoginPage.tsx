import React, { useState } from 'react';
import {
  Shield,
  Truck,
  User as UserIcon,
  HardHat,
  ArrowRight,
  AlertCircle,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';

export const LoginPage: React.FC = () => {
  const { login, register, switchRole, isLoading } = useAuth();
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<UserRole>('CUSTOMER');
  const [vendorCompany, setVendorCompany] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const demoPersonas: Array<{
    role: UserRole;
    name: string;
    email: string;
    title: string;
    desc: string;
    icon: React.ReactNode;
  }> = [
    {
      role: 'ADMIN',
      name: 'System Administrator',
      email: 'admin@hub.local',
      title: 'Admin Manager',
      desc: 'Lockers, analytics & user management',
      icon: <Shield className="w-4 h-4 text-rose-600" />
    },
    {
      role: 'VENDOR',
      name: 'QuickShip Traders',
      email: 'apex@vendor.local',
      title: 'Courier Vendor',
      desc: 'Inward packages & auto-allocation',
      icon: <Truck className="w-4 h-4 text-[#2453D4]" />
    },
    {
      role: 'CUSTOMER',
      name: 'Priya Kumar',
      email: 'sarah@customer.local',
      title: 'Customer Recipient',
      desc: 'View OTP codes & pick up parcels',
      icon: <UserIcon className="w-4 h-4 text-[#16A34A]" />
    },
    {
      role: 'HUB_STAFF',
      name: 'Elena Rostova',
      email: 'staff@hub.local',
      title: 'Hub Locker Attendant',
      desc: 'Physical checks & return clearance',
      icon: <HardHat className="w-4 h-4 text-[#D97706]" />
    }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      if (isRegisterMode) {
        await register({
          name: name.trim(),
          email: email.trim(),
          password,
          phone: phone.trim(),
          role,
          vendor_company: role === 'VENDOR' ? vendorCompany : undefined
        });
      } else {
        await login(email.trim(), password);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Authentication failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickDemoLogin = async (personaRole: UserRole) => {
    setErrorMessage(null);
    try {
      await switchRole(personaRole);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to switch demo persona.');
    }
  };

  return (
    <div className="min-h-screen bg-[#F0F3F9] text-[#172033] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full mx-auto space-y-6">
        {/* Branding matching screenshot */}
        <div className="text-center space-y-1">
          <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-[#102D4F] text-white shadow-xs mb-2">
            <span className="font-bold text-2xl tracking-tight">Parcel</span>
            <span className="font-bold text-2xl tracking-tight text-[#38BDF8]">Hub</span>
          </div>
          <h2 className="text-xl font-bold text-[#172033] tracking-tight">
            Smart Parcel Locker System
          </h2>
          <p className="text-xs text-[#697586]">
            Automated Locker Allocation & Secure OTP Retrieval
          </p>
        </div>

        {/* 1-Click Fast Evaluation Persona Buttons */}
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-[#E2E8F0]">
            <span className="text-xs font-semibold text-[#172033] flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#2453D4]" />
              <span>1-Click Demo Personas:</span>
            </span>
            <span className="text-[10px] text-[#697586] font-mono">Instant Sign In</span>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            {demoPersonas.map(p => (
              <button
                key={p.role}
                type="button"
                onClick={() => handleQuickDemoLogin(p.role)}
                disabled={isLoading}
                className="p-3 rounded-xl bg-[#F8FAFC] hover:bg-[#EFF6FF] border border-[#E2E8F0] hover:border-[#BFDBFE] text-left transition-all group"
              >
                <div className="flex items-center gap-1.5 mb-1">
                  {p.icon}
                  <span className="font-bold text-xs text-[#172033] group-hover:text-[#2453D4]">
                    {p.title}
                  </span>
                </div>
                <div className="text-[11px] text-[#697586] truncate">{p.name}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Credentials Form */}
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 shadow-xs space-y-5">
          <div className="flex items-center justify-between pb-2 border-b border-[#E2E8F0]">
            <h3 className="text-sm font-bold text-[#172033]">
              {isRegisterMode ? 'Register Account' : 'Sign In'}
            </h3>
            <button
              type="button"
              onClick={() => {
                setIsRegisterMode(!isRegisterMode);
                setErrorMessage(null);
              }}
              className="text-xs text-[#2453D4] hover:underline font-medium"
            >
              {isRegisterMode ? 'Back to Sign In' : 'Create Account'}
            </button>
          </div>

          {errorMessage && (
            <div className="p-2.5 rounded-lg bg-red-50 text-red-700 text-xs font-medium">
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegisterMode && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-[#172033] mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Priya Kumar"
                    className="w-full px-3.5 py-2 rounded-lg bg-white border border-[#CBD5E1] text-xs focus:outline-none focus:border-[#2453D4]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#172033] mb-1">Phone Number</label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="+91 9876543210"
                    className="w-full px-3.5 py-2 rounded-lg bg-white border border-[#CBD5E1] text-xs font-mono focus:outline-none focus:border-[#2453D4]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#172033] mb-1">Role</label>
                  <select
                    value={role}
                    onChange={e => setRole(e.target.value as UserRole)}
                    className="w-full px-3.5 py-2 rounded-lg bg-white border border-[#CBD5E1] text-xs focus:outline-none focus:border-[#2453D4]"
                  >
                    <option value="CUSTOMER">Customer (Recipient)</option>
                    <option value="VENDOR">Vendor (Courier Company)</option>
                    <option value="HUB_STAFF">Hub Staff (Attendant)</option>
                    <option value="ADMIN">System Administrator</option>
                  </select>
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-semibold text-[#172033] mb-1">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="admin@hub.local"
                className="w-full px-3.5 py-2 rounded-lg bg-white border border-[#CBD5E1] text-xs focus:outline-none focus:border-[#2453D4]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#172033] mb-1">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2 rounded-lg bg-white border border-[#CBD5E1] text-xs focus:outline-none focus:border-[#2453D4]"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 rounded-lg bg-[#2453D4] hover:bg-[#1D44B8] text-white text-xs font-semibold shadow-xs transition-colors flex items-center justify-center gap-1.5"
            >
              <span>{isSubmitting ? 'Authenticating...' : isRegisterMode ? 'Complete Registration' : 'Sign In'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
