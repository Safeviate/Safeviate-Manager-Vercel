'use client';

import { useMemo } from 'react';
import { format, startOfMonth, parse, differenceInMinutes, getQuarter } from 'date-fns';
import type { SpiConfig } from './edit-spi-form';
import type { SafetyReport } from '@/types/safety-report';
import type { Booking } from '@/types/booking';
import { TimeScale } from './page';

export type SpiDataPoint = {
    label: string; // e.g., "Jan 2024", "2024 Q1", "2024"
    value: number;
}

export const useSpiData = (spi: SpiConfig, reports: SafetyReport[] | null, bookings: Booking[] | null, timeScale: TimeScale) => {
    return useMemo(() => {
        if (!reports || !bookings) return [];

        const dataMap: { [key: string]: { count: number, flightHours: number } } = {};

        const getKeyForDate = (date: Date): string => {
            switch (timeScale) {
                case 'yearly':
                    return format(date, 'yyyy');
                case 'quarterly':
                    return `${format(date, 'yyyy')}-Q${getQuarter(date)}`;
                case 'monthly':
                default:
                    return format(date, 'yyyy-MM');
            }
        };

        // 1. Filter and aggregate reports
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

        // 2. Calculate flight hours per period
        bookings.filter(b => b.status === 'Completed' && b.postFlight).forEach(booking => {
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
        
        // 3. Generate final data with empty periods
        const finalData: SpiDataPoint[] = [];
        const today = new Date();
        const periods = timeScale === 'monthly' ? 6 : (timeScale === 'quarterly' ? 4 : 3);

        for (let i = periods - 1; i >= 0; i--) {
            let date, label;
            
            if (timeScale === 'monthly') {
                date = new Date(today.getFullYear(), today.getMonth() - i, 1);
                label = format(date, 'MMM yyyy');
            } else if (timeScale === 'quarterly') {
                date = new Date(today.getFullYear(), today.getMonth() - (i * 3), 1);
                label = `${format(date, 'yyyy')} Q${getQuarter(date)}`;
            } else { // yearly
                date = new Date(today.getFullYear() - i, 0, 1);
                label = format(date, 'yyyy');
            }
        
            const key = getKeyForDate(date);
            const data = dataMap[key] || { count: 0, flightHours: 0 };
            
            let value = 0;
            if (spi.unit === 'Count') {
                value = data.count;
            } else if (spi.unit === 'Rate per 100 fh') {
                value = data.flightHours > 0 ? (data.count / data.flightHours) * 100 : 0;
            } else if (spi.unit === 'Rate per flight hour') {
                value = data.flightHours > 0 ? data.count / data.flightHours : 0;
            }
        
            finalData.push({ label, value: parseFloat(value.toFixed(2)) });
        }
        return finalData;

    }, [spi, reports, bookings, timeScale]);
}
