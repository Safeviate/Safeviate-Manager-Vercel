
'use client';

import { Bar, BarChart, Line, LineChart, ReferenceLine, XAxis, YAxis } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import type { MonthlySpiData } from './use-spi-data';
import type { SpiConfig } from './edit-spi-form';

interface SpiChartProps {
    data: MonthlySpiData[];
    spi: SpiConfig;
}

export function SpiChart({ data, spi }: SpiChartProps) {
    const chartConfig = {
        value: {
            label: spi.unit,
            color: 'hsl(var(--primary))',
        },
    };

    const yAxisDomain = [0, spi.levels.urgentAction * 1.25];

    const commonProps = {
        data: data,
        margin: {
            top: 5,
            right: 10,
            left: -20,
            bottom: 0,
        },
    };

    const commonComponents = (
        <>
            <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} tickFormatter={(value) => value.slice(0, 3)} />
            <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickMargin={5} domain={yAxisDomain} />
            <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
            <ReferenceLine y={spi.target} label="Target" stroke="hsl(var(--primary))" strokeDasharray="3 3" />
            <ReferenceLine y={spi.levels.acceptable} stroke="green" strokeDasharray="3 3" />
            <ReferenceLine y={spi.levels.monitor} stroke="gold" strokeDasharray="3 3" />
            <ReferenceLine y={spi.levels.actionRequired} stroke="orange" strokeDasharray="3 3" />
            <ReferenceLine y={spi.levels.urgentAction} label="Urgent" stroke="red" strokeDasharray="3 3" />
        </>
    );

    return (
        <ChartContainer config={chartConfig} className="w-full h-full">
            {spi.unit === 'Count' ? (
                <BarChart accessibilityLayer {...commonProps}>
                    {commonComponents}
                    <Bar dataKey="value" fill="var(--color-value)" radius={4} />
                </BarChart>
            ) : (
                <LineChart accessibilityLayer {...commonProps}>
                    {commonComponents}
                    <Line type="monotone" dataKey="value" stroke="var(--color-value)" strokeWidth={2} dot={false} />
                </LineChart>
            )}
        </ChartContainer>
    );
}
