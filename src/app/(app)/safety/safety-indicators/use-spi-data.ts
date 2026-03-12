'use client';

import { useMemo } from 'react';
import { format, parse, differenceInMinutes } from 'date-fns';
import type { SpiConfig } from './edit-spi-form';
import type { SafetyReport } from '@/types/safety-report';
import type { Booking } from '@/types/booking';

export type SpiDataPoint = {
    label: string; // e.g., "Jan", "Feb"
    value: number;
}

export interface SpiCalculationResult {
    monthlyData: SpiDataPoint[];
    yearlyValue: number;
}

export const useSpiData = (spi: SpiConfig, reports: SafetyReport[] | null, bookings: Booking[] | null): SpiCalculationResult => {
    return useMemo(() => {
        const currentYear = new Date().getFullYear();
        const emptyResult = { 
            monthlyData: Array(12).fill(0).map((_, i) => ({ label: format(new Date(currentYear, i), 'MMM yy'), value: 0})), 
            yearlyValue: 0 
        };
        
        // 1. If manual override data is present, use it.
        if (spi.monthlyData && spi.monthlyData.some(v => v > 0)) {
            const monthlyData = spi.monthlyData.map((value, i) => ({
                label: format(new Date(currentYear, i), 'MMM yy'),
                value: value || 0
            }));
            
            let total = spi.monthlyData.reduce((sum, val) => sum + (val || 0), 0);
            let yearlyValue = spi.unit === 'Count' ? total / 12 : total / (spi.monthlyData.filter(v => v > 0).length || 1);

            return {
                monthlyData,
                yearlyValue: parseFloat(yearlyValue.toFixed(2))
            };
        }
        
        if (!reports || !bookings) return emptyResult;

        const dataMap: { [key: string]: { count: number, flightHours: number } } = {};

        const getKeyForDate = (date: Date): string => format(date, 'yyyy-MM');

        // Aggregating logic based on reports provided (which are already scoped by the parent component)
        reports.forEach(report => {
            let isMatch = false;
            const desc = report.description.toLowerCase();
            switch(spi.id) {
                case 'unstable-approach':
                    isMatch = report.reportType === 'Flight Operations' && desc.includes('unstable approach');
                    break;
                case 'tech-defect':
                    isMatch = report.reportType === 'Aircraft Defect';
                    break;
                case 'ground-incidents':
                    isMatch = report.reportType === 'Ground Operations';
                    break;
                case 'proactive-reports':
                    isMatch = report.reportType === 'General Safety Concern';
                    break;
                default:
                    isMatch = false;
            }

            if (isMatch) {
                const key = getKeyForDate(new Date(report.submittedAt));
                if (!dataMap[key]) dataMap[key] = { count: 0, flightHours: 0 };
                dataMap[key].count++;
            }
        });

        // Aggregating flight hours
        bookings.filter(b => b.status === 'Completed' && new Date(b.date).getFullYear() === currentYear).forEach(booking => {
            const start = parse(`${booking.date} ${booking.startTime}`, 'yyyy-MM-dd HH:mm', new Date());
            const end = parse(`${booking.date} ${booking.endTime}`, 'yyyy-MM-dd HH:mm', new Date());
            if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
                const fh = Math.max(0, differenceInMinutes(end, start) / 60);
                const key = getKeyForDate(start);
                if (!dataMap[key]) dataMap[key] = { count: 0, flightHours: 0 };
                dataMap[key].flightHours += fh;
            }
        });
        
        const monthlyData: SpiDataPoint[] = [];
        let totalCount = 0;
        let totalFH = 0;
        
        for (let i = 0; i < 12; i++) {
            const date = new Date(currentYear, i, 1);
            const key = getKeyForDate(date);
            const data = dataMap[key] || { count: 0, flightHours: 0 };

            totalCount += data.count;
            totalFH += data.flightHours;
            
            let value = 0;
            if (spi.unit === 'Count') {
                value = data.count;
            } else if (spi.unit === 'Rate') {
                const factor = spi.rateFactor || 100;
                value = data.flightHours > 0 ? (data.count / data.flightHours) * factor : 0;
            }
        
            monthlyData.push({ label: format(date, 'MMM yy'), value: parseFloat(value.toFixed(2)) });
        }

        let yearlyValue = 0;
        if (spi.unit === 'Count') {
            yearlyValue = totalCount / 12;
        } else if (spi.unit === 'Rate') {
            const factor = spi.rateFactor || 100;
            yearlyValue = totalFH > 0 ? (totalCount / totalFH) * factor : 0;
        }

        return {
            monthlyData,
            yearlyValue: parseFloat(yearlyValue.toFixed(2))
        };

    }, [spi, reports, bookings]);
};
