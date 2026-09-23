/**
 * Subcontractor list model (US-405): the shapes stored in public.subcontractors
 * and public.subcontractor_insurance_certificates
 * (supabase/migrations/20260924110000_subcontractors.sql), the form schemas,
 * and the pure rules the page applies to them.
 *
 * Kept free of React and of the Supabase client so the rules - above all which
 * certificate status a vendor shows - are testable on their own.
 */
import { z } from 'zod';
import { sanitizeFilename } from '@/lib/security/fileUploadValidation';

export const SUBCONTRACTOR_DOCUMENTS_BUCKET = 'subcontractor-documents';

export const TRADE_TYPES = [
  'Electrical',
  'Plumbing',
  'HVAC',
  'Concrete',
  'Framing',
  'Roofing',
  'Painting',
  'Drywall',
  'Flooring',
  'Landscaping',
  'Excavation',
  'Masonry',
  'Steel',
  'Fire Protection',
  'Insulation',
  'General Labor',
] as const;

export const COVERAGE_TYPES = [
  'General Liability',
  'Workers Compensation',
  'Commercial Auto',
  'Umbrella / Excess',
  'Professional Liability',
  'Other',
] as const;

/**
 * The prequalification checklist. `key` is what is stored in the
 * subcontractors.prequalification jsonb object, so it is a contract: renaming
 * one strands every saved tick for that item. Labels can change freely.
 */
export const SUBCONTRACTOR_PREQUALIFICATION = [
  { key: 'business_license', label: 'Valid business license on file' },
  { key: 'general_liability', label: 'General liability insurance verified' },
  { key: 'workers_comp', label: 'Workers compensation insurance verified' },
  { key: 'safety_program', label: 'Safety program documentation reviewed' },
  { key: 'osha_record', label: 'OSHA compliance record reviewed' },
  { key: 'references', label: 'References checked (minimum 3)' },
  { key: 'emr_acceptable', label: 'EMR (Experience Modification Rate) acceptable' },
  { key: 'bonding_capacity', label: 'Bonding capacity verified' },
] as const;

export type PrequalificationKey = (typeof SUBCONTRACTOR_PREQUALIFICATION)[number]['key'];
export type PrequalificationState = Partial<Record<PrequalificationKey, boolean>>;

/** Only the known keys, only real booleans; anything else in the jsonb is ignored. */
export function readPrequalification(value: unknown): PrequalificationState {
  const out: PrequalificationState = {};
  if (!value || typeof value !== 'object' || Array.isArray(value)) return out;
  const raw = value as Record<string, unknown>;
  for (const { key } of SUBCONTRACTOR_PREQUALIFICATION) {
    if (raw[key] === true) out[key] = true;
  }
  return out;
}

export function togglePrequalification(
  state: PrequalificationState,
  key: PrequalificationKey,
): PrequalificationState {
  return { ...state, [key]: !state[key] };
}

export function countPrequalified(state: PrequalificationState): number {
  return SUBCONTRACTOR_PREQUALIFICATION.filter(({ key }) => state[key]).length;
}

// --- Rows ---------------------------------------------------------------

