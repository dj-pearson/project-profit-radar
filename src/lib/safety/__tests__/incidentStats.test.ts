import { describe, it, expect } from 'vitest';
import {
  normalizeSeverity,
  summarizeIncidents,
  filterAndSortIncidents,
  type IncidentInput,
} from '../incidentStats';

describe('normalizeSeverity', () => {
  it('maps synonyms to the known set', () => {
    expect(normalizeSeverity('minor')).toBe('minor');
    expect(normalizeSeverity('near_miss')).toBe('minor');
    expect(normalizeSeverity('serious')).toBe('major');
    expect(normalizeSeverity('fatal')).toBe('critical');
    expect(normalizeSeverity('???')).toBe('other');
    expect(normalizeSeverity(null)).toBe('other');
  });
});

describe('summarizeIncidents', () => {
  const incidents: IncidentInput[] = [
    { id: '1', incident_date: '2026-06-01', severity: 'minor', incident_type: 'slip', status: 'closed' },
    { id: '2', incident_date: '2026-06-10', severity: 'critical', incident_type: 'fall', status: 'open', osha_recordable: true, lost_time: true, days_away_from_work: 5 },
    { id: '3', incident_date: '2026-05-15', severity: 'major', incident_type: 'slip', status: 'investigating', osha_recordable: true },
  ];
  const stats = summarizeIncidents(incidents, { asOf: '2026-06-25', months: 12 });

  it('counts totals and open incidents', () => {
    expect(stats.total).toBe(3);
    expect(stats.openCount).toBe(2); // open + investigating
  });

  it('breaks down by severity', () => {
    expect(stats.bySeverity).toEqual({ minor: 1, major: 1, critical: 1, other: 0 });
  });

  it('breaks down by type', () => {
    expect(stats.byType).toEqual({ slip: 2, fall: 1 });
  });

  it('computes days since last incident', () => {
    // last incident Jun 10, asOf Jun 25 -> 15 days
    expect(stats.lastIncidentDate).toBe('2026-06-10');
    expect(stats.daysSinceLastIncident).toBe(15);
  });

  it('counts OSHA-recordable, lost-time, and days away', () => {
    expect(stats.oshaRecordableCount).toBe(2);
    expect(stats.lostTimeCount).toBe(1);
    expect(stats.totalDaysAwayFromWork).toBe(5);
  });

  it('builds a trailing monthly trend with empty months as zero', () => {
    expect(stats.monthlyTrend).toHaveLength(12);
    const last = stats.monthlyTrend[stats.monthlyTrend.length - 1];
    expect(last.month).toBe('2026-06');
    expect(last.count).toBe(2); // two June incidents
    const may = stats.monthlyTrend.find((p) => p.month === '2026-05');
    expect(may?.count).toBe(1);
    // A month with no incidents is present and zero.
    const apr = stats.monthlyTrend.find((p) => p.month === '2026-04');
    expect(apr?.count).toBe(0);
  });

  it('handles an empty incident list', () => {
    const empty = summarizeIncidents([], { asOf: '2026-06-25' });
    expect(empty.total).toBe(0);
    expect(empty.daysSinceLastIncident).toBeNull();
    expect(empty.lastIncidentDate).toBeNull();
    expect(empty.monthlyTrend).toHaveLength(12);
  });

  it('ignores future-dated incidents for days-since', () => {
    const withFuture = summarizeIncidents(
      [{ incident_date: '2026-12-01', severity: 'minor', incident_type: 'x' }],
      { asOf: '2026-06-25' }
    );
    expect(withFuture.daysSinceLastIncident).toBeNull();
  });
});

describe('filterAndSortIncidents', () => {
  const incidents: IncidentInput[] = [
    { id: '1', incident_date: '2026-06-01', severity: 'minor', incident_type: 'slip', project_id: 'p1' },
    { id: '2', incident_date: '2026-06-10', severity: 'critical', incident_type: 'fall', project_id: 'p2' },
    { id: '3', incident_date: '2026-05-15', severity: 'major', incident_type: 'slip', project_id: 'p1' },
  ];

  it('filters by severity', () => {
    const r = filterAndSortIncidents(incidents, { severity: 'critical' });
    expect(r.map((i) => i.id)).toEqual(['2']);
  });

  it('filters by project', () => {
    const r = filterAndSortIncidents(incidents, { projectId: 'p1' });
    expect(r.map((i) => i.id).sort()).toEqual(['1', '3']);
  });

  it('filters by date range (inclusive)', () => {
    const r = filterAndSortIncidents(incidents, { from: '2026-06-01', to: '2026-06-30' });
    expect(r.map((i) => i.id).sort()).toEqual(['1', '2']);
  });

  it('sorts by date descending by default', () => {
    const r = filterAndSortIncidents(incidents);
    expect(r.map((i) => i.id)).toEqual(['2', '1', '3']);
  });

  it('sorts by severity descending', () => {
    const r = filterAndSortIncidents(incidents, {}, 'severity', 'desc');
    expect(r[0].id).toBe('2'); // critical first
  });

  it('returns all when no filter is given', () => {
    expect(filterAndSortIncidents(incidents)).toHaveLength(3);
  });
});
