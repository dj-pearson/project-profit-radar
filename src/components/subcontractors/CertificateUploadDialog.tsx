import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  CERTIFICATE_FILE_TYPES,
  COVERAGE_TYPES,
  certificateFormSchema,
  type CertificateFormValues,
} from '@/lib/subcontractors';
import { validateCertificateFile } from '@/hooks/useSubcontractors';

interface CertificateUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subcontractorName: string;
  saving: boolean;
  /** Resolves once the file is stored and the row written; rejects to keep the dialog open. */
  onSubmit: (file: File, values: CertificateFormValues) => Promise<void>;
}

const EMPTY: CertificateFormValues = { coverageType: '', expiresOn: '' };

export const CertificateUploadDialog: React.FC<CertificateUploadDialogProps> = ({
  open,
  onOpenChange,
  subcontractorName,
  saving,
  onSubmit,
}) => {
  const form = useForm<CertificateFormValues>({
    resolver: zodResolver(certificateFormSchema),
    defaultValues: EMPTY,
  });
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      form.reset(EMPTY);
      setFile(null);
      setFileError(null);
    }
  }, [open, form]);

  const submit = form.handleSubmit(async (values) => {
    if (!file) {
      setFileError('Choose the certificate file');
      return;
    }
    const problem = validateCertificateFile(file);
    if (problem) {
      setFileError(problem);
      return;
    }
    try {
      await onSubmit(file, values);
      onOpenChange(false);
    } catch {
      // The caller has already told the user why.
    }
  });

  return (
    <Dialog open={open} onOpenChange={(next) => !saving && onOpenChange(next)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Upload insurance certificate</DialogTitle>
          <DialogDescription>
            For {subcontractorName}. The expiry date sets whether this vendor shows as valid,
            expiring or expired.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={submit} className="space-y-4" noValidate>
            <div className="space-y-2">
              <Label htmlFor="certificate-file">
                Certificate file <span aria-hidden="true" className="text-destructive">*</span>
              </Label>
              <Input
                id="certificate-file"
                type="file"
                accept={CERTIFICATE_FILE_TYPES.join(',')}
                aria-required="true"
                aria-invalid={!!fileError}
                aria-describedby={fileError ? 'certificate-file-error' : 'certificate-file-hint'}
                onChange={(e) => {
                  setFile(e.target.files?.[0] ?? null);
                  setFileError(null);
                }}
              />
              {fileError ? (
                <p id="certificate-file-error" className="text-sm font-medium text-destructive" role="alert">
                  {fileError}
                </p>
              ) : (
                <p id="certificate-file-hint" className="text-sm text-muted-foreground">
                  PDF, JPG or PNG, up to 10MB.
                </p>
              )}
            </div>
            <FormField
              control={form.control}
              name="coverageType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Coverage</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger aria-required="true">
                        <SelectValue placeholder="Select coverage" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {COVERAGE_TYPES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="expiresOn"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Expires on</FormLabel>
                  <FormControl>
                    <Input type="date" aria-required="true" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" disabled={saving} onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Uploading...' : 'Upload'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
