'use client';

import {
  Firestore,
  doc,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore';

/**
 * Gets the next sequential number for a given counter in a thread-safe manner using a Firestore transaction.
 *
 * @param firestore The Firestore instance.
 * @param tenantId The ID of the tenant.
 * @param counterName The name of the counter to increment (e.g., 'bookings').
 * @returns A promise that resolves with the next sequential number.
 */
export async function getNextBookingNumber(
  firestore: Firestore,
  tenantId: string,
  counterName: string
): Promise<number> {
  const counterRef = doc(firestore, 'tenants', tenantId, 'counters', counterName);

  try {
    const newNumber = await runTransaction(firestore, async (transaction) => {
      const counterDoc = await transaction.get(counterRef);

      if (!counterDoc.exists()) {
        // If the counter document doesn't exist, create it and return 1.
        transaction.set(counterRef, { currentNumber: 1, createdAt: serverTimestamp() });
        return 1;
      }

      const currentNumber = counterDoc.data().currentNumber || 0;
      const nextNumber = currentNumber + 1;
      transaction.update(counterRef, { currentNumber: nextNumber });
      return nextNumber;
    });
    return newNumber;
  } catch (error) {
    console.error(`Error getting next ${counterName} number:`, error);
    // In case of an error, re-throw it to be handled by the caller.
    throw new Error(`Could not generate a new ${counterName} number.`);
  }
}

    