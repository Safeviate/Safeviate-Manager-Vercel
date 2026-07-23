function normalizeRegulationCodeInternal(
  value: unknown,
  seen: WeakSet<object>,
  depth: number
): string {
  if (typeof value === 'string') {
    return value.trim();
  }

  if (typeof value === 'number' || typeof value === 'bigint' || typeof value === 'boolean') {
    return String(value).trim();
  }

  if (!value || depth > 3) {
    return '';
  }

  if (Array.isArray(value)) {
    return value
      .map((entry) => normalizeRegulationCodeInternal(entry, seen, depth + 1))
      .filter(Boolean)
      .join(' ')
      .trim();
  }

  if (typeof value === 'object') {
    if (seen.has(value)) {
      return '';
    }

    seen.add(value);
    const record = value as Record<string, unknown>;
    for (const key of ['regulationCode', 'code', 'value', 'label', 'text', 'name']) {
      const normalized = normalizeRegulationCodeInternal(record[key], seen, depth + 1);
      if (normalized) {
        return normalized;
      }
    }
  }

  return '';
}

export function normalizeRegulationCode(value: unknown): string {
  try {
    return normalizeRegulationCodeInternal(value, new WeakSet<object>(), 0);
  } catch {
    return '';
  }
}

export function normalizeTextValue(value: unknown): string {
  if (typeof value === 'string') {
    return value.trim();
  }

  if (typeof value === 'number' || typeof value === 'bigint' || typeof value === 'boolean') {
    return String(value).trim();
  }

  return '';
}

function normalizeIndentationValue(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return null;
  }

  return Math.min(6, Math.max(0, Math.round(value)));
}

export function normalizeIndentationArray(value: unknown): number[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => normalizeIndentationValue(entry))
    .filter((entry): entry is number => entry !== null);
}

const STANDALONE_REGULATION_MARKER = /^\((\d+|[a-z]{1,3})\)$/i;
const ROMAN_NUMERAL_MARKER = /^(?:i|ii|iii|iv|v|vi|vii|viii|ix|x|xi|xii|xiii|xiv|xv)$/i;

function regulationMarkerIndent(marker: string, previousIndent: number) {
  if (/^\d+$/.test(marker)) return 0;

  // A roman marker normally sits below an alphabetic paragraph marker. Keep it
  // indented when copied source has split the marker from its paragraph text.
  if (ROMAN_NUMERAL_MARKER.test(marker) && previousIndent > 0) return 2;

  return 1;
}

/**
 * Repairs legal text copied from browser/PDF viewers that place a standalone
 * paragraph marker on one line and its text on the next line.
 */
export function normalizeRegulationClipboardText(value: string): string {
  const lines = value.replace(/\r\n/g, '\n').split('\n');
  const normalized: string[] = [];
  let previousIndent = 0;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index].trim();
    if (!line) {
      normalized.push('');
      continue;
    }

    const markerMatch = line.match(STANDALONE_REGULATION_MARKER);
    const nextLine = lines[index + 1]?.trim();
    if (markerMatch && nextLine && !STANDALONE_REGULATION_MARKER.test(nextLine)) {
      const indent = regulationMarkerIndent(markerMatch[1], previousIndent);
      normalized.push(`${'  '.repeat(indent)}${line} ${nextLine}`);
      previousIndent = indent;
      index += 1;
      continue;
    }

    normalized.push(line);
  }

  return normalized
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function sanitizeComplianceMatrixEntry<T>(item: T): T {
  if (!item || typeof item !== 'object') {
    return item;
  }
  const record = item as Record<string, unknown>;
  return {
    ...item,
    structureType: typeof record.structureType === 'string' ? record.structureType.trim() : undefined,
    regulationCode: normalizeRegulationCode(record.regulationCode),
    parentRegulationCode: normalizeRegulationCode(record.parentRegulationCode),
    documentHeading: normalizeTextValue(record.documentHeading),
    regulationStatement: normalizeTextValue(record.regulationStatement),
    technicalStandard: normalizeTextValue(record.technicalStandard),
    technicalStandardIndentation: normalizeIndentationArray(record.technicalStandardIndentation),
    companyReference: normalizeTextValue(record.companyReference),
    responsibleManagerId: normalizeTextValue(record.responsibleManagerId),
    gapStatusDate: normalizeTextValue(record.gapStatusDate),
    nextAuditDate: normalizeTextValue(record.nextAuditDate),
  } as T;
}
