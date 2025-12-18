
'use client';

import {
    Firestore,
    collection,
    doc,
    runTransaction,
    serverTimestamp,
    Timestamp,
    deleteField,
    writeBatch,
    getDoc,
  } from 'firebase/firestore';
import type { Booking } from '@/types/booking';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

type BookingCreationData = Omit<Booking, 'id' | 'bookingNumber' | 'status'>;

/**
 * Creates a new booking with a sequential number and updates aircraft status.
 * @param firestore - The Firestore instance.
 * @param tenantId - The ID of the tenant.
 * @param bookingData - The data for the new booking.
 */
export const createBooking = async (
    firestore: Firestore,
    tenantId: string,
    bookingData: Partial<BookingCreationData>
): Promise<string> => {

    const counterRef = doc(firestore, `tenants/${tenantId}/counters`, 'bookings');
    const bookingsRef = collection(firestore, `tenants/${tenantId}`, 'bookings');
    const aircraftRef = doc(firestore, `tenants/${tenantId}/aircrafts`, bookingData.aircraftId!);
    
    try {
        const newBookingId = await runTransaction(firestore, async (transaction) => {
            const counterDoc = await transaction.get(counterRef);
            
            let newBookingNumber = 1;
            if (counterDoc.exists()) {
                newBookingNumber = counterDoc.data().currentNumber + 1;
            }
            transaction.set(counterRef, { currentNumber: newBookingNumber }, { merge: true });

            const newBookingRef = doc(bookingsRef);
            
            const payload: Booking = {
                id: newBookingRef.id,
                bookingNumber: newBookingNumber,
                status: 'Confirmed',
                aircraftId: bookingData.aircraftId!,
                pilotId: bookingData.pilotId!,
                type: bookingData.type!,
                bookingDate: bookingData.bookingDate!,
                startTime: bookingData.startTime!,
                endTime: bookingData.endTime!,
                instructorId: bookingData.instructorId,
            };
            
            transaction.set(newBookingRef, payload);
            
            // Set aircraft status to needs-pre-flight
            transaction.update(aircraftRef, { 
                checklistStatus: 'needs-pre-flight',
                currentBookingId: newBookingRef.id 
            });

            return newBookingRef.id;
        });

        return newBookingId;
    } catch (error) {
        console.error("Transaction failed: ", error);
        throw new Error("Failed to create booking. Please try again.");
    }
};

/**
 * Updates an existing booking, e.g., with checklist data, and manages aircraft status.
 */
export const updateBooking = async (
    firestore: Firestore,
    tenantId: string,
    bookingId: string,
    updateData: Partial<Booking>,
    aircraftId: string,
    isSubmittingPreFlight: boolean,
    isSubmittingPostFlight: boolean
) => {
    const bookingRef = doc(firestore, `tenants/${tenantId}/bookings`, bookingId);
    
    // Create a clean object for the batch update.
    const finalUpdateData: { [key: string]: any } = {};

    for (const key in updateData) {
        const value = updateData[key as keyof typeof updateData];

        if (value === undefined) continue;

        if (value === null) {
            finalUpdateData[key] = deleteField();
        } else {
            finalUpdateData[key] = value;
        }
    }

    const batch = writeBatch(firestore);

    if (Object.keys(finalUpdateData).length > 0) {
        batch.set(bookingRef, finalUpdateData, { merge: true });
    }
    
    const aircraftRef = doc(firestore, `tenants/${tenantId}/aircrafts`, aircraftId);
    const isCancelling = updateData.status === 'Cancelled' || updateData.status === 'Cancelled with Reason';

    if (isSubmittingPostFlight) {
        batch.update(aircraftRef, { checklistStatus: 'Ready', currentBookingId: null });
    } else if (isSubmittingPreFlight) {
        batch.update(aircraftRef, { checklistStatus: 'needs-post-flight' });
    } else if (isCancelling) {
        // Only reset aircraft status if this cancelled booking was the one holding the status
        const aircraftDoc = await getDoc(aircraftRef);
        if (aircraftDoc.exists() && aircraftDoc.data().currentBookingId === bookingId) {
             batch.update(aircraftRef, { checklistStatus: 'Ready', currentBookingId: null });
        }
    }

    batch.commit().catch(error => {
        const contextualError = new FirestorePermissionError({
          operation: 'write',
          path: `tenants/${tenantId}/bookings/${bookingId} (and possibly aircraft)`,
          requestResourceData: finalUpdateData,
        });
        errorEmitter.emit('permission-error', contextualError);
        throw error;
    });
}

/**
 * Deletes a booking from the database and resets the aircraft status if needed.
 */
export const deleteBooking = async (
    firestore: Firestore,
    tenantId: string,
    bookingId: string
) => {
    const bookingRef = doc(firestore, `tenants/${tenantId}/bookings`, bookingId);
    
    try {
        await runTransaction(firestore, async (transaction) => {
            const bookingDoc = await transaction.get(bookingRef);
            if (!bookingDoc.exists()) {
                throw new Error("Booking does not exist.");
            }
            
            const bookingData = bookingDoc.data() as Booking;
            const aircraftRef = doc(firestore, `tenants/${tenantId}/aircrafts`, bookingData.aircraftId);

            const aircraftDoc = await transaction.get(aircraftRef);
            
            // If the deleted booking was the one holding the aircraft's status, reset it.
            if(aircraftDoc.exists() && aircraftDoc.data().currentBookingId === bookingId) {
                transaction.update(aircraftRef, { checklistStatus: 'Ready', currentBookingId: null });
            }
            
            transaction.delete(bookingRef);
        });
    } catch (error) {
        console.error("Booking deletion transaction failed: ", error);
        
        const contextualError = new FirestorePermissionError({
          operation: 'delete',
          path: bookingRef.path,
        });
        errorEmitter.emit('permission-error', contextualError);
        
        throw new Error("Failed to delete booking.");
    }
};
