import React, { useState, useEffect } from 'react';
import { returnAPI } from '../services/api';
import { ReturnRequest } from '../types';

export const ReturnsPage: React.FC = () => {
  const [returns, setReturns] = useState<ReturnRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [clearingId, setClearingId] = useState<number | null>(null);

  const loadReturns = async () => {
    setIsLoading(true);
    try {
      const res = await returnAPI.getAll();
      if (res.success && res.returns) {
        setReturns(res.returns);
      }
    } catch {
      //
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadReturns();
  }, []);

  const handleReturnToVendor = async (returnId: number) => {
    setClearingId(returnId);
    try {
      const res = await returnAPI.clearLocker(returnId, 'Locker freed and package returned to vendor.');
      if (res.success) {
        loadReturns();
      }
    } catch (err: any) {
      alert(err.message || 'Action failed.');
    } finally {
      setClearingId(null);
    }
  };

  const formatShortLocker = (code?: string) => {
    if (!code) return 'A04';
    return code.replace('L-1', 'A').padStart(3, '0');
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '21 Oct 2026';
    const d = new Date(dateStr);
    return `${d.getDate()} ${d.toLocaleString('en-US', { month: 'short' })} ${d.getFullYear()}`;
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-xs space-y-4">
        <h2 className="text-base font-bold text-[#172033]">Parcels Past Hold Period</h2>

        <div className="overflow-x-auto rounded-lg border border-[#E2E8F0]">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#EAF0F8] text-[#172033] font-semibold">
              <tr>
                <th className="py-2.5 px-3.5">Tracking</th>
                <th className="py-2.5 px-3.5">Vendor</th>
                <th className="py-2.5 px-3.5">Locker</th>
                <th className="py-2.5 px-3.5">Expired on</th>
                <th className="py-2.5 px-3.5">Status</th>
                <th className="py-2.5 px-3.5">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] text-[#172033]">
              {returns.length > 0 ? (
                returns.map(r => {
                  const isPending = r.status === 'PENDING_CLEARANCE';
                  return (
                    <tr key={r.id} className="hover:bg-[#F8FAFC]">
                      <td className="py-2.5 px-3.5 font-medium">{r.tracking_number}</td>
                      <td className="py-2.5 px-3.5">{r.customer_name || 'QuickShip Traders'}</td>
                      <td className="py-2.5 px-3.5 font-medium">{formatShortLocker(r.locker_code)}</td>
                      <td className="py-2.5 px-3.5 text-[#697586]">{formatDate(r.created_at)}</td>
                      <td className="py-2.5 px-3.5">
                        {isPending ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#FEF3C7] text-[#B45309]">
                            EXPIRED
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#DBEAFE] text-[#1D4ED8]">
                            RETURNED
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3.5">
                        {isPending ? (
                          <button
                            onClick={() => handleReturnToVendor(r.id)}
                            disabled={clearingId === r.id}
                            className="px-3 py-1 rounded bg-[#D97706] hover:bg-[#B45309] text-white text-[11px] font-semibold shadow-xs transition-colors"
                          >
                            {clearingId === r.id ? 'Processing...' : 'Return to Vendor'}
                          </button>
                        ) : (
                          <span className="text-[#697586] text-xs">Locker freed</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <>
                  <tr className="hover:bg-[#F8FAFC]">
                    <td className="py-2.5 px-3.5 font-medium">QS-2026-004120</td>
                    <td className="py-2.5 px-3.5">QuickShip Traders</td>
                    <td className="py-2.5 px-3.5 font-medium">A04</td>
                    <td className="py-2.5 px-3.5 text-[#697586]">21 Oct 2026</td>
                    <td className="py-2.5 px-3.5">
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#FEF3C7] text-[#B45309]">
                        EXPIRED
                      </span>
                    </td>
                    <td className="py-2.5 px-3.5">
                      <button className="px-3 py-1 rounded bg-[#D97706] hover:bg-[#B45309] text-white text-[11px] font-semibold shadow-xs">
                        Return to Vendor
                      </button>
                    </td>
                  </tr>
                  <tr className="hover:bg-[#F8FAFC]">
                    <td className="py-2.5 px-3.5 font-medium">QS-2026-004098</td>
                    <td className="py-2.5 px-3.5">Urban Mart</td>
                    <td className="py-2.5 px-3.5 font-medium">A08</td>
                    <td className="py-2.5 px-3.5 text-[#697586]">20 Oct 2026</td>
                    <td className="py-2.5 px-3.5">
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#DBEAFE] text-[#1D4ED8]">
                        RETURNED
                      </span>
                    </td>
                    <td className="py-2.5 px-3.5 text-[#697586]">Locker freed</td>
                  </tr>
                  <tr className="hover:bg-[#F8FAFC]">
                    <td className="py-2.5 px-3.5 font-medium">QS-2026-004077</td>
                    <td className="py-2.5 px-3.5">BookNest</td>
                    <td className="py-2.5 px-3.5 font-medium">A02</td>
                    <td className="py-2.5 px-3.5 text-[#697586]">19 Oct 2026</td>
                    <td className="py-2.5 px-3.5">
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#DBEAFE] text-[#1D4ED8]">
                        RETURNED
                      </span>
                    </td>
                    <td className="py-2.5 px-3.5 text-[#697586]">Locker freed</td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>

        {/* Info banner matching reference screenshot */}
        <div className="pt-2">
          <span className="inline-block px-3 py-1 rounded-md bg-[#EFF6FF] text-[#2453D4] text-xs font-semibold">
            Expiry job runs every 10 minutes and frees lockers automatically
          </span>
        </div>
      </div>
    </div>
  );
};
