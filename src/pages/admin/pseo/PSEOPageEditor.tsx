import { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PAGE_TYPE_LABELS, type PSEOPage } from '@/types/pseo';
import {
  AUTHORABLE_PAGE_TYPES,
  PSEO_MIN_UNIQUE_WORDS,
  TAXONOMY,
  buildDraftTemplate,
  buildPageIdentity,
  validatePseoPageDraft,
  type AuthorablePageType,
  type DimensionKey,
  type PseoPageRow,
} from '@/lib/pseo/pageAuthoring';

const DIMENSION_LABELS: Record<DimensionKey, string> = {
  contractor_types: 'Contractor type',
  pain_points: 'Pain point',
  geographies: 'Geography',
  business_sizes: 'Business size',
  competitors: 'Competitor',
};

interface PSEOPageEditorProps {
  existingPages: PSEOPage[];
  /** Persists a validated draft. Resolves true when the save succeeded. */
  onSave: (row: PseoPageRow) => Promise<boolean>;
}

/**
 * The one way content reaches pseo_pages (US-386). A draft is validated in
 * the browser, saved unpublished with status review_needed, and published from
 * the Pages tab, which validates it again.
 */
export function PSEOPageEditor({ existingPages, onSave }: PSEOPageEditorProps) {
  const [pageType, setPageType] = useState<AuthorablePageType>('contractor_pain');
  const [dimensionIds, setDimensionIds] = useState<string[]>([]);
  const [seoTitle, setSeoTitle] = useState('');
  const [seoDescription, setSeoDescription] = useState('');
  const [schemaText, setSchemaText] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const dims = AUTHORABLE_PAGE_TYPES[pageType].dimensions;
  const identity = useMemo(() => buildPageIdentity(pageType, dimensionIds), [pageType, dimensionIds]);
  const existing = identity ? existingPages.find((p) => p.combination_key === identity.combination_key) : undefined;

  const changePageType = (value: string) => {
    setPageType(value as AuthorablePageType);
    setDimensionIds([]);
    setErrors([]);
  };

  const setDimension = (index: number, id: string) => {
    const next = [...dimensionIds];
    next[index] = id;
    setDimensionIds(next);
  };

  const startFromTemplate = () => {
    setSchemaText(JSON.stringify(buildDraftTemplate(pageType, dimensionIds), null, 2));
  };

  const loadExisting = () => {
    if (!existing) return;
    setSeoTitle(existing.seo_title);
    setSeoDescription(existing.seo_description);
    setSchemaText(JSON.stringify(existing.page_schema, null, 2));
  };

  const validate = () => {
    let pageSchema: unknown;
    try {
      pageSchema = schemaText.trim() ? JSON.parse(schemaText) : undefined;
    } catch (e) {
      const result = { ok: false as const, errors: [`page_schema is not valid JSON: ${(e as Error).message}`] };
      setErrors(result.errors);
      setWarnings([]);
      return result;
    }
    const result = validatePseoPageDraft({
      page_type: pageType,
      dimension_ids: dimensionIds.filter(Boolean),
      seo_title: seoTitle,
      seo_description: seoDescription,
      page_schema: pageSchema,
    });
    setErrors(result.ok ? [] : result.errors);
    setWarnings(result.ok ? result.warnings : []);
    return result;
  };

  const save = async () => {
    const result = validate();
    if (!result.ok) return;
    setIsSaving(true);
    try {
      await onSave(result.row);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Write a page</CardTitle>
        <CardDescription>
          Saves an unpublished draft marked Needs Review. Publish it from the Pages tab. Pages with fewer
          than {PSEO_MIN_UNIQUE_WORDS} words of page-specific copy render noindex.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="pseo-page-type">Page type</Label>
            <Select value={pageType} onValueChange={changePageType}>
              <SelectTrigger id="pseo-page-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(AUTHORABLE_PAGE_TYPES) as AuthorablePageType[]).map((t) => (
                  <SelectItem key={t} value={t}>
                    {PAGE_TYPE_LABELS[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {dims.map((dim, i) => (
            <div key={`${pageType}-${dim}`} className="space-y-2">
              <Label htmlFor={`pseo-dim-${i}`}>{DIMENSION_LABELS[dim]}</Label>
              <Select value={dimensionIds[i] ?? ''} onValueChange={(v) => setDimension(i, v)}>
                <SelectTrigger id={`pseo-dim-${i}`}>
                  <SelectValue placeholder="Choose..." />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TAXONOMY[dim]).map(([id, entry]) => (
                    <SelectItem key={id} value={id}>
                      {entry.display_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>

        {identity && (
          <p className="text-sm text-muted-foreground">
            URL: <span className="font-mono">{identity.canonical_url}</span>
            {existing && (
              <>
                {' '}
                (already saved{existing.is_published ? ' and published; saving again unpublishes it for review' : ''}){' '}
                <Button variant="link" className="h-auto p-0" onClick={loadExisting}>
                  Load saved copy
                </Button>
              </>
            )}
          </p>
        )}

        <div className="space-y-2">
          <Label htmlFor="pseo-seo-title">SEO title ({seoTitle.length}/70)</Label>
          <Input id="pseo-seo-title" value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="pseo-seo-description">SEO description ({seoDescription.length}/160)</Label>
          <Textarea
            id="pseo-seo-description"
            rows={2}
            value={seoDescription}
            onChange={(e) => setSeoDescription(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="pseo-page-schema">Page content (JSON)</Label>
            <Button variant="outline" size="sm" onClick={startFromTemplate} disabled={!identity}>
              Start from template
            </Button>
          </div>
          <Textarea
            id="pseo-page-schema"
            rows={18}
            className="font-mono text-xs"
            value={schemaText}
            onChange={(e) => setSchemaText(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Needs a hero and a pain_section or solution_section. related_pages may only point at other pSEO
            URLs, and the live page shows a related link only once its target is published.
          </p>
        </div>

        {errors.length > 0 && (
          <Alert variant="destructive">
            <AlertTitle>Not saved: {errors.length} problem(s)</AlertTitle>
            <AlertDescription>
              <ul className="list-disc pl-4 space-y-1">
                {errors.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}
        {warnings.length > 0 && (
          <Alert>
            <AlertTitle>Valid, with a warning</AlertTitle>
            <AlertDescription>{warnings.join(' ')}</AlertDescription>
          </Alert>
        )}

        <div className="flex gap-2">
          <Button variant="outline" onClick={validate}>
            Check
          </Button>
          <Button onClick={save} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save draft'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
