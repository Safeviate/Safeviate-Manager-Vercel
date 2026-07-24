const NUMBERED_CLAUSE_PATTERN = /^\(\d+\)\s*/;
const ROMAN_CLAUSE_PATTERN = /^\((?:i|ii|iii|iv|v|vi|vii|viii|ix|x|xi|xii|xiii|xiv|xv|xvi|xvii|xviii|xix|xx)\)\s*/i;
const LETTERED_CLAUSE_PATTERN = /^\([a-z]{1,3}\)\s*/i;
const CLAUSE_MARKER_PATTERN = /^(\((?:\d+|[a-z]{1,3}|i{1,3}|iv|v|vi{0,3}|ix|x|xi{0,3}|xiv|xv|xvi{0,3}|xix|xx)\))\s+(.+)$/i;

export function getCanonicalClauseIndentation(line: string, level: number) {
  const trimmedLine = line.trim();

  if (NUMBERED_CLAUSE_PATTERN.test(trimmedLine)) return 0;
  if (ROMAN_CLAUSE_PATTERN.test(trimmedLine)) return Math.max(2, level);
  if (LETTERED_CLAUSE_PATTERN.test(trimmedLine)) return Math.max(1, level);
  return level;
}

export function getClauseIndentationOffset(level: number) {
  if (level <= 0) return '0';
  if (level === 1) return '0.75rem';
  if (level === 2) return '2rem';
  if (level === 3) return '3.5rem';
  return `${3.5 + (level - 3) * 1.5}rem`;
}

export function splitClauseMarker(line: string) {
  const match = line.trim().match(CLAUSE_MARKER_PATTERN);
  return match ? { marker: match[1], text: match[2] } : null;
}

export function getClauseGridTemplateColumns(line: string, level: number) {
  // Lettered clauses retain a nested marker, but their wording shares the parent text column.
  return LETTERED_CLAUSE_PATTERN.test(line.trim()) && level === 1
    ? '1.25rem minmax(0, 1fr)'
    : '2rem minmax(0, 1fr)';
}
