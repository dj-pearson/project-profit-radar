import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { 
  Users, 
  PlusCircle,
  ExternalLink,
  Edit,
  Trash2,
  Phone,
  Mail,
  MapPin,
  User,
  Building,
  Star,
  AlertTriangle,
  Search
} from 'lucide-react';

interface ProjectContact {
  id: string;
  project_id: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  mobile_phone?: string;
  title?: string;
  company_name?: string;
  contact_type: 'client' | 'architect' | 'engineer' | 'subcontractor' | 'supplier' | 'inspector' | 'project_manager' | 'foreman' | 'other';
  role_description?: string;
  address?: string;
  notes?: string;
  is_primary: boolean;
  is_emergency_contact: boolean;
  is_active: boolean;
  created_at: string;
}

interface ProjectContactsProps {
  projectId: string;
  onNavigate: (path: string) => void;
}

const contactTypes = [
  { value: 'client', label: 'Client', icon: User, color: 'text-blue-600' },
  { value: 'architect', label: 'Architect', icon: Building, color: 'text-purple-600' },
  { value: 'engineer', label: 'Engineer', icon: Building, color: 'text-green-600' },
  { value: 'subcontractor', label: 'Subcontractor', icon: Users, color: 'text-orange-600' },
  { value: 'supplier', label: 'Supplier', icon: Building, color: 'text-yellow-600' },
  { value: 'inspector', label: 'Inspector', icon: User, color: 'text-red-600' },
  { value: 'project_manager', label: 'Project Manager', icon: User, color: 'text-indigo-600' },
  { value: 'foreman', label: 'Foreman', icon: User, color: 'text-teal-600' },
  { value: 'other', label: 'Other', icon: User, color: 'text-gray-600' }
];

