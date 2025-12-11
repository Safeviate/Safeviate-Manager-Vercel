
'use client';

import {
  Firestore,
  doc,
  runTransaction,
  serverTimestamp,
  collection,
  query,
  where,
  getDocs,
  writeBatch,
  DocumentReference,
} from 'firebase/firestore';
import type { Booking } from '@/types/booking';

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

/**
 * Deletes one or more booking documents and decrements the booking counter within a single transaction.
 * @param firestore The Firestore instance.
 * @param tenantId The ID of the tenant.
 * @param bookingDocRefs An array of DocumentReferences for the bookings to be deleted.
 */
export async function deleteBookingAndDecrementCounter(
    firestore: Firestore,
    tenantId: string,
    bookingDocRefs: DocumentReference[]
): Promise<void> {
    const counterRef = doc(firestore, 'tenants', tenantId, 'counters', 'bookings');

    try {
        await runTransaction(firestore, async (transaction) => {
            const counterDoc = await transaction.get(counterRef);

            if (counterDoc.exists()) {
                const currentNumber = counterDoc.data().currentNumber || 0;
                // Decrement only if the counter is greater than 0
                const nextNumber = Math.max(0, currentNumber - 1);
                transaction.update(counterRef, { currentNumber: nextNumber });
            }

            // Delete all the booking documents passed in
            bookingDocRefs.forEach(docRef => {
                transaction.delete(docRef);
            });
        });
    } catch (error) {
        console.error('Error deleting booking and decrementing counter:', error);
        throw new Error('Could not delete the booking and update the counter.');
    }
}
