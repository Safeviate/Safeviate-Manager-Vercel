import type { DeviceBinding } from '@/types/flight-session';

const DEVICE_ID_STORAGE_KEY = 'safeviate:active-flight-device-id';
const DEVICE_LABEL_STORAGE_KEY = 'safeviate:active-flight-device-label';

const createDeviceId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `device-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36)}`;
};

export const getOrCreateDeviceBinding = (): DeviceBinding | null => {
  if (typeof window === 'undefined') return null;

  let deviceId = window.localStorage.getItem(DEVICE_ID_STORAGE_KEY);
  if (!deviceId) {
    deviceId = createDeviceId();
    window.localStorage.setItem(DEVICE_ID_STORAGE_KEY, deviceId);
  }

  const deviceLabel = window.localStorage.getItem(DEVICE_LABEL_STORAGE_KEY) || undefined;

  return {
    deviceId,
    deviceLabel,
    registeredAt: new Date().toISOString(),
  };
};

export const setDeviceLabel = (deviceLabel: string) => {
  if (typeof window === 'undefined') return;

  const trimmed = deviceLabel.trim();
  if (!trimmed) {
    window.localStorage.removeItem(DEVICE_LABEL_STORAGE_KEY);
    return;
  }

  window.localStorage.setItem(DEVICE_LABEL_STORAGE_KEY, trimmed);
};
