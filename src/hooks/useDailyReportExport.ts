/**
 * Loading a daily report for the customer PDF (US-330, AC5).
 *
 * Reads the report, its crew, material and equipment rows, and its photos,
 * then signs each photo, fetches it and downscales it to a JPEG so the PDF
 * stays a size somebody can email. Layout is buildDailyReportPDF.
 *
 * Every read that the PDF cannot do without (the report itself) throws. The
 * line items fall back to the text columns iOS still writes, and a photo that
 * cannot be fetched is counted and named in the PDF rather than dropped
 * silently.
 */
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { resolveStorageUrl } from '@/lib/storage/signedUrl';
import { formatDate } from '@/lib/format';
import { logger } from '@/lib/logger';
import {
  buildDailyReportPDF,
  dailyReportPdfFileName,
  type DailyReportPdfData,
  type DailyReportPdfPhoto,
} from '@/utils/dailyReportPDFGenerator';

/** A report with more photos than this gets the first ones and a count of the rest. */
export const MAX_PDF_PHOTOS = 30;
const MAX_IMAGE_EDGE_PX = 1400;

interface PhotoSource {
  bucket: string;
  path: string;
  caption: string | null;
  takenAt: string | null;
}

/** Fetch an image and re-encode it as a JPEG no larger than MAX_IMAGE_EDGE_PX on its long edge. */
async function imageToJpeg(url: string): Promise<{ dataUrl: string; width: number; height: number } | null> {
  const response = await fetch(url);
  if (!response.ok) return null;
  const bitmap = await createImageBitmap(await response.blob());
  const scale = Math.min(1, MAX_IMAGE_EDGE_PX / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close?.();
  return { dataUrl: canvas.toDataURL('image/jpeg', 0.8), width, height };
}

export async function loadDailyReportForPdf(reportId: string): Promise<DailyReportPdfData> {
  const { data: report, error } = await supabase
    .from('daily_reports')
    .select(`
      id, date, work_performed, crew_count, weather_conditions,
      materials_delivered, equipment_used, delays_issues, safety_incidents, photos,
      projects!inner(name, company_id)
    `)
    .eq('id', reportId)
    .single();
  if (error) throw error;
  const project = report.projects as unknown as { name: string; company_id: string | null };

  const [company, crew, materials, equipment, attachments] = await Promise.all([
    project.company_id
      ? supabase.from('companies').select('name').eq('id', project.company_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    supabase.from('daily_report_crew_items')
      .select('crew_member_name, role, hours_worked, overtime_hours')
      .eq('daily_report_id', reportId)
      .order('crew_member_name'),
    supabase.from('daily_report_material_items')
      .select('material_name, quantity, unit')
      .eq('daily_report_id', reportId)
      .order('created_at'),
    supabase.from('daily_report_equipment_items')
      .select('equipment_name, hours_used')
      .eq('daily_report_id', reportId)
      .order('created_at'),
    supabase.from('photo_attachments')
      .select('file_path, storage_bucket, caption, taken_at')
      .eq('daily_report_id', reportId)
      .order('taken_at'),
  ]);

  // Each of these has a fallback, so a failed read costs detail, not the PDF.
  for (const [label, result] of [
    ['company', company], ['crew', crew], ['materials', materials],
    ['equipment', equipment], ['photos', attachments],
  ] as const) {
    if (result.error) logger.error(`Daily report PDF: could not read ${label}`, result.error);
  }

  // photo_attachments is the record; the legacy array covers any report whose
  // rows were never written.
  const sources: PhotoSource[] = (attachments.data ?? []).length > 0
    ? (attachments.data ?? []).map((p) => ({
        bucket: p.storage_bucket || 'project-documents',
        path: p.file_path,
        caption: p.caption,
        takenAt: p.taken_at,
      }))
    : (report.photos ?? []).map((path: string) => ({
        bucket: 'project-documents', path, caption: null, takenAt: null,
      }));

  const photos: DailyReportPdfPhoto[] = [];
  let photosMissing = Math.max(sources.length - MAX_PDF_PHOTOS, 0);
  for (const source of sources.slice(0, MAX_PDF_PHOTOS)) {
    try {
      const url = await resolveStorageUrl(source.bucket, source.path);
      const image = url ? await imageToJpeg(url) : null;
      if (!image) {
        photosMissing += 1;
        continue;
      }
      photos.push({
        ...image,
        caption: source.caption,
        takenAt: source.takenAt ? formatDate(source.takenAt) : null,
      });
    } catch (photoError) {
      logger.error('Daily report PDF: a photo could not be included', photoError instanceof Error ? photoError : undefined);
      photosMissing += 1;
    }
  }

  return {
    companyName: company.data?.name ?? null,
    projectName: project.name,
    date: report.date,
    weather: report.weather_conditions,
    workPerformed: report.work_performed,
    delays: report.delays_issues,
    safety: report.safety_incidents,
    crew: (crew.data ?? []).map((c) => ({
      name: c.crew_member_name,
      role: c.role,
      hours: Number(c.hours_worked) || 0,
      overtime: Number(c.overtime_hours) || 0,
    })),
    crewCount: report.crew_count,
    materials: (materials.data ?? []).map((m) => ({ name: m.material_name, quantity: m.quantity, unit: m.unit })),
    materialsText: report.materials_delivered,
    equipment: (equipment.data ?? []).map((e) => ({ name: e.equipment_name, hours: e.hours_used })),
    equipmentText: report.equipment_used,
    photos,
    photosMissing,
  };
}

/** Builds and downloads the PDF. Resolves with how many photos made it in. */
export async function downloadDailyReportPdf(reportId: string): Promise<{ photos: number; missing: number }> {
  const data = await loadDailyReportForPdf(reportId);
  buildDailyReportPDF(data).save(dailyReportPdfFileName(data.projectName, data.date));
  return { photos: data.photos.length, missing: data.photosMissing ?? 0 };
}

export function useDailyReportPdf() {
  return useMutation({ mutationFn: downloadDailyReportPdf });
}
