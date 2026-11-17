import React, { useState, useEffect } from 'react';
import { lockerAPI } from '../services/api';
import { Locker } from '../types';
import { LockerWallView } from '../components/lockers/LockerWallView';

interface LockersPageProps {
  onOpenKiosk: (tracking?: string, otp?: string) => void;
}

export const LockersPage: React.FC<LockersPageProps> = ({ onOpenKiosk }) => {
  const [lockers, setLockers] = useState<Locker[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadLockers = async () => {
    setIsLoading(true);
    try {
      const res = await lockerAPI.getAll();
      if (res.success) {
        setLockers(res.lockers);
        setSummary(res.summary);
      }
    } catch {
      //
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadLockers();
  }, []);

  const totalLockers = summary?.total || lockers.length || 12;
  const occupiedLockers = (summary?.occupied || 0) + (summary?.expired_hold || 0);
  const freeLockers = summary?.available || (totalLockers - occupiedLockers);
  const maintenanceLockers = summary?.maintenance || 0;

  return (
    <div className="space-y-6">
      {/* 4 Stat Cards matching reference screenshot image_7b00c379.png */}
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

      {/* Locker Bank A Grid Wall matching reference */}
      <LockerWallView
        lockers={lockers}
        onRefresh={loadLockers}
        onLaunchKioskForParcel={(trk, otp) => onOpenKiosk(trk, otp)}
        bankTitle="Locker Bank A"
      />
    </div>
  );
};
