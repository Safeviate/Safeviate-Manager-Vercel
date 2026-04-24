
export type PerformanceRating = 1 | 2 | 3 | 4;

export type CompetencySignal = 'strength' | 'growth' | 'watch';

export interface StudentProgressEntry {
    id: string;
    exercise: string;
    rating: PerformanceRating;
    comment: string;
    competencyKey?: string;
    competencySignal?: CompetencySignal;
}

export interface StudentProgressReport {
    id: string;
    bookingId?: string;
    bookingNumber?: string;
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

export interface InstructorHourWarning {
    hours: number;
    warningHours: number;
    color?: string;
    foregroundColor?: string;
}

export interface InstructorHourWarningSettings {
    id: string;
    warnings: InstructorHourWarning[];
}

export interface ExamOption {
    id: string;
    text: string;
}

export interface ExamQuestion {
    id: string;
    text: string;
    options: ExamOption[];
    correctOptionId: string;
}

export interface QuestionBankItem extends ExamQuestion {
    topic: string;
    createdAt: string;
}

export interface ExamTemplate {
    id: string;
    title: string;
    description: string;
    subject: string;
    passingScore: number; // percentage
    questions: ExamQuestion[];
    createdAt: string;
}

export interface ExamResult {
    id: string;
    templateId: string;
    templateTitle: string;
    studentId: string;
    studentName: string;
    date: string; // ISO String
    score: number;
    passingScore: number;
    passed: boolean;
    isMock: boolean;
}
