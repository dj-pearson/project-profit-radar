import React, { useState, useMemo } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { AccessiblePageWrapper } from '@/components/accessibility/AccessiblePageWrapper';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
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
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// --- Types ---

interface PrequalificationItem {
  id: string;
  label: string;
  checked: boolean;
}

interface InsuranceCertificate {
  id: string;
  type: string;
  fileName: string;
  expirationDate: string;
}

interface Subcontractor {
  id: string;
  name: string;
  trade: string;
  contactName: string;
  phone: string;
  email: string;
  licenseNumber: string;
  rating: number;
  notes: string;
  prequalification: PrequalificationItem[];
  insuranceCertificates: InsuranceCertificate[];
  createdAt: string;
}

type InsuranceStatus = 'valid' | 'expiring' | 'expired' | 'all';

// --- Constants ---

const TRADE_TYPES = [
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

const DEFAULT_PREQUALIFICATION: Omit<PrequalificationItem, 'id'>[] = [
  { label: 'Valid business license on file', checked: false },
  { label: 'General liability insurance verified', checked: false },
  { label: 'Workers compensation insurance verified', checked: false },
  { label: 'Safety program documentation reviewed', checked: false },
  { label: 'OSHA compliance record reviewed', checked: false },
  { label: 'References checked (minimum 3)', checked: false },
  { label: 'EMR (Experience Modification Rate) acceptable', checked: false },
  { label: 'Bonding capacity verified', checked: false },
];

function createDefaultPrequalification(): PrequalificationItem[] {
  return DEFAULT_PREQUALIFICATION.map((item, index) => ({
    ...item,
    id: `pq-${Date.now()}-${index}`,
  }));
}

// --- Demo Data ---

function generateDemoData(): Subcontractor[] {
  const now = new Date();
  return [
    {
      id: 'sub-1',
      name: 'Apex Electrical Services',
      trade: 'Electrical',
      contactName: 'Mike Johnson',
      phone: '(555) 123-4567',
      email: 'mike@apexelectrical.com',
      licenseNumber: 'EL-2024-08821',
      rating: 5,
      notes: 'Reliable and consistently on schedule. Preferred sub for commercial projects.',
      prequalification: DEFAULT_PREQUALIFICATION.map((item, i) => ({
        ...item,
        id: `pq-1-${i}`,
        checked: true,
      })),
      insuranceCertificates: [
        {
          id: 'ins-1a',
          type: 'General Liability',
          fileName: 'apex_gl_cert.pdf',
          expirationDate: new Date(now.getTime() + 180 * 86400000).toISOString().split('T')[0],
        },
        {
          id: 'ins-1b',
          type: 'Workers Compensation',
          fileName: 'apex_wc_cert.pdf',
          expirationDate: new Date(now.getTime() + 90 * 86400000).toISOString().split('T')[0],
        },
      ],
      createdAt: '2024-06-15',
    },
    {
      id: 'sub-2',
      name: 'Summit Plumbing Co.',
      trade: 'Plumbing',
      contactName: 'Sarah Chen',
      phone: '(555) 234-5678',
      email: 'sarah@summitplumbing.com',
      licenseNumber: 'PL-2023-44210',
      rating: 4,
      notes: 'Good quality work. Occasionally needs reminders on documentation.',
      prequalification: DEFAULT_PREQUALIFICATION.map((item, i) => ({
        ...item,
        id: `pq-2-${i}`,
        checked: i < 6,
      })),
      insuranceCertificates: [
        {
          id: 'ins-2a',
          type: 'General Liability',
          fileName: 'summit_gl_cert.pdf',
          expirationDate: new Date(now.getTime() + 20 * 86400000).toISOString().split('T')[0],
        },
      ],
      createdAt: '2024-09-01',
    },
    {
      id: 'sub-3',
      name: 'Ironclad HVAC',
      trade: 'HVAC',
      contactName: 'James Rodriguez',
      phone: '(555) 345-6789',
      email: 'james@ironcladhvac.com',
      licenseNumber: 'HV-2024-11003',
      rating: 3,
      notes: 'Competitive pricing. Quality can be inconsistent on larger jobs.',
      prequalification: DEFAULT_PREQUALIFICATION.map((item, i) => ({
        ...item,
        id: `pq-3-${i}`,
        checked: i < 4,
      })),
      insuranceCertificates: [
        {
          id: 'ins-3a',
          type: 'General Liability',
          fileName: 'ironclad_gl_cert.pdf',
          expirationDate: new Date(now.getTime() - 10 * 86400000).toISOString().split('T')[0],
        },
      ],
      createdAt: '2025-01-10',
    },
    {
      id: 'sub-4',
      name: 'Precision Concrete LLC',
      trade: 'Concrete',
      contactName: 'David Park',
      phone: '(555) 456-7890',
      email: 'david@precisionconcrete.com',
      licenseNumber: 'CO-2024-55672',
      rating: 5,
      notes: 'Excellent flatwork. Always delivers on time with great communication.',
      prequalification: DEFAULT_PREQUALIFICATION.map((item, i) => ({
        ...item,
        id: `pq-4-${i}`,
        checked: true,
      })),
      insuranceCertificates: [
        {
          id: 'ins-4a',
          type: 'General Liability',
          fileName: 'precision_gl_cert.pdf',
          expirationDate: new Date(now.getTime() + 240 * 86400000).toISOString().split('T')[0],
        },
        {
          id: 'ins-4b',
          type: 'Workers Compensation',
          fileName: 'precision_wc_cert.pdf',
          expirationDate: new Date(now.getTime() + 240 * 86400000).toISOString().split('T')[0],
        },
      ],
      createdAt: '2024-03-20',
    },
    {
      id: 'sub-5',
      name: 'TopCoat Painting',
      trade: 'Painting',
      contactName: 'Lisa Martinez',
      phone: '(555) 567-8901',
      email: 'lisa@topcoatpainting.com',
      licenseNumber: 'PT-2025-30098',
      rating: 2,
      notes: 'Budget option. Has had some quality issues on recent projects.',
      prequalification: DEFAULT_PREQUALIFICATION.map((item, i) => ({
        ...item,
        id: `pq-5-${i}`,
        checked: i < 3,
      })),
      insuranceCertificates: [],
      createdAt: '2025-07-05',
    },
  ];
}

// --- Helpers ---

function getInsuranceStatus(certificates: InsuranceCertificate[]): InsuranceStatus {
  if (certificates.length === 0) return 'expired';
  const now = new Date();
  const thirtyDaysMs = 30 * 86400000;
  let hasExpired = false;
  let hasExpiring = false;

  for (const cert of certificates) {
    const expiry = new Date(cert.expirationDate);
    const diff = expiry.getTime() - now.getTime();
    if (diff < 0) {
      hasExpired = true;
    } else if (diff <= thirtyDaysMs) {
      hasExpiring = true;
    }
  }

  if (hasExpired) return 'expired';
  if (hasExpiring) return 'expiring';
  return 'valid';
}

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
    default:
      return null;
  }
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function daysUntilExpiry(dateStr: string): number {
  const now = new Date();
  const expiry = new Date(dateStr);
  return Math.ceil((expiry.getTime() - now.getTime()) / 86400000);
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
          onClick={() => onChange?.(star)}
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

// --- Empty Form State ---

interface SubcontractorFormData {
  name: string;
  trade: string;
  contactName: string;
  phone: string;
  email: string;
  licenseNumber: string;
  notes: string;
}

const EMPTY_FORM: SubcontractorFormData = {
  name: '',
  trade: '',
  contactName: '',
  phone: '',
  email: '',
  licenseNumber: '',
  notes: '',
};

// --- Main Component ---

const Subcontractors: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Simulate loading state on mount
  const [isLoading, setIsLoading] = useState(true);
  const [subcontractors, setSubcontractors] = useState<Subcontractor[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState<SubcontractorFormData>({ ...EMPTY_FORM });
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof SubcontractorFormData, string>>>({});

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [tradeFilter, setTradeFilter] = useState<string>('all');
  const [ratingFilter, setRatingFilter] = useState<string>('all');
  const [insuranceFilter, setInsuranceFilter] = useState<string>('all');

  // Simulate data load
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setSubcontractors(generateDemoData());
      setIsLoading(false);
    }, 600);
    return () => clearTimeout(timer);
  }, []);

  // --- Filtering ---

  const filteredSubcontractors = useMemo(() => {
    return subcontractors.filter((sub) => {
      // Search
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

      // Trade
      if (tradeFilter !== 'all' && sub.trade !== tradeFilter) return false;

      // Rating minimum
      if (ratingFilter !== 'all' && sub.rating < parseInt(ratingFilter, 10)) return false;

      // Insurance status
      if (insuranceFilter !== 'all') {
        const status = getInsuranceStatus(sub.insuranceCertificates);
        if (status !== insuranceFilter) return false;
      }

      return true;
    });
  }, [subcontractors, searchQuery, tradeFilter, ratingFilter, insuranceFilter]);

  // --- Form Validation ---

  function validateForm(data: SubcontractorFormData): boolean {
    const errors: Partial<Record<keyof SubcontractorFormData, string>> = {};

    if (!data.name.trim()) errors.name = 'Company name is required';
    if (!data.trade) errors.trade = 'Trade type is required';
    if (!data.contactName.trim()) errors.contactName = 'Contact name is required';
    if (!data.phone.trim()) errors.phone = 'Phone number is required';
    if (!data.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      errors.email = 'Invalid email address';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }

  // --- Handlers ---

  function handleAddSubcontractor() {
    if (!validateForm(formData)) return;

    const newSub: Subcontractor = {
      id: `sub-${Date.now()}`,
      name: formData.name.trim(),
      trade: formData.trade,
      contactName: formData.contactName.trim(),
      phone: formData.phone.trim(),
      email: formData.email.trim(),
      licenseNumber: formData.licenseNumber.trim(),
      rating: 0,
      notes: formData.notes.trim(),
      prequalification: createDefaultPrequalification(),
      insuranceCertificates: [],
      createdAt: new Date().toISOString().split('T')[0],
    };

    setSubcontractors((prev) => [newSub, ...prev]);
    setFormData({ ...EMPTY_FORM });
    setFormErrors({});
    setDialogOpen(false);
    toast({
      title: 'Subcontractor added',
      description: `${newSub.name} has been added successfully.`,
    });
  }

  function handleRatingChange(subId: string, newRating: number) {
    setSubcontractors((prev) =>
      prev.map((sub) => (sub.id === subId ? { ...sub, rating: newRating } : sub))
    );
  }

  function handlePrequalToggle(subId: string, pqId: string) {
    setSubcontractors((prev) =>
      prev.map((sub) =>
        sub.id === subId
          ? {
              ...sub,
              prequalification: sub.prequalification.map((pq) =>
                pq.id === pqId ? { ...pq, checked: !pq.checked } : pq
              ),
            }
          : sub
      )
    );
  }

  function handleInsuranceUpload(subId: string) {
    // Simulate an insurance upload since we have no real file storage wired up
    const newCert: InsuranceCertificate = {
      id: `ins-${Date.now()}`,
      type: 'General Liability',
      fileName: 'uploaded_certificate.pdf',
      expirationDate: new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0],
    };

    setSubcontractors((prev) =>
      prev.map((sub) =>
        sub.id === subId
          ? { ...sub, insuranceCertificates: [...sub.insuranceCertificates, newCert] }
          : sub
      )
    );

    toast({
      title: 'Certificate uploaded',
      description: 'Insurance certificate has been uploaded (demo).',
    });
  }

  function handleFormChange(field: keyof SubcontractorFormData, value: string) {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  }

  // --- Render ---

  const activeFilterCount = [
    tradeFilter !== 'all',
    ratingFilter !== 'all',
    insuranceFilter !== 'all',
  ].filter(Boolean).length;

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
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2" aria-label="Add a new subcontractor">
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  Add Subcontractor
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" aria-describedby="add-sub-description">
                <DialogHeader>
                  <DialogTitle>Add Subcontractor</DialogTitle>
                  <p id="add-sub-description" className="text-sm text-muted-foreground">
                    Enter subcontractor details to add them to your vendor list.
                  </p>
                </DialogHeader>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleAddSubcontractor();
                  }}
                  className="space-y-4"
                  aria-label="Add subcontractor form"
                  noValidate
                >
                  {/* Company Name */}
                  <div className="space-y-1.5">
                    <Label htmlFor="sub-name">
                      Company Name <span aria-hidden="true" className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="sub-name"
                      value={formData.name}
                      onChange={(e) => handleFormChange('name', e.target.value)}
                      placeholder="e.g. ABC Electrical"
                      aria-required="true"
                      aria-invalid={!!formErrors.name}
                      aria-describedby={formErrors.name ? 'sub-name-error' : undefined}
                    />
                    {formErrors.name && (
                      <p id="sub-name-error" className="text-sm text-red-600" role="alert">
                        {formErrors.name}
                      </p>
                    )}
                  </div>

                  {/* Trade Type */}
                  <div className="space-y-1.5">
                    <Label htmlFor="sub-trade">
                      Trade Type <span aria-hidden="true" className="text-red-500">*</span>
                    </Label>
                    <Select
                      value={formData.trade}
                      onValueChange={(val) => handleFormChange('trade', val)}
                    >
                      <SelectTrigger
                        id="sub-trade"
                        aria-required="true"
                        aria-invalid={!!formErrors.trade}
                        aria-describedby={formErrors.trade ? 'sub-trade-error' : undefined}
                      >
                        <SelectValue placeholder="Select trade type" />
                      </SelectTrigger>
                      <SelectContent>
                        {TRADE_TYPES.map((trade) => (
                          <SelectItem key={trade} value={trade}>
                            {trade}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {formErrors.trade && (
                      <p id="sub-trade-error" className="text-sm text-red-600" role="alert">
                        {formErrors.trade}
                      </p>
                    )}
                  </div>

                  {/* Contact Name */}
                  <div className="space-y-1.5">
                    <Label htmlFor="sub-contact">
                      Contact Name <span aria-hidden="true" className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="sub-contact"
                      value={formData.contactName}
                      onChange={(e) => handleFormChange('contactName', e.target.value)}
                      placeholder="e.g. John Smith"
                      aria-required="true"
                      aria-invalid={!!formErrors.contactName}
                      aria-describedby={formErrors.contactName ? 'sub-contact-error' : undefined}
                    />
                    {formErrors.contactName && (
                      <p id="sub-contact-error" className="text-sm text-red-600" role="alert">
                        {formErrors.contactName}
                      </p>
                    )}
                  </div>

                  {/* Phone */}
                  <div className="space-y-1.5">
                    <Label htmlFor="sub-phone">
                      Phone <span aria-hidden="true" className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="sub-phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => handleFormChange('phone', e.target.value)}
                      placeholder="(555) 123-4567"
                      aria-required="true"
                      aria-invalid={!!formErrors.phone}
                      aria-describedby={formErrors.phone ? 'sub-phone-error' : undefined}
                    />
                    {formErrors.phone && (
                      <p id="sub-phone-error" className="text-sm text-red-600" role="alert">
                        {formErrors.phone}
                      </p>
                    )}
                  </div>

                  {/* Email */}
                  <div className="space-y-1.5">
                    <Label htmlFor="sub-email">
                      Email <span aria-hidden="true" className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="sub-email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleFormChange('email', e.target.value)}
                      placeholder="contact@company.com"
                      aria-required="true"
                      aria-invalid={!!formErrors.email}
                      aria-describedby={formErrors.email ? 'sub-email-error' : undefined}
                    />
                    {formErrors.email && (
                      <p id="sub-email-error" className="text-sm text-red-600" role="alert">
                        {formErrors.email}
                      </p>
                    )}
                  </div>

                  {/* License Number */}
                  <div className="space-y-1.5">
                    <Label htmlFor="sub-license">License Number</Label>
                    <Input
                      id="sub-license"
                      value={formData.licenseNumber}
                      onChange={(e) => handleFormChange('licenseNumber', e.target.value)}
                      placeholder="e.g. EL-2024-12345"
                    />
                  </div>

                  {/* Notes */}
                  <div className="space-y-1.5">
                    <Label htmlFor="sub-notes">Notes</Label>
                    <Textarea
                      id="sub-notes"
                      value={formData.notes}
                      onChange={(e) => handleFormChange('notes', e.target.value)}
                      placeholder="Any additional notes about this subcontractor..."
                      rows={3}
                    />
                  </div>

                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setDialogOpen(false);
                        setFormData({ ...EMPTY_FORM });
                        setFormErrors({});
                      }}
                    >
                      Cancel
                    </Button>
                    <Button type="submit">Add Subcontractor</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {/* Filter Bar */}
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
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Active filter count */}
          {(activeFilterCount > 0 || searchQuery) && (
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
          {!isLoading && filteredSubcontractors.length === 0 && (
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
                    ? 'Get started by adding your first subcontractor to track their prequalification and insurance status.'
                    : 'Try adjusting your search or filter criteria to find what you are looking for.'}
                </p>
                {subcontractors.length === 0 && (
                  <Button
                    onClick={() => setDialogOpen(true)}
                    className="gap-2"
                    aria-label="Add your first subcontractor"
                  >
                    <Plus className="h-4 w-4" aria-hidden="true" />
                    Add Subcontractor
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {/* Subcontractor Cards Grid */}
          {!isLoading && filteredSubcontractors.length > 0 && (
            <div
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
              role="list"
              aria-label="Subcontractors list"
            >
              {filteredSubcontractors.map((sub) => {
                const insuranceStatus = getInsuranceStatus(sub.insuranceCertificates);
                const completedPrequal = sub.prequalification.filter((pq) => pq.checked).length;
                const totalPrequal = sub.prequalification.length;

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
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="secondary" className="gap-1">
                              <HardHat className="h-3 w-3" aria-hidden="true" />
                              {sub.trade}
                            </Badge>
                            {getInsuranceBadge(insuranceStatus)}
                          </div>
                        </div>
                      </div>
                      {/* Star Rating */}
                      <div className="mt-2">
                        <StarRating
                          rating={sub.rating}
                          onChange={(r) => handleRatingChange(sub.id, r)}
                          subcontractorName={sub.name}
                        />
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-4 flex-1">
                      {/* Contact Info */}
                      <div className="space-y-1.5 text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <User className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
                          <span>{sub.contactName}</span>
                        </div>
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
                        <fieldset aria-label={`Prequalification checklist for ${sub.name}`}>
                          <legend className="sr-only">Prequalification items for {sub.name}</legend>
                          <ul className="space-y-1.5" role="list">
                            {sub.prequalification.map((pq) => (
                              <li key={pq.id} className="flex items-start gap-2">
                                <Checkbox
                                  id={`${sub.id}-${pq.id}`}
                                  checked={pq.checked}
                                  onCheckedChange={() => handlePrequalToggle(sub.id, pq.id)}
                                  aria-label={pq.label}
                                  className="mt-0.5"
                                />
                                <label
                                  htmlFor={`${sub.id}-${pq.id}`}
                                  className={`text-xs leading-tight cursor-pointer ${
                                    pq.checked ? 'text-muted-foreground line-through' : ''
                                  }`}
                                >
                                  {pq.label}
                                </label>
                              </li>
                            ))}
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
                          <ul className="space-y-2" role="list" aria-label={`Insurance certificates for ${sub.name}`}>
                            {sub.insuranceCertificates.map((cert) => {
                              const days = daysUntilExpiry(cert.expirationDate);
                              const isExpired = days < 0;
                              const isExpiring = !isExpired && days <= 30;

                              return (
                                <li
                                  key={cert.id}
                                  className={`text-xs p-2 rounded border ${
                                    isExpired
                                      ? 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950'
                                      : isExpiring
                                        ? 'border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950'
                                        : 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950'
                                  }`}
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="font-medium">{cert.type}</span>
                                    {isExpired && (
                                      <span className="text-red-600 dark:text-red-400 font-medium" role="alert">
                                        Expired
                                      </span>
                                    )}
                                    {isExpiring && (
                                      <span className="text-yellow-600 dark:text-yellow-400 font-medium" role="alert">
                                        {days} day{days !== 1 ? 's' : ''} left
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-muted-foreground mt-0.5">
                                    Expires: {formatDate(cert.expirationDate)}
                                  </div>
                                </li>
                              );
                            })}
                          </ul>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full mt-2 gap-1.5"
                          onClick={() => handleInsuranceUpload(sub.id)}
                          aria-label={`Upload insurance certificate for ${sub.name}`}
                        >
                          <Upload className="h-3.5 w-3.5" aria-hidden="true" />
                          Upload Certificate
                        </Button>
                      </div>

                      {/* Notes */}
                      {sub.notes && (
                        <div>
                          <h3 className="text-sm font-medium mb-1">Notes</h3>
                          <p className="text-xs text-muted-foreground">{sub.notes}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </AccessiblePageWrapper>
    </DashboardLayout>
  );
};

export default Subcontractors;
