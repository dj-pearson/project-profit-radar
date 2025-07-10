import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { LoadingState } from '@/components/ui/loading-spinner';
import { ErrorBoundary, ErrorState, EmptyState } from '@/components/ui/error-boundary';
import { ResponsiveContainer, ResponsiveGrid } from '@/components/layout/ResponsiveContainer';
import { useLoadingState } from '@/hooks/useLoadingState';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
  Tag
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
    
    if (!loading && user && userProfile && !userProfile.company_id) {
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
    
    return matchesSearch && matchesType && matchesStatus;
  }) || [];

  if (loading) {
    return <LoadingState message="Loading contacts..." />;
  }

  if (!user) {
    return null;
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen bg-background flex w-full">
        <AppSidebar />
        
        <div className="flex-1">
          {/* Header */}
          <nav className="border-b bg-background/95 backdrop-blur-sm">
            <div className="flex justify-between h-14 sm:h-16 px-3 sm:px-4 lg:px-6">
              <div className="flex items-center min-w-0 flex-1">
                <SidebarTrigger className="mr-2 sm:mr-3 flex-shrink-0" />
                <h1 className="text-base sm:text-lg lg:text-2xl font-bold text-foreground truncate">Contact Management</h1>
              </div>
              <div className="flex items-center space-x-2 sm:space-x-3 lg:space-x-4 flex-shrink-0">
                <span className="hidden md:block text-xs sm:text-sm text-muted-foreground truncate max-w-32 lg:max-w-none">
                  Welcome, {userProfile?.first_name || user.email}
                </span>
                <ThemeToggle />
                <Button variant="outline" size="sm" className="hidden sm:flex text-xs lg:text-sm px-2 lg:px-3" onClick={signOut}>
                  Sign Out
                </Button>
              </div>
            </div>
          </nav>

          {/* Main Content */}
          <ResponsiveContainer className="py-4 sm:py-6" padding="sm">
            
            {/* Filters and Actions */}
            <Card className="mb-6">
              <CardContent className="pt-6">
                <div className="flex flex-col lg:flex-row gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search contacts by name, email, company, or job title..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Select value={typeFilter} onValueChange={setTypeFilter}>
                      <SelectTrigger className="w-full sm:w-40">
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
                      <SelectTrigger className="w-full sm:w-40">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                        <SelectItem value="do_not_contact">Do Not Contact</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    <Dialog open={showNewContactDialog} onOpenChange={setShowNewContactDialog}>
                      <DialogTrigger asChild>
                        <Button>
                          <Plus className="h-4 w-4 mr-2" />
                          New Contact
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Create New Contact</DialogTitle>
                          <DialogDescription>
                            Add a new contact to your CRM system.
                          </DialogDescription>
                        </DialogHeader>
                        
                        <div className="grid gap-6 py-4">
                          {/* Basic Information */}
                          <div className="space-y-4">
                            <h3 className="text-lg font-medium">Contact Information</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <Label htmlFor="first_name">First Name *</Label>
                                <Input
                                  id="first_name"
                                  value={newContact.first_name || ''}
                                  onChange={(e) => setNewContact({...newContact, first_name: e.target.value})}
                                  placeholder="John"
                                />
                              </div>
                              <div>
                                <Label htmlFor="last_name">Last Name *</Label>
                                <Input
                                  id="last_name"
                                  value={newContact.last_name || ''}
                                  onChange={(e) => setNewContact({...newContact, last_name: e.target.value})}
                                  placeholder="Smith"
                                />
                              </div>
                              <div>
                                <Label htmlFor="email">Email</Label>
                                <Input
                                  id="email"
                                  type="email"
                                  value={newContact.email || ''}
                                  onChange={(e) => setNewContact({...newContact, email: e.target.value})}
                                  placeholder="john.smith@email.com"
                                />
                              </div>
                              <div>
                                <Label htmlFor="phone">Phone</Label>
                                <Input
                                  id="phone"
                                  value={newContact.phone || ''}
                                  onChange={(e) => setNewContact({...newContact, phone: e.target.value})}
                                  placeholder="(555) 123-4567"
                                />
                              </div>
                              <div>
                                <Label htmlFor="company_name">Company</Label>
                                <Input
                                  id="company_name"
                                  value={newContact.company_name || ''}
                                  onChange={(e) => setNewContact({...newContact, company_name: e.target.value})}
                                  placeholder="ABC Corporation"
                                />
                              </div>
                              <div>
                                <Label htmlFor="job_title">Job Title</Label>
                                <Input
                                  id="job_title"
                                  value={newContact.job_title || ''}
                                  onChange={(e) => setNewContact({...newContact, job_title: e.target.value})}
                                  placeholder="Property Manager"
                                />
                              </div>
                            </div>
                          </div>

                          {/* Contact Type and Status */}
                          <div className="space-y-4">
                            <h3 className="text-lg font-medium">Classification</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <Label htmlFor="contact_type">Contact Type</Label>
                                <Select value={newContact.contact_type} onValueChange={(value) => setNewContact({...newContact, contact_type: value})}>
                                  <SelectTrigger>
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
                                  <SelectTrigger>
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
                          </div>

                          {/* Notes */}
                          <div className="space-y-4">
                            <div>
                              <Label htmlFor="notes">Notes</Label>
                              <Textarea
                                id="notes"
                                value={newContact.notes || ''}
                                onChange={(e) => setNewContact({...newContact, notes: e.target.value})}
                                placeholder="Additional notes about this contact..."
                              />
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex justify-end space-x-2">
                          <Button variant="outline" onClick={() => setShowNewContactDialog(false)}>
                            Cancel
                          </Button>
                          <Button onClick={createContact}>
                            Create Contact
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Contacts List */}
            <ErrorBoundary>
              {contactsLoading ? (
                <LoadingState message="Loading contacts..." />
              ) : contactsError ? (
                <ErrorState 
                  error={contactsError} 
                  onRetry={() => loadContacts(loadContactsData)}
                />
              ) : !filteredContacts.length ? (
                <EmptyState
                  icon={Users}
                  title="No contacts found"
                  description={searchTerm ? "No contacts match your search criteria." : "Start building your contact database by adding your first contact."}
                  action={!searchTerm ? {
                    label: "Add First Contact",
                    onClick: () => setShowNewContactDialog(true)
                  } : undefined}
                />
              ) : (
                <ResponsiveGrid cols={{ default: 1, md: 2, lg: 3 }} gap="sm">
                  {filteredContacts.map((contact) => (
                    <Card key={contact.id} className="hover:shadow-md transition-shadow">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="text-lg">
                              {contact.first_name} {contact.last_name}
                            </CardTitle>
                            {contact.job_title && (
                              <CardDescription>{contact.job_title}</CardDescription>
                            )}
                          </div>
                          <div className="flex space-x-1">
                            <Badge variant="outline" className={`text-${getTypeColor(contact.contact_type)}-600`}>
                              {contact.contact_type}
                            </Badge>
                            <Badge variant="outline" className={`text-${getStatusColor(contact.relationship_status)}-600`}>
                              {contact.relationship_status}
                            </Badge>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {contact.company_name && (
                          <div className="flex items-center space-x-2">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">{contact.company_name}</span>
                          </div>
                        )}
                        {contact.email && (
                          <div className="flex items-center space-x-2">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm truncate">{contact.email}</span>
                          </div>
                        )}
                        {contact.phone && (
                          <div className="flex items-center space-x-2">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">{contact.phone}</span>
                          </div>
                        )}
                        {(contact.city || contact.state) && (
                          <div className="flex items-center space-x-2">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">
                              {[contact.city, contact.state].filter(Boolean).join(', ')}
                            </span>
                          </div>
                        )}
                        <div className="flex items-center justify-between pt-2">
                          <span className="text-xs text-muted-foreground">
                            Added {formatDate(contact.created_at)}
                          </span>
                          <div className="flex space-x-1">
                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </ResponsiveGrid>
              )}
            </ErrorBoundary>
          </ResponsiveContainer>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default CRMContacts;