export const ProjectContacts: React.FC<ProjectContactsProps> = ({
  projectId,
  onNavigate
}) => {
  const { userProfile } = useAuth();
  const [contacts, setContacts] = useState<ProjectContact[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<ProjectContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [showAddContact, setShowAddContact] = useState(false);
  const [editingContact, setEditingContact] = useState<ProjectContact | null>(null);

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    mobile_phone: '',
    title: '',
    company_name: '',
    contact_type: 'client' as const,
    role_description: '',
    address: '',
    notes: '',
    is_primary: false,
    is_emergency_contact: false
  });

  useEffect(() => {
    if (projectId && userProfile?.company_id) {
      loadContacts();
    }
  }, [projectId, userProfile?.company_id]);

  useEffect(() => {
    filterContacts();
  }, [contacts, searchTerm, filterType]);

  const loadContacts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('project_contacts')
        .select('*')
        .eq('project_id', projectId)
        .eq('is_active', true)
        .order('is_primary', { ascending: false })
        .order('last_name');

      if (error) throw error;
      setContacts(data || []);
    } catch (error: any) {
      console.error('Error loading project contacts:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load project contacts"
      });
    } finally {
      setLoading(false);
    }
  };

  const filterContacts = () => {
    let filtered = contacts;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(contact =>
        `${contact.first_name} ${contact.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contact.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contact.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contact.title?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by type
    if (filterType && filterType !== 'all') {
      filtered = filtered.filter(contact => contact.contact_type === filterType);
    }

    setFilteredContacts(filtered);
  };

  const resetForm = () => {
    setFormData({
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      mobile_phone: '',
      title: '',
      company_name: '',
      contact_type: 'client',
      role_description: '',
      address: '',
      notes: '',
      is_primary: false,
      is_emergency_contact: false
    });
  };

  const handleCreateContact = async () => {
    try {
      const contactData = {
        ...formData,
        project_id: projectId,
        company_id: userProfile?.company_id,
        created_by: userProfile?.id
      };

      const { data, error } = await supabase
        .from('project_contacts')
        .insert([contactData])
        .select()
        .single();

      if (error) throw error;

      setContacts([...contacts, data]);
      resetForm();
      setShowAddContact(false);

      toast({
        title: "Success",
        description: "Contact added successfully"
      });
    } catch (error: any) {
      console.error('Error creating contact:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to add contact"
      });
    }
  };

  const handleUpdateContact = async () => {
    if (!editingContact) return;

    try {
      const { data, error } = await supabase
        .from('project_contacts')
        .update(formData)
        .eq('id', editingContact.id)
        .select()
        .single();

      if (error) throw error;

      setContacts(contacts.map(c => c.id === editingContact.id ? data : c));
      resetForm();
      setEditingContact(null);

      toast({
        title: "Success",
        description: "Contact updated successfully"
      });
    } catch (error: any) {
      console.error('Error updating contact:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to update contact"
      });
    }
  };

  const handleDeleteContact = async (contactId: string) => {
    try {
      const { error } = await supabase
        .from('project_contacts')
        .update({ is_active: false })
        .eq('id', contactId);

      if (error) throw error;

      setContacts(contacts.filter(c => c.id !== contactId));
      toast({
        title: "Success",
        description: "Contact removed successfully"
      });
    } catch (error: any) {
      console.error('Error deleting contact:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to remove contact"
      });
    }
  };

  const startEdit = (contact: ProjectContact) => {
    setFormData({
      first_name: contact.first_name,
      last_name: contact.last_name,
      email: contact.email || '',
      phone: contact.phone || '',
      mobile_phone: contact.mobile_phone || '',
      title: contact.title || '',
      company_name: contact.company_name || '',
      contact_type: contact.contact_type,
      role_description: contact.role_description || '',
      address: contact.address || '',
      notes: contact.notes || '',
      is_primary: contact.is_primary,
      is_emergency_contact: contact.is_emergency_contact
    });
    setEditingContact(contact);
  };

  const getContactTypeInfo = (type: string) => {
    return contactTypes.find(t => t.value === type) || contactTypes[contactTypes.length - 1];
  };

  const getContactStats = () => {
    const total = contacts.length;
    const primary = contacts.filter(c => c.is_primary).length;
    const emergency = contacts.filter(c => c.is_emergency_contact).length;
    const types = contactTypes.map(type => ({
      ...type,
      count: contacts.filter(c => c.contact_type === type.value).length
    })).filter(type => type.count > 0);

    return { total, primary, emergency, types };
  };

  const stats = getContactStats();

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Contacts</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Users className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Primary Contacts</p>
                <p className="text-2xl font-bold">{stats.primary}</p>
              </div>
              <Star className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Emergency Contacts</p>
                <p className="text-2xl font-bold">{stats.emergency}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Contacts List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center">
              <Users className="h-5 w-5 mr-2" />
              Project Contacts ({filteredContacts.length})
            </span>
            <div className="flex gap-2">
              <Button 
                size="sm" 
                onClick={() => onNavigate(`/crm/contacts?project=${projectId}`)}
                variant="outline"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                CRM Contacts
              </Button>
              <Dialog open={showAddContact} onOpenChange={setShowAddContact}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Add Contact
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Add Project Contact</DialogTitle>
                    <DialogDescription>
                      Add a new contact for this project
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="first_name">First Name *</Label>
                        <Input
                          id="first_name"
                          value={formData.first_name}
                          onChange={(e) => setFormData({...formData, first_name: e.target.value})}
                          placeholder="John"
                        />
                      </div>
                      <div>
                        <Label htmlFor="last_name">Last Name *</Label>
                        <Input
                          id="last_name"
                          value={formData.last_name}
                          onChange={(e) => setFormData({...formData, last_name: e.target.value})}
                          placeholder="Smith"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({...formData, email: e.target.value})}
                          placeholder="john@example.com"
                        />
                      </div>
                      <div>
                        <Label htmlFor="phone">Phone</Label>
                        <Input
                          id="phone"
                          type="tel"
                          value={formData.phone}
                          onChange={(e) => setFormData({...formData, phone: e.target.value})}
                          placeholder="(555) 123-4567"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="mobile_phone">Mobile Phone</Label>
                        <Input
                          id="mobile_phone"
                          type="tel"
                          value={formData.mobile_phone}
                          onChange={(e) => setFormData({...formData, mobile_phone: e.target.value})}
                          placeholder="(555) 987-6543"
                        />
                      </div>
                      <div>
                        <Label htmlFor="title">Title</Label>
                        <Input
                          id="title"
                          value={formData.title}
                          onChange={(e) => setFormData({...formData, title: e.target.value})}
                          placeholder="Project Manager"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="company_name">Company</Label>
                        <Input
                          id="company_name"
                          value={formData.company_name}
                          onChange={(e) => setFormData({...formData, company_name: e.target.value})}
                          placeholder="ABC Construction"
                        />
                      </div>
                      <div>
                        <Label htmlFor="contact_type">Contact Type</Label>
                        <Select value={formData.contact_type} onValueChange={(value: any) => setFormData({...formData, contact_type: value})}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {contactTypes.map((type) => (
                              <SelectItem key={type.value} value={type.value}>
                                {type.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="role_description">Role Description</Label>
                      <Input
                        id="role_description"
                        value={formData.role_description}
                        onChange={(e) => setFormData({...formData, role_description: e.target.value})}
                        placeholder="Describe their role in the project..."
                      />
                    </div>

                    <div>
                      <Label htmlFor="address">Address</Label>
                      <Textarea
                        id="address"
                        value={formData.address}
                        onChange={(e) => setFormData({...formData, address: e.target.value})}
                        placeholder="Full address..."
                        rows={2}
                      />
                    </div>

                    <div>
                      <Label htmlFor="notes">Notes</Label>
                      <Textarea
                        id="notes"
                        value={formData.notes}
                        onChange={(e) => setFormData({...formData, notes: e.target.value})}
                        placeholder="Additional notes..."
                        rows={3}
                      />
                    </div>

                    <div className="flex gap-4">
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="is_primary"
                          checked={formData.is_primary}
                          onCheckedChange={(checked) => setFormData({...formData, is_primary: checked as boolean})}
                        />
                        <Label htmlFor="is_primary">Primary Contact</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="is_emergency_contact"
                          checked={formData.is_emergency_contact}
                          onCheckedChange={(checked) => setFormData({...formData, is_emergency_contact: checked as boolean})}
                        />
                        <Label htmlFor="is_emergency_contact">Emergency Contact</Label>
                      </div>
                    </div>

                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => {
                        setShowAddContact(false);
                        resetForm();
                      }}>
                        Cancel
                      </Button>
                      <Button 
                        onClick={handleCreateContact}
                        disabled={!formData.first_name || !formData.last_name}
                      >
                        Add Contact
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardTitle>
          <CardDescription>Manage contacts for this project</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Search and Filter */}
          <div className="flex gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search contacts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {contactTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {filteredContacts.length > 0 ? (
            <div className="space-y-4">
              {filteredContacts.map((contact) => {
                const typeInfo = getContactTypeInfo(contact.contact_type);
                const Icon = typeInfo.icon;
                
                return (
                  <div key={contact.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Icon className={`h-5 w-5 ${typeInfo.color}`} />
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-medium">
                              {contact.first_name} {contact.last_name}
                            </span>
                            {contact.is_primary && (
                              <Badge variant="secondary" className="text-xs">
                                <Star className="h-3 w-3 mr-1" />
                                Primary
                              </Badge>
                            )}
                            {contact.is_emergency_contact && (
                              <Badge variant="destructive" className="text-xs">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                Emergency
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                            <Badge variant="outline" className="capitalize">
                              {typeInfo.label}
                            </Badge>
                            {contact.title && <span>{contact.title}</span>}
                            {contact.company_name && <span>at {contact.company_name}</span>}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => startEdit(contact)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleDeleteContact(contact.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Contact Details */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                      {contact.email && (
                        <div className="flex items-center space-x-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <a 
                            href={`mailto:${contact.email}`}
                            className="text-blue-600 hover:underline"
                          >
                            {contact.email}
                          </a>
                        </div>
                      )}
                      {contact.phone && (
                        <div className="flex items-center space-x-2">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <a 
                            href={`tel:${contact.phone}`}
                            className="text-blue-600 hover:underline"
                          >
                            {contact.phone}
                          </a>
                        </div>
                      )}
                      {contact.mobile_phone && (
                        <div className="flex items-center space-x-2">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <a 
                            href={`tel:${contact.mobile_phone}`}
                            className="text-blue-600 hover:underline"
                          >
                            {contact.mobile_phone} (Mobile)
                          </a>
                        </div>
                      )}
                    </div>

                    {contact.address && (
                      <div className="flex items-start space-x-2 text-sm">
                        <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <span>{contact.address}</span>
                      </div>
                    )}

                    {contact.role_description && (
                      <div className="text-sm">
                        <span className="text-muted-foreground">Role:</span>
                        <p className="mt-1">{contact.role_description}</p>
                      </div>
                    )}

                    {contact.notes && (
                      <div className="text-sm">
                        <span className="text-muted-foreground">Notes:</span>
                        <p className="mt-1">{contact.notes}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">
                {searchTerm || filterType !== 'all' 
                  ? 'No contacts match your search criteria'
                  : 'No contacts added for this project yet'
                }
              </p>
              {!searchTerm && filterType === 'all' && (
                <Button onClick={() => setShowAddContact(true)} variant="outline">
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Add First Contact
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Contact Dialog */}
      <Dialog open={!!editingContact} onOpenChange={() => setEditingContact(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Contact</DialogTitle>
            <DialogDescription>
              Update contact information
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit_first_name">First Name *</Label>
                <Input
                  id="edit_first_name"
                  value={formData.first_name}
                  onChange={(e) => setFormData({...formData, first_name: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="edit_last_name">Last Name *</Label>
                <Input
                  id="edit_last_name"
                  value={formData.last_name}
                  onChange={(e) => setFormData({...formData, last_name: e.target.value})}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit_email">Email</Label>
                <Input
                  id="edit_email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="edit_phone">Phone</Label>
                <Input
                  id="edit_phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit_mobile_phone">Mobile Phone</Label>
                <Input
                  id="edit_mobile_phone"
                  type="tel"
                  value={formData.mobile_phone}
                  onChange={(e) => setFormData({...formData, mobile_phone: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="edit_title">Title</Label>
                <Input
                  id="edit_title"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit_company_name">Company</Label>
                <Input
                  id="edit_company_name"
                  value={formData.company_name}
                  onChange={(e) => setFormData({...formData, company_name: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="edit_contact_type">Contact Type</Label>
                <Select value={formData.contact_type} onValueChange={(value: any) => setFormData({...formData, contact_type: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {contactTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="edit_role_description">Role Description</Label>
              <Input
                id="edit_role_description"
                value={formData.role_description}
                onChange={(e) => setFormData({...formData, role_description: e.target.value})}
              />
            </div>

            <div>
              <Label htmlFor="edit_address">Address</Label>
              <Textarea
                id="edit_address"
                value={formData.address}
                onChange={(e) => setFormData({...formData, address: e.target.value})}
                rows={2}
              />
            </div>

            <div>
              <Label htmlFor="edit_notes">Notes</Label>
              <Textarea
                id="edit_notes"
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                rows={3}
              />
            </div>

            <div className="flex gap-4">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="edit_is_primary"
                  checked={formData.is_primary}
                  onCheckedChange={(checked) => setFormData({...formData, is_primary: checked as boolean})}
                />
                <Label htmlFor="edit_is_primary">Primary Contact</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="edit_is_emergency_contact"
                  checked={formData.is_emergency_contact}
                  onCheckedChange={(checked) => setFormData({...formData, is_emergency_contact: checked as boolean})}
                />
                <Label htmlFor="edit_is_emergency_contact">Emergency Contact</Label>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => {
                setEditingContact(null);
                resetForm();
              }}>
                Cancel
              </Button>
              <Button 
                onClick={handleUpdateContact}
                disabled={!formData.first_name || !formData.last_name}
              >
                Update Contact
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
