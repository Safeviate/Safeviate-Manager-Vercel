export type AttendanceStatus = 'clocked_out' | 'clocked_in';

export interface AttendanceBreak {
  start: string;
  end?: string;
  minutes?: number;
}

export interface AttendanceRecordData {
  id: string;
  personnelId: string;
  personnelName?: string;
  role?: string;
  clockIn: string;
  clockOut?: string | null;
  breaks?: AttendanceBreak[];
  location?: string;
  notes?: string;
  status: AttendanceStatus;
}

export interface AttendanceSummary {
  dutyRecords: AttendanceRecordData[];
  clockedInCount: number;
  openSessions: number;
  totalDutyMinutes: number;
  totalDutyHours: number;
}
