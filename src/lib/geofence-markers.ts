/**
 * US-072: Pure helpers for the geofence map (extracted so the data mapping is
 * unit-testable without rendering Leaflet, which needs a real DOM).
 *
 * US-367: the input is a `time_entries` row, because that is the table every
 * live clock-in path writes (MobileTimeTracker, TimeTrackingDashboard, the
 * time-tracking edge function). time_entries stores one GPS fix, taken at clock-in, in
 * gps_latitude/gps_longitude; it has no clock-out coordinates, so a finished
 * shift is drawn at its clock-in point rather than as a second marker.
 */

/** The time_entries columns the map reads. Keep in sync with the select. */
export const TIME_ENTRY_MAP_COLUMNS = 'user_id, gps_latitude, gps_longitude, start_time, end_time';

export interface TimeEntryLite {
  user_id: string;
  gps_latitude: number | null;
  gps_longitude: number | null;
  start_time: string;
  end_time: string | null;
}

export interface CrewMarker {
  lat: number;
  lng: number;
  label: string;
  kind: 'onsite' | 'in';
}

const hhmm = (iso: string): string => {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
};

/**
 * Turn today's time entries into map markers: one point per entry at its
 * clock-in location, flagged "on site" while the entry is still open.
 * Entries without coordinates are skipped.
 */
export function buildCrewMarkers(
  entries: TimeEntryLite[],
  nameById: Map<string, string>
): CrewMarker[] {
  const markers: CrewMarker[] = [];
  for (const e of entries) {
    if (e.gps_latitude == null || e.gps_longitude == null) continue;
    const name = nameById.get(e.user_id) ?? 'Crew';
    const onsite = e.end_time == null;
    const t = hhmm(e.start_time);
    markers.push({
      lat: e.gps_latitude,
      lng: e.gps_longitude,
      label: onsite
        ? `${name} - on site (in ${t})`
        : `${name} - clocked in ${t}, out ${hhmm(e.end_time as string)}`,
      kind: onsite ? 'onsite' : 'in',
    });
  }
  return markers;
}
