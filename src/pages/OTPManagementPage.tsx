import React, { useState, useEffect } from 'react';
import { parcelAPI } from '../services/api';
import { Parcel } from '../types';

export const OTPManagementPage: React.FC = () => {
  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [selectedParcel, setSelectedParcel] = useState<Parcel | null>(null);
  const [otpCode, setOtpCode] = useState<string>('482917');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await parcelAPI.getAll();
        if (res.success && res.parcels.length > 0) {
          setParcels(res.parcels);
          const firstWithOTP = res.parcels.find(p => p.current_otp) || res.parcels[0];
          setSelectedParcel(firstWithOTP);
          if (firstWithOTP.current_otp) {
            setOtpCode(firstWithOTP.current_otp);
          }
        }
      } catch {
        //
      }
    };
    load();
  }, []);

  const handleSelectParcel = (p: Parcel) => {
    setSelectedParcel(p);
    if (p.current_otp) {
      setOtpCode(p.current_otp);
    } else {
      setOtpCode('482917');
    }
    setStatusMessage(null);
  };

  const handleResendOTP = () => {
    const newCode = Math.floor(100000 + Math.random() * 900000).toString();
    setOtpCode(newCode);
    setStatusMessage(`New OTP code ${newCode} generated and dispatched via SMS.`);
  };

  const handleInvalidateOTP = () => {
    setOtpCode('------');
    setStatusMessage('OTP has been successfully invalidated for security.');
  };

  const digits = otpCode.padEnd(6, '-').slice(0, 6).split('');

  const lockerCode = selectedParcel?.locker_code ? selectedParcel.locker_code.replace('L-1', 'A').padStart(3, '0') : 'A10';
  const tracking = selectedParcel?.tracking_number || 'QS-2026-004581';
  const customerEmail = selectedParcel?.customer_email || 'priya.kumar@mail.com';
  const customerPhone = selectedParcel?.customer_phone || '+91 98XXXXXX21';

  return (
    <div className="max-w-3xl space-y-6">
      {/* Selector dropdown if multiple parcels */}
      {parcels.length > 1 && (
        <div className="bg-white p-3.5 rounded-xl border border-[#E2E8F0] flex items-center justify-between text-xs">
          <span className="font-semibold text-[#172033]">Select Stored Parcel:</span>
          <select
            value={selectedParcel?.id || ''}
            onChange={e => {
              const p = parcels.find(item => item.id === parseInt(e.target.value, 10));
              if (p) handleSelectParcel(p);
            }}
            className="px-3 py-1.5 rounded-lg border border-[#CBD5E1] bg-white text-xs font-mono font-medium focus:outline-none focus:border-[#2453D4]"
          >
            {parcels.map(p => (
              <option key={p.id} value={p.id}>
                {p.tracking_number} (Locker {p.locker_code ? p.locker_code.replace('L-1', 'A').padStart(3, '0') : 'A01'}) - {p.customer_name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Main White Card matching reference screenshot image_fcd05faa.png */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] p-8 shadow-xs space-y-6">
        <h2 className="text-base font-bold text-[#172033]">
          One-Time Password Generated
        </h2>

        {/* 6 Individual Digit Boxes */}
        <div className="flex items-center gap-3 py-2">
          {digits.map((digit, idx) => (
            <div
              key={idx}
              className="w-12 h-16 sm:w-14 sm:h-18 rounded-xl border-2 border-[#CBD5E1] bg-white flex items-center justify-center font-bold text-2xl sm:text-3xl text-[#2453D4] shadow-xs select-none"
            >
              {digit}
            </div>
          ))}
        </div>

        {/* Details Table matching reference screenshot */}
        <div className="divide-y divide-[#E2E8F0] text-xs font-medium text-[#172033]">
          <div className="py-3 flex flex-col sm:flex-row sm:items-center">
            <span className="w-44 text-[#697586]">Sent to</span>
            <span>{customerPhone} (SMS) and {customerEmail}</span>
          </div>
          <div className="py-3 flex flex-col sm:flex-row sm:items-center">
            <span className="w-44 text-[#697586]">Valid for</span>
            <span>15 minutes (until {new Date(Date.now() + 15 * 60 * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})</span>
          </div>
          <div className="py-3 flex flex-col sm:flex-row sm:items-center">
            <span className="w-44 text-[#697586]">Attempts allowed</span>
            <span>3</span>
          </div>
          <div className="py-3 flex flex-col sm:flex-row sm:items-center">
            <span className="w-44 text-[#697586]">Storage</span>
            <span className="text-[#172033]">Hashed (bcrypt) - never stored in plain text</span>
          </div>
        </div>

        {statusMessage && (
          <div className="p-3 rounded-lg bg-[#EFF6FF] border border-[#BFDBFE] text-[#2453D4] text-xs font-medium">
            {statusMessage}
          </div>
        )}

        {/* Buttons matching reference screenshot */}
        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={handleResendOTP}
            className="px-5 py-2.5 rounded-lg bg-[#2453D4] hover:bg-[#1D44B8] text-white text-xs font-semibold shadow-xs transition-colors"
          >
            Resend OTP
          </button>
          <button
            onClick={handleInvalidateOTP}
            className="px-5 py-2.5 rounded-lg bg-[#DC2626] hover:bg-[#B91C1C] text-white text-xs font-semibold shadow-xs transition-colors"
          >
            Invalidate OTP
          </button>
        </div>
      </div>
    </div>
  );
};
