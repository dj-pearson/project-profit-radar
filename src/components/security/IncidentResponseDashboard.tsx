import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  AlertTriangle, 
  Shield, 
  Clock, 
  Users, 
  FileText, 
  CheckCircle, 
  AlertCircle,
  Phone,
  Mail,
  MessageSquare,
  Activity,
  TrendingUp,
  Database
} from 'lucide-react';

interface SecurityIncident {
  id: string;
  title: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  status: 'open' | 'investigating' | 'contained' | 'resolved';
  type: string;
  reported_at: string;
  assigned_to?: string;
  description: string;
}

interface ResponseTeamMember {
  id: string;
  name: string;
  role: string;
  contact: string;
  availability: 'available' | 'busy' | 'offline';
}

export const IncidentResponseDashboard = () => {
  const [activeTab, setActiveTab] = useState('incidents');

  // Mock data - in real implementation, this would come from Supabase
  const mockIncidents: SecurityIncident[] = [
    {
      id: '1',
      title: 'Suspicious Login Activity Detected',
      severity: 'high',
      status: 'investigating',
      type: 'Authentication',
      reported_at: '2024-01-19T14:30:00Z',
      assigned_to: 'Security Team',
      description: 'Multiple failed login attempts from unusual IP addresses'
    },
    {
      id: '2',
      title: 'Data Access Anomaly',
      severity: 'medium',
      status: 'open',
      type: 'Data Access',
      reported_at: '2024-01-19T12:15:00Z',
      description: 'Unusual data access patterns detected in customer database'
    }
  ];

  const mockResponseTeam: ResponseTeamMember[] = [
    {
      id: '1',
      name: 'John Smith',
      role: 'Security Lead',
      contact: 'john.smith@company.com',
      availability: 'available'
    },
    {
      id: '2',
      name: 'Sarah Johnson',
      role: 'IT Manager',
      contact: 'sarah.johnson@company.com',
      availability: 'available'
    },
    {
      id: '3',
      name: 'Mike Davis',
      role: 'Legal Counsel',
      contact: 'mike.davis@company.com',
      availability: 'busy'
    }
  ];

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'high': return 'secondary';
      case 'medium': return 'default';
      case 'low': return 'outline';
      default: return 'outline';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'resolved': return 'default';
      case 'contained': return 'secondary';
      case 'investigating': return 'default';
      case 'open': return 'destructive';
      default: return 'outline';
    }
  };

  const getAvailabilityColor = (availability: string) => {
    switch (availability) {
      case 'available': return 'default';
      case 'busy': return 'secondary';
      case 'offline': return 'outline';
      default: return 'outline';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Incident Response Center</h2>
          <p className="text-muted-foreground">
            Monitor and respond to security incidents
          </p>
        </div>
        <Button className="bg-destructive hover:bg-destructive/90">
          <AlertTriangle className="mr-2 h-4 w-4" />
          Report Incident
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Incidents</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2</div>
            <p className="text-xs text-muted-foreground">
              1 high severity
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Response Time</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">15m</div>
            <p className="text-xs text-muted-foreground">
              Average response time
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Team Available</CardTitle>
            <Users className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2/3</div>
            <p className="text-xs text-muted-foreground">
              Response team members
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <TrendingUp className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">7</div>
            <p className="text-xs text-muted-foreground">
              Incidents resolved
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="incidents">Active Incidents</TabsTrigger>
          <TabsTrigger value="response-team">Response Team</TabsTrigger>
          <TabsTrigger value="playbooks">Playbooks</TabsTrigger>
          <TabsTrigger value="metrics">Metrics</TabsTrigger>
        </TabsList>

        <TabsContent value="incidents" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Active Security Incidents</CardTitle>
              <CardDescription>
                Monitor and manage ongoing security incidents
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockIncidents.map((incident) => (
                  <div key={incident.id} className="flex items-center justify-between border rounded-lg p-4">
                    <div className="flex items-center space-x-4">
                      <div className="flex flex-col space-y-1">
                        <div className="flex items-center space-x-2">
                          <h4 className="font-medium">{incident.title}</h4>
                          <Badge variant={getSeverityColor(incident.severity) as any}>
                            {incident.severity.toUpperCase()}
                          </Badge>
                          <Badge variant={getStatusColor(incident.status) as any}>
                            {incident.status.toUpperCase()}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{incident.description}</p>
                        <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                          <span>Type: {incident.type}</span>
                          <span>Reported: {new Date(incident.reported_at).toLocaleString()}</span>
                          {incident.assigned_to && <span>Assigned: {incident.assigned_to}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm">
                        <FileText className="mr-2 h-4 w-4" />
                        Details
                      </Button>
                      <Button size="sm">
                        Investigate
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="response-team" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Incident Response Team</CardTitle>
              <CardDescription>
                Key personnel and their availability status
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockResponseTeam.map((member) => (
                  <div key={member.id} className="flex items-center justify-between border rounded-lg p-4">
                    <div className="flex items-center space-x-4">
                      <div className="flex flex-col space-y-1">
                        <div className="flex items-center space-x-2">
                          <h4 className="font-medium">{member.name}</h4>
                          <Badge variant={getAvailabilityColor(member.availability) as any}>
                            {member.availability.toUpperCase()}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{member.role}</p>
                        <p className="text-xs text-muted-foreground">{member.contact}</p>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm">
                        <Phone className="mr-2 h-4 w-4" />
                        Call
                      </Button>
                      <Button variant="outline" size="sm">
                        <Mail className="mr-2 h-4 w-4" />
                        Email
                      </Button>
                      <Button variant="outline" size="sm">
                        <MessageSquare className="mr-2 h-4 w-4" />
                        Message
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="playbooks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Incident Response Playbooks</CardTitle>
              <CardDescription>
                Standardized procedures for different types of security incidents
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Data Breach Response</CardTitle>
                    <CardDescription>
                      Steps for handling potential data breaches
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span>Immediate containment</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span>Assess scope of breach</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span>Notify stakeholders</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span>Document incident</span>
                      </div>
                    </div>
                    <Button className="w-full mt-4" variant="outline">
                      View Full Playbook
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Malware Detection</CardTitle>
                    <CardDescription>
                      Response procedures for malware incidents
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span>Isolate affected systems</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span>Run security scans</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span>Remove malware</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span>Restore from clean backup</span>
                      </div>
                    </div>
                    <Button className="w-full mt-4" variant="outline">
                      View Full Playbook
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Account Compromise</CardTitle>
                    <CardDescription>
                      Steps for compromised user accounts
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span>Disable compromised account</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span>Reset authentication</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span>Review access logs</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span>Notify user</span>
                      </div>
                    </div>
                    <Button className="w-full mt-4" variant="outline">
                      View Full Playbook
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">DDoS Attack</CardTitle>
                    <CardDescription>
                      Response to distributed denial of service attacks
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span>Activate DDoS protection</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span>Monitor traffic patterns</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span>Scale infrastructure</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span>Contact ISP if needed</span>
                      </div>
                    </div>
                    <Button className="w-full mt-4" variant="outline">
                      View Full Playbook
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="metrics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Security Metrics & KPIs</CardTitle>
              <CardDescription>
                Track incident response performance and security posture
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-4">
                  <h4 className="font-medium">Response Metrics</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Mean Time to Detection (MTTD)</span>
                      <span className="font-medium">12 minutes</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Mean Time to Response (MTTR)</span>
                      <span className="font-medium">15 minutes</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Mean Time to Recovery (MTTR)</span>
                      <span className="font-medium">2.5 hours</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Incident Escalation Rate</span>
                      <span className="font-medium">15%</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium">Monthly Trends</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Total Incidents</span>
                      <span className="font-medium">7</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Critical Incidents</span>
                      <span className="font-medium">1</span>
                    </div>
                    <div className="flex justify-between">
                      <span>False Positives</span>
                      <span className="font-medium">2</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Resolution Rate</span>
                      <span className="font-medium">100%</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};