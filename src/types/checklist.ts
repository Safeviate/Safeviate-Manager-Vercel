
import type { Timestamp } from 'firebase/firestore';

export type ChecklistItemResponse = {
  itemId: string;
  checked: boolean;
  notes?: string;
  photoUrl?: string;
};

export type ChecklistResponse = {
  id: string;
  bookingId: string;
  pilotId: string;
  checklistType: 'pre-flight' | 'post-flight';
  submissionTime: Timestamp;
  responses: ChecklistItemResponse[];
};
