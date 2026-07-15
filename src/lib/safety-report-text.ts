function normalizeForComparison(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

export function getInitialNarrative(
  description?: string | null,
  immediateAction?: string | null,
) {
  const narrative = description?.replace(/\r\n/g, '\n').trim() || '';
  const action = immediateAction?.replace(/\r\n/g, '\n').trim() || '';

  if (!narrative || !action) return narrative;

  const marker = /\n\s*Immediate action taken:\s*\n?/i;
  const markerMatch = marker.exec(narrative);
  if (!markerMatch || markerMatch.index === undefined) return narrative;

  const appendedAction = narrative.slice(markerMatch.index + markerMatch[0].length).trim();
  if (normalizeForComparison(appendedAction) !== normalizeForComparison(action)) {
    return narrative;
  }

  return narrative.slice(0, markerMatch.index).trimEnd();
}
