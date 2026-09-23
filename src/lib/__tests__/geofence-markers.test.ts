/**
 * US-072 / US-367: crew marker construction for the geofence map, from
 * time_entries rows (gps_latitude/gps_longitude/start_time/end_time).
 */
import { describe, it, expect } from 'vitest';
import { buildCrewMarkers, type TimeEntryLite } from '@/lib/geofence-markers';

const names = new Map<string, string>([
  ['u1', 'Jane Doe'],
  ['u2', 'Bob Smith'],
]);

describe('buildCrewMarkers', () => {
  it('marks an open entry (no end_time) as on site', () => {
    const entries: TimeEntryLite[] = [
      { user_id: 'u1', gps_latitude: 40.1, gps_longitude: -74.2, start_time: '2026-06-27T13:00:00.000Z', end_time: null },
    ];
    const markers = buildCrewMarkers(entries, names);
    expect(markers).toHaveLength(1);
    expect(markers[0]).toMatchObject({ kind: 'onsite', lat: 40.1, lng: -74.2 });
    expect(markers[0].label).toContain('Jane Doe');
  });

  it('emits one clock-in marker for a finished entry (time_entries has no clock-out coordinates)', () => {
    const entries: TimeEntryLite[] = [
      {
        user_id: 'u2',
        gps_latitude: 40.1,
        gps_longitude: -74.2,
        start_time: '2026-06-27T13:00:00.000Z',
        end_time: '2026-06-27T21:00:00.000Z',
      },
    ];
    const markers = buildCrewMarkers(entries, names);
    expect(markers).toHaveLength(1);
    expect(markers[0].kind).toBe('in');
    expect(markers[0].label).toContain('Bob Smith');
  });

  it('skips entries without coordinates', () => {
    const entries: TimeEntryLite[] = [
      { user_id: 'u1', gps_latitude: null, gps_longitude: null, start_time: '2026-06-27T13:00:00.000Z', end_time: null },
    ];
    expect(buildCrewMarkers(entries, names)).toHaveLength(0);
  });

  it('falls back to "Crew" for a user not in the name map', () => {
    const entries: TimeEntryLite[] = [
      { user_id: 'unknown', gps_latitude: 40.1, gps_longitude: -74.2, start_time: '2026-06-27T13:00:00.000Z', end_time: null },
    ];
    const markers = buildCrewMarkers(entries, names);
    expect(markers).toHaveLength(1);
    expect(markers[0].label).toContain('Crew');
  });
});
