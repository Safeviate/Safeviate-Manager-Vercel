
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function hexToHsl(hex: string): string {
  if (!hex || hex.length < 4) {
    return "0 0% 0%";
  }

  // Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
  const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
  hex = hex.replace(shorthandRegex, (m, r, g, b) => r + r + g + g + b + b);

  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) {
    return "0 0% 0%";
  }

  let r = parseInt(result[1], 16);
  let g = parseInt(result[2], 16);
  let b = parseInt(result[3], 16);

  (r /= 255), (g /= 255), (b /= 255);
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b);
  let h = 0,
    s = 0,
    l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }

  h = Math.round(h * 360);
  s = Math.round(s * 100);
  l = Math.round(l * 100);

  return `${h} ${s}% ${l}%`;
}

const isPointOnSegment = (
    point: { x: number, y: number },
    start: { x: number, y: number },
    end: { x: number, y: number },
    epsilon = 1e-9
) => {
    const cross = (point.y - start.y) * (end.x - start.x) - (point.x - start.x) * (end.y - start.y);
    if (Math.abs(cross) > epsilon) return false;

    const dot = (point.x - start.x) * (end.x - start.x) + (point.y - start.y) * (end.y - start.y);
    if (dot < -epsilon) return false;

    const squaredLength = (end.x - start.x) ** 2 + (end.y - start.y) ** 2;
    if (dot - squaredLength > epsilon) return false;

    return true;
};

const dedupePolygonPoints = (polygon: { x: number, y: number }[], epsilon = 1e-9) => {
    const unique: { x: number, y: number }[] = [];

    polygon.forEach((point) => {
        const exists = unique.some(
            existing =>
                Math.abs(existing.x - point.x) <= epsilon &&
                Math.abs(existing.y - point.y) <= epsilon
        );

        if (!exists) {
            unique.push(point);
        }
    });

    return unique;
};

const cross = (
    origin: { x: number, y: number },
    a: { x: number, y: number },
    b: { x: number, y: number }
) => (a.x - origin.x) * (b.y - origin.y) - (a.y - origin.y) * (b.x - origin.x);

const normalizePolygon = (polygon: { x: number, y: number }[]) => {
    const unique = dedupePolygonPoints(polygon);
    if (unique.length <= 3) return unique;

    const sorted = [...unique].sort((a, b) => (a.x === b.x ? a.y - b.y : a.x - b.x));
    const lower: { x: number, y: number }[] = [];

    for (const point of sorted) {
        while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], point) <= 0) {
            lower.pop();
        }
        lower.push(point);
    }

    const upper: { x: number, y: number }[] = [];
    for (let i = sorted.length - 1; i >= 0; i--) {
        const point = sorted[i];
        while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], point) <= 0) {
            upper.pop();
        }
        upper.push(point);
    }

    lower.pop();
    upper.pop();

    const hull = [...lower, ...upper];
    return hull.length >= 3 ? hull : unique;
};

// Returns true if the point is inside the polygon or on its boundary.
export const isPointInPolygon = (point: {x: number, y: number}, polygon: {x: number, y: number}[]) => {
    if (!polygon || polygon.length === 0) return false;
    const normalizedPolygon = normalizePolygon(polygon);
    if (normalizedPolygon.length < 3) return false;
    let isInside = false;
    for (let i = 0, j = normalizedPolygon.length - 1; i < normalizedPolygon.length; j = i++) {
        const xi = normalizedPolygon[i].x, yi = normalizedPolygon[i].y;
        const xj = normalizedPolygon[j].x, yj = normalizedPolygon[j].y;

        if (isPointOnSegment(point, { x: xi, y: yi }, { x: xj, y: yj })) {
            return true;
        }

        const intersect = ((yi > point.y) !== (yj > point.y))
            && (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);
        if (intersect) isInside = !isInside;
    }
    return isInside;
};
