
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

export const useSpiData = (spi: SpiConfig, reports: SafetyReport[] | null, bookings: Booking[] | null) => {
    return useMemo(() => {
        // ---- MANUAL DATA OVERRIDE ----
        // If manual data exists, use it to generate monthly data points.
        if (spi.monthlyData && spi.monthlyData.length === 12 && spi.monthlyData.some(d => d > 0)) {
            const finalData: SpiDataPoint[] = [];
            const currentYear = new Date().getFullYear();
            for (let i = 0; i < 12; i++) {
                const date = new Date(currentYear, i, 1);
                const label = format(date, 'MMM yy');
                finalData.push({ label, value: spi.monthlyData[i] || 0 });
            }
            return finalData;
        }
        
        // ---- AUTOMATIC CALCULATION ----
        if (!reports || !bookings) return [];

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
        const currentYear = new Date().getFullYear();
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
        const finalData: SpiDataPoint[] = [];
        
        for (let i = 0; i < 12; i++) {
            const date = new Date(currentYear, i, 1);
            const key = format(date, 'yyyy-MM');
            const data = dataMap[key] || { count: 0, flightHours: 0 };
            
            let value = 0;
            if (spi.unit === 'Count') {
                value = data.count;
            } else if (spi.unit === 'Rate per 100 fh') {
                value = data.flightHours > 0 ? (data.count / data.flightHours) * 100 : 0;
            } else if (spi.unit === 'Rate per flight hour') {
                value = data.flightHours > 0 ? data.count / data.flightHours : 0;
            }
        
            finalData.push({ label: format(date, 'MMM yy'), value: parseFloat(value.toFixed(2)) });
        }
        return finalData;

    }, [spi, reports, bookings]);
};
