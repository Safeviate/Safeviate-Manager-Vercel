
export interface HourWarning {
    hours: number;
    color: string;
    foregroundColor: string;
}

export interface AircraftInspectionWarningSettings {
    id: string;
    fiftyHourWarnings: HourWarning[];
    oneHundredHourWarnings: HourWarning[];
}
