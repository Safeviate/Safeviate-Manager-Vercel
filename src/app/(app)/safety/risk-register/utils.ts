
export function getRiskScoreStyle(score: number): { backgroundColor: string; color: string } {
    // Based on the score levels defined in risk-form.tsx getRiskLevel and colors from risk-matrix-page.tsx
    if (score > 16) return { backgroundColor: '#d9534f', color: 'white' };      // Critical -> Red
    if (score > 9) return { backgroundColor: '#f97316', color: 'white' };       // High -> Orange
    if (score > 4) return { backgroundColor: '#f0ad4e', color: 'black' };       // Medium -> Yellow/Orange
    return { backgroundColor: '#5cb85c', color: 'white' };                      // Low -> Green
}
