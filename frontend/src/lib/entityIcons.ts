import { EntityType } from '@/types';

// SVG icons for each entity type, rendered as data URIs for Leaflet markers
const ICONS: Record<EntityType, string> = {
  flight: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%233b82f6" width="20" height="20"><path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/></svg>`,
  ship: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%2306b6d4" width="20" height="20"><path d="M20 21c-1.39 0-2.78-.47-4-1.32-2.44 1.71-5.56 1.71-8 0C6.78 20.53 5.39 21 4 21H2v2h2c1.38 0 2.74-.35 4-.99 2.52 1.29 5.48 1.29 8 0 1.26.65 2.62.99 4 .99h2v-2h-2zM3.95 19H4c1.6 0 3.02-.88 4-2 .98 1.12 2.4 2 4 2s3.02-.88 4-2c.98 1.12 2.4 2 4 2h.05l1.89-6.68c.08-.26.06-.54-.06-.78s-.34-.42-.6-.5L20 10.62V6c0-1.1-.9-2-2-2h-3V1H9v3H6c-1.1 0-2 .9-2 2v4.62l-1.29.42c-.26.08-.48.26-.6.5s-.15.52-.06.78L3.95 19zM6 6h12v3.97L12 8 6 9.97V6z"/></svg>`,
  satellite: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23a855f7" width="20" height="20"><path d="M17.59 3.41L15.17 5.83 18.17 8.83 20.59 6.41 17.59 3.41zM7.5 8.5L3.41 4.41 4.41 3.41 8.5 7.5 7.5 8.5zM11 1H13V4H11V1zM18.36 11H22V13H18.36zM1 11H4.64V13H1V11zM11 18.36V22H13V18.36H11zM15.54 15.54L18.36 18.36 19.78 16.95 16.95 14.12 15.54 15.54zM5.64 5.64L8.46 8.46 7.05 9.88 4.22 7.05 5.64 5.64zM12 8C9.79 8 8 9.79 8 12S9.79 16 12 16 16 14.21 16 12 14.21 8 12 8z"/></svg>`,
  vehicle: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%2322c55e" width="20" height="20"><path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/></svg>`,
  event: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23f59e0b" width="20" height="20"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>`,
};

export function getEntityIconUrl(type: EntityType): string {
  const svg = ICONS[type];
  return `data:image/svg+xml,${svg}`;
}

export const TYPE_COLORS: Record<EntityType, string> = {
  flight: '#3b82f6',
  ship: '#06b6d4',
  satellite: '#a855f7',
  vehicle: '#22c55e',
  event: '#f59e0b',
};

export const TYPE_LABELS: Record<EntityType, string> = {
  flight: 'Flights',
  ship: 'Ships',
  satellite: 'Satellites',
  vehicle: 'Vehicles',
  event: 'Events',
};

export const SEVERITY_COLORS: Record<string, string> = {
  low: '#22c55e',
  medium: '#f59e0b',
  high: '#f97316',
  critical: '#ef4444',
};
