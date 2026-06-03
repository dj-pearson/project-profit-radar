import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { LoadingState } from '@/components/ui/loading-spinner';
import { ErrorBoundary, ErrorState, EmptyState } from '@/components/ui/error-boundary';
import { ResponsiveContainer, ResponsiveGrid } from '@/components/layout/ResponsiveContainer';
import { AccessibleTable, type TableColumn, type SortDirection } from '@/components/accessibility/AccessibleTable';
import { AccessibleModal } from '@/components/accessibility/AccessibleModal';
import { Checkbox } from '@/components/ui/checkbox';
import { logger } from '@/lib/logger';
import { useLoadingState } from '@/hooks/useLoadingState';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AccessibleForm, AccessibleFormField, AccessibleTextarea, AccessibleFieldset } from '@/components/accessibility/AccessibleForm';
import {
  Users,
  Search,
  Plus,
  Phone,
  Mail,
  MapPin,
  Building2,
  User,
  Edit,
  Trash2,
  Globe,
  Calendar,
  Tag,
  Download,
  X,
  Loader2
} from 'lucide-react';

interface Contact {
  id: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  mobile_phone?: string;
  company_name?: string;
  job_title?: string;
  department?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  country?: string;
  website?: string;
  linkedin_profile?: string;
  contact_type: string;
  relationship_status: string;
  preferred_contact_method?: string;
  time_zone?: string;
  birthday?: string;
  anniversary?: string;
  lead_source?: string;
  assigned_to?: string;
  last_contact_date?: string;
  next_contact_date?: string;
  notes?: string;
  tags?: string[];
  custom_fields?: any;
  created_at: string;
  updated_at: string;
}

