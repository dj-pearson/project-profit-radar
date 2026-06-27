/**
 * US-072: crew marker construction for the geofence map
 */
import { describe, it, expect } from 'vitest';
import { buildCrewMarkers, type TimeEntryLite } from '@/lib/geofence-markers';

const names = new Map<string, string>([
  ['u1', 'Jane Doe'],
  ['u2', 'Bob Smith'],
]);

describe('buildCrewMarkers (US-072)', () => {
  it('marks an open entry (no clock-out) as on site with a single marker', () => {
    const entries: TimeEntryLite[] = [
      {
        user_id: 'u1',
        clock_in_lat: 40.1,
        clock_in_lng: -74.2,
        clock_in_timestamp: '2026-06-27T13:00:00.000Z',
        clock_out_lat: null,
        clock_out_lng: null,
        clock_out_timestamp: null,
      },
    ];
    const markers = buildCrewMarkers(entries, names);
    expect(markers).toHaveLength(1);
    expect(markers[0].kind).toBe('onsite');
    expect(markers[0].lat).toBe(40.1);
    expect(markers[0].label).toContain('Jane Doe');
  });

  it('emits clock-in and clock-out markers for a completed entry', () => {
    const entries: TimeEntryLite[] = [
      {
        user_id: 'u2',
        clock_in_lat: 40.1,
        clock_in_lng: -74.2,
        clock_in_timestamp: '2026-06-27T13:00:00.000Z',
        clock_out_lat: 40.15,
        clock_out_lng: -74.25,
        clock_out_timestamp: '2026-06-27T21:00:00.000Z',
      },
    ];
    const markers = buildCrewMarkers(entries, names);
    expect(markers).toHaveLength(2);
    expect(markers.map((m) => m.kind).sort()).toEqual(['in', 'out']);
    expect(markers.every((m) => m.label.includes('Bob Smith'))).toBe(true);
  });

  it('skips entries without clock-in coordinates and falls back to "Crew"', () => {
    const entries: TimeEntryLite[] = [
      {
        user_id: 'unknown',
        clock_in_lat: null,
        clock_in_lng: null,
        clock_in_timestamp: '2026-06-27T13:00:00.000Z',
        clock_out_lat: null,
        clock_out_lng: null,
        clock_out_timestamp: null,
      },
    ];
    expect(buildCrewMarkers(entries, names)).toHaveLength(0);
  });
});
