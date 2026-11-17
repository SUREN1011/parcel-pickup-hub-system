import React, { useState, useEffect } from 'react';
import { parcelAPI, pickupAPI } from '../services/api';
import { Parcel } from '../types';

interface CustomerPickupPageProps {
  onOpenKiosk: (tracking?: string, otp?: string) => void;
}

export const CustomerPickupPage: React.FC<CustomerPickupPageProps> = () => {
  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [selectedParcel, setSelectedParcel] = useState<Parcel | null>(null);
  const [otpInput, setOtpInput] = useState<string>('482917');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifiedMessage, setVerifiedMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadParcels = async () => {
    try {
      const res = await parcelAPI.getAll();
      if (res.success && res.parcels) {
        setParcels(res.parcels);
        const active = res.parcels.find(p => p.status === 'READY_FOR_PICKUP' || p.status === 'STORED') || res.parcels[0];
        if (active) {
          setSelectedParcel(active);
          if (active.current_otp) {
            setOtpInput(active.current_otp);
          }
        }
      }
    } catch {
      //
    }
  };

  useEffect(() => {
    loadParcels();
  }, []);

  const formatShortLocker = (code?: string) => {
    if (!code) return '-';
    return code.replace('L-1', 'A').padStart(3, '0');
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return `${d.getDate()} ${d.toLocaleString('en-US', { month: 'short' })} ${d.getFullYear()}`;
  };

  const handleUnlockLocker = async () => {
    if (!selectedParcel) return;
    setIsVerifying(true);
    setErrorMessage(null);

    try {
      // Verify OTP
      const res = await pickupAPI.verifyOTP(selectedParcel.tracking_number, otpInput.trim());
      if (res.success) {
        // Confirm pickup to release locker
        if (res.locker?.id) {
          await pickupAPI.confirmPickup({
            parcel_id: selectedParcel.id,
            locker_id: res.locker.id,
            otp_code: otpInput.trim()
          });
        }
        const lockerLabel = formatShortLocker(selectedParcel.locker_code);
        setVerifiedMessage(`OTP verified. Locker ${lockerLabel} unlocked.`);
        loadParcels();
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Verification failed.');
    } finally {
      setIsVerifying(false);
    }
  };

  const activeLockerCode = formatShortLocker(selectedParcel?.locker_code);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Card: My Parcels */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-xs space-y-4">
          <h2 className="text-base font-bold text-[#172033]">My Parcels</h2>

          <div className="overflow-x-auto rounded-lg border border-[#E2E8F0]">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#EAF0F8] text-[#172033] font-semibold">
                <tr>
                  <th className="py-2.5 px-3.5">Tracking</th>
                  <th className="py-2.5 px-3.5">Status</th>
                  <th className="py-2.5 px-3.5">Locker</th>
                  <th className="py-2.5 px-3.5">Collect before</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] text-[#172033]">
                {parcels.length > 0 ? (
                  parcels.map(p => {
                    const isPickedUp = p.status === 'PICKED_UP';
                    const isSelected = selectedParcel?.id === p.id;
                    return (
                      <tr
                        key={p.id}
                        onClick={() => {
                          setSelectedParcel(p);
                          if (p.current_otp) setOtpInput(p.current_otp);
                          setVerifiedMessage(null);
                        }}
                        className={`cursor-pointer transition-colors ${
                          isSelected ? 'bg-[#F0F7FF]' : 'hover:bg-[#F8FAFC]'
                        }`}
                      >
                        <td className="py-2.5 px-3.5 font-medium">{p.tracking_number}</td>
                        <td className="py-2.5 px-3.5">
                          {isPickedUp ? (
                            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#DCFCE7] text-[#15803D]">
                              PICKED UP
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#DBEAFE] text-[#1D4ED8]">
                              STORED
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3.5 font-medium">
                          {isPickedUp ? '-' : formatShortLocker(p.locker_code)}
                        </td>
                        <td className="py-2.5 px-3.5 text-[#697586]">
                          {isPickedUp ? '-' : formatDate(p.pickup_deadline)}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <>
                    <tr className="hover:bg-[#F8FAFC]">
                      <td className="py-2.5 px-3.5 font-medium">QS-2026-004581</td>
                      <td className="py-2.5 px-3.5">
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#DBEAFE] text-[#1D4ED8]">
                          STORED
                        </span>
                      </td>
                      <td className="py-2.5 px-3.5 font-medium">A10</td>
                      <td className="py-2.5 px-3.5 text-[#697586]">27 Oct 2026</td>
                    </tr>
                    <tr className="hover:bg-[#F8FAFC]">
                      <td className="py-2.5 px-3.5 font-medium">QS-2026-004302</td>
                      <td className="py-2.5 px-3.5">
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#DCFCE7] text-[#15803D]">
                          PICKED UP
                        </span>
                      </td>
                      <td className="py-2.5 px-3.5 font-medium">-</td>
                      <td className="py-2.5 px-3.5 text-[#697586]">-</td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Card: Unlock Locker matching reference screenshot image_0e10780e.png */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-xs space-y-5">
          <h2 className="text-base font-bold text-[#172033]">
            Unlock Locker {activeLockerCode}
          </h2>

          <div className="space-y-3">
            <label className="block text-xs font-semibold text-[#172033]">
              Enter 6-digit OTP
            </label>

            {/* OTP input container */}
            <div className="p-3 bg-white border border-[#CBD5E1] rounded-lg">
              <input
                type="text"
                maxLength={6}
                value={otpInput}
                onChange={e => setOtpInput(e.target.value)}
                placeholder="482917"
                className="w-full text-2xl font-bold tracking-[0.6em] text-center text-[#172033] focus:outline-none"
              />
            </div>
          </div>

          {errorMessage && (
            <div className="p-2.5 rounded-lg bg-red-50 text-red-700 text-xs font-medium">
              {errorMessage}
            </div>
          )}

          <div>
            <button
              onClick={handleUnlockLocker}
              disabled={isVerifying || !otpInput}
              className="px-5 py-2.5 rounded-lg bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              {isVerifying ? 'Verifying...' : 'Unlock Locker'}
            </button>
          </div>

          {verifiedMessage && (
            <div className="p-2.5 rounded-lg bg-[#DCFCE7] text-[#15803D] text-xs font-semibold">
              {verifiedMessage}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
