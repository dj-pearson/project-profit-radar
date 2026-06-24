import { describe, it, expect } from 'vitest';
import { buildReportFromPrevious, applyTemplateDefaults } from '../templateFill';

describe('buildReportFromPrevious', () => {
  it('carries over recurring context and prior work, but not day-specific fields', () => {
    const result = buildReportFromPrevious({
      work_performed: 'Framed second floor',
      crew_count: 6,
      weather_conditions: 'Sunny, 75F',
      materials_delivered: 'Lumber',
      equipment_used: 'Crane',
      delays_issues: 'Late concrete truck',
      safety_incidents: 'None',
    });
    expect(result.work_performed).toBe('Framed second floor');
    expect(result.crew_count).toBe(6);
    expect(result.weather_conditions).toBe('Sunny, 75F');
    expect(result.materials_delivered).toBe('Lumber');
    expect(result.equipment_used).toBe('Crane');
    // day-specific fields are cleared
    expect(result.delays_issues).toBe('');
    expect(result.safety_incidents).toBe('');
  });

  it('handles missing fields with safe defaults', () => {
    const result = buildReportFromPrevious({});
    expect(result.work_performed).toBe('');
    expect(result.crew_count).toBe(0);
    expect(result.weather_conditions).toBe('');
  });
});

describe('applyTemplateDefaults', () => {
  it('only returns fields the template specifies', () => {
    const result = applyTemplateDefaults({
      default_crew_count: 4,
      default_weather_conditions: 'Clear',
      default_safety_notes: 'Hard hats required',
    });
    expect(result).toEqual({
      crew_count: 4,
      weather_conditions: 'Clear',
      safety_incidents: 'Hard hats required',
    });
  });

  it('omits null/empty template fields so form values are preserved', () => {
    const result = applyTemplateDefaults({ default_crew_count: null, default_weather_conditions: '', default_safety_notes: null });
    expect(result).toEqual({});
  });

  it('keeps crew_count of 0 when explicitly set', () => {
    expect(applyTemplateDefaults({ default_crew_count: 0 })).toEqual({ crew_count: 0 });
  });
});
