import React, { useState, useEffect } from 'react';
import {
  Search,
  Package,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  RefreshCw,
  Terminal,
  Clock,
  X
} from 'lucide-react';
import { parcelAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Parcel } from '../types';

interface ParcelsListPageProps {
  onOpenKiosk: (tracking?: string, otp?: string) => void;
  onNavigateToRegister?: () => void;
}

export const ParcelsListPage: React.FC<ParcelsListPageProps> = ({
  onOpenKiosk
}) => {
  const { user } = useAuth();
  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedParcel, setSelectedParcel] = useState<Parcel | null>(null);

  const loadParcels = async () => {
    setIsLoading(true);
    try {
      const res = await parcelAPI.getAll({
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        search: searchQuery.trim() || undefined
      });
      if (res.success && res.parcels) {
        setParcels(res.parcels);
      }
    } catch {
      //
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadParcels();
  }, [statusFilter, searchQuery]);

  const formatShortLocker = (code?: string) => {
    if (!code) return '-';
    return code.replace('L-1', 'A').padStart(3, '0');
  };

  const getStatusBadge = (status: Parcel['status']) => {
    switch (status) {
      case 'READY_FOR_PICKUP':
      case 'STORED':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#DBEAFE] text-[#1D4ED8]">
            STORED
          </span>
        );
      case 'PICKED_UP':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#DCFCE7] text-[#15803D]">
            PICKED UP
          </span>
        );
      case 'EXPIRED':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#FEF3C7] text-[#B45309]">
            EXPIRED
          </span>
        );
      case 'RETURNED':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#F1F5F9] text-[#697586]">
            RETURNED
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#F1F5F9] text-[#172033]">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Search & Filter Bar */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-[#697586] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search tracking, recipient, phone..."
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-[#F8FAFC] border border-[#CBD5E1] text-xs text-[#172033] focus:outline-none focus:border-[#2453D4]"
          />
        </div>

        <div className="flex items-center gap-1.5 bg-[#F0F3F9] p-1 rounded-lg">
          {['ALL', 'READY_FOR_PICKUP', 'PICKED_UP', 'EXPIRED', 'RETURNED'].map(st => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                statusFilter === st ? 'bg-[#2453D4] text-white' : 'text-[#697586] hover:text-[#172033]'
              }`}
            >
              {st === 'READY_FOR_PICKUP' ? 'Stored' : st === 'PICKED_UP' ? 'Picked Up' : st}
            </button>
          ))}
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-xs space-y-4">
        <h2 className="text-base font-bold text-[#172033]">Registered Parcels Directory</h2>

        <div className="overflow-x-auto rounded-lg border border-[#E2E8F0]">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#EAF0F8] text-[#172033] font-semibold">
              <tr>
                <th className="py-2.5 px-3.5">Tracking</th>
                <th className="py-2.5 px-3.5">Recipient</th>
                <th className="py-2.5 px-3.5">Locker</th>
                <th className="py-2.5 px-3.5">Size</th>
                <th className="py-2.5 px-3.5">Status</th>
                <th className="py-2.5 px-3.5">OTP (Dev)</th>
                <th className="py-2.5 px-3.5">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] text-[#172033]">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-[#697586]">
                    Loading parcels...
                  </td>
                </tr>
              ) : parcels.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-[#697586]">
                    No parcels found matching filter.
                  </td>
                </tr>
              ) : (
                parcels.map(p => (
                  <tr key={p.id} className="hover:bg-[#F8FAFC]">
                    <td className="py-2.5 px-3.5 font-medium">{p.tracking_number}</td>
                    <td className="py-2.5 px-3.5">
                      <div>{p.customer_name}</div>
                      <div className="text-[10px] text-[#697586]">{p.customer_phone}</div>
                    </td>
                    <td className="py-2.5 px-3.5 font-semibold text-[#2453D4]">
                      {formatShortLocker(p.locker_code)}
                    </td>
                    <td className="py-2.5 px-3.5">{p.required_size?.[0] || 'M'}</td>
                    <td className="py-2.5 px-3.5">{getStatusBadge(p.status)}</td>
                    <td className="py-2.5 px-3.5 font-mono font-bold text-[#2453D4]">
                      {p.current_otp || '—'}
                    </td>
                    <td className="py-2.5 px-3.5">
                      {p.status === 'READY_FOR_PICKUP' ? (
                        <button
                          onClick={() => onOpenKiosk(p.tracking_number, p.current_otp)}
                          className="px-2.5 py-1 rounded bg-[#16A34A] hover:bg-[#15803D] text-white text-[11px] font-semibold"
                        >
                          Pickup
                        </button>
                      ) : (
                        <button
                          onClick={() => setSelectedParcel(p)}
                          className="px-2.5 py-1 rounded border border-[#CBD5E1] text-[11px] text-[#172033] hover:bg-[#F0F3F9]"
                        >
                          View
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Details Modal */}
      {selectedParcel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md bg-white rounded-2xl border border-[#CBD5E1] shadow-2xl p-6 text-xs text-[#172033] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
              <span className="text-base font-bold text-[#172033]">
                Parcel {selectedParcel.tracking_number}
              </span>
              <button
                onClick={() => setSelectedParcel(null)}
                className="p-1 text-[#697586] hover:text-[#172033] rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-[#F0F3F9] p-3.5 rounded-xl space-y-2 font-mono text-[11px]">
              <div className="flex justify-between">
                <span className="text-[#697586]">Recipient:</span>
                <span className="font-semibold">{selectedParcel.customer_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#697586]">Phone / Email:</span>
                <span>{selectedParcel.customer_phone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#697586]">Locker Compartment:</span>
                <span className="font-bold text-[#2453D4]">{formatShortLocker(selectedParcel.locker_code)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#697586]">Dimensions:</span>
                <span>{selectedParcel.length_cm}x{selectedParcel.width_cm}x{selectedParcel.height_cm} cm ({selectedParcel.weight_kg}kg)</span>
              </div>
              {selectedParcel.current_otp && (
                <div className="flex justify-between pt-1 border-t border-[#CBD5E1]">
                  <span className="text-[#2453D4] font-semibold">Active Pickup OTP:</span>
                  <span className="font-bold text-[#2453D4] text-sm tracking-widest">{selectedParcel.current_otp}</span>
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedParcel(null)}
                className="px-4 py-1.5 rounded-lg bg-[#2453D4] text-white text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
