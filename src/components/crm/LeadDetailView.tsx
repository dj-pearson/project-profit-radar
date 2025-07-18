import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { ActivityStream } from './ActivityStream';
import { LeadScoring } from './LeadScoring';
import { format } from 'date-fns';
import { 
  User, 
  Building2, 
  Phone, 
  Mail, 
  Calendar, 
  DollarSign,
  Star,
  MessageSquare,
  FileText,
  Activity,
  Plus,
  Save,
  ArrowLeft,
  Clock,
  Target,
  CheckCircle2,
  AlertCircle,
  Edit,
  PhoneCall,
  Send,
  CalendarPlus,
  Users,
  MapPin,
  Briefcase
} from 'lucide-react';

interface Lead {
  id: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  company_name?: string;
  job_title?: string;
  project_name?: string;
  project_type?: string;
  project_description?: string;
  project_address?: string;
  project_city?: string;
  project_state?: string;
  project_zip?: string;
  estimated_budget?: number;
  budget_range?: string;
  desired_start_date?: string;
  desired_completion_date?: string;
  timeline_flexibility?: string;
  lead_source: string;
  lead_source_detail?: string;
  status: string;
  priority: string;
  assigned_to?: string;
  property_type?: string;
  permits_required?: boolean;
  hoa_approval_needed?: boolean;
  financing_secured?: boolean;
  financing_type?: string;
  site_accessible?: boolean;
  site_conditions?: string;
  decision_maker?: boolean;
  decision_timeline?: string;
  next_follow_up_date?: string;
  last_contact_date?: string;
  notes?: string;
  tags?: string[];
  created_at: string;
  updated_at: string;
}

interface Activity {
  id: string;
  activity_type: string;
  description?: string;
  activity_date: string;
  status?: string;
  priority?: string;
  lead_id?: string;
  opportunity_id?: string;
  created_by: string;
  created_at: string;
}

interface Note {
  id: string;
  content: string;
  note_type: string;
  created_at: string;
  created_by: string;
  user_profiles?: {
    first_name: string;
    last_name: string;
  };
}

interface LeadDetailViewProps {
  leadId: string;
  onBack: () => void;
  onUpdate: (leadId: string, updates: Partial<Lead>) => void;
}

