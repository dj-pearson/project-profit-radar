import React, { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { AccessiblePageWrapper } from '@/components/accessibility/AccessiblePageWrapper';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Plus,
  Search,
  Star,
  Phone,
  Mail,
  Shield,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Upload,
  HardHat,
  FileText,
  User,
  Pencil,
  Trash2,
  ExternalLink,
  X,
} from 'lucide-react';
import { SubcontractorFormDialog } from '@/components/subcontractors/SubcontractorFormDialog';
import { CertificateUploadDialog } from '@/components/subcontractors/CertificateUploadDialog';
import { useSubcontractors } from '@/hooks/useSubcontractors';
import { openStorageObject } from '@/lib/storage/signedUrl';
import {
  SUBCONTRACTOR_DOCUMENTS_BUCKET,
  SUBCONTRACTOR_PREQUALIFICATION,
  TRADE_TYPES,
  certificateStatus,
  countPrequalified,
  daysUntil,
  formValuesFrom,
  getInsuranceStatus,
  parseLocalDate,
  togglePrequalification,
  type InsuranceCertificate,
  type InsuranceStatus,
  type PrequalificationKey,
  type Subcontractor,
  type SubcontractorFormValues,
} from '@/lib/subcontractors';

// --- Helpers ---

function getInsuranceBadge(status: InsuranceStatus) {
  switch (status) {
    case 'valid':
      return (
        <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 gap-1" aria-label="Insurance status: Valid">
          <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
          Valid
        </Badge>
      );
    case 'expiring':
      return (
        <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 gap-1" aria-label="Insurance status: Expiring soon">
          <AlertTriangle className="h-3 w-3" aria-hidden="true" />
          Expiring Soon
        </Badge>
      );
    case 'expired':
      return (
        <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 gap-1" aria-label="Insurance status: Expired">
          <XCircle className="h-3 w-3" aria-hidden="true" />
          Expired
        </Badge>
      );
    case 'none':
      return (
        <Badge variant="outline" className="gap-1" aria-label="Insurance status: No certificate on file">
          <FileText className="h-3 w-3" aria-hidden="true" />
          No certificate
        </Badge>
      );
    default:
      return null;
  }
}

function formatDate(isoDate: string): string {
  return parseLocalDate(isoDate).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'Something went wrong. Try again.';
}

// --- Star Rating Component ---

interface StarRatingProps {
  rating: number;
  onChange?: (rating: number) => void;
  readonly?: boolean;
  subcontractorName?: string;
}

const StarRating: React.FC<StarRatingProps> = ({ rating, onChange, readonly = false, subcontractorName }) => {
  const [hoverRating, setHoverRating] = useState(0);
  const displayRating = hoverRating || rating;

  return (
    <div
      className="flex items-center gap-0.5"
      role="group"
      aria-label={readonly ? `Rating: ${rating} out of 5 stars` : `Set rating for ${subcontractorName || 'subcontractor'}`}
    >
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          className={`p-0.5 transition-colors ${readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110'} focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 rounded`}
          // Clicking the current rating clears it back to unrated.
          onClick={() => onChange?.(star === rating ? 0 : star)}
          onMouseEnter={() => !readonly && setHoverRating(star)}
          onMouseLeave={() => !readonly && setHoverRating(0)}
          aria-label={`${star} star${star !== 1 ? 's' : ''}`}
          aria-pressed={star <= rating}
          tabIndex={readonly ? -1 : 0}
        >
          <Star
            className={`h-4 w-4 ${
              star <= displayRating
                ? 'fill-yellow-400 text-yellow-400'
                : 'text-gray-300 dark:text-gray-600'
            }`}
            aria-hidden="true"
          />
        </button>
      ))}
    </div>
  );
};

// --- Main Component ---

