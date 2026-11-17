import React, { useState } from 'react';
import {
  Bell,
  LogOut,
  ChevronDown,
  Terminal,
  RefreshCw,
  MessageSquare,
  Shield,
  Truck,
  User as UserIcon,
  HardHat
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';
import { NavigationTab } from './Sidebar';

interface NavbarProps {
  currentTab: NavigationTab;
  onOpenKiosk: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentTab, onOpenKiosk }) => {
  const { user, logout, switchRole, simulatedSMSList, markSMSRead, clearSMS, isLoading } = useAuth();
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  const [showSMSDrawer, setShowSMSDrawer] = useState(false);

  const getPageInfo = (tab: NavigationTab) => {
    switch (tab) {
      case 'dashboard':
        return {
          title: 'Dashboard Overview',
          subtitle: `Live - refreshed ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`
        };
      case 'register':
        return {
          title: 'Register Parcel',
          subtitle: user?.vendor_company ? `Vendor: ${user.vendor_company}` : 'Vendor: QuickShip Traders'
        };
      case 'allocation':
        return {
          title: 'Locker Allocation',
          subtitle: 'Auto-allocation: smallest free locker that fits'
        };
      case 'otp':
        return {
          title: 'OTP Management',
          subtitle: 'Cryptographic 6-digit OTP verification & bcrypt storage'
        };
      case 'pickup':
        return {
          title: 'Customer Pickup',
          subtitle: user?.role === 'CUSTOMER' ? `Customer: ${user.name}` : 'Customer: Priya Kumar'
        };
      case 'lockers':
        return {
          title: 'Locker Status Dashboard',
          subtitle: `Live - refreshed ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`
        };
      case 'returns':
        return {
          title: 'Expiry and Return Management',
          subtitle: 'Hold period: 3 days'
        };
      case 'users':
        return {
          title: 'Admin - User Management',
          subtitle: 'Administrator'
        };
      case 'reports':
        return {
          title: 'Reports and Monitoring',
          subtitle: '1 Oct - 24 Oct 2026'
        };
      case 'schema':
        return {
          title: 'Relational Database Design',
          subtitle: 'MySQL schema.sql & 3NF Data Dictionary'
        };
      default:
        return {
          title: 'ParcelHub System',
          subtitle: 'Smart Locker OS'
        };
    }
  };

  const { title, subtitle } = getPageInfo(currentTab);
  const unreadSMSCount = simulatedSMSList.filter(s => !s.read).length;

  const roles: Array<{ role: UserRole; label: string; icon: React.ReactNode }> = [
    { role: 'ADMIN', label: 'Admin (Manager)', icon: <Shield className="w-3.5 h-3.5 text-rose-500" /> },
    { role: 'VENDOR', label: 'Vendor (Courier)', icon: <Truck className="w-3.5 h-3.5 text-sky-500" /> },
    { role: 'CUSTOMER', label: 'Customer (Recipient)', icon: <UserIcon className="w-3.5 h-3.5 text-emerald-500" /> },
    { role: 'HUB_STAFF', label: 'Hub Staff (Attendant)', icon: <HardHat className="w-3.5 h-3.5 text-amber-500" /> }
  ];

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-[#E2E8F0] text-[#172033] shadow-xs">
      <div className="flex items-center justify-between h-[60px]">
        {/* Left branding anchor on sidebar width */}
        <div className="w-56 bg-[#102D4F] h-full flex items-center px-5 shrink-0">
          <div className="flex items-center gap-1">
            <span className="font-bold text-xl tracking-tight text-white">Parcel</span>
            <span className="font-bold text-xl tracking-tight text-[#38BDF8]">Hub</span>
          </div>
        </div>

        {/* Main Header bar */}
        <div className="flex-1 px-6 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-[#172033] tracking-tight">{title}</h1>
          </div>

          {/* Right Subtitle & Utilities */}
          <div className="flex items-center gap-4">
            <span className="text-xs font-medium text-[#697586] hidden sm:inline">
              {subtitle}
            </span>

            {/* Quick Demo Role Switcher */}
            <div className="relative">
              <button
                onClick={() => setShowRoleDropdown(!showRoleDropdown)}
                disabled={isLoading}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#F0F3F9] hover:bg-[#E2E8F0] border border-[#CBD5E1] text-xs font-semibold text-[#172033] transition-colors"
                title="Switch demo role for evaluation"
              >
                {isLoading ? (
                  <RefreshCw className="w-3 h-3 animate-spin text-[#2453D4]" />
                ) : (
                  <span className="w-2 h-2 rounded-full bg-[#2453D4]" />
                )}
                <span>Role: {user?.role}</span>
                <ChevronDown className="w-3 h-3 text-[#697586]" />
              </button>

              {showRoleDropdown && (
                <div className="absolute right-0 mt-1.5 w-60 bg-white border border-[#CBD5E1] rounded-xl shadow-xl p-2 z-50">
                  <div className="px-2.5 py-1.5 border-b border-[#E2E8F0] text-[11px] font-semibold text-[#697586]">
                    Switch Demo Persona:
                  </div>
                  <div className="space-y-1 py-1">
                    {roles.map(r => (
                      <button
                        key={r.role}
                        onClick={() => {
                          switchRole(r.role);
                          setShowRoleDropdown(false);
                        }}
                        className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left text-xs transition-colors ${
                          user?.role === r.role ? 'bg-[#2453D4]/10 text-[#2453D4] font-semibold' : 'hover:bg-[#F0F3F9] text-[#172033]'
                        }`}
                      >
                        {r.icon}
                        <span>{r.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Simulated SMS Alert Bell */}
            <div className="relative">
              <button
                onClick={() => setShowSMSDrawer(!showSMSDrawer)}
                className="relative p-2 rounded-lg hover:bg-[#F0F3F9] text-[#697586] hover:text-[#172033] transition-colors"
                title="Simulated SMS Notifications"
              >
                <Bell className="w-4 h-4" />
                {unreadSMSCount > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#2453D4]" />
                )}
              </button>

              {showSMSDrawer && (
                <div className="absolute right-0 mt-1.5 w-80 bg-white border border-[#CBD5E1] rounded-xl shadow-2xl p-4 z-50 text-xs text-[#172033]">
                  <div className="flex items-center justify-between pb-2 border-b border-[#E2E8F0]">
                    <div className="font-semibold text-sm flex items-center gap-1.5">
                      <MessageSquare className="w-4 h-4 text-[#2453D4]" />
                      <span>Simulated SMS Gateway</span>
                    </div>
                    {simulatedSMSList.length > 0 && (
                      <button
                        onClick={clearSMS}
                        className="text-[11px] text-[#697586] hover:text-red-500"
                      >
                        Clear
                      </button>
                    )}
                  </div>

                  <div className="max-h-64 overflow-y-auto space-y-2 my-2.5 pr-1">
                    {simulatedSMSList.length === 0 ? (
                      <div className="text-center py-4 text-[#697586]">
                        No simulated SMS messages yet.
                      </div>
                    ) : (
                      simulatedSMSList.map(sms => (
                        <div
                          key={sms.id}
                          onClick={() => markSMSRead(sms.id)}
                          className={`p-2.5 rounded-lg border text-xs cursor-pointer ${
                            sms.read ? 'bg-[#F8FAFC] border-[#E2E8F0] text-[#697586]' : 'bg-[#EFF6FF] border-[#BFDBFE] text-[#1E3A8A]'
                          }`}
                        >
                          <div className="flex justify-between font-mono text-[10px] text-[#697586] mb-1">
                            <span>To: {sms.recipient}</span>
                            <span>{new Date(sms.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          <p className="leading-relaxed">{sms.message}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Logout */}
            <button
              onClick={logout}
              className="p-2 rounded-lg hover:bg-red-50 text-[#697586] hover:text-red-600 transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
