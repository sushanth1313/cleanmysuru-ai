/**
 * CleanMysuru AI — Greater Mysuru Location & Geocoding Engine
 * Real geocoding mechanism with Mysuru geographic bounds
 * Supports arbitrary search across all Mysuru localities, roads, layouts, and landmarks.
 */

import { api } from './api';

export interface LocationSearchResult {
  display_name: string;
  lat: number;
  lng: number;
  locality: string;
  city: string;
  state: string;
}

// Bounding box for Greater Mysuru Region
export const MYSURU_BOUNDS = {
  minLat: 12.15,
  maxLat: 12.45,
  minLng: 76.45,
  maxLng: 76.82,
};

/**
 * Checks whether given coordinates are within Greater Mysuru
 */
export function isWithinGreaterMysuru(lat: number, lng: number): boolean {
  return (
    lat >= MYSURU_BOUNDS.minLat &&
    lat <= MYSURU_BOUNDS.maxLat &&
    lng >= MYSURU_BOUNDS.minLng &&
    lng <= MYSURU_BOUNDS.maxLng
  );
}

/**
 * Safely formats coordinates for React rendering without risking object-render errors
 */
export function formatCoordinates(lat?: number | null, lng?: number | null): string {
  if (typeof lat !== 'number' || typeof lng !== 'number' || isNaN(lat) || isNaN(lng)) {
    return 'Coordinates Pending';
  }
  const latDir = lat >= 0 ? 'N' : 'S';
  const lngDir = lng >= 0 ? 'E' : 'W';
  return `${Math.abs(lat).toFixed(5)}° ${latDir}, ${Math.abs(lng).toFixed(5)}° ${lngDir}`;
}

/**
 * Real geocoding search for any arbitrary location in Mysuru
 */
export async function searchMysuruLocations(query: string): Promise<LocationSearchResult[]> {
  const trimmed = query?.trim() || '';
  if (trimmed.length < 2) return [];

  try {
    let norm = trimmed
      .replace(/sathgalli/gi, 'Sathagalli')
      .replace(/vv\s*mohalla/gi, 'Vani Vilas Mohalla')
      .replace(/krs\s*road/gi, 'Krishnaraja Sagara Road');

    const url = `https://nominatim.openstreetmap.org/search?format=json&viewbox=76.45,12.45,76.82,12.15&bounded=1&q=${encodeURIComponent(norm + ', Mysuru, Karnataka, India')}&limit=6`;
    const resp = await fetch(url);
    if (resp.ok) {
      const items = await resp.json();
      if (Array.isArray(items)) {
        return items
          .map((i: any) => ({
            display_name: i.display_name,
            lat: parseFloat(i.lat),
            lng: parseFloat(i.lon),
            locality: i.display_name.split(',')[0].trim(),
            city: 'Mysuru',
            state: 'Karnataka',
          }))
          .filter((i) => !isNaN(i.lat) && !isNaN(i.lng));
      }
    }
  } catch (directErr) {
    console.warn('Direct geocoding failed:', directErr);
  }

  return [];
}

/**
 * Reverse geocode coordinates to human-readable address in Mysuru
 */
export async function reverseGeocodeLocation(lat: number, lng: number): Promise<{
  display_name: string;
  locality: string;
  city: string;
  state: string;
}> {
  try {
    const res = await api.reverseGeocode(lat, lng);
    if (res?.success && res.display_name) {
      return {
        display_name: res.display_name,
        locality: res.locality || res.display_name.split(',')[0].trim(),
        city: res.city || 'Mysuru',
        state: res.state || 'Karnataka',
      };
    }
  } catch (err) {
    console.warn('Backend reverse geocoding failed:', err);
  }

  return {
    display_name: `Location at ${lat.toFixed(4)}, ${lng.toFixed(4)}, Mysuru`,
    locality: 'Mysuru',
    city: 'Mysuru',
    state: 'Karnataka',
  };
}
