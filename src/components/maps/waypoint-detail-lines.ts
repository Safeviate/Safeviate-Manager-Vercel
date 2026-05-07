import type { NavlogLeg } from '@/types/booking';

type WaypointDetailSource = Pick<NavlogLeg, 'frequencies' | 'layerInfo' | 'notes'> | null | undefined;

export type WaypointDetailTone = 'airport' | 'navaid' | 'airspace' | 'neutral';
export type WaypointDetailEntry = {
  text: string;
  tone: WaypointDetailTone;
};
export type WaypointDetailGroup = {
  entries: WaypointDetailEntry[];
  tone: WaypointDetailTone;
};

const AIRPORT_TONE_PATTERN = /\b(openaip airports?|airport|aerodrome|rwy|runway|tower|apron|gnd|ground)\b/i;
const NAVAID_TONE_PATTERN = /\b(openaip navaids?|openaip reporting points?)\b/i;
const AIRSPACE_TONE_PATTERN = /\b(awy|ctr|cta|tma|fir|uir|atz|class [a-g]|danger|restricted|prohibited|training|gliding|hang|airspace|app|approach)\b/i;
const DETAIL_SPLIT_PATTERN = /\s*(?:•|·)\s*|\n+/;

const classifyDetailText = (text: string): WaypointDetailTone => {
  const normalized = text.trim();
  if (!normalized) return 'neutral';
  if (NAVAID_TONE_PATTERN.test(normalized)) return 'navaid';
  if (AIRSPACE_TONE_PATTERN.test(normalized)) return 'airspace';
  if (AIRPORT_TONE_PATTERN.test(normalized)) return 'airport';
  return 'neutral';
};

const splitDetailText = (text: string | null | undefined) =>
  (text || '')
    .split(DETAIL_SPLIT_PATTERN)
    .map((part) => part.trim())
    .filter(Boolean);

export const getWaypointDetailLines = (leg: WaypointDetailSource) =>
  [leg?.frequencies, leg?.layerInfo]
    .flatMap((line) => splitDetailText(line))
    .filter((line): line is string => Boolean(line && line.trim()));

export const getWaypointDetailEntries = (leg: WaypointDetailSource): WaypointDetailEntry[] =>
  [leg?.frequencies, leg?.layerInfo]
    .flatMap((line) => splitDetailText(line).map((text) => ({ text, tone: classifyDetailText(text) })))
    .filter((entry) => Boolean(entry.text));

export const getWaypointDetailGroups = (leg: WaypointDetailSource): WaypointDetailGroup[] =>
  [leg?.frequencies, leg?.layerInfo]
    .map((line) => splitDetailText(line).map((text) => ({ text, tone: classifyDetailText(text) })))
    .filter((entries) => entries.length > 0)
    .map((entries) => {
      const tone = entries.reduce<WaypointDetailTone>((current, entry) => {
        if (entry.tone === 'navaid') return 'navaid';
        if (entry.tone === 'airspace' && current !== 'navaid') return 'airspace';
        if (entry.tone === 'airport' && current === 'neutral') return 'airport';
        return current;
      }, 'neutral');

      return { entries, tone };
    });

export const getWaypointDetailTone = (leg: WaypointDetailSource): WaypointDetailTone => {
  const entries = getWaypointDetailEntries(leg);
  if (!entries.length) return 'neutral';
  const priority = entries.reduce<WaypointDetailTone>((current, entry) => {
    if (entry.tone === 'navaid') return 'navaid';
    if (entry.tone === 'airspace' && current !== 'navaid') return 'airspace';
    if (entry.tone === 'airport' && current === 'neutral') return 'airport';
    return current;
  }, 'neutral');
  return priority;
};

export const getWaypointDetailToneClass = (tone: WaypointDetailTone) => {
  if (tone === 'airport') {
    return {
      label: 'text-sky-700',
      text: 'text-sky-700',
    };
  }

  if (tone === 'navaid') {
    return {
      label: 'text-emerald-700',
      text: 'text-emerald-700',
    };
  }

  if (tone === 'airspace') {
    return {
      label: 'text-violet-700',
      text: 'text-violet-700',
    };
  }

  return {
    label: 'text-slate-400',
    text: 'text-slate-700',
  };
};
