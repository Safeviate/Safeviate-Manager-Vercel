import L from 'leaflet';

type NumberedWaypointIconOptions = {
  backgroundColor?: string;
  borderColor?: string;
  shadowColor?: string;
};

export const createNumberedWaypointMarkup = (index: number, options: NumberedWaypointIconOptions = {}) => `
  <div style="
    width:22px;
    height:22px;
    border-radius:9999px;
    background:${options.backgroundColor || '#0ea5e9'};
    border:2px solid ${options.borderColor || '#fff'};
    box-shadow:0 0 0 2px ${options.shadowColor || 'rgba(14,165,233,0.35)'};
    color:#fff;
    display:flex;
    align-items:center;
    justify-content:center;
    font-size:12px;
    font-weight:900;
    line-height:1;
  ">${index}</div>
`;

export const createNumberedWaypointIcon = (index: number, options: NumberedWaypointIconOptions = {}) =>
  L.divIcon({
    className: '',
    html: createNumberedWaypointMarkup(index, options),
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });

export const createNumberedWaypointElement = (index: number, options: NumberedWaypointIconOptions = {}) => {
  const element = document.createElement('div');
  element.innerHTML = createNumberedWaypointMarkup(index, options);
  const wrapper = element.firstElementChild as HTMLElement | null;
  if (!wrapper) return element;
  return wrapper;
};
