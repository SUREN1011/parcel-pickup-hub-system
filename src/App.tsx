import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/common/Navbar';
import { Sidebar, NavigationTab } from './components/common/Sidebar';
import { LockerKioskSimulator } from './components/kiosk/LockerKioskSimulator';
import { Dashboard } from './pages/Dashboard';
import { ParcelRegistrationPage } from './pages/ParcelRegistrationPage';
import { LockerAllocationPage } from './pages/LockerAllocationPage';
import { OTPManagementPage } from './pages/OTPManagementPage';
import { CustomerPickupPage } from './pages/CustomerPickupPage';
import { LockersPage } from './pages/LockersPage';
import { ReturnsPage } from './pages/ReturnsPage';
import { UsersManagementPage } from './pages/UsersManagementPage';
import { ReportsPage } from './pages/ReportsPage';
import { DatabaseSchemaPage } from './pages/DatabaseSchemaPage';
import { LoginPage } from './pages/LoginPage';
import {
  LayoutDashboard,
  PackagePlus,
  Grid3X3,
  KeyRound,
  RotateCcw,
  BarChart3,
  Users as UsersIcon,
  Database,
  Terminal
} from 'lucide-react';

function MainApp() {
  const { user, isLoading } = useAuth();
  const [currentTab, setCurrentTab] = useState<NavigationTab>('register');

  // Kiosk Modal state
  const [isKioskOpen, setIsKioskOpen] = useState(false);
  const [kioskInitialTracking, setKioskInitialTracking] = useState('');
  const [kioskInitialOTP, setKioskInitialOTP] = useState('');

  const handleOpenKiosk = (tracking: string = '', otp: string = '') => {
    setKioskInitialTracking(tracking);
    setKioskInitialOTP(otp);
    setIsKioskOpen(true);
  };

  const handleCloseKiosk = () => {
    setIsKioskOpen(false);
    setKioskInitialTracking('');
    setKioskInitialOTP('');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F0F3F9] flex flex-col items-center justify-center p-4 text-[#172033]">
        <div className="w-10 h-10 rounded-xl bg-[#2453D4] flex items-center justify-center animate-pulse mb-3">
          <Terminal className="w-5 h-5 text-white" />
        </div>
        <h2 className="text-base font-bold tracking-tight">Initializing ParcelHub...</h2>
        <p className="text-xs text-[#697586] mt-1">Connecting to smart locker bank</p>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return (
    <div className="min-h-screen bg-[#F0F3F9] text-[#172033] flex flex-col font-sans">
      {/* Top Navbar */}
      <Navbar
        currentTab={currentTab}
        onOpenKiosk={() => handleOpenKiosk()}
      />

      {/* Main Workspace with Sidebar */}
      <div className="flex-1 flex w-full">
        <Sidebar
          currentTab={currentTab}
          onSelectTab={setCurrentTab}
          onOpenKiosk={() => handleOpenKiosk()}
        />

        <main className="flex-1 p-6 md:p-8 overflow-y-auto max-w-full pb-20 md:pb-8">
          {currentTab === 'dashboard' && (
            <Dashboard
              onNavigateTab={setCurrentTab}
              onOpenKiosk={(trk, otp) => handleOpenKiosk(trk, otp)}
            />
          )}

          {currentTab === 'register' && (
            <ParcelRegistrationPage
              onOpenKiosk={(trk, otp) => handleOpenKiosk(trk, otp)}
              onNavigateToParcels={() => setCurrentTab('allocation')}
            />
          )}

          {currentTab === 'allocation' && (
            <LockerAllocationPage
              onOpenKiosk={(trk, otp) => handleOpenKiosk(trk, otp)}
            />
          )}

          {currentTab === 'otp' && (
            <OTPManagementPage />
          )}

          {currentTab === 'pickup' && (
            <CustomerPickupPage
              onOpenKiosk={(trk, otp) => handleOpenKiosk(trk, otp)}
            />
          )}

          {currentTab === 'lockers' && (
            <LockersPage
              onOpenKiosk={(trk, otp) => handleOpenKiosk(trk, otp)}
            />
          )}

          {currentTab === 'returns' && (
            <ReturnsPage />
          )}

          {currentTab === 'users' && (
            <UsersManagementPage />
          )}

          {currentTab === 'reports' && (
            <ReportsPage />
          )}

          {currentTab === 'schema' && (
            <DatabaseSchemaPage />
          )}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-[#102D4F] border-t border-[#1E3E66] z-40 px-2 py-1.5 flex items-center justify-around text-white">
        <button
          onClick={() => setCurrentTab('dashboard')}
          className={`p-1.5 flex flex-col items-center text-[10px] ${
            currentTab === 'dashboard' ? 'text-[#38BDF8] font-bold' : 'text-[#CBD5E1]'
          }`}
        >
          <LayoutDashboard className="w-4 h-4" />
          <span>Home</span>
        </button>

        <button
          onClick={() => setCurrentTab('register')}
          className={`p-1.5 flex flex-col items-center text-[10px] ${
            currentTab === 'register' ? 'text-[#38BDF8] font-bold' : 'text-[#CBD5E1]'
          }`}
        >
          <PackagePlus className="w-4 h-4" />
          <span>Register</span>
        </button>

        <button
          onClick={() => handleOpenKiosk()}
          className="p-2 -mt-4 bg-[#2453D4] text-white rounded-full shadow-md flex items-center justify-center w-10 h-10 border-2 border-[#102D4F]"
          title="Open Kiosk"
        >
          <Terminal className="w-4 h-4" />
        </button>

        <button
          onClick={() => setCurrentTab('lockers')}
          className={`p-1.5 flex flex-col items-center text-[10px] ${
            currentTab === 'lockers' ? 'text-[#38BDF8] font-bold' : 'text-[#CBD5E1]'
          }`}
        >
          <Grid3X3 className="w-4 h-4" />
          <span>Lockers</span>
        </button>

        <button
          onClick={() => setCurrentTab('reports')}
          className={`p-1.5 flex flex-col items-center text-[10px] ${
            currentTab === 'reports' ? 'text-[#38BDF8] font-bold' : 'text-[#CBD5E1]'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Reports</span>
        </button>
      </div>

      {/* Global Interactive Touchscreen Locker Kiosk Simulator */}
      <LockerKioskSimulator
        isOpen={isKioskOpen}
        onClose={handleCloseKiosk}
        initialTracking={kioskInitialTracking}
        initialOTP={kioskInitialOTP}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
