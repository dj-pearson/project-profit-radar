import { z } from 'zod';

/**
 * Document Management "Upload Documents" dialog (US-268). The files stay a
 * FileList, exactly what the input hands over; the upload loop reads it
 * unchanged.
 */
export const documentUploadFormSchema = z.object({
  files: z
    .custom<FileList | null>((v) => v === null || (typeof FileList !== 'undefined' && v instanceof FileList))
    .refine((f) => !!f && f.length > 0, { message: 'Select at least one file' }),
  categoryId: z.string(),
  description: z.string().max(1000, 'Must be 1000 characters or fewer'),
  smartProcessing: z.boolean(),
});
export type DocumentUploadFormValues = z.infer<typeof documentUploadFormSchema>;

export const DOCUMENT_UPLOAD_DEFAULTS: DocumentUploadFormValues = {
  files: null,
  categoryId: '',
  description: '',
  smartProcessing: true,
};
