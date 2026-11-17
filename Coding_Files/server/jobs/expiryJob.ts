import { processExpiredParcels } from '../services/expiryService.js';

let intervalHandle: NodeJS.Timeout | null = null;

export function startExpiryMonitor(intervalMs: number = 60000) {
  // Run once immediately on start
  try {
    processExpiredParcels();
  } catch (err) {
    console.error('Initial expiry scan error:', err);
  }

  // Periodic interval
  intervalHandle = setInterval(() => {
    try {
      const result = processExpiredParcels();
      if (result.expiredCount > 0) {
        console.log(`[ExpiryJob] Detected and transitioned ${result.expiredCount} expired parcel(s).`);
      }
    } catch (err) {
      console.error('[ExpiryJob] Error running scheduled expiry scan:', err);
    }
  }, intervalMs);
}

export function stopExpiryMonitor() {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
  }
}
