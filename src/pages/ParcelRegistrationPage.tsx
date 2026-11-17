import React, { useState, useEffect } from 'react';
import { parcelAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { LockerSize, Parcel } from '../types';

interface ParcelRegistrationPageProps {
  onOpenKiosk: (tracking?: string, otp?: string) => void;
  onNavigateToParcels?: () => void;
}

export const ParcelRegistrationPage: React.FC<ParcelRegistrationPageProps> = ({
  onOpenKiosk
}) => {
  const { addSimulatedSMS } = useAuth();

  // Form states
  const [trackingNumber, setTrackingNumber] = useState(`QS-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`);
  const [customerEmail, setCustomerEmail] = useState('priya.kumar@mail.com');
  const [customerName, setCustomerName] = useState('Priya Kumar');
  const [customerPhone, setCustomerPhone] = useState('+91 9876543210');
  const [parcelSize, setParcelSize] = useState<LockerSize>('MEDIUM');
  const [weightKg, setWeightKg] = useState('2.4');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastNotification, setLastNotification] = useState<string>('Parcel stored in locker A10. OTP sent.');
  const [recentParcels, setRecentParcels] = useState<Parcel[]>([]);

  const loadRecentParcels = async () => {
    try {
      const res = await parcelAPI.getAll();
      if (res.success && res.parcels) {
        setRecentParcels(res.parcels.slice(0, 5));
      }
    } catch {
      // background fetch
    }
  };

  useEffect(() => {
    loadRecentParcels();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    // Dimension mapping based on selected size
    let l = 28, w = 22, h = 18;
    if (parcelSize === 'SMALL') {
      l = 12; w = 15; h = 18;
    } else if (parcelSize === 'LARGE') {
      l = 45; w = 40; h = 35;
    }

    try {
      const res = await parcelAPI.register({
        customer_name: customerName.trim() || 'Priya Kumar',
        customer_email: customerEmail.trim(),
        customer_phone: customerPhone.trim() || '+91 9876543210',
        description: `${parcelSize} Parcel Package`,
        length_cm: l,
        width_cm: w,
        height_cm: h,
        weight_kg: parseFloat(weightKg) || 2.4,
        pickup_deadline_hours: 48
      });

      if (res.success) {
        const lockerCode = res.locker?.locker_code || 'A10';
        const formattedLocker = lockerCode.replace('L-1', 'A').padStart(3, '0');
        setLastNotification(`Parcel stored in locker ${formattedLocker}. OTP sent.`);

        if (res.sms_simulation) {
          addSimulatedSMS(res.sms_simulation);
        }

        // Generate new tracking for next item
        setTrackingNumber(`QS-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`);
        loadRecentParcels();
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Locker allocation failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
          {errorMessage}
        </div>
      )}

      {/* 2-Column Layout matching reference screenshot image_3774c997.png */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Card: New Parcel Registration */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-xs space-y-5">
          <h2 className="text-base font-bold text-[#172033]">New Parcel Registration</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#172033] mb-1.5">
                Tracking number
              </label>
              <input
                type="text"
                value={trackingNumber}
                onChange={e => setTrackingNumber(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-lg bg-white border border-[#CBD5E1] text-xs font-medium text-[#172033] focus:outline-none focus:border-[#2453D4] focus:ring-1 focus:ring-[#2453D4]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#172033] mb-1.5">
                Customer e-mail
              </label>
              <input
                type="email"
                value={customerEmail}
                onChange={e => setCustomerEmail(e.target.value)}
                required
                placeholder="priya.kumar@mail.com"
                className="w-full px-3.5 py-2.5 rounded-lg bg-white border border-[#CBD5E1] text-xs font-medium text-[#172033] focus:outline-none focus:border-[#2453D4] focus:ring-1 focus:ring-[#2453D4]"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#172033] mb-1.5">
                  Parcel size
                </label>
                <select
                  value={parcelSize}
                  onChange={e => setParcelSize(e.target.value as LockerSize)}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-white border border-[#CBD5E1] text-xs font-medium text-[#172033] focus:outline-none focus:border-[#2453D4] focus:ring-1 focus:ring-[#2453D4]"
                >
                  <option value="SMALL">Small (S)</option>
                  <option value="MEDIUM">Medium (M)</option>
                  <option value="LARGE">Large (L)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#172033] mb-1.5">
                  Weight (kg)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  value={weightKg}
                  onChange={e => setWeightKg(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 rounded-lg bg-white border border-[#CBD5E1] text-xs font-medium text-[#172033] focus:outline-none focus:border-[#2453D4] focus:ring-1 focus:ring-[#2453D4]"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="px-5 py-2.5 rounded-lg bg-[#2453D4] hover:bg-[#1D44B8] text-white text-xs font-medium shadow-xs transition-colors cursor-pointer"
              >
                {isLoading ? 'Allocating...' : 'Register & Allocate Locker'}
              </button>
            </div>
          </form>
        </div>

        {/* Right Card: Last Registered */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-xs space-y-4">
          <h2 className="text-base font-bold text-[#172033]">Last Registered</h2>

          <div className="overflow-hidden rounded-lg border border-[#E2E8F0]">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#EAF0F8] text-[#172033] font-semibold">
                <tr>
                  <th className="py-2.5 px-3.5">Tracking</th>
                  <th className="py-2.5 px-3.5">Locker</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] text-[#172033]">
                {recentParcels.length > 0 ? (
                  recentParcels.slice(0, 4).map(p => {
                    const shortTracking = p.tracking_number.length > 8 ? p.tracking_number.slice(0, 8) : p.tracking_number;
                    const shortLocker = p.locker_code ? p.locker_code.replace('L-1', 'A').padStart(3, '0') : 'A01';
                    return (
                      <tr key={p.id} className="hover:bg-[#F8FAFC]">
                        <td className="py-2.5 px-3.5 font-medium">{shortTracking}</td>
                        <td className="py-2.5 px-3.5 font-medium">{shortLocker}</td>
                      </tr>
                    );
                  })
                ) : (
                  <>
                    <tr className="hover:bg-[#F8FAFC]">
                      <td className="py-2.5 px-3.5 font-medium">QS-4579</td>
                      <td className="py-2.5 px-3.5 font-medium">A07</td>
                    </tr>
                    <tr className="hover:bg-[#F8FAFC]">
                      <td className="py-2.5 px-3.5 font-medium">QS-4578</td>
                      <td className="py-2.5 px-3.5 font-medium">A02</td>
                    </tr>
                    <tr className="hover:bg-[#F8FAFC]">
                      <td className="py-2.5 px-3.5 font-medium">QS-4577</td>
                      <td className="py-2.5 px-3.5 font-medium">A01</td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>

          {/* Green notification banner below table */}
          {lastNotification && (
            <div className="p-2.5 rounded-lg bg-[#DCFCE7] border border-[#BBF7D0] text-[#15803D] text-xs font-semibold flex items-center justify-between">
              <span>{lastNotification}</span>
              <button
                onClick={() => onOpenKiosk()}
                className="text-[11px] underline hover:opacity-80"
              >
                Open Kiosk
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
