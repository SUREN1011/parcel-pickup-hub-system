import { db } from '../config/database.js';

export type LockerSize = 'SMALL' | 'MEDIUM' | 'LARGE';

export interface LockerDimensionSpec {
  size: LockerSize;
  maxLength: number;
  maxWidth: number;
  maxHeight: number;
  maxWeight: number;
}

export const LOCKER_SPECS: Record<LockerSize, LockerDimensionSpec> = {
  SMALL: { size: 'SMALL', maxLength: 15.0, maxWidth: 20.0, maxHeight: 30.0, maxWeight: 10.0 },
  MEDIUM: { size: 'MEDIUM', maxLength: 30.0, maxWidth: 35.0, maxHeight: 45.0, maxWeight: 20.0 },
  LARGE: { size: 'LARGE', maxLength: 50.0, maxWidth: 50.0, maxHeight: 60.0, maxWeight: 35.0 }
};

/**
 * Checks if parcel dimensions fit inside a given locker size,
 * testing 3D rotation (sorting the 3 dimensions).
 */
export function canFit(
  pLength: number,
  pWidth: number,
  pHeight: number,
  pWeight: number,
  spec: LockerDimensionSpec
): boolean {
  if (pWeight > spec.maxWeight) return false;

  const parcelSorted = [pLength, pWidth, pHeight].sort((a, b) => a - b);
  const lockerSorted = [spec.maxLength, spec.maxWidth, spec.maxHeight].sort((a, b) => a - b);

  return (
    parcelSorted[0] <= lockerSorted[0] &&
    parcelSorted[1] <= lockerSorted[1] &&
    parcelSorted[2] <= lockerSorted[2]
  );
}

/**
 * Determines the smallest standard category required for parcel dimensions.
 */
export function determineMinimumRequiredSize(
  length: number,
  width: number,
  height: number,
  weight: number
): LockerSize | null {
  const sizes: LockerSize[] = ['SMALL', 'MEDIUM', 'LARGE'];
  for (const size of sizes) {
    if (canFit(length, width, height, weight, LOCKER_SPECS[size])) {
      return size;
    }
  }
  return null; // Oversized parcel
}

export interface AllocationResult {
  success: boolean;
  locker?: {
    id: number;
    locker_code: string;
    size: LockerSize;
    bay_number: string;
    max_length_cm: number;
    max_width_cm: number;
    max_height_cm: number;
  };
  requiredSize?: LockerSize;
  allocatedSize?: LockerSize;
  isUpgraded?: boolean;
  message?: string;
}

/**
 * Automatically allocates the SMALLEST suitable available locker.
 * Must be executed within or alongside a database transaction to prevent race conditions.
 */
export function allocateSmallestSuitableLocker(
  length: number,
  width: number,
  height: number,
  weight: number
): AllocationResult {
  const requiredSize = determineMinimumRequiredSize(length, width, height, weight);

  if (!requiredSize) {
    return {
      success: false,
      message: `Parcel dimensions (${length} x ${width} x ${height} cm, ${weight}kg) exceed the maximum capacity of Large Lockers (50 x 50 x 60 cm, 35kg).`
    };
  }

  // Size hierarchy for upgrade search
  const sizeHierarchy: LockerSize[] = ['SMALL', 'MEDIUM', 'LARGE'];
  const startIndex = sizeHierarchy.indexOf(requiredSize);
  const eligibleSizes = sizeHierarchy.slice(startIndex);

  // Check each eligible size starting from the smallest suitable
  for (const size of eligibleSizes) {
    const candidate = db.prepare(`
      SELECT id, locker_code, size, bay_number, max_length_cm, max_width_cm, max_height_cm
      FROM lockers
      WHERE size = ?
        AND status = 'AVAILABLE'
        AND is_active = 1
      ORDER BY id ASC
      LIMIT 1
    `).get(size) as any;

    if (candidate) {
      const isUpgraded = size !== requiredSize;
      return {
        success: true,
        locker: candidate,
        requiredSize,
        allocatedSize: size,
        isUpgraded,
        message: isUpgraded
          ? `Smallest size (${requiredSize}) lockers are currently full. Automatically upgraded to available ${size} Locker ${candidate.locker_code}.`
          : `Allocated optimal ${size} Locker ${candidate.locker_code}.`
      };
    }
  }

  // No lockers available
  return {
    success: false,
    requiredSize,
    message: `All suitable lockers (${eligibleSizes.join(', ')}) are currently occupied or in maintenance. Please retry once compartments are cleared.`
  };
}
