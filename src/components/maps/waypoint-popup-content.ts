import type { NavlogLeg } from '@/types/booking';
import { formatWaypointCoordinatesDms } from '@/components/maps/waypoint-coordinate-utils';

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const formatWaypointHeading = (heading?: number | null) => {
  if (heading == null || Number.isNaN(heading)) return null;
  return ((heading + 180) % 360).toFixed(0);
};

export const buildWaypointPopupMarkup = (leg: NavlogLeg, index: number) => {
  const title = escapeHtml(leg.waypoint || `Waypoint ${index + 1}`);
  const coordinates = escapeHtml(formatWaypointCoordinatesDms(leg.latitude, leg.longitude));
  const heading = formatWaypointHeading(leg.magneticHeading);
  const details = [
    leg.frequencies
      ? `<p style="margin:0;font-size:11px;font-weight:800;line-height:1.35;color:#0f172a;">${escapeHtml(leg.frequencies)}</p>`
      : '',
    leg.layerInfo
      ? `<p style="margin:4px 0 0;font-size:11px;font-weight:700;line-height:1.35;color:#475569;">${escapeHtml(leg.layerInfo)}</p>`
      : '',
  ]
    .filter(Boolean)
    .join('');

  const notesMarkup = leg.notes
    ? `<div style="margin-top:10px;border-top:1px solid rgba(148,163,184,0.18);padding-top:10px;"><p style="margin:0;font-size:10px;font-weight:800;letter-spacing:0.16em;text-transform:uppercase;color:#64748b;">Notes</p><p style="margin:4px 0 0;font-size:11px;line-height:1.4;color:#0f172a;white-space:pre-wrap;">${escapeHtml(leg.notes)}</p></div>`
    : '';

  return `
    <div style="font-family:Inter,system-ui,sans-serif;max-width:320px;">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px;">
        <div>
          <p style="margin:0;font-size:10px;font-weight:800;letter-spacing:0.16em;text-transform:uppercase;color:#64748b;">Waypoint ${index + 1}</p>
          <h3 style="margin:4px 0 0;font-size:16px;font-weight:800;line-height:1.1;color:#0f172a;">${title}</h3>
          <p style="margin:4px 0 0;font-size:11px;color:#475569;">${coordinates}</p>
        </div>
      </div>

      ${details ? `<div style="margin-top:10px;display:grid;gap:6px;">${details}</div>` : ''}

      <div style="margin-top:10px;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;">
        <div style="border:1px solid rgba(148,163,184,0.22);border-radius:10px;padding:8px 10px;background:#f8fafc;">
          <p style="margin:0;font-size:9px;font-weight:800;letter-spacing:0.16em;text-transform:uppercase;color:#64748b;">Dist</p>
          <p style="margin:4px 0 0;font-size:13px;font-weight:800;color:#0f172a;">${leg.distance != null ? `${leg.distance.toFixed(1)} NM` : '0.0 NM'}</p>
        </div>
        <div style="border:1px solid rgba(148,163,184,0.22);border-radius:10px;padding:8px 10px;background:#f8fafc;">
          <p style="margin:0;font-size:9px;font-weight:800;letter-spacing:0.16em;text-transform:uppercase;color:#64748b;">HDG</p>
          <p style="margin:4px 0 0;font-size:13px;font-weight:800;color:#0f172a;">${heading ?? '0'}&deg;</p>
        </div>
      </div>

      ${notesMarkup}
    </div>
  `;
};
