
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
import { StudentProgressReport } from '@/types/training';

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
                payload.privatePilotId = null;
            } else if (payload.type === 'Private Flight') {
                payload.privatePilotId = bookingData.privatePilotId || null;
                payload.studentId = null;
                payload.instructorId = null;
            } else {
                payload.studentId = null;
                payload.instructorId = null;
                payload.privatePilotId = null;
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
        updatePayload.privatePilotId = null;
    } else if (updatePayload.type === 'Private Flight') {
        updatePayload.privatePilotId = updateData.privatePilotId || null;
        updatePayload.studentId = null;
        updatePayload.instructorId = null;
    } else if (updatePayload.type) {
        updatePayload.studentId = null;
        updatePayload.instructorId = null;
        updatePayload.privatePilotId = null;
    }


    if (updateData.isOvernight === false) {
        updatePayload.overnightBookingDate = deleteField();
        updatePayload.overnightEndTime = deleteField();
    }
    
    // Explicitly include photos if they exist in the payload.
    if (updateData.preFlight?.photos) {
      updatePayload.preFlight.photos = updateData.preFlight.photos;
    }
    if (updateData.postFlight?.photos) {
      updatePayload.postFlight.photos = updateData.postFlight.photos;
    }

    const batch = writeBatch(firestore);

    // If submitting a post-flight, also update the end time to now
    if (isSubmittingPostFlight) {
        updatePayload.endTime = format(new Date(), 'HH:mm');
    }

    batch.set(bookingRef, updatePayload, { merge: true });
    
    // If submitting a post-flight, update the aircraft's core metrics
    if (isSubmittingPostFlight && updateData.postFlight?.actualHobbs && updateData.postFlight?.actualTacho) {
        const aircraftRef = doc(firestore, `tenants/${tenantId}/aircrafts`, aircraft.id);
        const newTacho = updateData.postFlight.actualTacho;
        const previousTacho = aircraft.currentTacho || 0;
        
        batch.update(aircraftRef, {
            currentHobbs: updateData.postFlight.actualHobbs,
            currentTacho: newTacho,
        });

        // Update component TSN and TSO based on tacho difference
        if (newTacho > previousTacho) {
            const hoursToAdd = newTacho - previousTacho;
            const componentsRef = collection(firestore, `tenants/${tenantId}/aircrafts/${aircraft.id}/components`);
            const componentsSnapshot = await getDocs(componentsRef);
            componentsSnapshot.forEach(componentDoc => {
                const componentData = componentDoc.data();
                const currentTsn = typeof componentData.tsn === 'number' ? componentData.tsn : 0;
                const currentTso = typeof componentData.tso === 'number' ? componentData.tso : 0;
                const newTsn = currentTsn + hoursToAdd;
                const newTso = currentTso + hoursToAdd;
                batch.update(componentDoc.ref, { tsn: newTsn, tso: newTso });
            });
        }

        // If it's a training flight, create a draft progress report
        const bookingDoc = await getDoc(bookingRef);
        const originalBooking = bookingDoc.data() as Booking;

        const finalBookingData = { ...originalBooking, ...updatePayload };

        if (finalBookingData.type === 'Training Flight' && finalBookingData.studentId && finalBookingData.instructorId) {
            const reportRef = doc(collection(firestore, `tenants/${tenantId}/student-progress-reports`));
            const reportData: Omit<StudentProgressReport, 'id'> = {
                bookingId: finalBookingData.id,
                studentId: finalBookingData.studentId,
                instructorId: finalBookingData.instructorId,
                date: new Date().toISOString(),
                entries: [],
                overallComment: '',
            };
            batch.set(reportRef, reportData);
        }
    }

    await batch.commit().catch(error => {
        const contextualError = new FirestorePermissionError({
          operation: 'write',
          path: `tenants/${tenantId}/bookings/${bookingId} (and possibly others)`,
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