const CRMContacts = () => {
  const { user, userProfile, signOut, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [tagFilter, setTagFilter] = useState('all');
  const [showNewContactDialog, setShowNewContactDialog] = useState(false);

  // US-090: sort, selection, and bulk-action state.
  const [sortColumn, setSortColumn] = useState<string | undefined>(undefined);
  const [sortDirection, setSortDirection] = useState<SortDirection>('none');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showAddTagDialog, setShowAddTagDialog] = useState(false);
  const [newTagValue, setNewTagValue] = useState('');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [newContact, setNewContact] = useState<Partial<Contact>>({
    contact_type: 'prospect',
    relationship_status: 'active',
    preferred_contact_method: 'email',
    country: 'United States'
  });

  const {
    data: contacts,
    loading: contactsLoading,
    error: contactsError,
    execute: loadContacts
  } = useLoadingState<Contact[]>([]);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }

    if (!loading && user && userProfile && !userProfile.company_id && userProfile.role !== 'root_admin') {
      navigate('/setup');
    }

    if (!loading && user && userProfile) {
      loadContacts(loadContactsData);
    }
  }, [user, userProfile, loading, navigate]);

  const loadContactsData = async (): Promise<Contact[]> => {
    if (!userProfile?.company_id) {
      throw new Error('No company associated with user');
    }

    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .eq('company_id', userProfile.company_id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  };

  const createContact = async () => {
    if (!userProfile?.company_id) {
      toast({
        title: "Error",
        description: "No company associated with your account.",
        variant: "destructive"
      });
      return;
    }

    if (!newContact.first_name || !newContact.last_name) {
      toast({
        title: "Validation Error",
        description: "First name and last name are required.",
        variant: "destructive"
      });
      return;
    }

    try {
      const contactData = {
        first_name: newContact.first_name!,
        last_name: newContact.last_name!,
        email: newContact.email,
        phone: newContact.phone,
        mobile_phone: newContact.mobile_phone,
        company_name: newContact.company_name,
        job_title: newContact.job_title,
        department: newContact.department,
        address: newContact.address,
        city: newContact.city,
        state: newContact.state,
        zip_code: newContact.zip_code,
        country: newContact.country,
        website: newContact.website,
        linkedin_profile: newContact.linkedin_profile,
        contact_type: newContact.contact_type!,
        relationship_status: newContact.relationship_status!,
        preferred_contact_method: newContact.preferred_contact_method,
        time_zone: newContact.time_zone,
        birthday: newContact.birthday,
        anniversary: newContact.anniversary,
        lead_source: newContact.lead_source,
        assigned_to: newContact.assigned_to,
        last_contact_date: newContact.last_contact_date,
        next_contact_date: newContact.next_contact_date,
        notes: newContact.notes,
        tags: newContact.tags,
        custom_fields: newContact.custom_fields,
        company_id: userProfile.company_id,
        created_by: user?.id
      };

      const { error } = await supabase
        .from('contacts')
        .insert([contactData]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Contact created successfully!",
      });

      setShowNewContactDialog(false);
      setNewContact({
        contact_type: 'prospect',
        relationship_status: 'active',
        preferred_contact_method: 'email',
        country: 'United States'
      });
      loadContacts(loadContactsData);
    } catch (error) {
      console.error('Error creating contact:', error);
      toast({
        title: "Error",
        description: "Failed to create contact. Please try again.",
        variant: "destructive"
      });
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'client': return 'green';
      case 'prospect': return 'blue';
      case 'vendor': return 'purple';
      case 'partner': return 'orange';
      case 'referral': return 'yellow';
      default: return 'gray';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'green';
      case 'inactive': return 'gray';
      case 'do_not_contact': return 'red';
      default: return 'gray';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const filteredContacts = contacts?.filter(contact => {
    const matchesSearch = searchTerm === '' ||
      `${contact.first_name} ${contact.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.job_title?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = typeFilter === 'all' || contact.contact_type === typeFilter;
    const matchesStatus = statusFilter === 'all' || contact.relationship_status === statusFilter;
    const matchesTag = tagFilter === 'all' || (contact.tags || []).includes(tagFilter);

    return matchesSearch && matchesType && matchesStatus && matchesTag;
  }) || [];

  // Distinct tags across all contacts, for the tag filter dropdown.
  const allTags = Array.from(
    new Set((contacts || []).flatMap((c) => c.tags || []))
  ).sort();

  // Sorting (client-side; the list is fully loaded, not paginated).
  const sortAccessors: Record<string, (c: Contact) => string | number> = {
    first_name: (c) => `${c.first_name} ${c.last_name}`.toLowerCase(),
    company_name: (c) => (c.company_name || '').toLowerCase(),
    email: (c) => (c.email || '').toLowerCase(),
    phone: (c) => (c.phone || '').toLowerCase(),
    contact_type: (c) => (c.contact_type || '').toLowerCase(),
    relationship_status: (c) => (c.relationship_status || '').toLowerCase(),
    last_contact_date: (c) => (c.last_contact_date ? new Date(c.last_contact_date).getTime() : 0),
  };

  const displayContacts = (() => {
    if (!sortColumn || sortDirection === 'none') return filteredContacts;
    const accessor = sortAccessors[sortColumn];
    if (!accessor) return filteredContacts;
    const sorted = [...filteredContacts].sort((a, b) => {
      const av = accessor(a);
      const bv = accessor(b);
      if (av < bv) return -1;
      if (av > bv) return 1;
      return 0;
    });
    return sortDirection === 'descending' ? sorted.reverse() : sorted;
  })();

  const handleSort = (column: string, direction: SortDirection) => {
    setSortColumn(direction === 'none' ? undefined : column);
    setSortDirection(direction);
  };

  // Selection helpers
  const allSelected = displayContacts.length > 0 && displayContacts.every((c) => selectedIds.has(c.id));
  const someSelected = displayContacts.some((c) => selectedIds.has(c.id)) && !allSelected;
  const toggleOne = (id: string) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  const toggleAll = () =>
    setSelectedIds((prev) => (displayContacts.every((c) => prev.has(c.id)) ? new Set() : new Set(displayContacts.map((c) => c.id))));
  const clearSelection = () => setSelectedIds(new Set());

  const selectedContacts = displayContacts.filter((c) => selectedIds.has(c.id));

  // Bulk actions
  const bulkSendEmail = () => {
    const emails = selectedContacts.map((c) => c.email).filter(Boolean) as string[];
    if (emails.length === 0) {
      toast({ title: 'No emails', description: 'None of the selected contacts have an email address.', variant: 'destructive' });
      return;
    }
    window.location.href = `mailto:?bcc=${encodeURIComponent(emails.join(','))}`;
  };

  const bulkAddTag = async () => {
    const tag = newTagValue.trim();
    const ids = Array.from(selectedIds);
    if (!tag || ids.length === 0) return;
    setBulkBusy(true);
    try {
      // Tags are per-row arrays, so append the tag to each selected contact's set.
      await Promise.all(
        selectedContacts.map((c) => {
          const nextTags = Array.from(new Set([...(c.tags || []), tag]));
          return supabase.from('contacts').update({ tags: nextTags }).eq('id', c.id);
        })
      );
      toast({ title: 'Tag added', description: `"${tag}" added to ${ids.length} contact(s).` });
      clearSelection();
      setShowAddTagDialog(false);
      setNewTagValue('');
      loadContacts(loadContactsData);
    } catch (error) {
      logger.error('Bulk add tag failed', error instanceof Error ? error : undefined);
      toast({ title: 'Error', description: 'Failed to add tag.', variant: 'destructive' });
    } finally {
      setBulkBusy(false);
    }
  };

  const bulkDelete = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    setBulkBusy(true);
    try {
      const { error } = await supabase.from('contacts').delete().in('id', ids);
      if (error) throw error;
      toast({ title: 'Contacts deleted', description: `${ids.length} contact(s) deleted.` });
      clearSelection();
      setShowDeleteDialog(false);
      loadContacts(loadContactsData);
    } catch (error) {
      logger.error('Bulk contact delete failed', error instanceof Error ? error : undefined);
      toast({ title: 'Error', description: 'Failed to delete contacts.', variant: 'destructive' });
    } finally {
      setBulkBusy(false);
    }
  };

  const exportSelectedCsv = () => {
    if (selectedContacts.length === 0) return;
    const headers = ['First Name', 'Last Name', 'Email', 'Phone', 'Company', 'Type', 'Status', 'Tags', 'Last Contact'];
    const rows = selectedContacts.map((c) => [
      c.first_name ?? '',
      c.last_name ?? '',
      c.email ?? '',
      c.phone ?? '',
      c.company_name ?? '',
      c.contact_type ?? '',
      c.relationship_status ?? '',
      (c.tags || []).join('; '),
      c.last_contact_date ?? '',
    ]);
    const csv = [headers, ...rows]
      .map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `contacts-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'Exported', description: `${selectedContacts.length} contact(s) exported to CSV.` });
  };

  if (loading) {
    return <LoadingState message="Loading contacts..." />;
  }

  if (!user) {
    return null;
  }

  return (
    <DashboardLayout title="Contact Management">

            {/* Filters and Actions */}
            <Card className="mb-6">
              <CardContent className="pt-6">
                <div className="flex flex-col lg:flex-row gap-4">
                  <div className="flex-1" role="search" aria-label="Search contacts">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
                      <Input
                        placeholder="Search contacts by name, email, company, or job title..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                        aria-label="Search contacts"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2">
                    <Select value={typeFilter} onValueChange={setTypeFilter}>
                      <SelectTrigger className="w-full sm:w-40" aria-label="Filter by contact type">
                        <SelectValue placeholder="Type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="client">Client</SelectItem>
                        <SelectItem value="prospect">Prospect</SelectItem>
                        <SelectItem value="vendor">Vendor</SelectItem>
                        <SelectItem value="partner">Partner</SelectItem>
                        <SelectItem value="referral">Referral</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-full sm:w-40" aria-label="Filter by relationship status">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                        <SelectItem value="do_not_contact">Do Not Contact</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select value={tagFilter} onValueChange={setTagFilter}>
                      <SelectTrigger className="w-full sm:w-40" aria-label="Filter by tag">
                        <SelectValue placeholder="Tag" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Tags</SelectItem>
                        {allTags.map((t) => (
                          <SelectItem key={t} value={t}>{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Button aria-label="Create new contact" onClick={() => setShowNewContactDialog(true)}>
                      <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
                      New Contact
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* New Contact Modal */}
            <AccessibleModal
              isOpen={showNewContactDialog}
              onClose={() => setShowNewContactDialog(false)}
              title="Create New Contact"
              description="Add a new contact to your CRM system."
              size="xl"
              footer={
                <>
                  <Button type="button" variant="outline" onClick={() => setShowNewContactDialog(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" form="create-contact-form">
                    Create Contact
                  </Button>
                </>
              }
            >
              <AccessibleForm
                id="create-contact-form"
                onSubmit={() => { createContact(); }}
                ariaLabel="Create new contact form"
                className="space-y-6"
              >
                <AccessibleFieldset legend="Contact Information">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <AccessibleFormField
                      name="first_name"
                      label="First Name"
                      required
                      value={newContact.first_name || ''}
                      onChange={(e) => setNewContact({...newContact, first_name: e.target.value})}
                      placeholder="John"
                    />
                    <AccessibleFormField
                      name="last_name"
                      label="Last Name"
                      required
                      value={newContact.last_name || ''}
                      onChange={(e) => setNewContact({...newContact, last_name: e.target.value})}
                      placeholder="Smith"
                    />
                    <AccessibleFormField
                      name="email"
                      label="Email"
                      type="email"
                      value={newContact.email || ''}
                      onChange={(e) => setNewContact({...newContact, email: e.target.value})}
                      placeholder="john.smith@email.com"
                    />
                    <AccessibleFormField
                      name="phone"
                      label="Phone"
                      type="tel"
                      value={newContact.phone || ''}
                      onChange={(e) => setNewContact({...newContact, phone: e.target.value})}
                      placeholder="(555) 123-4567"
                    />
                    <AccessibleFormField
                      name="company_name"
                      label="Company"
                      value={newContact.company_name || ''}
                      onChange={(e) => setNewContact({...newContact, company_name: e.target.value})}
                      placeholder="ABC Corporation"
                    />
                    <AccessibleFormField
                      name="job_title"
                      label="Job Title"
                      value={newContact.job_title || ''}
                      onChange={(e) => setNewContact({...newContact, job_title: e.target.value})}
                      placeholder="Property Manager"
                    />
                  </div>
                </AccessibleFieldset>

                <AccessibleFieldset legend="Classification">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="contact_type">Contact Type</Label>
                      <Select value={newContact.contact_type} onValueChange={(value) => setNewContact({...newContact, contact_type: value})}>
                        <SelectTrigger aria-label="Contact type">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="client">Client</SelectItem>
                          <SelectItem value="prospect">Prospect</SelectItem>
                          <SelectItem value="vendor">Vendor</SelectItem>
                          <SelectItem value="partner">Partner</SelectItem>
                          <SelectItem value="referral">Referral</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="relationship_status">Status</Label>
                      <Select value={newContact.relationship_status} onValueChange={(value) => setNewContact({...newContact, relationship_status: value})}>
                        <SelectTrigger aria-label="Relationship status">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
                          <SelectItem value="do_not_contact">Do Not Contact</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </AccessibleFieldset>

                <AccessibleTextarea
                  name="notes"
                  label="Notes"
                  value={newContact.notes || ''}
                  onChange={(e) => setNewContact({...newContact, notes: e.target.value})}
                  placeholder="Additional notes about this contact..."
                />
              </AccessibleForm>
            </AccessibleModal>

            {/* Contacts Table */}
            <ErrorBoundary>
              {contactsError ? (
                <ErrorState
                  error={contactsError}
                  onRetry={() => loadContacts(loadContactsData)}
                />
              ) : (() => {
                const contactColumns: TableColumn<Contact>[] = [
                  {
                    key: 'select',
                    header: 'Select',
                    width: '2.5rem',
                    headerRender: () => (
                      <Checkbox
                        checked={allSelected ? true : someSelected ? 'indeterminate' : false}
                        onCheckedChange={toggleAll}
                        aria-label={allSelected ? 'Deselect all contacts' : 'Select all contacts'}
                      />
                    ),
                    render: (_value, row) => (
                      <Checkbox
                        checked={selectedIds.has(row.id)}
                        onCheckedChange={() => toggleOne(row.id)}
                        aria-label={`Select ${row.first_name} ${row.last_name}`}
                      />
                    ),
                  },
                  {
                    key: 'first_name',
                    header: 'Name',
                    sortable: true,
                    render: (_, row) => (
                      <div>
                        <span className="font-medium">{row.first_name} {row.last_name}</span>
                        {row.job_title && (
                          <span className="block text-xs text-muted-foreground">{row.job_title}</span>
                        )}
                      </div>
                    ),
                  },
                  {
                    key: 'email',
                    header: 'Email',
                    hideOnMobile: true,
                    sortable: true,
                    render: (value) => (
                      <span className="flex items-center gap-1 text-sm">
                        <Mail className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
                        {value || '--'}
                      </span>
                    ),
                  },
                  {
                    key: 'phone',
                    header: 'Phone',
                    hideOnMobile: true,
                    sortable: true,
                    render: (value) => (
                      <span className="flex items-center gap-1 text-sm">
                        <Phone className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
                        {value || '--'}
                      </span>
                    ),
                  },
                  {
                    key: 'company_name',
                    header: 'Company',
                    hideOnMobile: true,
                    sortable: true,
                    render: (value) => (
                      <span className="flex items-center gap-1 text-sm">
                        <Building2 className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
                        {value || '--'}
                      </span>
                    ),
                  },
                  {
                    key: 'contact_type',
                    header: 'Type',
                    sortable: true,
                    render: (value) => (
                      <Badge variant="outline" className={`text-${getTypeColor(value)}-600`} aria-label={`Type: ${value}`}>
                        {value}
                      </Badge>
                    ),
                  },
                  {
                    key: 'relationship_status',
                    header: 'Status',
                    sortable: true,
                    render: (value) => (
                      <Badge variant="outline" className={`text-${getStatusColor(value)}-600`} aria-label={`Status: ${value.replace('_', ' ')}`}>
                        {value}
                      </Badge>
                    ),
                  },
                  {
                    key: 'last_contact_date',
                    header: 'Last Contact',
                    hideOnMobile: true,
                    sortable: true,
                    render: (value) => (
                      <span className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Calendar className="h-3 w-3" aria-hidden="true" />
                        {value ? formatDate(value) : '--'}
                      </span>
                    ),
                  },
                  {
                    key: 'actions',
                    header: 'Actions',
                    headerRender: () => <span className="sr-only">Actions</span>,
                    render: (_, row) => (
                      <div className="flex space-x-1">
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0" aria-label={`Edit ${row.first_name} ${row.last_name}`}>
                          <Edit className="h-4 w-4" aria-hidden="true" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0" aria-label={`Delete ${row.first_name} ${row.last_name}`}>
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </Button>
                      </div>
                    ),
                  },
                ];

                return (
                  <div className="space-y-3">
                    {selectedIds.size > 0 && (
                      <div className="flex flex-wrap items-center gap-2 rounded-md border bg-muted/40 px-3 py-2">
                        <span className="text-sm font-medium">{selectedIds.size} selected</span>
                        <div className="flex-1" />
                        <Button size="sm" variant="outline" disabled={bulkBusy} onClick={bulkSendEmail}>
                          <Mail className="mr-2 h-4 w-4" aria-hidden="true" />Send Email
                        </Button>
                        <Button size="sm" variant="outline" disabled={bulkBusy} onClick={() => setShowAddTagDialog(true)}>
                          <Tag className="mr-2 h-4 w-4" aria-hidden="true" />Add Tag
                        </Button>
                        <Button size="sm" variant="outline" disabled={bulkBusy} onClick={exportSelectedCsv}>
                          <Download className="mr-2 h-4 w-4" aria-hidden="true" />Export Selected
                        </Button>
                        <Button size="sm" variant="destructive" disabled={bulkBusy} onClick={() => setShowDeleteDialog(true)}>
                          <Trash2 className="mr-2 h-4 w-4" aria-hidden="true" />Delete Selected
                        </Button>
                        <Button size="sm" variant="ghost" onClick={clearSelection} aria-label="Clear selection">
                          <X className="h-4 w-4" aria-hidden="true" />
                        </Button>
                      </div>
                    )}
                  <AccessibleTable<Contact>
                    caption="CRM Contacts"
                    hideCaption
                    columns={contactColumns}
                    data={displayContacts}
                    loading={contactsLoading}
                    sortColumn={sortColumn}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                    emptyContent={
                      <div className="text-center py-8">
                        <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" aria-hidden="true" />
                        <h3 className="text-lg font-medium mb-2">No contacts found</h3>
                        <p className="text-muted-foreground mb-4">
                          {searchTerm ? "No contacts match your search criteria." : "Start building your contact database by adding your first contact."}
                        </p>
                        {!searchTerm && (
                          <Button onClick={() => setShowNewContactDialog(true)}>
                            <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
                            Add First Contact
                          </Button>
                        )}
                      </div>
                    }
                  />
                  </div>
                );
              })()}
            </ErrorBoundary>

            {/* Bulk Add Tag Modal */}
            <AccessibleModal
              isOpen={showAddTagDialog}
              onClose={() => { setShowAddTagDialog(false); setNewTagValue(''); }}
              title={`Add tag to ${selectedIds.size} contact${selectedIds.size > 1 ? 's' : ''}`}
              description="The tag is appended to each selected contact's existing tags."
              size="sm"
              footer={
                <>
                  <Button variant="outline" onClick={() => { setShowAddTagDialog(false); setNewTagValue(''); }}>Cancel</Button>
                  <Button disabled={!newTagValue.trim() || bulkBusy} onClick={bulkAddTag} className="gap-2">
                    {bulkBusy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                    Add Tag
                  </Button>
                </>
              }
            >
              <div className="space-y-2">
                <Label htmlFor="bulk-tag">Tag</Label>
                <Input
                  id="bulk-tag"
                  value={newTagValue}
                  onChange={(e) => setNewTagValue(e.target.value)}
                  placeholder="e.g. VIP, follow-up"
                  list="contact-tags"
                />
                <datalist id="contact-tags">
                  {allTags.map((t) => <option key={t} value={t} />)}
                </datalist>
              </div>
            </AccessibleModal>

            {/* Bulk Delete Confirmation Modal */}
            <AccessibleModal
              isOpen={showDeleteDialog}
              onClose={() => setShowDeleteDialog(false)}
              title={`Delete ${selectedIds.size} contact${selectedIds.size > 1 ? 's' : ''}?`}
              description="This permanently removes the selected contacts. This action cannot be undone."
              size="sm"
              disableClickOutside
              footer={
                <>
                  <Button variant="outline" disabled={bulkBusy} onClick={() => setShowDeleteDialog(false)}>Cancel</Button>
                  <Button variant="destructive" disabled={bulkBusy} onClick={bulkDelete} className="gap-2">
                    {bulkBusy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                    Delete
                  </Button>
                </>
              }
            />
    </DashboardLayout>
  );
};

export default CRMContacts;
