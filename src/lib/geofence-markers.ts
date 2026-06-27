/**
 * US-072: Pure helpers for the geofence map (extracted so the data mapping is
 * unit-testable without rendering Leaflet, which needs a real DOM).
 */

export interface TimeEntryLite {
  user_id: string;
  clock_in_lat: number | null;
  clock_in_lng: number | null;
  clock_in_timestamp: string;
  clock_out_lat: number | null;
  clock_out_lng: number | null;
  clock_out_timestamp: string | null;
}

export interface CrewMarker {
  lat: number;
  lng: number;
  label: string;
  kind: 'onsite' | 'in' | 'out';
}

const hhmm = (iso: string): string => {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
};

/**
 * Turn today's time entries into map markers: a clock-in point per entry
 * (flagged "on site" when there's no clock-out yet) and a clock-out point
 * where present. Entries without coordinates are skipped.
 */
export function buildCrewMarkers(
  entries: TimeEntryLite[],
  nameById: Map<string, string>
): CrewMarker[] {
  const markers: CrewMarker[] = [];
  for (const e of entries) {
    const name = nameById.get(e.user_id) ?? 'Crew';
    if (e.clock_in_lat != null && e.clock_in_lng != null) {
      const onsite = e.clock_out_timestamp == null;
      const t = hhmm(e.clock_in_timestamp);
      markers.push({
        lat: e.clock_in_lat,
        lng: e.clock_in_lng,
        label: onsite ? `${name} — on site (in ${t})` : `${name} — clocked in ${t}`,
        kind: onsite ? 'onsite' : 'in',
      });
    }
    if (e.clock_out_lat != null && e.clock_out_lng != null && e.clock_out_timestamp) {
      markers.push({
        lat: e.clock_out_lat,
        lng: e.clock_out_lng,
        label: `${name} — clocked out ${hhmm(e.clock_out_timestamp)}`,
        kind: 'out',
      });
    }
  }
  return markers;
}
