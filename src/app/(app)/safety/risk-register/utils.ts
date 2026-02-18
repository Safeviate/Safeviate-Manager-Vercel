
export function getRiskScoreColor(score: number): string {
    if (score <= 4) return 'bg-green-500';
    if (score <= 9) return 'bg-yellow-500';
    if (score <= 16) return 'bg-orange-500';
    return 'bg-red-500';
}
