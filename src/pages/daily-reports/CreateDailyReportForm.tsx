import type { UseFormReturn } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { FormFieldHelp } from '@/components/help/HelpTooltip';
import { SignatureCapture } from '@/components/ui/signature-capture';
import { Camera, Cloud, Copy, LayoutTemplate, Settings2, Upload, X } from 'lucide-react';
import type { DailyReportFormValues } from '@/lib/validations/daily-reports';

interface Option {
  id: string;
  name: string;
}

interface CreateDailyReportFormProps {
  /** Owned by the page so a draft survives closing the dialog, as before. */
  form: UseFormReturn<DailyReportFormValues>;
  onSubmit: (values: DailyReportFormValues) => Promise<void> | void;
  onCancel: () => void;
  projects: Option[];
  templates: Option[];
  templatesError: { message: string } | null | undefined;
  onApplyTemplate: (templateId: string) => void;
  onCreateTemplates: () => void;
  onCopyFromYesterday: () => void;
  copyingPrevious: boolean;
  onAutoFillWeather: () => void;
  selectedPhotos: File[];
  onAddPhotos: (files: File[]) => void;
  onRemovePhoto: (index: number) => void;
}

/** Daily Reports "Create Daily Report" fields (US-268). */
export function CreateDailyReportForm({
  form,
  onSubmit,
  onCancel,
  projects,
  templates,
  templatesError,
  onApplyTemplate,
  onCreateTemplates,
  onCopyFromYesterday,
  copyingPrevious,
  onAutoFillWeather,
  selectedPhotos,
  onAddPhotos,
  onRemovePhoto,
}: CreateDailyReportFormProps) {
  const projectId = form.watch('project_id');

  return (
    <Form {...form}>
      <form className="space-y-4" aria-label="Create daily report form" noValidate onSubmit={form.handleSubmit(onSubmit)}>
        <FormField
          control={form.control}
          name="project_id"
          render={({ field }) => (
            <FormItem className="space-y-0">
              <FormLabel>Project *</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger aria-required="true" onBlur={field.onBlur}>
                    <SelectValue placeholder="Select project" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Quick-fill: template picker + copy from previous (US-074) */}
        <div className="flex flex-col sm:flex-row gap-2 rounded-md border border-dashed p-3">
          <div className="flex-1">
            <Label htmlFor="template-quickfill" className="text-xs flex items-center gap-1">
              <LayoutTemplate className="h-3 w-3" aria-hidden="true" />
              Start from template
            </Label>
            {templatesError ? (
              <p className="text-xs text-destructive" role="alert">
                Templates could not be loaded: {templatesError.message}
              </p>
            ) : templates.length > 0 ? (
              <Select onValueChange={onApplyTemplate}>
                <SelectTrigger id="template-quickfill" aria-label="Apply a daily report template">
                  <SelectValue placeholder="Choose a template..." />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full justify-start"
                onClick={onCreateTemplates}
              >
                <Settings2 className="mr-2 h-4 w-4" aria-hidden="true" />
                Create templates
              </Button>
            )}
          </div>
          <div className="flex items-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onCopyFromYesterday}
              disabled={copyingPrevious || !projectId}
              className="whitespace-nowrap"
            >
              <Copy className="mr-2 h-4 w-4" aria-hidden="true" />
              {copyingPrevious ? 'Copying\u2026' : 'Copy from Yesterday'}
            </Button>
          </div>
        </div>

        <FormField
          control={form.control}
          name="work_performed"
          render={({ field }) => (
            <FormItem className="space-y-0">
              <FormLabel>Work Performed * <FormFieldHelp content="Describe the work completed today. This becomes the official record for the client and your files." /></FormLabel>
              <FormControl>
                <Textarea {...field} placeholder="Describe the work completed today..." aria-required="true" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="crew_count"
            render={({ field }) => (
              <FormItem className="space-y-0">
                <FormLabel>Crew Count <FormFieldHelp content="Number of workers on site today. Used for labor tracking and productivity reports." /></FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min="0"
                    name={field.name}
                    ref={field.ref}
                    onBlur={field.onBlur}
                    value={field.value}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="weather_conditions"
            render={({ field }) => (
              <FormItem className="space-y-0">
                <FormLabel>Weather Conditions <FormFieldHelp content="On-site conditions. Use Auto-fill to pull current weather, or note any weather-related delays." /></FormLabel>
                <div className="flex gap-2">
                  <FormControl>
                    <Input {...field} placeholder={'e.g., Sunny, 75\u00B0F'} className="flex-1" />
                  </FormControl>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="whitespace-nowrap"
                    onClick={onAutoFillWeather}
                    aria-label="Auto-fill weather from current location"
                  >
                    <Cloud className="h-4 w-4 mr-1" aria-hidden="true" />
                    Auto-fill
                  </Button>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="materials_delivered"
          render={({ field }) => (
            <FormItem className="space-y-0">
              <FormLabel>Materials Delivered <FormFieldHelp content="List materials received on site today, with quantities where relevant." /></FormLabel>
              <FormControl>
                <Textarea {...field} placeholder="List materials delivered today..." />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="equipment_used"
          render={({ field }) => (
            <FormItem className="space-y-0">
              <FormLabel>Equipment Used</FormLabel>
              <FormControl>
                <Textarea {...field} placeholder="List equipment used today..." />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="delays_issues"
          render={({ field }) => (
            <FormItem className="space-y-0">
              <FormLabel>Delays & Issues</FormLabel>
              <FormControl>
                <Textarea {...field} placeholder="Any delays or issues encountered..." />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="safety_incidents"
          render={({ field }) => (
            <FormItem className="space-y-0">
              <FormLabel>Safety Incidents</FormLabel>
              <FormControl>
                <Textarea {...field} placeholder="Any safety incidents or concerns..." />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* US-108: Supervisor signature */}
        <FormField
          control={form.control}
          name="signature"
          render={({ field }) => (
            <div>
              <SignatureCapture
                label="Supervisor Signature"
                value={field.value}
                onChange={(dataUrl) => field.onChange(dataUrl ?? '')}
              />
            </div>
          )}
        />

        {/* Photo Upload Section */}
        <fieldset>
          <legend className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Photos</legend>
          <div className="space-y-4 mt-2">
            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6">
              <div className="text-center">
                <Camera className="h-8 w-8 text-muted-foreground mx-auto mb-2" aria-hidden="true" />
                <p className="text-sm text-muted-foreground mb-2" id="photo-upload-hint">
                  Add photos to document progress
                </p>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={(e) => onAddPhotos(Array.from(e.target.files || []))}
                  className="hidden"
                  id="photo-upload"
                  aria-describedby="photo-upload-hint"
                />
                <label htmlFor="photo-upload">
                  <Button variant="outline" size="sm" asChild>
                    <span>
                      <Upload className="h-4 w-4 mr-2" aria-hidden="true" />
                      Select Photos
                    </span>
                  </Button>
                </label>
              </div>
            </div>

            {/* Photo Preview */}
            {selectedPhotos.length > 0 && (
              <div className="grid grid-cols-3 gap-2" role="list" aria-label="Selected photos">
                {selectedPhotos.map((photo, index) => (
                  <div key={index} className="relative" role="listitem">
                    <img
                      src={URL.createObjectURL(photo)}
                      alt={`Selected photo ${index + 1} of ${selectedPhotos.length}`}
                      className="w-full h-20 object-cover rounded border"
                    />
                    <Button
                      variant="destructive"
                      size="sm"
                      className="absolute -top-2 -right-2 h-6 w-6 p-0"
                      onClick={() => onRemovePhoto(index)}
                      aria-label={`Remove photo ${index + 1}`}
                      type="button"
                    >
                      <X className="h-3 w-3" aria-hidden="true" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </fieldset>

        <div className="flex justify-end space-x-2">
          <Button variant="outline" type="button" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={form.formState.isSubmitting} aria-busy={form.formState.isSubmitting}>
            Create Report
          </Button>
        </div>
      </form>
    </Form>
  );
}