export interface SubcontractorRow {
  id: string;
  company_id: string;
  name: string;
  trade: string;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  license_number: string | null;
  rating: number;
  notes: string | null;
  prequalification: unknown;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CertificateRow {
  id: string;
  company_id: string;
  subcontractor_id: string;
  coverage_type: string;
  file_path: string;
  file_name: string | null;
  expires_on: string;
  created_at: string;
}

export interface InsuranceCertificate {
  id: string;
  coverageType: string;
  filePath: string;
  fileName: string;
  expiresOn: string;
}

export interface Subcontractor {
  id: string;
  name: string;
  trade: string;
  contactName: string;
  phone: string;
  email: string;
  licenseNumber: string;
  rating: number;
  notes: string;
  prequalification: PrequalificationState;
  insuranceCertificates: InsuranceCertificate[];
  createdAt: string;
}

export function toSubcontractor(row: SubcontractorRow, certs: CertificateRow[]): Subcontractor {
  return {
    id: row.id,
    name: row.name,
    trade: row.trade,
    contactName: row.contact_name ?? '',
    phone: row.phone ?? '',
    email: row.email ?? '',
    licenseNumber: row.license_number ?? '',
    rating: Math.max(0, Math.min(5, Number(row.rating) || 0)),
    notes: row.notes ?? '',
    prequalification: readPrequalification(row.prequalification),
    insuranceCertificates: certs
      .filter((c) => c.subcontractor_id === row.id)
      .map((c) => ({
        id: c.id,
        coverageType: c.coverage_type,
        filePath: c.file_path,
        fileName: c.file_name ?? '',
        expiresOn: c.expires_on,
      }))
      .sort((a, b) => a.expiresOn.localeCompare(b.expiresOn)),
    createdAt: row.created_at,
  };
}

// --- Forms --------------------------------------------------------------

// Blank is allowed; it is stored as NULL by toSubcontractorColumns.
const optionalText = (max: number) => z.string().trim().max(max, `Keep this under ${max} characters`);

export const subcontractorFormSchema = z.object({
  name: z.string().trim().min(1, 'Company name is required').max(200, 'Keep this under 200 characters'),
  trade: z.string().trim().min(1, 'Trade type is required').max(100),
  contactName: z.string().trim().min(1, 'Contact name is required').max(200),
  phone: z.string().trim().min(1, 'Phone number is required').max(50),
  email: z.string().trim().min(1, 'Email is required').email('Invalid email address').max(320),
  licenseNumber: optionalText(100),
  notes: optionalText(4000),
});

export type SubcontractorFormValues = z.infer<typeof subcontractorFormSchema>;

export const EMPTY_SUBCONTRACTOR_FORM: SubcontractorFormValues = {
  name: '',
  trade: '',
  contactName: '',
  phone: '',
  email: '',
  licenseNumber: '',
  notes: '',
};

export function formValuesFrom(sub: Subcontractor): SubcontractorFormValues {
  return {
    name: sub.name,
    trade: sub.trade,
    contactName: sub.contactName,
    phone: sub.phone,
    email: sub.email,
    licenseNumber: sub.licenseNumber,
    notes: sub.notes,
  };
}

/** Form values to the editable columns. Empty optional text is stored as NULL. */
export function toSubcontractorColumns(values: SubcontractorFormValues) {
  const v = subcontractorFormSchema.parse(values);
  return {
    name: v.name,
    trade: v.trade,
    contact_name: v.contactName,
    phone: v.phone,
    email: v.email,
    license_number: v.licenseNumber || null,
    notes: v.notes || null,
  };
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export const certificateFormSchema = z.object({
  coverageType: z.string().trim().min(1, 'Coverage type is required').max(100),
  expiresOn: z
    .string()
    .regex(ISO_DATE, 'Expiry date is required')
    .refine((s) => !Number.isNaN(parseLocalDate(s).getTime()), 'Invalid date'),
});

export type CertificateFormValues = z.infer<typeof certificateFormSchema>;

/** Certificates are PDFs or photos of the paper copy. */
export const CERTIFICATE_FILE_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];
export const CERTIFICATE_MAX_BYTES = 10 * 1024 * 1024;

/**
 * <company_id>/<subcontractor_id>/<uuid>-<name>. The first segment is what the
 * storage policies check, so it must be the caller's company.
 */
export function certificateStoragePath(
  companyId: string,
  subcontractorId: string,
  fileName: string,
  id: string = crypto.randomUUID(),
): string {
  const safe = sanitizeFilename(fileName).replace(/\s+/g, '_') || 'certificate';
  return `${companyId}/${subcontractorId}/${id}-${safe}`;
}

// --- Insurance status ---------------------------------------------------

export type InsuranceStatus = 'valid' | 'expiring' | 'expired' | 'none';
export const EXPIRING_WITHIN_DAYS = 30;

/** 'YYYY-MM-DD' as a local calendar date, not UTC midnight (which is the day before in the Americas). */
export function parseLocalDate(isoDate: string): Date {
  const [y, m, d] = isoDate.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

/** Whole days until the date; 0 on the expiry day itself, negative once past. */
export function daysUntil(isoDate: string, now: Date = new Date()): number {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((parseLocalDate(isoDate).getTime() - today.getTime()) / 86_400_000);
}

export function certificateStatus(expiresOn: string, now: Date = new Date()): Exclude<InsuranceStatus, 'none'> {
  const days = daysUntil(expiresOn, now);
  if (days < 0) return 'expired';
  if (days <= EXPIRING_WITHIN_DAYS) return 'expiring';
  return 'valid';
}

/**
 * One status per vendor. For each coverage type only the latest certificate
 * counts - last year's expired GL cert does not make a vendor with this year's
 * GL cert "expired" - and the vendor shows the worst of those.
 */
export function getInsuranceStatus(
  certificates: Pick<InsuranceCertificate, 'coverageType' | 'expiresOn'>[],
  now: Date = new Date(),
): InsuranceStatus {
  if (certificates.length === 0) return 'none';
  const latest = new Map<string, string>();
  for (const c of certificates) {
    const key = c.coverageType.trim().toLowerCase();
    const prev = latest.get(key);
    if (!prev || c.expiresOn > prev) latest.set(key, c.expiresOn);
  }
  const statuses = [...latest.values()].map((d) => certificateStatus(d, now));
  if (statuses.includes('expired')) return 'expired';
  if (statuses.includes('expiring')) return 'expiring';
  return 'valid';
}

// --- Errors -------------------------------------------------------------

/**
 * True when the table itself is missing - the migration has not been applied
 * to this database yet. PostgREST answers PGRST205 ("Could not find the table
 * ... in the schema cache"); Postgres itself says 42P01.
 */
export function isMissingTableError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const { code, message } = error as { code?: unknown; message?: unknown };
  if (code === 'PGRST205' || code === '42P01') return true;
  return typeof message === 'string' && /schema cache|relation .* does not exist/i.test(message);
}
