const fs = require('fs');
const path = require('path');

const ROOT = path.join(process.cwd(), 'src', 'app', '(app)');
const PAGE_MARKERS = /MainPageHeader|ResponsiveTabRow|OrganizationTabsRow|CardHeader|TabsList|TabsTrigger/;

const HEURISTICS = [
  { regex: /\b(p-10|p-8)\b/, weight: 4, label: 'large padding' },
  { regex: /\b(py-5|py-4|pt-5|pb-5)\b/, weight: 3, label: 'roomy spacing' },
  { regex: /\b(h-14|h-12|min-h-14|min-h-12)\b/, weight: 4, label: 'tall control' },
  { regex: /flex-row items-center justify-between space-y-0/, weight: 3, label: 'wide header band' },
];

function walk(dir, results = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.next') continue;
      walk(fullPath, results);
    } else if (entry.isFile() && entry.name.endsWith('.tsx')) {
      results.push(fullPath);
    }
  }
  return results;
}

function getLineMatches(lines, index) {
  const window = [
    lines[index - 2] || '',
    lines[index - 1] || '',
    lines[index] || '',
    lines[index + 1] || '',
    lines[index + 2] || '',
  ].join('\n');

  if (!/CardHeader|MainPageHeader|ResponsiveTabRow|OrganizationTabsRow|border-b bg-muted\/5/.test(window)) {
    return null;
  }

  const line = lines[index];
  const isRelevantLine = /CardHeader|CardContent|MainPageHeader|ResponsiveTabRow|OrganizationTabsRow|border-b bg-muted\/5/.test(line);
  const hits = isRelevantLine ? HEURISTICS.filter((heuristic) => heuristic.regex.test(line)) : [];
  if (hits.length === 0) return null;

  return {
    lineNumber: index + 1,
    line: line.trim(),
    score: hits.reduce((sum, hit) => sum + hit.weight, 0),
    labels: hits.map((hit) => hit.label),
  };
}

const files = walk(ROOT);
const findings = [];

for (const file of files) {
  const text = fs.readFileSync(file, 'utf8');
  if (!PAGE_MARKERS.test(text)) continue;

  const lines = text.split(/\r?\n/);
  const matches = [];
  for (let i = 0; i < lines.length; i += 1) {
    const match = getLineMatches(lines, i);
    if (match) matches.push(match);
  }

  if (matches.length > 0) {
    const score = matches.reduce((sum, match) => sum + match.score, 0);
    findings.push({ file, score, matches });
  }
}

findings.sort((a, b) => b.score - a.score || a.file.localeCompare(b.file));

if (findings.length === 0) {
  console.log('No obvious card-density outliers found.');
  process.exit(0);
}

console.log('Safeviate card-density audit');
console.log('');

for (const finding of findings) {
  console.log(`${finding.file}  [score ${finding.score}]`);
  for (const match of finding.matches.slice(0, 5)) {
    console.log(`  ${match.lineNumber}: ${match.line}`);
  }
  if (finding.matches.length > 5) {
    console.log(`  ... ${finding.matches.length - 5} more matches`);
  }
  console.log('');
}

process.exitCode = 1;
