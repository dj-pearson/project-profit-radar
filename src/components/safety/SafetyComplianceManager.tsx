import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertTriangle, Shield, Calendar, FileText, Camera, Users, CheckCircle, XCircle, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface SafetyIncident {
  id: string;
  type: 'injury' | 'near_miss' | 'property_damage' | 'environmental';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  location: string;
  reportedBy: string;
  reportedAt: Date;
  status: 'reported' | 'investigating' | 'resolved';
  photos: string[];
  witnesses: string[];
  corrective_actions: string;
}

interface ComplianceItem {
  id: string;
  requirement: string;
  category: 'osha' | 'epa' | 'dot' | 'local';
  dueDate: Date;
  status: 'compliant' | 'warning' | 'overdue';
  assignedTo: string;
  documentation: string[];
  notes: string;
}

interface SafetyMeeting {
  id: string;
  title: string;
  date: Date;
  attendees: string[];
  topics: string[];
  duration: number;
  documentation: string;
  followUpActions: string[];
}

export const SafetyComplianceManager: React.FC = () => {
  const [activeTab, setActiveTab] = useState('incidents');
  const [incidents, setIncidents] = useState<SafetyIncident[]>([]);
  const [compliance, setCompliance] = useState<ComplianceItem[]>([]);
  const [meetings, setMeetings] = useState<SafetyMeeting[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Mock data for demonstration
  useEffect(() => {
    const mockIncidents: SafetyIncident[] = [
      {
        id: '1',
        type: 'near_miss',
        severity: 'medium',
        description: 'Worker almost struck by falling debris',
        location: 'Building A - 3rd Floor',
        reportedBy: 'John Smith',
        reportedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        status: 'investigating',
        photos: [],
        witnesses: ['Mike Johnson', 'Sarah Wilson'],
        corrective_actions: 'Install additional safety netting'
      },
      {
        id: '2',
        type: 'injury',
        severity: 'low',
        description: 'Minor cut on hand from sharp edge',
        location: 'Workshop',
        reportedBy: 'Lisa Brown',
        reportedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        status: 'resolved',
        photos: [],
        witnesses: [],
        corrective_actions: 'Edge guards installed, first aid provided'
      }
    ];

    const mockCompliance: ComplianceItem[] = [
      {
        id: '1',
        requirement: 'Monthly Safety Training',
        category: 'osha',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        status: 'warning',
        assignedTo: 'Safety Manager',
        documentation: [],
        notes: 'Schedule next training session'
      },
      {
        id: '2',
        requirement: 'Equipment Inspection - Crane #1',
        category: 'osha',
        dueDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        status: 'overdue',
        assignedTo: 'Equipment Supervisor',
        documentation: [],
        notes: 'Critical - Schedule immediately'
      }
    ];

    const mockMeetings: SafetyMeeting[] = [
      {
        id: '1',
        title: 'Weekly Toolbox Talk - Fall Protection',
        date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        attendees: ['John Smith', 'Mike Johnson', 'Sarah Wilson', 'Tom Davis'],
        topics: ['Fall protection equipment', 'Proper harness use', 'Anchor points'],
        duration: 30,
        documentation: 'All attendees signed safety acknowledgment forms',
        followUpActions: ['Check harness inventory', 'Schedule advanced training']
      }
    ];

    setIncidents(mockIncidents);
    setCompliance(mockCompliance);
    setMeetings(mockMeetings);
  }, []);

  const getIncidentIcon = (type: string) => {
    switch (type) {
      case 'injury': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'near_miss': return <Shield className="h-4 w-4 text-yellow-500" />;
      case 'property_damage': return <XCircle className="h-4 w-4 text-orange-500" />;
      default: return <AlertTriangle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getComplianceStatus = (status: string) => {
    switch (status) {
      case 'compliant': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warning': return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'overdue': return <XCircle className="h-4 w-4 text-red-500" />;
      default: return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const handleReportIncident = async () => {
    setLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast({
        title: "Incident Reported",
        description: "Safety incident has been logged successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to report incident. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleScheduleMeeting = async () => {
    setLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast({
        title: "Meeting Scheduled",
        description: "Safety meeting has been scheduled successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to schedule meeting. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Safety & Compliance</h2>
          <p className="text-muted-foreground">Manage workplace safety and regulatory compliance</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleReportIncident} disabled={loading}>
            <AlertTriangle className="h-4 w-4 mr-2" />
            Report Incident
          </Button>
          <Button variant="outline" onClick={handleScheduleMeeting} disabled={loading}>
            <Calendar className="h-4 w-4 mr-2" />
            Schedule Meeting
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="incidents">Safety Incidents</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
          <TabsTrigger value="meetings">Safety Meetings</TabsTrigger>
        </TabsList>

        <TabsContent value="incidents" className="space-y-4">
          <div className="grid gap-4">
            {incidents.map((incident) => (
              <Card key={incident.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      {getIncidentIcon(incident.type)}
                      {incident.type.replace('_', ' ').toUpperCase()} - {incident.location}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge className={`${getSeverityColor(incident.severity)} text-white`}>
                        {incident.severity.toUpperCase()}
                      </Badge>
                      <Badge variant={incident.status === 'resolved' ? 'default' : 'secondary'}>
                        {incident.status.toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <p className="text-sm">{incident.description}</p>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Reported by:</span> {incident.reportedBy}
                      </div>
                      <div>
                        <span className="font-medium">Date:</span> {incident.reportedAt.toLocaleDateString()}
                      </div>
                    </div>
                    {incident.witnesses.length > 0 && (
                      <div className="text-sm">
                        <span className="font-medium">Witnesses:</span> {incident.witnesses.join(', ')}
                      </div>
                    )}
                    {incident.corrective_actions && (
                      <div className="text-sm">
                        <span className="font-medium">Corrective Actions:</span> {incident.corrective_actions}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="compliance" className="space-y-4">
          <div className="grid gap-4">
            {compliance.map((item) => (
              <Card key={item.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      {getComplianceStatus(item.status)}
                      {item.requirement}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{item.category.toUpperCase()}</Badge>
                      <Badge variant={item.status === 'compliant' ? 'default' : 'destructive'}>
                        {item.status.toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Due Date:</span> {item.dueDate.toLocaleDateString()}
                      </div>
                      <div>
                        <span className="font-medium">Assigned to:</span> {item.assignedTo}
                      </div>
                    </div>
                    {item.notes && (
                      <div className="text-sm">
                        <span className="font-medium">Notes:</span> {item.notes}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="meetings" className="space-y-4">
          <div className="grid gap-4">
            {meetings.map((meeting) => (
              <Card key={meeting.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Users className="h-4 w-4" />
                      {meeting.title}
                    </CardTitle>
                    <Badge variant="outline">{meeting.duration} min</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="text-sm">
                      <span className="font-medium">Date:</span> {meeting.date.toLocaleDateString()}
                    </div>
                    <div className="text-sm">
                      <span className="font-medium">Attendees ({meeting.attendees.length}):</span> {meeting.attendees.join(', ')}
                    </div>
                    <div className="text-sm">
                      <span className="font-medium">Topics:</span>
                      <ul className="list-disc list-inside ml-4 mt-1">
                        {meeting.topics.map((topic, index) => (
                          <li key={index}>{topic}</li>
                        ))}
                      </ul>
                    </div>
                    {meeting.followUpActions.length > 0 && (
                      <div className="text-sm">
                        <span className="font-medium">Follow-up Actions:</span>
                        <ul className="list-disc list-inside ml-4 mt-1">
                          {meeting.followUpActions.map((action, index) => (
                            <li key={index}>{action}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};