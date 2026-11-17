import React, { useState, useEffect } from 'react';
import { reportAPI, lockerAPI } from '../services/api';
import { DashboardStatistics, Locker } from '../types';
import { LockerWallView } from '../components/lockers/LockerWallView';
import { NavigationTab } from '../components/common/Sidebar';

interface DashboardProps {
  onNavigateTab: (tab: NavigationTab) => void;
  onOpenKiosk: (tracking?: string, otp?: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigateTab, onOpenKiosk }) => {
  const [stats, setStats] = useState<DashboardStatistics | null>(null);
  const [lockers, setLockers] = useState<Locker[]>([]);

  const loadData = async () => {
    try {
      const [sRes, lRes] = await Promise.all([
        reportAPI.getStatistics(),
        lockerAPI.getAll()
      ]);
      if (sRes.success) setStats(sRes.statistics);
      if (lRes.success) setLockers(lRes.lockers);
    } catch {
      //
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const totalLockers = stats?.lockers?.total || lockers.length || 12;
  const occupiedLockers = (stats?.lockers?.occupied || 0) + (stats?.lockers?.expired_hold || 0);
  const freeLockers = stats?.lockers?.available || (totalLockers - occupiedLockers);
  const maintenanceLockers = stats?.lockers?.maintenance || 0;

  return (
    <div className="space-y-6">
      {/* 4 Top KPI Cards matching reference style */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Lockers */}
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-5 shadow-xs flex flex-col justify-between">
          <div className="text-3xl font-bold text-[#172033]">
            {totalLockers}
          </div>
          <div className="text-xs font-normal text-[#697586] mt-1">
            Total lockers
          </div>
        </div>

        {/* Occupied */}
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-5 shadow-xs flex flex-col justify-between">
          <div className="text-3xl font-bold text-[#DC2626]">
            {occupiedLockers}
          </div>
          <div className="text-xs font-normal text-[#697586] mt-1">
            Occupied
          </div>
        </div>

        {/* Free */}
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-5 shadow-xs flex flex-col justify-between">
          <div className="text-3xl font-bold text-[#16A34A]">
            {freeLockers}
          </div>
          <div className="text-xs font-normal text-[#697586] mt-1">
            Free
          </div>
        </div>

        {/* Maintenance */}
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-5 shadow-xs flex flex-col justify-between">
          <div className="text-3xl font-bold text-[#D97706]">
            {maintenanceLockers}
          </div>
          <div className="text-xs font-normal text-[#697586] mt-1">
            Maintenance
          </div>
        </div>
      </div>

      {/* Locker Bank A Grid Wall */}
      <LockerWallView
        lockers={lockers}
        onRefresh={loadData}
        onLaunchKioskForParcel={(trk, otp) => onOpenKiosk(trk, otp)}
        bankTitle="Locker Bank A"
      />
    </div>
  );
};
