
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
    query,
    where,
    orderBy,
    limit,
    getDocs,
    deleteDoc,
    updateDoc,
  } from 'firebase/firestore';
import type { Booking } from '@/types/booking';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { parse, isAfter, format, startOfToday } from 'date-fns';
import type { Aircraft } from '../../assets/page';

type BookingCreationData = Omit<Booking, 'id' | 'bookingNumber' | 'status'>;

/**
 * Creates a new booking with a sequential number. Does not affect aircraft status.
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
    
    try {
        const newBookingId = await runTransaction(firestore, async (transaction) => {
            // Read operations first
            const counterDoc = await transaction.get(counterRef);

            let newBookingNumber = 1;
            if (counterDoc.exists()) {
                newBookingNumber = counterDoc.data().currentNumber + 1;
            }

            // Write operations
            transaction.set(counterRef, { currentNumber: newBookingNumber }, { merge: true });

            const newBookingRef = doc(bookingsRef);
            
            const payload: Partial<Booking> = {
                ...bookingData,
                id: newBookingRef.id,
                bookingNumber: newBookingNumber,
                status: 'Confirmed',
            };

            // Correctly handle user IDs based on booking type
            if (payload.type === 'Training Flight') {
                payload.studentId = bookingData.studentId || null;
                payload.instructorId = bookingData.instructorId || null;
            } else {
                payload.studentId = null;
                payload.instructorId = null;
            }

            if (!bookingData.isOvernight) {
                payload.overnightBookingDate = null;
                payload.overnightEndTime = null;
            }

            transaction.set(newBookingRef, payload);

            return newBookingRef.id;
        });

        return newBookingId;
    } catch (error) {
        console.error("Transaction failed: ", error);
        throw new Error("Failed to create booking. Please try again.");
    }
};

type UpdateBookingParams = {
    firestore: Firestore;
    tenantId: string;
    bookingId: string;
    updateData: Partial<Booking>;
    aircraft: Aircraft;
    isSubmittingPostFlight?: boolean;
};

/**
 * Updates an existing booking, e.g., with checklist data, and manages aircraft hobbs/tacho.
 */
export const updateBooking = async ({
    firestore,
    tenantId,
    bookingId,
    updateData,
    aircraft,
    isSubmittingPostFlight = false,
}: UpdateBookingParams) => {
    const bookingRef = doc(firestore, `tenants/${tenantId}/bookings`, bookingId);
    
    const updatePayload: Record<string, any> = { ...updateData };

     // Correctly handle user IDs based on booking type
    if (updatePayload.type === 'Training Flight') {
        updatePayload.studentId = updateData.studentId || null;
        updatePayload.instructorId = updateData.instructorId || null;
    } else if (updatePayload.type) { // If type is being changed TO a non-training flight
        updatePayload.studentId = null;
        updatePayload.instructorId = null;
    }


    if (updateData.isOvernight === false) {
        updatePayload.overnightBookingDate = deleteField();
        updatePayload.overnightEndTime = deleteField();
    }
    
    // Explicitly include photos if they exist in the payload. This was the fix.
    if (updateData.preFlight?.photos) {
      updatePayload.preFlight.photos = updateData.preFlight.photos;
    }
    if (updateData.postFlight?.photos) {
      updatePayload.postFlight.photos = updateData.postFlight.photos;
    }

    const batch = writeBatch(firestore);

    batch.set(bookingRef, updatePayload, { merge: true });
    
    // If submitting a post-flight, update the aircraft's core metrics
    if (isSubmittingPostFlight && updateData.postFlight?.actualHobbs && updateData.postFlight?.actualTacho) {
        const aircraftRef = doc(firestore, `tenants/${tenantId}/aircrafts`, aircraft.id);
        batch.update(aircraftRef, {
            currentHobbs: updateData.postFlight.actualHobbs,
            currentTacho: updateData.postFlight.actualTacho,
        });
    }

    await batch.commit().catch(error => {
        const contextualError = new FirestorePermissionError({
          operation: 'write',
          path: `tenants/${tenantId}/bookings/${bookingId} (and possibly aircraft)`,
          requestResourceData: updatePayload,
        });
        errorEmitter.emit('permission-error', contextualError);
        throw error;
    });
}

/**
 * Deletes a booking from the database.
 */
export const deleteBooking = async (
    firestore: Firestore,
    tenantId: string,
    bookingId: string
) => {
    const bookingRef = doc(firestore, `tenants/${tenantId}/bookings`, bookingId);
    
    try {
        await deleteDoc(bookingRef);
    } catch (error) {
        console.error("Booking deletion failed: ", error);
        
        const contextualError = new FirestorePermissionError({
          operation: 'delete',
          path: bookingRef.path,
        });
        errorEmitter.emit('permission-error', contextualError);
        
        throw new Error("Failed to delete booking.");
    }
};

/**
 * Cancels a booking by updating its status and adding a reason.
 */
export const cancelBooking = async (
    firestore: Firestore,
    tenantId: string,
    bookingId: string,
    reason: string
) => {
    const bookingRef = doc(firestore, `tenants/${tenantId}/bookings`, bookingId);
    
    const updatePayload = {
        status: reason ? 'Cancelled with Reason' : 'Cancelled',
        cancellationReason: reason,
    };

    try {
        await updateDoc(bookingRef, updatePayload);
    } catch (error) {
        console.error("Booking cancellation failed: ", error);
        
        const contextualError = new FirestorePermissionError({
          operation: 'update',
          path: bookingRef.path,
          requestResourceData: updatePayload
        });
        errorEmitter.emit('permission-error', contextualError);
        
        throw new Error("Failed to cancel booking.");
    }
};