const Subcontractors: React.FC = () => {
  const {
    subcontractors,
    available,
    isLoading,
    error,
    refetch,
    hasCompany,
    canManage,
    create,
    update,
    remove,
    addCertificate,
    removeCertificate,
  } = useSubcontractors();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Subcontractor | null>(null);
  const [deleting, setDeleting] = useState<Subcontractor | null>(null);
  const [uploadFor, setUploadFor] = useState<Subcontractor | null>(null);
  const [removingCert, setRemovingCert] = useState<{ sub: Subcontractor; cert: InsuranceCertificate } | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [tradeFilter, setTradeFilter] = useState<string>('all');
  const [ratingFilter, setRatingFilter] = useState<string>('all');
  const [insuranceFilter, setInsuranceFilter] = useState<string>('all');

  const editingValues = useMemo(() => (editing ? formValuesFrom(editing) : undefined), [editing]);

  // --- Filtering ---

  const filteredSubcontractors = useMemo(() => {
    return subcontractors.filter((sub) => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesSearch =
          sub.name.toLowerCase().includes(q) ||
          sub.trade.toLowerCase().includes(q) ||
          sub.contactName.toLowerCase().includes(q) ||
          sub.email.toLowerCase().includes(q) ||
          sub.licenseNumber.toLowerCase().includes(q);
        if (!matchesSearch) return false;
      }
      if (tradeFilter !== 'all' && sub.trade !== tradeFilter) return false;
      if (ratingFilter !== 'all' && sub.rating < parseInt(ratingFilter, 10)) return false;
      if (insuranceFilter !== 'all' && getInsuranceStatus(sub.insuranceCertificates) !== insuranceFilter) {
        return false;
      }
      return true;
    });
  }, [subcontractors, searchQuery, tradeFilter, ratingFilter, insuranceFilter]);

  // --- Handlers ---

  function openAdd() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(sub: Subcontractor) {
    setEditing(sub);
    setFormOpen(true);
  }

  async function handleSave(values: SubcontractorFormValues) {
    try {
      if (editing) {
        await update.mutateAsync({ id: editing.id, patch: { kind: 'details', values } });
        toast.success(`${values.name} updated`);
      } else {
        await create.mutateAsync(values);
        toast.success(`${values.name} added to your subcontractors`);
      }
    } catch (err) {
      toast.error(editing ? 'Could not save changes' : 'Could not add subcontractor', {
        description: errorMessage(err),
      });
      throw err;
    }
  }

  function handleRatingChange(sub: Subcontractor, rating: number) {
    update.mutate(
      { id: sub.id, patch: { kind: 'rating', rating } },
      { onError: (err) => toast.error(`Rating for ${sub.name} was not saved`, { description: errorMessage(err) }) },
    );
  }

  function handlePrequalToggle(sub: Subcontractor, key: PrequalificationKey) {
    update.mutate(
      { id: sub.id, patch: { kind: 'prequalification', prequalification: togglePrequalification(sub.prequalification, key) } },
      { onError: (err) => toast.error(`Checklist for ${sub.name} was not saved`, { description: errorMessage(err) }) },
    );
  }

  async function handleDelete() {
    if (!deleting) return;
    try {
      await remove.mutateAsync(deleting);
      toast.success(`${deleting.name} deleted`);
    } catch (err) {
      toast.error(`Could not delete ${deleting.name}`, { description: errorMessage(err) });
    }
  }

  async function handleUpload(file: File, values: { coverageType: string; expiresOn: string }) {
    if (!uploadFor) return;
    try {
      await addCertificate.mutateAsync({ subcontractorId: uploadFor.id, file, values });
      toast.success(`${values.coverageType} certificate saved for ${uploadFor.name}`);
    } catch (err) {
      toast.error('Certificate was not uploaded', { description: errorMessage(err) });
      throw err;
    }
  }

  async function handleRemoveCertificate() {
    if (!removingCert) return;
    try {
      await removeCertificate.mutateAsync(removingCert.cert);
      toast.success(`${removingCert.cert.coverageType} certificate removed`);
    } catch (err) {
      toast.error('Could not remove certificate', { description: errorMessage(err) });
    }
  }

  async function handleViewCertificate(cert: InsuranceCertificate) {
    const opened = await openStorageObject(SUBCONTRACTOR_DOCUMENTS_BUCKET, cert.filePath);
    if (!opened) toast.error('Could not open that certificate file');
  }

  // --- Render ---

  const activeFilterCount = [
    tradeFilter !== 'all',
    ratingFilter !== 'all',
    insuranceFilter !== 'all',
  ].filter(Boolean).length;

  const ready = !isLoading && !error && available && hasCompany;

  return (
    <DashboardLayout hasAccessibleWrapper>
      <AccessiblePageWrapper
        pageTitle="Subcontractor Management"
        mainLabel="Subcontractor management content"
      >
        <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
          {/* Page Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Subcontractors</h1>
              <p className="text-muted-foreground mt-1">
                Manage subcontractors, track prequalification status, and monitor insurance compliance.
              </p>
            </div>
            {ready && canManage && (
              <Button className="gap-2" onClick={openAdd} aria-label="Add a new subcontractor">
                <Plus className="h-4 w-4" aria-hidden="true" />
                Add Subcontractor
              </Button>
            )}
          </div>

          {/* The tables exist in a migration this database has not had applied. */}
          {!isLoading && !available && (
            <div className="rounded-lg border border-amber-500/40 bg-amber-50 dark:bg-amber-950/30 p-4" role="status">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" aria-hidden="true" />
                <div className="space-y-1">
                  <p className="font-medium text-amber-900 dark:text-amber-100">
                    Subcontractor records are not available on this server yet
                  </p>
                  <p className="text-sm text-amber-800 dark:text-amber-200">
                    The subcontractor tables have not been set up in this database, so nothing can
                    be saved here. Keep your subcontractor list where it is today.
                  </p>
                </div>
              </div>
            </div>
          )}

          {!isLoading && !hasCompany && (
            <Card>
              <CardContent className="py-10 text-center text-muted-foreground">
                Your account is not linked to a company, so there is no subcontractor list to show.
              </CardContent>
            </Card>
          )}

          {error && (
            <Card role="alert">
              <CardContent className="py-10 flex flex-col items-center gap-3 text-center">
                <XCircle className="h-8 w-8 text-destructive" aria-hidden="true" />
                <p className="font-medium">Could not load your subcontractors</p>
                <p className="text-sm text-muted-foreground max-w-md">{error.message}</p>
                <Button variant="outline" onClick={() => refetch()}>
                  Try again
                </Button>
              </CardContent>
            </Card>
          )}

          {ready && !canManage && (
            <p className="text-sm text-muted-foreground" role="status">
              You can view this list. Adding, editing and rating subcontractors is limited to office roles.
            </p>
          )}

          {/* Filter Bar */}
          {ready && (
            <div
              className="flex flex-col sm:flex-row gap-3 p-4 bg-muted/50 rounded-lg border"
              role="search"
              aria-label="Filter subcontractors"
            >
              <div className="flex-1 min-w-0">
                <Label htmlFor="sub-search" className="sr-only">Search subcontractors</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  <Input
                    id="sub-search"
                    placeholder="Search by name, trade, contact, or license..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                    aria-label="Search subcontractors"
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <div>
                  <Label htmlFor="filter-trade" className="sr-only">Filter by trade</Label>
                  <Select value={tradeFilter} onValueChange={setTradeFilter}>
                    <SelectTrigger id="filter-trade" className="w-[160px]" aria-label="Filter by trade type">
                      <SelectValue placeholder="All Trades" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Trades</SelectItem>
                      {TRADE_TYPES.map((trade) => (
                        <SelectItem key={trade} value={trade}>
                          {trade}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="filter-rating" className="sr-only">Filter by minimum rating</Label>
                  <Select value={ratingFilter} onValueChange={setRatingFilter}>
                    <SelectTrigger id="filter-rating" className="w-[160px]" aria-label="Filter by minimum rating">
                      <SelectValue placeholder="Any Rating" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Any Rating</SelectItem>
                      <SelectItem value="5">5 Stars</SelectItem>
                      <SelectItem value="4">4+ Stars</SelectItem>
                      <SelectItem value="3">3+ Stars</SelectItem>
                      <SelectItem value="2">2+ Stars</SelectItem>
                      <SelectItem value="1">1+ Stars</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="filter-insurance" className="sr-only">Filter by insurance status</Label>
                  <Select value={insuranceFilter} onValueChange={setInsuranceFilter}>
                    <SelectTrigger id="filter-insurance" className="w-[170px]" aria-label="Filter by insurance status">
                      <SelectValue placeholder="All Insurance" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Insurance</SelectItem>
                      <SelectItem value="valid">Valid</SelectItem>
                      <SelectItem value="expiring">Expiring Soon</SelectItem>
                      <SelectItem value="expired">Expired</SelectItem>
                      <SelectItem value="none">No certificate</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {/* Active filter count */}
          {ready && (activeFilterCount > 0 || searchQuery) && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>
                Showing {filteredSubcontractors.length} of {subcontractors.length} subcontractor{subcontractors.length !== 1 ? 's' : ''}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchQuery('');
                  setTradeFilter('all');
                  setRatingFilter('all');
                  setInsuranceFilter('all');
                }}
                aria-label="Clear all filters"
              >
                Clear filters
              </Button>
            </div>
          )}

          {/* Loading State */}
          {isLoading && (
            <div
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
              aria-label="Loading subcontractors"
              role="status"
            >
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-1/2 mt-2" />
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-4 w-5/6" />
                    <Skeleton className="h-20 w-full" />
                  </CardContent>
                </Card>
              ))}
              <span className="sr-only">Loading subcontractor data...</span>
            </div>
          )}

          {/* Empty State */}
          {ready && filteredSubcontractors.length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <HardHat className="h-12 w-12 text-muted-foreground mb-4" aria-hidden="true" />
                <h2 className="text-lg font-semibold mb-2">
                  {subcontractors.length === 0
                    ? 'No subcontractors yet'
                    : 'No subcontractors match your filters'}
                </h2>
                <p className="text-muted-foreground mb-4 max-w-md">
                  {subcontractors.length === 0
                    ? 'Add the vendors you work with to track their prequalification and insurance certificates.'
                    : 'Try adjusting your search or filter criteria to find what you are looking for.'}
                </p>
                {subcontractors.length === 0 && canManage && (
                  <Button onClick={openAdd} className="gap-2" aria-label="Add your first subcontractor">
                    <Plus className="h-4 w-4" aria-hidden="true" />
                    Add Subcontractor
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {/* Subcontractor Cards Grid */}
          {ready && filteredSubcontractors.length > 0 && (
            <div
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
              role="list"
              aria-label="Subcontractors list"
            >
              {filteredSubcontractors.map((sub) => {
                const insuranceStatus = getInsuranceStatus(sub.insuranceCertificates);
                const completedPrequal = countPrequalified(sub.prequalification);
                const totalPrequal = SUBCONTRACTOR_PREQUALIFICATION.length;

                return (
                  <Card
                    key={sub.id}
                    role="listitem"
                    aria-label={`${sub.name} - ${sub.trade}`}
                    className="flex flex-col"
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <CardTitle className="text-lg truncate" id={`sub-title-${sub.id}`}>
                            {sub.name}
                          </CardTitle>
                          <div className="flex flex-wrap items-center gap-2 mt-1">
                            <Badge variant="secondary" className="gap-1">
                              <HardHat className="h-3 w-3" aria-hidden="true" />
                              {sub.trade}
                            </Badge>
                            {getInsuranceBadge(insuranceStatus)}
                          </div>
                        </div>
                        {canManage && (
                          <div className="flex shrink-0 gap-1">
                            <Button variant="ghost" size="icon" onClick={() => openEdit(sub)} aria-label={`Edit ${sub.name}`}>
                              <Pencil className="h-4 w-4" aria-hidden="true" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => setDeleting(sub)} aria-label={`Delete ${sub.name}`}>
                              <Trash2 className="h-4 w-4" aria-hidden="true" />
                            </Button>
                          </div>
                        )}
                      </div>
                      <div className="mt-2">
                        <StarRating
                          rating={sub.rating}
                          readonly={!canManage}
                          onChange={(r) => handleRatingChange(sub, r)}
                          subcontractorName={sub.name}
                        />
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-4 flex-1">
                      {/* Contact Info */}
                      <div className="space-y-1.5 text-sm">
                        {sub.contactName && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <User className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
                            <span>{sub.contactName}</span>
                          </div>
                        )}
                        {sub.phone && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Phone className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
                            <a
                              href={`tel:${sub.phone}`}
                              className="hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
                              aria-label={`Call ${sub.name} at ${sub.phone}`}
                            >
                              {sub.phone}
                            </a>
                          </div>
                        )}
                        {sub.email && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Mail className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
                            <a
                              href={`mailto:${sub.email}`}
                              className="hover:underline truncate focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
                              aria-label={`Email ${sub.name} at ${sub.email}`}
                            >
                              {sub.email}
                            </a>
                          </div>
                        )}
                        {sub.licenseNumber && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <FileText className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
                            <span>License: {sub.licenseNumber}</span>
                          </div>
                        )}
                      </div>

                      {/* Prequalification Checklist */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-sm font-medium flex items-center gap-1.5">
                            <Shield className="h-3.5 w-3.5" aria-hidden="true" />
                            Prequalification
                          </h3>
                          <span className="text-xs text-muted-foreground">
                            {completedPrequal}/{totalPrequal}
                          </span>
                        </div>
                        <fieldset aria-label={`Prequalification checklist for ${sub.name}`} disabled={!canManage}>
                          <legend className="sr-only">Prequalification items for {sub.name}</legend>
                          <ul className="space-y-1.5">
                            {SUBCONTRACTOR_PREQUALIFICATION.map((pq) => {
                              const checked = !!sub.prequalification[pq.key];
                              return (
                                <li key={pq.key} className="flex items-start gap-2">
                                  <Checkbox
                                    id={`${sub.id}-${pq.key}`}
                                    checked={checked}
                                    disabled={!canManage}
                                    onCheckedChange={() => handlePrequalToggle(sub, pq.key)}
                                    aria-label={pq.label}
                                    className="mt-0.5"
                                  />
                                  <label
                                    htmlFor={`${sub.id}-${pq.key}`}
                                    className={`text-xs leading-tight ${canManage ? 'cursor-pointer' : ''} ${
                                      checked ? 'text-muted-foreground line-through' : ''
                                    }`}
                                  >
                                    {pq.label}
                                  </label>
                                </li>
                              );
                            })}
                          </ul>
                        </fieldset>
                      </div>

                      {/* Insurance Certificates */}
                      <div>
                        <h3 className="text-sm font-medium flex items-center gap-1.5 mb-2">
                          <Shield className="h-3.5 w-3.5" aria-hidden="true" />
                          Insurance Certificates
                        </h3>
                        {sub.insuranceCertificates.length === 0 ? (
                          <p className="text-xs text-muted-foreground italic">
                            No certificates on file
                          </p>
                        ) : (
                          <ul className="space-y-2" aria-label={`Insurance certificates for ${sub.name}`}>
                            {sub.insuranceCertificates.map((cert) => {
                              const status = certificateStatus(cert.expiresOn);
                              const days = daysUntil(cert.expiresOn);

                              return (
                                <li
                                  key={cert.id}
                                  className={`text-xs p-2 rounded border ${
                                    status === 'expired'
                                      ? 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950'
                                      : status === 'expiring'
                                        ? 'border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950'
                                        : 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950'
                                  }`}
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="font-medium">{cert.coverageType}</span>
                                    {status === 'expired' && (
                                      <span className="text-red-600 dark:text-red-400 font-medium">Expired</span>
                                    )}
                                    {status === 'expiring' && (
                                      <span className="text-yellow-700 dark:text-yellow-400 font-medium">
                                        {days === 0 ? 'Expires today' : `${days} day${days !== 1 ? 's' : ''} left`}
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center justify-between gap-2 mt-0.5">
                                    <span className="text-muted-foreground">
                                      Expires: {formatDate(cert.expiresOn)}
                                    </span>
                                    <span className="flex gap-1">
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6"
                                        onClick={() => handleViewCertificate(cert)}
                                        aria-label={`Open ${cert.coverageType} certificate for ${sub.name}`}
                                      >
                                        <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                                      </Button>
                                      {canManage && (
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-6 w-6"
                                          onClick={() => setRemovingCert({ sub, cert })}
                                          aria-label={`Remove ${cert.coverageType} certificate for ${sub.name}`}
                                        >
                                          <X className="h-3.5 w-3.5" aria-hidden="true" />
                                        </Button>
                                      )}
                                    </span>
                                  </div>
                                </li>
                              );
                            })}
                          </ul>
                        )}
                        {canManage && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full mt-2 gap-1.5"
                            onClick={() => setUploadFor(sub)}
                            aria-label={`Upload insurance certificate for ${sub.name}`}
                          >
                            <Upload className="h-3.5 w-3.5" aria-hidden="true" />
                            Upload Certificate
                          </Button>
                        )}
                      </div>

                      {/* Notes */}
                      {sub.notes && (
                        <div>
                          <h3 className="text-sm font-medium mb-1">Notes</h3>
                          <p className="text-xs text-muted-foreground whitespace-pre-line">{sub.notes}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        <SubcontractorFormDialog
          open={formOpen}
          onOpenChange={(open) => {
            setFormOpen(open);
            if (!open) setEditing(null);
          }}
          initialValues={editingValues}
          saving={create.isPending || (!!editing && update.isPending)}
          onSubmit={handleSave}
        />

        <CertificateUploadDialog
          open={!!uploadFor}
          onOpenChange={(open) => !open && setUploadFor(null)}
          subcontractorName={uploadFor?.name ?? ''}
          saving={addCertificate.isPending}
          onSubmit={handleUpload}
        />

        <ConfirmDialog
          open={!!deleting}
          onOpenChange={(open) => !open && setDeleting(null)}
          title={`Delete ${deleting?.name ?? 'subcontractor'}?`}
          description="This removes the subcontractor, their prequalification checklist and every insurance certificate on file for them. It cannot be undone."
          destructive
          onConfirm={handleDelete}
        />

        <ConfirmDialog
          open={!!removingCert}
          onOpenChange={(open) => !open && setRemovingCert(null)}
          title={`Remove ${removingCert?.cert.coverageType ?? ''} certificate?`}
          description={`The file is deleted from ${removingCert?.sub.name ?? 'this subcontractor'}'s record. It cannot be undone.`}
          confirmLabel="Remove"
          destructive
          onConfirm={handleRemoveCertificate}
        />
      </AccessiblePageWrapper>
    </DashboardLayout>
  );
};

export default Subcontractors;
