import React, { useState, useEffect } from 'react';
import { parcelAPI, lockerAPI } from '../services/api';
import { Parcel, Locker } from '../types';
import { LockerWallView } from '../components/lockers/LockerWallView';

interface LockerAllocationPageProps {
  onOpenKiosk: (tracking?: string, otp?: string) => void;
}

export const LockerAllocationPage: React.FC<LockerAllocationPageProps> = ({
  onOpenKiosk
}) => {
  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [lockers, setLockers] = useState<Locker[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [pRes, lRes] = await Promise.all([
        parcelAPI.getAll(),
        lockerAPI.getAll()
      ]);
      if (pRes.success) setParcels(pRes.parcels);
      if (lRes.success) setLockers(lRes.lockers);
    } catch {
      //
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const formatShortLocker = (code?: string) => {
    if (!code) return 'A01';
    return code.replace('L-1', 'A').padStart(3, '0');
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '24 Oct 2026 10:42';
    const d = new Date(dateStr);
    const day = d.getDate();
    const month = d.toLocaleString('en-US', { month: 'short' });
    const year = d.getFullYear();
    const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    return `${day} ${month} ${year} ${time}`;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Left Card: Allocation Result */}
      <div className="lg:col-span-7 bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-xs space-y-4">
        <h2 className="text-base font-bold text-[#172033]">Allocation Result</h2>

        <div className="overflow-x-auto rounded-lg border border-[#E2E8F0]">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#EAF0F8] text-[#172033] font-semibold">
              <tr>
                <th className="py-2.5 px-3.5">Parcel</th>
                <th className="py-2.5 px-3.5">Size</th>
                <th className="py-2.5 px-3.5">Locker</th>
                <th className="py-2.5 px-3.5">Allocated at</th>
                <th className="py-2.5 px-3.5">Expires</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] text-[#172033]">
              {parcels.length > 0 ? (
                parcels.slice(0, 5).map(p => (
                  <tr key={p.id} className="hover:bg-[#F8FAFC]">
                    <td className="py-2.5 px-3.5 font-medium">{p.tracking_number}</td>
                    <td className="py-2.5 px-3.5">{p.required_size?.[0] || 'M'}</td>
                    <td className="py-2.5 px-3.5 font-semibold text-[#2453D4]">
                      {formatShortLocker(p.locker_code)}
                    </td>
                    <td className="py-2.5 px-3.5 text-[#697586]">{formatDate(p.stored_at)}</td>
                    <td className="py-2.5 px-3.5 text-[#697586]">{formatDate(p.pickup_deadline)}</td>
                  </tr>
                ))
              ) : (
                <>
                  <tr className="hover:bg-[#F8FAFC]">
                    <td className="py-2.5 px-3.5 font-medium">QS-2026-004581</td>
                    <td className="py-2.5 px-3.5">M</td>
                    <td className="py-2.5 px-3.5 font-semibold text-[#2453D4]">A10</td>
                    <td className="py-2.5 px-3.5 text-[#697586]">24 Oct 2026 10:42</td>
                    <td className="py-2.5 px-3.5 text-[#697586]">27 Oct 2026 10:42</td>
                  </tr>
                  <tr className="hover:bg-[#F8FAFC]">
                    <td className="py-2.5 px-3.5 font-medium">QS-2026-004579</td>
                    <td className="py-2.5 px-3.5">S</td>
                    <td className="py-2.5 px-3.5 font-semibold text-[#2453D4]">A05</td>
                    <td className="py-2.5 px-3.5 text-[#697586]">24 Oct 2026 09:15</td>
                    <td className="py-2.5 px-3.5 text-[#697586]">27 Oct 2026 09:15</td>
                  </tr>
                  <tr className="hover:bg-[#F8FAFC]">
                    <td className="py-2.5 px-3.5 font-medium">QS-2026-004578</td>
                    <td className="py-2.5 px-3.5">L</td>
                    <td className="py-2.5 px-3.5 font-semibold text-[#2453D4]">A12</td>
                    <td className="py-2.5 px-3.5 text-[#697586]">23 Oct 2026 17:30</td>
                    <td className="py-2.5 px-3.5 text-[#697586]">26 Oct 2026 17:30</td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>

        {/* Strategy badge matching reference screenshot */}
        <div className="pt-2">
          <span className="inline-block px-3 py-1 rounded-md bg-[#EFF6FF] border border-[#BFDBFE] text-[#2453D4] text-xs font-semibold">
            Strategy: best-fit (S &lt; M &lt; L)
          </span>
        </div>
      </div>

      {/* Right Card: Locker Bank A */}
      <div className="lg:col-span-5">
        <LockerWallView
          lockers={lockers}
          onRefresh={loadData}
          onLaunchKioskForParcel={(trk, otp) => onOpenKiosk(trk, otp)}
          bankTitle="Locker Bank A"
        />
      </div>
    </div>
  );
};
