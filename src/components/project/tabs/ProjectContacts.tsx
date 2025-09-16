import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { 
  Users, 
  Phone,
  Mail,
  Building,
  User,
  Crown,
  PlusCircle,
  ExternalLink
} from 'lucide-react';

interface ProjectContactsProps {
  projectId: string;
}

interface ProjectContact {
  id: string;
  contact_id: string;
  role: string | null;
  is_primary: boolean | null;
  contacts: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    company_name: string | null;
    email: string | null;
    phone: string | null;
    contact_type: string;
  };
}

export const ProjectContacts: React.FC<ProjectContactsProps> = ({ projectId }) => {
  const { userProfile } = useAuth();
  const [contacts, setContacts] = useState<ProjectContact[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (projectId && userProfile?.company_id) {
      loadContacts();
    }
  }, [projectId, userProfile?.company_id]);

  const loadContacts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('project_contacts')
        .select(`
          *,
          contacts (
            id,
            first_name,
            last_name,
            company_name,
            email,
            phone,
            contact_type
          )
        `)
        .eq('project_id', projectId);

      if (error) throw error;
      setContacts(data || []);
    } catch (error: any) {
      console.error('Error loading contacts:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load project contacts"
      });
    } finally {
      setLoading(false);
    }
  };

  const getContactTypeColor = (type: string) => {
    switch (type) {
      case 'client': return 'bg-blue-100 text-blue-800';
      case 'contractor': return 'bg-green-100 text-green-800';
      case 'supplier': return 'bg-orange-100 text-orange-800';
      case 'consultant': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleColor = (role: string | null) => {
    if (!role) return 'bg-gray-100 text-gray-800';
    switch (role.toLowerCase()) {
      case 'project manager': return 'bg-indigo-100 text-indigo-800';
      case 'architect': return 'bg-teal-100 text-teal-800';
      case 'engineer': return 'bg-cyan-100 text-cyan-800';
      case 'superintendent': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center">
            <Users className="h-5 w-5 mr-2" />
            Project Contacts ({contacts.length})
          </span>
          <div className="flex gap-2">
            <Button 
              size="sm" 
              onClick={() => window.open('/contacts', '_blank')}
              variant="outline"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Manage Contacts
            </Button>
          </div>
        </CardTitle>
        <CardDescription>
          Key contacts and stakeholders for this project
        </CardDescription>
      </CardHeader>
      <CardContent>
        {contacts.length > 0 ? (
          <div className="space-y-4">
            {contacts.map((projectContact) => {
              const contact = projectContact.contacts;
              const fullName = `${contact.first_name || ''} ${contact.last_name || ''}`.trim();
              
              return (
                <div key={projectContact.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center space-x-2">
                        <User className="h-5 w-5 text-muted-foreground" />
                        <span className="font-medium text-lg">
                          {fullName || 'Unknown Contact'}
                        </span>
                        {projectContact.is_primary && (
                          <span title="Primary Contact">
                            <Crown className="h-4 w-4 text-yellow-500" />
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge className={getContactTypeColor(contact.contact_type)}>
                        {contact.contact_type}
                      </Badge>
                      {projectContact.role && (
                        <Badge className={getRoleColor(projectContact.role)}>
                          {projectContact.role}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {contact.company_name && (
                    <div className="flex items-center space-x-2 text-sm">
                      <Building className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Company:</span>
                      <span className="font-medium">{contact.company_name}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    {contact.email && (
                      <div className="flex items-center space-x-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Email:</span>
                        <a 
                          href={`mailto:${contact.email}`}
                          className="text-primary hover:underline"
                        >
                          {contact.email}
                        </a>
                      </div>
                    )}
                    {contact.phone && (
                      <div className="flex items-center space-x-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Phone:</span>
                        <a 
                          href={`tel:${contact.phone}`}
                          className="text-primary hover:underline"
                        >
                          {contact.phone}
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8">
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">No contacts assigned to this project yet</p>
            <Button 
              onClick={() => window.open('/contacts', '_blank')} 
              variant="outline"
            >
              <PlusCircle className="h-4 w-4 mr-2" />
              Add Project Contacts
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ProjectContacts;