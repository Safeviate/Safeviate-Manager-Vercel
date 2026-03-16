
export function getRiskScoreStyle(score: number): { backgroundColor: string; color: string } {
    // Based on the score levels defined in risk-form.tsx getRiskLevel and colors from risk-matrix-page.tsx
    if (score > 9) { // Critical & High
        return { backgroundColor: '#ef4444', color: 'white' }; 
    }
    if (score > 4) { // Medium
        return { backgroundColor: '#f59e0b', color: 'black' };
    }
    // Low
    return { backgroundColor: '#10b981', color: 'white' };
}

export function getAlphanumericRisk(likelihood: number, severity: number): string {
    const severityMap: Record<number, string> = { 5: 'A', 4: 'B', 3: 'C', 2: 'D', 1: 'E' };
    return `${likelihood}${severityMap[severity] || 'E'}`;
}
