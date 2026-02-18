
export function getRiskScoreStyle(score: number): { backgroundColor: string; color: string } {
    // Based on the score levels defined in risk-form.tsx getRiskLevel and colors from risk-matrix-page.tsx
    if (score > 9) { // Critical & High
        return { backgroundColor: '#d9534f', color: 'white' }; 
    }
    if (score > 4) { // Medium
        return { backgroundColor: '#f0ad4e', color: 'black' };
    }
    // Low
    return { backgroundColor: '#5cb85c', color: 'white' };
}
