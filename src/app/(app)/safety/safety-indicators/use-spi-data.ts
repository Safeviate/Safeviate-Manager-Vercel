'use client';

import { useMemo } from 'react';
import { format, startOfMonth, parse, differenceInMinutes } from 'date-fns';
import type { SpiConfig } from './edit-spi-form';
import type { SafetyReport } from '@/types/safety-report';
import type { Booking } from '@/types/booking';

export type MonthlySpiData = {
    month: string; // e.g., "Jan 2024"
    value: number;
}

export const useSpiData = (spi: SpiConfig, reports: SafetyReport[] | null, bookings: Booking[] | null) => {
    return useMemo(() => {
        if (!reports || !bookings) return [];

        const monthlyData: { [key: string]: { count: number, flightHours: number } } = {};

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
                const monthKey = format(startOfMonth(new Date(report.submittedAt)), 'yyyy-MM');
                if (!monthlyData[monthKey]) {
                    monthlyData[monthKey] = { count: 0, flightHours: 0 };
                }
                monthlyData[monthKey].count++;
            }
        });

        // 2. Calculate flight hours per month from completed bookings
        bookings.filter(b => b.status === 'Completed' && b.postFlight).forEach(booking => {
            const preFlightTime = parse(`${booking.bookingDate} ${booking.startTime}`, 'yyyy-MM-dd HH:mm', new Date());
            const postFlightTime = parse(`${booking.bookingDate} ${booking.endTime}`, 'yyyy-MM-dd HH:mm', new Date());
            if (!isNaN(preFlightTime.getTime()) && !isNaN(postFlightTime.getTime())) {
                const flightMinutes = differenceInMinutes(postFlightTime, preFlightTime);
                const flightHours = flightMinutes / 60;
                
                const monthKey = format(startOfMonth(preFlightTime), 'yyyy-MM');
                if (!monthlyData[monthKey]) {
                    monthlyData[monthKey] = { count: 0, flightHours: 0 };
                }
                monthlyData[monthKey].flightHours += flightHours;
            }
        });
        
        // Ensure all months with reports or bookings are present
        const allMonthKeys = new Set([...Object.keys(monthlyData)]);
        const sortedMonthKeys = Array.from(allMonthKeys).sort();

        // 3. Calculate final SPI value for each month
        const result: MonthlySpiData[] = sortedMonthKeys.map(monthKey => {
            const data = monthlyData[monthKey];
            const monthLabel = format(new Date(`${monthKey}-02`), 'MMM yyyy'); // Use day 2 to avoid timezone issues
            let value = 0;
            if (spi.unit === 'Count') {
                value = data.count;
            } else if (spi.unit === 'Rate per 100 fh') {
                value = data.flightHours > 0 ? (data.count / data.flightHours) * 100 : 0;
            }
            return { month: monthLabel, value: parseFloat(value.toFixed(2)) };
        });

        // Generate the last 6 months including months with no data
        const finalData: MonthlySpiData[] = [];
        const today = new Date();
        for (let i = 5; i >= 0; i--) {
            const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
            const monthLabel = format(date, 'MMM yyyy');
            const existingMonth = result.find(d => d.month === monthLabel);
            finalData.push(existingMonth || { month: monthLabel, value: 0 });
        }

        return finalData;

    }, [spi, reports, bookings]);
}
