
'use client';

import { useMemo } from 'react';
import { format, startOfMonth, parse, differenceInMinutes, getQuarter } from 'date-fns';
import type { SpiConfig } from './edit-spi-form';
import type { SafetyReport } from '@/types/safety-report';
import type { Booking } from '@/types/booking';

export type SpiDataPoint = {
    label: string; // e.g., "Jan", "Q1", "2024"
    value: number;
}

export interface SpiCalculationResult {
    monthlyData: SpiDataPoint[];
    yearlyValue: number;
}


export const useSpiData = (spi: SpiConfig, reports: SafetyReport[] | null, bookings: Booking[] | null): SpiCalculationResult => {
    return useMemo(() => {
        const currentYear = new Date().getFullYear();
        const emptyResult = { monthlyData: Array(12).fill(0).map((_, i) => ({ label: format(new Date(currentYear, i), 'MMM yy'), value: 0})), yearlyValue: 0 };
        
        // ---- MANUAL DATA OVERRIDE ----
        if (spi.monthlyData && spi.monthlyData.length === 12) {
            const monthlyData = spi.monthlyData.map((value, i) => ({
                label: format(new Date(currentYear, i), 'MMM yy'),
                value: value || 0
            }));
            
            let yearlyValue = 0;
            if (spi.unit === 'Count') {
                yearlyValue = spi.monthlyData.reduce((sum, val) => sum + val, 0) / 12;
            } else { // Rate
                const nonZeroMonths = spi.monthlyData.filter(v => v > 0);
                if(nonZeroMonths.length > 0) {
                     yearlyValue = nonZeroMonths.reduce((sum, val) => sum + val, 0) / nonZeroMonths.length;
                }
            }

            return {
                monthlyData,
                yearlyValue: parseFloat(yearlyValue.toFixed(2))
            };
        }
        
        if (!reports || !bookings) return emptyResult;

        const dataMap: { [key: string]: { count: number, flightHours: number } } = {};

        const getKeyForDate = (date: Date): string => {
            return format(date, 'yyyy-MM');
        };

        // 1. Filter and aggregate reports by month
        reports.forEach(report => {
            let isMatch = false;
            switch(spi.id) {
                case 'unstable-approach':
                    isMatch = report.reportType === 'Flight Operations' && report.description.toLowerCase().includes('unstable approach');
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
                if (!dataMap[key]) {
                    dataMap[key] = { count: 0, flightHours: 0 };
                }
                dataMap[key].count++;
            }
        });

        // 2. Calculate flight hours per month for the current year
        bookings.filter(b => b.status === 'Completed' && b.postFlight && new Date(b.date).getFullYear() === currentYear).forEach(booking => {
            const preFlightTime = parse(`${booking.date} ${booking.startTime}`, 'yyyy-MM-dd HH:mm', new Date());
            const postFlightTime = parse(`${booking.date} ${booking.endTime}`, 'yyyy-MM-dd HH:mm', new Date());
            if (!isNaN(preFlightTime.getTime()) && !isNaN(postFlightTime.getTime())) {
                const flightMinutes = differenceInMinutes(postFlightTime, preFlightTime);
                const flightHours = flightMinutes / 60;
                
                const key = getKeyForDate(preFlightTime);
                if (!dataMap[key]) {
                    dataMap[key] = { count: 0, flightHours: 0 };
                }
                dataMap[key].flightHours += flightHours;
            }
        });
        
        // 3. Generate final data points for each month of the current year
        const monthlyData: SpiDataPoint[] = [];
        let totalYearlyCount = 0;
        let totalYearlyFlightHours = 0;
        
        for (let i = 0; i < 12; i++) {
            const date = new Date(currentYear, i, 1);
            const key = format(date, 'yyyy-MM');
            const data = dataMap[key] || { count: 0, flightHours: 0 };

            totalYearlyCount += data.count;
            totalYearlyFlightHours += data.flightHours;
            
            let value = 0;
            if (spi.unit === 'Count') {
                value = data.count;
            } else if (spi.unit === 'Rate') {
                const rateFactor = spi.rateFactor || 1;
                value = data.flightHours > 0 ? (data.count / data.flightHours) * rateFactor : 0;
            }
        
            monthlyData.push({ label: format(date, 'MMM yy'), value: parseFloat(value.toFixed(2)) });
        }

        let yearlyValue = 0;
        if (spi.unit === 'Count') {
            yearlyValue = totalYearlyCount / 12;
        } else if (spi.unit === 'Rate') {
            const rateFactor = spi.rateFactor || 1;
            yearlyValue = totalYearlyFlightHours > 0 ? (totalYearlyCount / totalYearlyFlightHours) * rateFactor : 0;
        }

        return {
            monthlyData,
            yearlyValue: parseFloat(yearlyValue.toFixed(2))
        };

    }, [spi, reports, bookings]);
};
