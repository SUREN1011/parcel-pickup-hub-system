import React, { useState } from 'react';
import {
  Wrench,
  Package,
  Unlock,
  CheckCircle2,
  Maximize2,
  Info,
  X
} from 'lucide-react';
import { Locker } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { lockerAPI } from '../../services/api';

interface LockerWallViewProps {
  lockers: Locker[];
  onRefresh: () => void;
  onLaunchKioskForParcel?: (tracking: string, otp?: string) => void;
  bankTitle?: string;
}

export const LockerWallView: React.FC<LockerWallViewProps> = ({
  lockers,
  onRefresh,
  onLaunchKioskForParcel,
  bankTitle = 'Locker Bank A'
}) => {
  const { user } = useAuth();
  const [selectedLocker, setSelectedLocker] = useState<Locker | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const bays = Array.from(new Set(lockers.map(l => l.bay_number))).sort();
  const [activeBay, setActiveBay] = useState<string>('ALL');

  const filteredLockers = lockers.filter(l => activeBay === 'ALL' || l.bay_number === activeBay);

  const handleToggleMaintenance = async (locker: Locker) => {
    setIsUpdating(true);
    try {
      const newStatus = locker.status === 'MAINTENANCE' ? 'AVAILABLE' : 'MAINTENANCE';
      await lockerAPI.updateStatus(locker.id, { status: newStatus });
      onRefresh();
      if (selectedLocker?.id === locker.id) {
        setSelectedLocker(prev => prev ? { ...prev, status: newStatus as any } : null);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update locker status.');
    } finally {
      setIsUpdating(false);
    }
  };

  const getTileStyle = (status: Locker['status']) => {
    if (status === 'AVAILABLE') {
      return {
        bg: 'bg-[#16A34A] hover:bg-[#15803D]',
        label: 'Free'
      };
    }
    if (status === 'MAINTENANCE') {
      return {
        bg: 'bg-[#D97706] hover:bg-[#B45309]',
        label: 'Maintenance'
      };
    }
    // OCCUPIED or EXPIRED_HOLD
    return {
      bg: 'bg-[#DC2626] hover:bg-[#B91C1C]',
      label: status === 'EXPIRED_HOLD' ? 'Expired' : 'Occupied'
    };
  };

  const formatShortCode = (code: string) => {
    // E.g. "L-101" -> "A01", "L-102" -> "A02", etc., or preserve code
    if (code.startsWith('L-1')) {
      const num = code.replace('L-1', '');
      return `A${num.padStart(2, '0')}`;
    }
    return code;
  };

  const getSizeInitial = (size: Locker['size']) => {
    return size ? size[0] : 'S';
  };

  return (
    <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-xs space-y-6">
      {/* Header & Bay selector if multiple */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h3 className="text-base font-bold text-[#172033]">{bankTitle}</h3>

        {bays.length > 1 && (
          <div className="flex items-center gap-1.5 bg-[#F0F3F9] p-1 rounded-lg">
            <button
              onClick={() => setActiveBay('ALL')}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                activeBay === 'ALL' ? 'bg-[#2453D4] text-white' : 'text-[#697586] hover:text-[#172033]'
              }`}
            >
              All Bays
            </button>
            {bays.map(bay => (
              <button
                key={bay}
                onClick={() => setActiveBay(bay)}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                  activeBay === bay ? 'bg-[#2453D4] text-white' : 'text-[#697586] hover:text-[#172033]'
                }`}
              >
                {bay}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Locker Grid matching exact screenshot reference */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-3.5">
        {filteredLockers.map(locker => {
          const tile = getTileStyle(locker.status);
          const shortCode = formatShortCode(locker.locker_code);
          const sizeChar = getSizeInitial(locker.size);

          return (
            <button
              key={locker.id}
              onClick={() => setSelectedLocker(locker)}
              className={`${tile.bg} rounded-xl p-3 text-white text-center flex flex-col items-center justify-center min-h-[78px] transition-all cursor-pointer shadow-xs active:scale-95 group focus:outline-none focus:ring-2 focus:ring-[#2453D4]`}
              title={`Locker ${locker.locker_code} - Click to inspect`}
            >
              <div className="text-sm sm:text-base font-bold tracking-wide">
                {shortCode}
              </div>
              <div className="text-[11px] font-normal text-white/95 mt-0.5 whitespace-nowrap">
                {sizeChar} - {tile.label}
              </div>
            </button>
          );
        })}
      </div>

      {/* Legend matching reference screenshot */}
      <div className="flex items-center gap-6 pt-2 text-xs font-medium text-[#172033]">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-[#16A34A]" />
          <span>Free</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-[#DC2626]" />
          <span>Occupied</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-[#D97706]" />
          <span>Maintenance</span>
        </div>
      </div>

      {/* Selected Locker Inspector Modal */}
      {selectedLocker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md bg-white rounded-2xl border border-[#CBD5E1] shadow-2xl p-6 text-xs text-[#172033] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
              <div className="flex items-center gap-2">
                <span className="text-base font-bold text-[#172033]">
                  Locker {formatShortCode(selectedLocker.locker_code)} ({selectedLocker.locker_code})
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold text-white ${
                    selectedLocker.status === 'AVAILABLE'
                      ? 'bg-[#16A34A]'
                      : selectedLocker.status === 'MAINTENANCE'
                      ? 'bg-[#D97706]'
                      : 'bg-[#DC2626]'
                  }`}
                >
                  {selectedLocker.status}
                </span>
              </div>
              <button
                onClick={() => setSelectedLocker(null)}
                className="p-1 text-[#697586] hover:text-[#172033] rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-[#F0F3F9] p-3.5 rounded-xl space-y-1.5 font-mono text-[11px]">
              <div className="flex justify-between">
                <span className="text-[#697586]">Bay Station:</span>
                <span className="font-semibold">{selectedLocker.bay_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#697586]">Size Category:</span>
                <span className="font-semibold">{selectedLocker.size}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#697586]">Max Dimensions:</span>
                <span>{selectedLocker.max_length_cm} x {selectedLocker.max_width_cm} x {selectedLocker.max_height_cm} cm</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#697586]">Door Sensor State:</span>
                <span className={selectedLocker.door_sensor_state === 'OPEN' ? 'text-amber-600 font-bold' : 'text-green-600'}>
                  {selectedLocker.door_sensor_state}
                </span>
              </div>
            </div>

            {selectedLocker.tracking_number ? (
              <div className="bg-[#EFF6FF] border border-[#BFDBFE] p-3.5 rounded-xl space-y-1.5">
                <div className="font-semibold text-[#1E3A8A] flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5" />
                  <span>Stored Parcel</span>
                </div>
                <div className="font-mono flex justify-between">
                  <span className="text-[#697586]">Tracking:</span>
                  <span className="font-bold text-[#172033]">{selectedLocker.tracking_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#697586]">Recipient:</span>
                  <span>{selectedLocker.customer_name}</span>
                </div>
                {selectedLocker.current_otp && (
                  <div className="flex justify-between pt-1 border-t border-[#DBEAFE] font-mono">
                    <span className="text-[#1E3A8A] font-semibold">Active OTP:</span>
                    <span className="font-bold text-[#2453D4] tracking-widest">{selectedLocker.current_otp}</span>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-center py-2 text-[#697586]">No parcel currently stored in this locker.</p>
            )}

            <div className="pt-2 border-t border-[#E2E8F0] flex items-center justify-between gap-2">
              {(user?.role === 'ADMIN' || user?.role === 'HUB_STAFF') && (
                <button
                  disabled={isUpdating}
                  onClick={() => handleToggleMaintenance(selectedLocker)}
                  className="px-3 py-1.5 rounded-lg border border-[#CBD5E1] text-[#172033] hover:bg-[#F0F3F9] font-medium flex items-center gap-1.5"
                >
                  <Wrench className="w-3 h-3 text-[#D97706]" />
                  <span>{selectedLocker.status === 'MAINTENANCE' ? 'Restore to Free' : 'Set Maintenance'}</span>
                </button>
              )}

              {selectedLocker.tracking_number && onLaunchKioskForParcel && (
                <button
                  onClick={() => {
                    const trk = selectedLocker.tracking_number!;
                    const otp = selectedLocker.current_otp || undefined;
                    setSelectedLocker(null);
                    onLaunchKioskForParcel(trk, otp);
                  }}
                  className="ml-auto px-4 py-1.5 rounded-lg bg-[#2453D4] hover:bg-[#1D44B8] text-white font-medium flex items-center gap-1.5"
                >
                  <Unlock className="w-3 h-3" />
                  <span>Test Kiosk Pickup</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