export const LeadDetailView: React.FC<LeadDetailViewProps> = ({ leadId, onBack, onUpdate }) => {
  const { user, userProfile } = useAuth();
  const [lead, setLead] = useState<Lead | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [newNote, setNewNote] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Lead>>({});
  const [loading, setLoading] = useState(true);
  const [showActivityDialog, setShowActivityDialog] = useState(false);
  const [newActivity, setNewActivity] = useState({
    activity_type: 'call',
    description: '',
    activity_date: new Date().toISOString().split('T')[0]
  });
  const { toast } = useToast();

  useEffect(() => {
    loadLeadDetails();
  }, [leadId]);

  const loadLeadDetails = async () => {
    try {
      setLoading(true);
      
      // Load lead data
      const { data: leadData, error: leadError } = await supabase
        .from('leads')
        .select('*')
        .eq('id', leadId)
        .single();

      if (leadError) throw leadError;
      setLead(leadData);
      setEditForm(leadData);

      // Load activities
      const { data: activitiesData } = await supabase
        .from('lead_activities')
        .select('*')
        .eq('lead_id', leadId)
        .order('activity_date', { ascending: false });

      if (activitiesData) setActivities(activitiesData);

      // Load notes
      const { data: notesData } = await supabase
        .from('lead_notes')
        .select(`
          *,
          user_profiles:created_by (
            first_name,
            last_name
          )
        `)
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false });

      if (notesData) setNotes(notesData);

    } catch (error: any) {
      toast({
        title: "Error loading lead details",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!lead) return;

    try {
      const { error } = await supabase
        .from('leads')
        .update(editForm)
        .eq('id', leadId);

      if (error) throw error;

      setLead({ ...lead, ...editForm });
      onUpdate(leadId, editForm);
      setIsEditing(false);
      
      toast({
        title: "Lead updated successfully",
        description: "Changes have been saved"
      });
    } catch (error: any) {
      toast({
        title: "Error updating lead",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const addNote = async () => {
    if (!newNote.trim() || !userProfile?.company_id) return;

    try {
      const { data, error } = await supabase
        .from('lead_notes')
        .insert({
          lead_id: leadId,
          content: newNote,
          note_type: 'general',
          company_id: userProfile.company_id,
          created_by: user?.id
        })
        .select(`
          *,
          user_profiles:created_by (
            first_name,
            last_name
          )
        `)
        .single();

      if (error) throw error;

      setNotes([data, ...notes]);
      setNewNote('');
      
      toast({
        title: "Note added",
        description: "Your note has been saved"
      });
    } catch (error: any) {
      toast({
        title: "Error adding note",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const addActivity = async () => {
    if (!newActivity.description.trim() || !userProfile?.company_id) return;

    try {
      const { data, error } = await supabase
        .from('lead_activities')
        .insert({
          lead_id: leadId,
          activity_type: newActivity.activity_type,
          description: newActivity.description,
          subject: newActivity.activity_type,
          activity_date: newActivity.activity_date,
          company_id: userProfile.company_id,
          created_by: user?.id
        })
        .select()
        .single();

      if (error) throw error;

      setActivities([data, ...activities]);
      setNewActivity({
        activity_type: 'call',
        description: '',
        activity_date: new Date().toISOString().split('T')[0]
      });
      setShowActivityDialog(false);
      
      toast({
        title: "Activity logged",
        description: "Activity has been recorded"
      });
    } catch (error: any) {
      toast({
        title: "Error adding activity",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const getStatusColor = (status: string) => {
    const colors = {
      new: 'blue',
      contacted: 'yellow',
      qualified: 'green',
      proposal_sent: 'purple',
      negotiating: 'orange',
      won: 'emerald',
      lost: 'red'
    };
    return colors[status as keyof typeof colors] || 'gray';
  };

  const getPriorityColor = (priority: string) => {
    const colors = {
      low: 'green',
      medium: 'yellow',
      high: 'orange',
      urgent: 'red'
    };
    return colors[priority as keyof typeof colors] || 'gray';
  };

  if (loading) {
    return <div className="p-6">Loading lead details...</div>;
  }

  if (!lead) {
    return <div className="p-6">Lead not found</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{lead.first_name} {lead.last_name}</h1>
            <p className="text-muted-foreground">{lead.company_name || 'Individual'}</p>
          </div>
          <div className="flex space-x-2">
            <Badge variant="outline" className={`border-${getStatusColor(lead.status)}-500 text-${getStatusColor(lead.status)}-700`}>
              {lead.status}
            </Badge>
            <Badge variant="outline" className={`border-${getPriorityColor(lead.priority)}-500 text-${getPriorityColor(lead.priority)}-700`}>
              {lead.priority} Priority
            </Badge>
          </div>
        </div>
        <div className="flex space-x-2">
          {isEditing ? (
            <>
              <Button variant="outline" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave}>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </Button>
            </>
          ) : (
            <Button onClick={() => setIsEditing(true)}>
              Edit Lead
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="col-span-2 space-y-6">
          <Tabs defaultValue="overview" className="w-full">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="activities">Activities</TabsTrigger>
              <TabsTrigger value="notes">Notes</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Lead Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {isEditing ? (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>First Name</Label>
                        <Input
                          value={editForm.first_name || ''}
                          onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label>Last Name</Label>
                        <Input
                          value={editForm.last_name || ''}
                          onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label>Email</Label>
                        <Input
                          value={editForm.email || ''}
                          onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label>Phone</Label>
                        <Input
                          value={editForm.phone || ''}
                          onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label>Status</Label>
                        <Select value={editForm.status} onValueChange={(value) => setEditForm({ ...editForm, status: value })}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="new">New</SelectItem>
                            <SelectItem value="contacted">Contacted</SelectItem>
                            <SelectItem value="qualified">Qualified</SelectItem>
                            <SelectItem value="proposal_sent">Proposal Sent</SelectItem>
                            <SelectItem value="negotiating">Negotiating</SelectItem>
                            <SelectItem value="won">Won</SelectItem>
                            <SelectItem value="lost">Lost</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Priority</Label>
                        <Select value={editForm.priority} onValueChange={(value) => setEditForm({ ...editForm, priority: value })}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="urgent">Urgent</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-3">
                        <div className="flex items-center space-x-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span>{lead.first_name} {lead.last_name}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <span>{lead.email}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <span>{lead.phone}</span>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div className="flex items-center space-x-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          <span>{lead.company_name || 'Individual'}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <DollarSign className="h-4 w-4 text-muted-foreground" />
                          <span>${lead.estimated_budget?.toLocaleString() || 'TBD'}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span>Next follow-up: {lead.next_follow_up_date || 'Not scheduled'}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Project Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p><strong>Project Name:</strong> {lead.project_name || 'Not specified'}</p>
                    <p><strong>Project Type:</strong> {lead.project_type || 'Not specified'}</p>
                    <p><strong>Lead Source:</strong> {lead.lead_source}</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="activities" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Activity className="h-5 w-5" />
                    <span>Recent Activities</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {activities.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">No activities recorded yet</p>
                  ) : (
                    <div className="space-y-4">
                      {activities.map((activity) => (
                        <div key={activity.id} className="border-l-2 border-blue-500 pl-4 pb-4">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium">{activity.activity_type}</h4>
                            <span className="text-sm text-muted-foreground">
                              {new Date(activity.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">{activity.description}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="notes" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <MessageSquare className="h-5 w-5" />
                    <span>Notes</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex space-x-2">
                    <Textarea
                      placeholder="Add a note..."
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      className="flex-1"
                    />
                    <Button onClick={addNote}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  {notes.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">No notes yet</p>
                  ) : (
                    <div className="space-y-4">
                      {notes.map((note) => (
                        <div key={note.id} className="p-4 border rounded-lg">
                          <p className="text-sm">{note.content}</p>
                          <p className="text-xs text-muted-foreground mt-2">
                            {new Date(note.created_at).toLocaleString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Star className="h-5 w-5" />
                <span>Lead Score</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">85</div>
                <p className="text-sm text-muted-foreground">out of 100</p>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div className="bg-blue-600 h-2 rounded-full" style={{ width: '85%' }}></div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button className="w-full" variant="outline">
                <Phone className="h-4 w-4 mr-2" />
                Call Lead
              </Button>
              <Button className="w-full" variant="outline">
                <Mail className="h-4 w-4 mr-2" />
                Send Email
              </Button>
              <Button className="w-full" variant="outline">
                <Calendar className="h-4 w-4 mr-2" />
                Schedule Meeting
              </Button>
              <Button className="w-full" variant="outline">
                <FileText className="h-4 w-4 mr-2" />
                Create Proposal
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};