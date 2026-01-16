
export type PerformanceRating = 1 | 2 | 3 | 4;

export interface StudentProgressEntry {
    id: string;
    exercise: string;
    rating: PerformanceRating;
    comment: string;
}

export interface StudentProgressReport {
    id: string;
    bookingId: string;
    studentId?: string;
    instructorId?: string;
    date: string; // ISO String
    overallComment?: string;
    entries: StudentProgressEntry[];
    instructorSignatureUrl?: string;
    studentSignatureUrl?: string;
}

export interface MilestoneWarning {
    milestone: number;
    warningHours: number;
}

export interface StudentMilestoneSettings {
    id: string;
    milestones: MilestoneWarning[];
}
