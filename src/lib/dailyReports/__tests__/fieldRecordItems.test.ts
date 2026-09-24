/**
 * US-330, the parts left after the first pass: materials and equipment as
 * rows (AC3), photo classification (AC4) and the customer PDF with photos
 * (AC5).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  splitReportLines,
  materialItemsFromText,
  equipmentItemsFromText,
  MAX_REPORT_ITEMS,
} from '@/lib/dailyReportField';
import {
  parseClassification,
  PHOTO_TAGS,
  MAX_TAGS_PER_PHOTO,
  CLASSIFY_PROMPT,
} from '../../../../supabase/functions/classify-photo/tags';
import { buildDailyReportPDF, dailyReportPdfFileName } from '@/utils/dailyReportPDFGenerator';

const strip = (path: string) =>
  readFileSync(path, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter((l) => !l.trim().startsWith('//') && !l.trim().startsWith('--'))
    .join('\n');

describe('materials and equipment become rows (AC3)', () => {
  it('splits on lines and semicolons, dropping bullets, numbering and "none"', () => {
    expect(splitReportLines('- 20 bags concrete\n* rebar; 2. lumber\n\nNone\nN/A')).toEqual([
      '20 bags concrete', 'rebar', 'lumber',
    ]);
    expect(splitReportLines(null)).toEqual([]);
  });

  it('caps a pasted wall of text', () => {
    const text = Array.from({ length: 80 }, (_, i) => `item ${i}`).join('\n');
    expect(splitReportLines(text)).toHaveLength(MAX_REPORT_ITEMS);
  });

  it('reads quantity and unit when the line has them', () => {
    expect(materialItemsFromText('20 bags concrete\n2.5 tons of gravel\n3 x sheets plywood')).toEqual([
      { material_name: 'concrete', quantity: 20, unit: 'bags' },
      { material_name: 'gravel', quantity: 2.5, unit: 'tons' },
      { material_name: 'plywood', quantity: 3, unit: 'sheets' },
    ]);
  });

  it('keeps an unknown word as part of the name rather than guessing a unit', () => {
    expect(materialItemsFromText('12 2x4 studs')).toEqual([
      { material_name: '2x4 studs', quantity: 12, unit: null },
    ]);
  });

  it('keeps a line it cannot read as a name, not as nothing', () => {
    expect(materialItemsFromText('Rebar delivered by Acme')).toEqual([
      { material_name: 'Rebar delivered by Acme', quantity: null, unit: null },
    ]);
  });

  it('reads equipment hours in the ways people write them', () => {
    expect(equipmentItemsFromText('Excavator 6h\nSkid steer - 4.5 hrs\nCompactor (2 hours)\nGenerator')).toEqual([
      { equipment_name: 'Excavator', hours_used: 6 },
      { equipment_name: 'Skid steer', hours_used: 4.5 },
      { equipment_name: 'Compactor', hours_used: 2 },
      // Untimed is unknown, not zero.
      { equipment_name: 'Generator', hours_used: null },
    ]);
  });

  it('writes the rows from the create flow and keeps the text columns for iOS', () => {
    const page = strip('src/pages/DailyReports.tsx');
    expect(page).toMatch(/materials: materialItemsFromText\(values\.materials_delivered\),\s*equipment: equipmentItemsFromText\(values\.equipment_used\)/);
    // The text still goes into daily_reports through the same builder.
    expect(page).toMatch(/buildDailyReportInsert\(values,/);
    const hook = strip('src/hooks/useDailyReportsPage.ts');
    expect(hook).toMatch(/insertDailyReportItems\(reportId, materials, equipment\)/);
    expect(hook).toMatch(/from\('daily_report_material_items'\)/);
    expect(hook).toMatch(/from\('daily_report_equipment_items'\)/);
  });

  it('does not lose the report when the item rows fail, and says so', () => {
    const hook = strip('src/hooks/useDailyReportsPage.ts');
    const fn = hook.slice(hook.indexOf('export async function insertDailyReportItems'));
    expect(fn).toMatch(/failures\.push\(/);
    expect(fn.slice(0, fn.indexOf('\n}\n'))).not.toMatch(/throw /);
  });
});

describe('the items migration (AC3)', () => {
  const file = 'supabase/migrations/20260924190000_daily_report_items.sql';
  const sql = strip(file);

  it('is additive', () => {
    expect(sql).not.toMatch(/DROP TABLE|DROP COLUMN|DROP POLICY|SET NOT NULL|RENAME/i);
  });

  it('only fills columns the writer left NULL', () => {
    expect(sql).toMatch(/IF NEW\.company_id IS NULL/);
    expect(sql).toMatch(/IF NEW\.created_by IS NULL/);
    expect(sql).toMatch(/IF NEW\.site_id IS NULL AND NEW\.project_id IS NOT NULL/);
    expect(sql).toMatch(/IF NEW\.site_id IS NULL THEN/);
  });

  it('attaches the site_id fill only where the column exists', () => {
    expect(sql).toMatch(/table_name = t AND column_name = 'site_id'/);
  });

  it('scopes the new policies by the report company, through the project', () => {
    expect(sql).toMatch(/JOIN public\.projects p ON p\.id = dr\.project_id/);
    expect(sql).toMatch(/daily_report_company_id\(daily_report_id\) = public\.get_user_company\(auth\.uid\(\)\)/);
    expect(sql).toMatch(/IN \('root_admin', 'admin', 'project_manager', 'field_supervisor'\)/);
  });

  it('pins search_path on every SECURITY DEFINER function it creates', () => {
    const definers = sql.split(/CREATE OR REPLACE FUNCTION/).slice(1);
    expect(definers.length).toBeGreaterThan(0);
    for (const body of definers) {
      if (/SECURITY DEFINER/.test(body)) expect(body).toMatch(/SET search_path = public/);
    }
  });
});

describe('photo classification (AC4)', () => {
  it('keeps only tags from the vocabulary, normalised and de-duplicated', () => {
    const result = parseClassification(JSON.stringify({
      tags: ['Framing', 'framing', 'Safety Hazard', 'a unicorn', 'exterior'],
      confidence: 0.91234,
    }));
    expect(result).toEqual({ tags: ['framing', 'safety-hazard', 'exterior'], confidence: 0.912 });
  });

  it('reads an answer wrapped in a markdown fence', () => {
    expect(parseClassification('```json\n{"tags":["concrete"],"confidence":1}\n```')?.tags).toEqual(['concrete']);
  });

  it('caps the tags per photo and clamps confidence to 0..1', () => {
    const result = parseClassification(JSON.stringify({ tags: [...PHOTO_TAGS], confidence: 7 }));
    expect(result?.tags).toHaveLength(MAX_TAGS_PER_PHOTO);
    expect(result?.confidence).toBe(1);
  });

  it('returns null for an unusable answer so the photo stays in the backlog', () => {
    expect(parseClassification('I think this is a house')).toBeNull();
    expect(parseClassification('{"labels":["framing"]}')).toBeNull();
    expect(parseClassification('')).toBeNull();
  });

  it('asks the model for exactly the vocabulary it will accept', () => {
    for (const tag of PHOTO_TAGS) expect(CLASSIFY_PROMPT).toContain(tag);
  });

  it('runs on upload, in the background, for every new photo row', () => {
    const hook = strip('src/hooks/useDailyReportsPage.ts');
    const insert = hook.slice(hook.indexOf('export async function insertPhotoAttachments'));
    expect(insert).toMatch(/from\('photo_attachments'\)\.insert\([^)]*\)\.select\('id'\)/);
    expect(insert).toMatch(/classifyPhotosInBackground\(/);
    const dispatch = hook.slice(hook.indexOf('export function classifyPhotosInBackground'));
    expect(dispatch).toMatch(/functions\s*\.invoke\('classify-photo'/);
    // Fire and forget: the person filing does not wait on a model call.
    expect(dispatch).toMatch(/void supabase\.functions/);
    expect(dispatch).toMatch(/i \+= CLASSIFY_BATCH_LIMIT/);
  });

  it('classifies through the caller, writes the tag columns, and leaves failures unclassified', () => {
    const fn = strip('supabase/functions/classify-photo/index.ts');
    expect(fn).toMatch(/initializeAuthContext\(req\)/);
    expect(fn).toMatch(/enforceRateLimit\(createServiceClient\(\), user\.id, 'classify-photo'/);
    // RLS, not a service-role read, decides which photos the caller may tag.
    expect(fn).toMatch(/await supabase\s*\.from\('photo_attachments'\)\s*\.select/);
    expect(fn).toMatch(/ai_tags: result\.tags/);
    expect(fn).toMatch(/ai_classified_at: new Date\(\)\.toISOString\(\)/);
    expect(fn).toMatch(/if \(!result\) \{\s*unreadable\+\+;\s*continue;/);
  });

  it('the timeline reads and searches the tags', () => {
    expect(strip('src/hooks/useProjectPhotos.ts')).toMatch(/ai_tags/);
    expect(strip('src/components/project/tabs/ProjectPhotos.tsx')).toMatch(/p\.ai_tags \?\? \[\]\)\.some/);
  });
});

describe('the customer PDF carries the photos (AC5)', () => {
  // A 1x1 white JPEG.
  const JPEG =
    'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';

  const pdf = buildDailyReportPDF({
    companyName: 'Reyes Builders',
    projectName: 'Maple St Remodel',
    date: '2026-09-24',
    weather: 'Sunny, 75F',
    workPerformed: 'Framed the second floor.',
    crew: [{ name: 'Dana Whitfield', role: 'field_supervisor', hours: 8, overtime: 1.5 }],
    materials: [{ name: 'concrete', quantity: 20, unit: 'bags' }],
    materialsText: 'should not print when rows exist',
    equipment: [],
    equipmentText: 'Excavator 6h',
    photos: [
      { dataUrl: JPEG, width: 4, height: 3, caption: 'North wall', takenAt: 'Sep 24, 2026' },
      { dataUrl: JPEG, width: 3, height: 4 },
      { dataUrl: JPEG, width: 4, height: 3 },
    ],
    photosMissing: 1,
  }).output();

  it('prints the report', () => {
    expect(pdf).toContain('Reyes Builders');
    expect(pdf).toContain('Daily report: Maple St Remodel');
    expect(pdf).toContain('Framed the second floor.');
    expect(pdf).toContain('Dana Whitfield \\(field_supervisor\\): 8h + 1.5h overtime');
  });

  it('prefers the rows and falls back to the text iOS writes', () => {
    expect(pdf).toContain('20 bags concrete');
    expect(pdf).not.toContain('should not print when rows exist');
    expect(pdf).toContain('Excavator 6h');
  });

  it('embeds every photo and says how many could not be included', () => {
    expect(pdf).toContain('Photos \\(3\\)');
    // jsPDF stores identical image data once and draws it three times, so
    // count the draw operators rather than the image objects.
    expect((pdf.match(/\/I\d+ Do/g) ?? []).length).toBe(3);
    expect(pdf).toContain('North wall - Sep 24, 2026');
    expect(pdf).toContain('1 photo\\(s\\) on this report could not be included.');
  });

  it('names the file after the project and day', () => {
    expect(dailyReportPdfFileName('Maple St. Remodel!', '2026-09-24')).toBe('daily-report-maple-st-remodel-2026-09-24.pdf');
  });

  it('is reachable from the daily reports list', () => {
    const page = strip('src/pages/DailyReports.tsx');
    expect(page).toMatch(/onClick=\{\(\) => handleDownloadPdf\(row\.id\)\}/);
    const loader = strip('src/hooks/useDailyReportExport.ts');
    // photo_attachments first, the legacy array as the fallback.
    expect(loader).toMatch(/from\('photo_attachments'\)/);
    expect(loader).toMatch(/report\.photos \?\? \[\]/);
    // Signed, never public (US-289).
    expect(loader).toMatch(/resolveStorageUrl\(/);
    expect(loader).not.toMatch(/getPublicUrl/);
  });
});
