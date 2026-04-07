export type GraphPoint = {
  x: number;
  y: number;
  label?: string;
  color?: string;
};

export type GraphTemplate = {
  id: string;
  name: string;
  family: string;
  description: string;
  xLabel: string;
  yLabel: string;
  xDomain: [number, number];
  yDomain: [number, number];
  envelope: GraphPoint[];
  currentPoint: GraphPoint;
  notes: string[];
};

export const GRAPH_TEMPLATES: GraphTemplate[] = [
  {
    id: 'pa-28-180',
    name: 'Piper PA-28-180',
    family: 'Trainer',
    description: 'Current working shape based on the existing PA-28-style envelope.',
    xLabel: 'CG (inches)',
    yLabel: 'Gross Weight (lbs)',
    xDomain: [78, 96],
    yDomain: [1200, 2700],
    envelope: [
      { x: 82, y: 1400, color: '#f97316', label: 'A' },
      { x: 82, y: 1950, color: '#3b82f6', label: 'B' },
      { x: 86.5, y: 2450, color: '#eab308', label: 'C' },
      { x: 93.2, y: 2450, color: '#8b5cf6', label: 'D' },
      { x: 93.2, y: 1400, color: '#ec4899', label: 'E' },
      { x: 82, y: 1400, color: '#f97316', label: 'A' },
    ],
    currentPoint: { x: 86.49, y: 2044 },
    notes: [
      'This is the reference envelope we have been struggling to fit.',
      'Use it to validate mobile and desktop layout behavior against the same data.',
    ],
  },
  {
    id: 'c172s',
    name: 'Cessna 172S',
    family: 'Four-seat trainer',
    description: 'A tighter, more upright envelope for a common light aircraft layout.',
    xLabel: 'CG (inches)',
    yLabel: 'Gross Weight (lbs)',
    xDomain: [34, 48],
    yDomain: [1500, 2550],
    envelope: [
      { x: 35.8, y: 1650, color: '#f97316', label: 'A' },
      { x: 35.8, y: 2300, color: '#3b82f6', label: 'B' },
      { x: 47.4, y: 2300, color: '#eab308', label: 'C' },
      { x: 47.4, y: 1700, color: '#8b5cf6', label: 'D' },
      { x: 35.8, y: 1650, color: '#f97316', label: 'A' },
    ],
    currentPoint: { x: 40.9, y: 2050 },
    notes: [
      'Useful for testing a very different arm range.',
      'Shows how the same engine adapts to a different aircraft family.',
    ],
  },
  {
    id: 'da40',
    name: 'Diamond DA40',
    family: 'Composite trainer',
    description: 'Longer CG range with a more pointed envelope shape.',
    xLabel: 'CG (inches)',
    yLabel: 'Gross Weight (lbs)',
    xDomain: [94, 105],
    yDomain: [1650, 2860],
    envelope: [
      { x: 95.4, y: 1760, color: '#f97316', label: 'A' },
      { x: 95.4, y: 2360, color: '#3b82f6', label: 'B' },
      { x: 100.2, y: 2730, color: '#eab308', label: 'C' },
      { x: 103.9, y: 2360, color: '#8b5cf6', label: 'D' },
      { x: 103.9, y: 1760, color: '#ec4899', label: 'E' },
      { x: 95.4, y: 1760, color: '#f97316', label: 'A' },
    ],
    currentPoint: { x: 99.1, y: 2230 },
    notes: [
      'Good for testing a different aspect ratio in the same engine.',
      'Stresses the axis label and tick density logic.',
    ],
  },
];

export function getGraphTemplate(templateId: string) {
  return GRAPH_TEMPLATES.find((template) => template.id === templateId) ?? GRAPH_TEMPLATES[0];
}
