
export type SpiComparison = 'lower-is-better' | 'greater-is-better';
export type SpiUnit = 'Count' | 'Rate';

export type SpiConfig = {
    id: string;
    name: string;
    comparison: SpiComparison;
    unit: SpiUnit;
    rateFactor?: number;
    periodLabel?: string;
    description: string;
    target: number;
    levels: {
        acceptable: number;
        monitor: number;
        actionRequired: number;
        urgentAction: number;
    };
    monthlyData?: number[];
};

export type SpiConfigurations = {
    id: string;
    configurations: SpiConfig[];
};
