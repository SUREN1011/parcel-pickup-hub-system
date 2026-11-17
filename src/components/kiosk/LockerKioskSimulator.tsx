import React, { useState, useEffect } from 'react';
import {
  X,
  KeyRound,
  Package,
  Unlock,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  RefreshCw
} from 'lucide-react';
import { pickupAPI, parcelAPI } from '../../services/api';
import { Parcel } from '../../types';

interface LockerKioskSimulatorProps {
  isOpen: boolean;
  onClose: () => void;
  onPickupComplete?: () => void;
  initialTracking?: string;
  initialOTP?: string;
}

export const LockerKioskSimulator: React.FC<LockerKioskSimulatorProps> = ({
  isOpen,
  onClose,
  onPickupComplete,
  initialTracking = '',
  initialOTP = ''
}) => {
  const [identifier, setIdentifier] = useState(initialTracking);
  const [otpCode, setOtpCode] = useState(initialOTP);
  const [activeStep, setActiveStep] = useState<'ENTER_CREDENTIALS' | 'UNLOCKING' | 'DOOR_OPEN' | 'COMPLETED'>('ENTER_CREDENTIALS');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [verifiedParcel, setVerifiedParcel] = useState<any>(null);
  const [allocatedLocker, setAllocatedLocker] = useState<any>(null);
  const [pickupReceipt, setPickupReceipt] = useState<any>(null);
  const [availablePickupDemos, setAvailablePickupDemos] = useState<Parcel[]>([]);

  useEffect(() => {
    if (isOpen) {
      if (initialTracking) setIdentifier(initialTracking);
      if (initialOTP) setOtpCode(initialOTP);
      loadAvailableDemoParcels();
    } else {
      resetState();
    }
  }, [isOpen, initialTracking, initialOTP]);

  const loadAvailableDemoParcels = async () => {
    try {
      const res = await parcelAPI.getAll({ status: 'READY_FOR_PICKUP' });
      if (res.success) {
        setAvailablePickupDemos(res.parcels);
      }
    } catch {
      //
    }
  };

  const resetState = () => {
    setIdentifier('');
    setOtpCode('');
    setActiveStep('ENTER_CREDENTIALS');
    setErrorMessage(null);
    setVerifiedParcel(null);
    setAllocatedLocker(null);
    setPickupReceipt(null);
  };

  const handleKeypadPress = (val: string) => {
    if (otpCode.length < 6) {
      setOtpCode(prev => prev + val);
    }
  };

  const handleKeypadBackspace = () => {
    setOtpCode(prev => prev.slice(0, -1));
  };

  const handleSelectDemoParcel = (parcel: Parcel) => {
    setIdentifier(parcel.tracking_number);
    if (parcel.current_otp) {
      setOtpCode(parcel.current_otp);
    }
    setErrorMessage(null);
  };

  const handleVerify = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!identifier.trim()) {
      setErrorMessage('Please enter your tracking number or phone.');
      return;
    }
    if (otpCode.length < 4) {
      setErrorMessage('Please enter the 6-digit OTP code.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await pickupAPI.verifyOTP(identifier.trim(), otpCode.trim());
      if (res.success) {
        setVerifiedParcel(res.parcel);
        setAllocatedLocker(res.locker);
        setActiveStep('UNLOCKING');

        setTimeout(() => {
          setActiveStep('DOOR_OPEN');
        }, 800);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'OTP verification failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmDoorCloseAndPickup = async () => {
    if (!verifiedParcel || !allocatedLocker) return;

    setIsLoading(true);
    try {
      const res = await pickupAPI.confirmPickup({
        parcel_id: verifiedParcel.id,
        locker_id: allocatedLocker.id,
        otp_code: otpCode
      });

      if (res.success) {
        setPickupReceipt(res.pickup_receipt);
        setActiveStep('COMPLETED');
        if (onPickupComplete) {
          onPickupComplete();
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to confirm pickup.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-xl bg-white border border-[#CBD5E1] rounded-2xl shadow-2xl overflow-hidden flex flex-col text-[#172033]">
        {/* Terminal Header */}
        <div className="bg-[#102D4F] text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-bold text-base tracking-tight">Parcel</span>
            <span className="font-bold text-base tracking-tight text-[#38BDF8]">Hub</span>
            <span className="text-[11px] text-[#CBD5E1] ml-2 font-mono">Terminal Kiosk</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-white/80 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[80vh]">
          {/* STEP 1: Enter Credentials */}
          {activeStep === 'ENTER_CREDENTIALS' && (
            <div className="space-y-5">
              <div className="text-center space-y-1">
                <div className="w-10 h-10 rounded-full bg-[#EFF6FF] text-[#2453D4] mx-auto flex items-center justify-center mb-1">
                  <KeyRound className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-[#172033]">Enter Pickup Code</h3>
                <p className="text-xs text-[#697586]">
                  Enter your tracking number and the 6-digit OTP code to unlock your locker.
                </p>
              </div>

              {/* Demo Quick-Select */}
              {availablePickupDemos.length > 0 && (
                <div className="bg-[#F0F3F9] rounded-xl p-3 text-xs space-y-1.5">
                  <span className="font-semibold text-[#172033]">Ready for Pickup (Autofill):</span>
                  <div className="flex flex-wrap gap-2">
                    {availablePickupDemos.slice(0, 3).map(p => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleSelectDemoParcel(p)}
                        className="px-2.5 py-1 rounded-md bg-white border border-[#CBD5E1] text-[11px] font-mono hover:border-[#2453D4] text-[#172033]"
                      >
                        {p.tracking_number} (Locker {p.locker_code?.replace('L-1', 'A')})
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {errorMessage && (
                <div className="p-2.5 rounded-lg bg-red-50 text-red-700 text-xs font-medium flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <form onSubmit={handleVerify} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[#172033] mb-1">
                    Tracking Number or Phone
                  </label>
                  <input
                    type="text"
                    value={identifier}
                    onChange={e => setIdentifier(e.target.value)}
                    placeholder="e.g. QS-2026-004581 or +91 9876543210"
                    className="w-full px-3.5 py-2.5 rounded-lg bg-white border border-[#CBD5E1] text-xs font-mono text-[#172033] focus:outline-none focus:border-[#2453D4]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#172033] mb-1.5">
                    6-Digit OTP Code
                  </label>

                  {/* Digit boxes matching reference */}
                  <div className="flex items-center justify-center gap-2 py-1">
                    {[0, 1, 2, 3, 4, 5].map(idx => (
                      <div
                        key={idx}
                        className={`w-10 h-12 rounded-lg border-2 flex items-center justify-center font-bold text-xl text-[#2453D4] ${
                          otpCode[idx] ? 'border-[#2453D4] bg-[#EFF6FF]' : 'border-[#CBD5E1] bg-white'
                        }`}
                      >
                        {otpCode[idx] || '•'}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Numeric Keypad */}
                <div className="max-w-xs mx-auto grid grid-cols-3 gap-2 pt-1">
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(d => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => handleKeypadPress(d)}
                      className="h-10 rounded-lg bg-[#F0F3F9] hover:bg-[#E2E8F0] active:bg-[#CBD5E1] text-sm font-bold text-[#172033] border border-[#CBD5E1] transition-colors"
                    >
                      {d}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setOtpCode('')}
                    className="h-10 rounded-lg bg-[#F0F3F9] text-xs font-semibold text-[#697586] border border-[#CBD5E1]"
                  >
                    Clear
                  </button>
                  <button
                    type="button"
                    onClick={() => handleKeypadPress('0')}
                    className="h-10 rounded-lg bg-[#F0F3F9] hover:bg-[#E2E8F0] text-sm font-bold text-[#172033] border border-[#CBD5E1]"
                  >
                    0
                  </button>
                  <button
                    type="button"
                    onClick={handleKeypadBackspace}
                    className="h-10 rounded-lg bg-[#F0F3F9] text-xs font-semibold text-[#697586] border border-[#CBD5E1]"
                  >
                    ⌫ Del
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2.5 rounded-lg bg-[#2453D4] hover:bg-[#1D44B8] text-white text-xs font-semibold shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isLoading ? 'Verifying...' : 'Unlock Locker Compartment'}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            </div>
          )}

          {/* STEP 2: Unlocking */}
          {activeStep === 'UNLOCKING' && (
            <div className="py-12 text-center space-y-3">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto text-[#2453D4]" />
              <h3 className="text-base font-bold text-[#172033]">Unlocking Solenoid Latch...</h3>
              <p className="text-xs text-[#697586]">Opening Locker Door {allocatedLocker?.locker_code?.replace('L-1', 'A')}</p>
            </div>
          )}

          {/* STEP 3: Door Open */}
          {activeStep === 'DOOR_OPEN' && (
            <div className="space-y-5 text-center">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#DCFCE7] text-[#15803D] text-xs font-semibold">
                <Unlock className="w-3.5 h-3.5" />
                <span>Door Unlocked • Door State: OPEN</span>
              </div>

              <div className="p-6 rounded-xl bg-[#F0F3F9] border border-[#CBD5E1] space-y-2">
                <div className="text-2xl font-black text-[#172033]">
                  LOCKER {allocatedLocker?.locker_code?.replace('L-1', 'A')} IS OPEN
                </div>
                <p className="text-xs text-[#697586]">
                  Please retrieve package <strong>{verifiedParcel?.tracking_number}</strong> from compartment {allocatedLocker?.locker_code?.replace('L-1', 'A')}.
                </p>
              </div>

              <button
                onClick={handleConfirmDoorCloseAndPickup}
                disabled={isLoading}
                className="w-full py-3 rounded-lg bg-[#16A34A] hover:bg-[#15803D] text-white font-bold text-xs shadow-xs transition-colors"
              >
                {isLoading ? 'Updating System...' : 'Package Collected (Close Locker Door)'}
              </button>
            </div>
          )}

          {/* STEP 4: Completed Receipt */}
          {activeStep === 'COMPLETED' && (
            <div className="text-center space-y-4 py-4">
              <div className="w-12 h-12 rounded-full bg-[#DCFCE7] text-[#16A34A] mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6" />
              </div>

              <div className="space-y-1">
                <h3 className="text-lg font-bold text-[#172033]">Pickup Successful!</h3>
                <p className="text-xs text-[#697586]">
                  Locker door closed. Compartment {pickupReceipt?.locker_code?.replace('L-1', 'A')} is now Free.
                </p>
              </div>

              <div className="bg-[#F0F3F9] rounded-xl p-4 text-xs font-mono space-y-1.5 text-left text-[#172033]">
                <div className="flex justify-between">
                  <span className="text-[#697586]">Tracking:</span>
                  <span className="font-bold">{pickupReceipt?.tracking_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#697586]">Recipient:</span>
                  <span>{pickupReceipt?.customer_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#697586]">Locker:</span>
                  <span>{pickupReceipt?.locker_code?.replace('L-1', 'A')}</span>
                </div>
              </div>

              <div className="flex justify-center gap-2 pt-2">
                <button
                  onClick={resetState}
                  className="px-4 py-2 rounded-lg border border-[#CBD5E1] text-xs font-medium hover:bg-[#F0F3F9]"
                >
                  Pickup Another
                </button>
                <button
                  onClick={onClose}
                  className="px-5 py-2 rounded-lg bg-[#2453D4] text-white text-xs font-semibold"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
