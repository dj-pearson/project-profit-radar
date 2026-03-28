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
import { AccessibleTable, type TableColumn } from '@/components/accessibility/AccessibleTable';
import { AccessibleModal } from '@/components/accessibility/AccessibleModal';
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
  Download
} from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';

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
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showNewContactDialog, setShowNewContactDialog] = useState(false);
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
      case 'lead': return 'sky';
      case 'subcontractor': return 'amber';
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

  // Collect all unique tags across contacts for the tag filter
  const allTags = React.useMemo(() => {
    const tagSet = new Set<string>();
    contacts?.forEach(contact => {
      contact.tags?.forEach(tag => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
  }, [contacts]);

  const filteredContacts = contacts?.filter(contact => {
    const matchesSearch = searchTerm === '' ||
      `${contact.first_name} ${contact.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.company_name?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = typeFilter === 'all' || contact.contact_type === typeFilter;
    const matchesStatus = statusFilter === 'all' || contact.relationship_status === statusFilter;
    const matchesTag = tagFilter === 'all' || contact.tags?.includes(tagFilter);

    return matchesSearch && matchesType && matchesStatus && matchesTag;
  }) || [];

  // Clear selections that are no longer in the filtered list
  const filteredIds = new Set(filteredContacts.map(c => c.id));
  const validSelectedIds = selectedIds.filter(id => filteredIds.has(id));
  if (validSelectedIds.length !== selectedIds.length) {
    // Defer state update to avoid setting state during render
    React.startTransition(() => setSelectedIds(validSelectedIds));
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(filteredContacts.map(c => c.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (contactId: string, checked: boolean) => {
    if (checked) {
      setSelectedIds(prev => [...prev, contactId]);
    } else {
      setSelectedIds(prev => prev.filter(id => id !== contactId));
    }
  };

  const handleBulkSendEmail = () => {
    toast({
      title: "Send Email",
      description: `Preparing email for ${selectedIds.length} selected contact(s).`,
    });
  };

  const handleBulkAddTag = () => {
    toast({
      title: "Add Tag",
      description: `Adding tag to ${selectedIds.length} selected contact(s).`,
    });
  };

  const handleBulkExport = () => {
    toast({
      title: "Export Selected",
      description: `Exporting ${selectedIds.length} selected contact(s).`,
    });
  };

  const handleBulkDelete = () => {
    setShowDeleteConfirm(true);
  };

  const confirmBulkDelete = () => {
    const remaining = contacts?.filter(c => !selectedIds.includes(c.id)) || [];
    // Update local state by reloading without the deleted items
    // For now, we remove from local data via the loading state hook
    loadContacts(async () => remaining);
    toast({
      title: "Deleted",
      description: `${selectedIds.length} contact(s) deleted.`,
    });
    setSelectedIds([]);
    setShowDeleteConfirm(false);
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
                        <SelectItem value="lead">Lead</SelectItem>
                        <SelectItem value="subcontractor">Subcontractor</SelectItem>
                        <SelectItem value="vendor">Vendor</SelectItem>
                        <SelectItem value="prospect">Prospect</SelectItem>
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

                    {allTags.length > 0 && (
                      <Select value={tagFilter} onValueChange={setTagFilter}>
                        <SelectTrigger className="w-full sm:w-40" aria-label="Filter by tag">
                          <SelectValue placeholder="Tag" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Tags</SelectItem>
                          {allTags.map(tag => (
                            <SelectItem key={tag} value={tag}>{tag}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}

                    <Button aria-label="Create new contact" onClick={() => setShowNewContactDialog(true)}>
                      <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
                      New Contact
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Bulk Actions Bar */}
            {selectedIds.length > 0 && (
              <Card className="mb-4 border-primary">
                <CardContent className="py-3">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                    <span className="text-sm font-medium">
                      {selectedIds.length} contact{selectedIds.length !== 1 ? 's' : ''} selected
                    </span>
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" onClick={handleBulkSendEmail}>
                        <Mail className="h-4 w-4 mr-1" aria-hidden="true" />
                        Send Email
                      </Button>
                      <Button size="sm" variant="outline" onClick={handleBulkAddTag}>
                        <Tag className="h-4 w-4 mr-1" aria-hidden="true" />
                        Add Tag
                      </Button>
                      <Button size="sm" variant="outline" onClick={handleBulkExport}>
                        <Download className="h-4 w-4 mr-1" aria-hidden="true" />
                        Export Selected
                      </Button>
                      <Button size="sm" variant="destructive" onClick={handleBulkDelete}>
                        <Trash2 className="h-4 w-4 mr-1" aria-hidden="true" />
                        Delete Selected
                      </Button>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="ml-auto"
                      onClick={() => setSelectedIds([])}
                    >
                      Clear Selection
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Delete Confirmation Modal */}
            <AccessibleModal
              isOpen={showDeleteConfirm}
              onClose={() => setShowDeleteConfirm(false)}
              title="Confirm Deletion"
              description={`Are you sure you want to delete ${selectedIds.length} selected contact(s)? This action cannot be undone.`}
              footer={
                <>
                  <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
                    Cancel
                  </Button>
                  <Button variant="destructive" onClick={confirmBulkDelete}>
                    Delete {selectedIds.length} Contact{selectedIds.length !== 1 ? 's' : ''}
                  </Button>
                </>
              }
            >
              <p className="text-muted-foreground">
                This will permanently remove {selectedIds.length} contact{selectedIds.length !== 1 ? 's' : ''} from your CRM.
              </p>
            </AccessibleModal>

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
                const isAllSelected = filteredContacts.length > 0 && selectedIds.length === filteredContacts.length;
                const isSomeSelected = selectedIds.length > 0 && selectedIds.length < filteredContacts.length;

                const contactColumns: TableColumn<Contact>[] = [
                  {
                    key: 'select',
                    header: 'Select',
                    width: '48px',
                    headerRender: () => (
                      <Checkbox
                        checked={isAllSelected}
                        ref={(el) => {
                          if (el) {
                            (el as unknown as HTMLButtonElement).dataset.indeterminate = String(isSomeSelected);
                          }
                        }}
                        onCheckedChange={(checked) => handleSelectAll(checked === true)}
                        aria-label={isAllSelected ? 'Deselect all contacts' : 'Select all contacts'}
                      />
                    ),
                    render: (_, row) => (
                      <Checkbox
                        checked={selectedIds.includes(row.id)}
                        onCheckedChange={(checked) => handleSelectOne(row.id, checked === true)}
                        aria-label={`Select ${row.first_name} ${row.last_name}`}
                        onClick={(e) => e.stopPropagation()}
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
                  <AccessibleTable<Contact>
                    caption="CRM Contacts"
                    hideCaption
                    columns={contactColumns}
                    data={filteredContacts}
                    loading={contactsLoading}
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
                );
              })()}
            </ErrorBoundary>
    </DashboardLayout>
  );
};

export default CRMContacts;
