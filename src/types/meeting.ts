export type MeetingType =
  | 'Operations'
  | 'Safety'
  | 'Quality'
  | 'Training'
  | 'General'
  | 'Board'
  | 'Other';

export type MeetingStatus = 'Scheduled' | 'Completed' | 'Cancelled';

export type MeetingActionStatus = 'Open' | 'In Progress' | 'Completed' | 'Cancelled';

export type MeetingDiscussionPoint = {
  id: string;
  text: string;
  minutes?: string;
};

export type MeetingActionItem = {
  id: string;
  description: string;
  assigneeId: string;
  assigneeName?: string;
  dueDate: string;
  status: MeetingActionStatus;
};

export type MeetingAgendaItem = {
  id: string;
  title: string;
  notes?: string;
  discussionPoints?: MeetingDiscussionPoint[];
  decision?: string;
};

export type MeetingRecordData = {
  id: string;
  meetingNumber: string;
  title: string;
  meetingType: MeetingType;
  meetingDate: string;
  startTime: string;
  endTime: string;
  location: string;
  description?: string;
  inviteeIds: string[];
  agendaItems: MeetingAgendaItem[];
  agendaNotes?: string;
  agendaSentAt?: string | null;
  minutes?: string;
  minutesSentAt?: string | null;
  actionItems: MeetingActionItem[];
  status: MeetingStatus;
  createdById?: string;
  createdByName?: string;
  updatedAt?: string;
};
