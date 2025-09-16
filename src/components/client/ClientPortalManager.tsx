import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  MessageCircle, Camera, Calendar, FileText, Star, 
  Clock, CheckCircle, AlertCircle, Send, Phone, Mail 
} from 'lucide-react';

interface ClientUpdate {
  id: string;
  projectId: string;
  type: 'progress' | 'issue' | 'milestone' | 'photo';
  title: string;
  description: string;
  images?: string[];
  timestamp: Date;
  isRead: boolean;
}

interface ClientMessage {
  id: string;
  projectId: string;
  senderId: string;
  senderName: string;
  senderRole: 'client' | 'contractor' | 'project_manager';
  message: string;
  timestamp: Date;
  attachments?: string[];
}

interface ProjectInfo {
  id: string;
  name: string;
  status: 'planning' | 'in_progress' | 'on_hold' | 'completed';
  progress: number;
  startDate: Date;
  expectedCompletion: Date;
  budget: number;
  client: {
    name: string;
    email: string;
    phone: string;
    company: string;
  };
}

export const ClientPortalManager: React.FC = () => {
  const [selectedProject, setSelectedProject] = useState<string>('proj-1');
  const [newMessage, setNewMessage] = useState('');
  const [activeTab, setActiveTab] = useState('overview');

  const [projects] = useState<ProjectInfo[]>([
    {
      id: 'proj-1',
      name: 'Modern Office Renovation',
      status: 'in_progress',
      progress: 65,
      startDate: new Date('2024-01-15'),
      expectedCompletion: new Date('2024-06-30'),
      budget: 850000,
      client: {
        name: 'Sarah Johnson',
        email: 'sarah@techcorp.com',
        phone: '(555) 123-4567',
        company: 'TechCorp Industries'
      }
    }
  ]);

  const [clientUpdates] = useState<ClientUpdate[]>([
    {
      id: '1',
      projectId: 'proj-1',
      type: 'progress',
      title: 'Electrical Work Completed',
      description: 'All electrical installations in the main office area have been completed and tested.',
      timestamp: new Date('2024-01-12T14:30:00'),
      isRead: false
    },
    {
      id: '2',
      projectId: 'proj-1',
      type: 'milestone',
      title: 'Phase 2 Milestone Reached',
      description: 'Framing and drywall installation completed ahead of schedule.',
      timestamp: new Date('2024-01-10T09:15:00'),
      isRead: true
    },
    {
      id: '3',
      projectId: 'proj-1',
      type: 'photo',
      title: 'Progress Photos - Week 4',
      description: 'Latest progress photos from the construction site.',
      images: ['progress1.jpg', 'progress2.jpg'],
      timestamp: new Date('2024-01-08T16:45:00'),
      isRead: true
    }
  ]);

  const [messages] = useState<ClientMessage[]>([
    {
      id: '1',
      projectId: 'proj-1',
      senderId: 'client-1',
      senderName: 'Sarah Johnson',
      senderRole: 'client',
      message: 'Hi team, I wanted to check on the timeline for the conference room completion. We have an important client meeting scheduled for next month.',
      timestamp: new Date('2024-01-12T10:30:00'),
    },
    {
      id: '2',
      projectId: 'proj-1',
      senderId: 'pm-1',
      senderName: 'Mike Rodriguez',
      senderRole: 'project_manager',
      message: 'Hi Sarah! The conference room is on track to be completed by January 25th, well ahead of your meeting. I\'ll send progress photos this afternoon.',
      timestamp: new Date('2024-01-12T11:15:00'),
    }
  ]);

  const currentProject = projects.find(p => p.id === selectedProject);
  const projectUpdates = clientUpdates.filter(u => u.projectId === selectedProject);
  const projectMessages = messages.filter(m => m.projectId === selectedProject);

  const sendMessage = () => {
    if (!newMessage.trim()) return;
    // Add message logic here
    setNewMessage('');
  };

  const renderUpdateCard = (update: ClientUpdate) => (
    <Card key={update.id} className={`${!update.isRead ? 'border-primary' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-full bg-primary/10">
            {update.type === 'progress' && <CheckCircle className="h-4 w-4 text-primary" />}
            {update.type === 'milestone' && <Star className="h-4 w-4 text-primary" />}
            {update.type === 'issue' && <AlertCircle className="h-4 w-4 text-destructive" />}
            {update.type === 'photo' && <Camera className="h-4 w-4 text-primary" />}
          </div>
          
          <div className="flex-1">
            <div className="flex justify-between items-start">
              <h4 className="font-medium">{update.title}</h4>
              <div className="flex items-center gap-2">
                {!update.isRead && <div className="w-2 h-2 bg-primary rounded-full" />}
                <span className="text-xs text-muted-foreground">
                  {update.timestamp.toLocaleDateString()}
                </span>
              </div>
            </div>
            
            <p className="text-sm text-muted-foreground mt-1">{update.description}</p>
            
            {update.images && update.images.length > 0 && (
              <div className="flex gap-2 mt-2">
                {update.images.map((image, index) => (
                  <div key={index} className="w-16 h-16 bg-muted rounded border flex items-center justify-center">
                    <Camera className="h-4 w-4 text-muted-foreground" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderMessageBubble = (message: ClientMessage) => (
    <div key={message.id} className={`flex gap-3 ${
      message.senderRole === 'client' ? 'flex-row-reverse' : ''
    }`}>
      <Avatar className="w-8 h-8">
        <AvatarFallback>
          {message.senderName.split(' ').map(n => n[0]).join('')}
        </AvatarFallback>
      </Avatar>
      
      <div className={`max-w-[70%] ${
        message.senderRole === 'client' ? 'items-end' : 'items-start'
      } space-y-1`}>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{message.senderName}</span>
          <span>{message.timestamp.toLocaleTimeString()}</span>
        </div>
        
        <div className={`p-3 rounded-lg ${
          message.senderRole === 'client' 
            ? 'bg-primary text-primary-foreground' 
            : 'bg-muted'
        }`}>
          <p className="text-sm">{message.message}</p>
        </div>
      </div>
    </div>
  );

  if (!currentProject) return <div>No project found</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Client Portal</h2>
          <p className="text-muted-foreground">
            Transparent project communication and updates
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Phone className="h-4 w-4 mr-2" />
            Call Client
          </Button>
          <Button variant="outline">
            <Mail className="h-4 w-4 mr-2" />
            Send Email
          </Button>
        </div>
      </div>

      {/* Project Overview */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="flex items-center gap-2">
                {currentProject.name}
                <Badge variant={
                  currentProject.status === 'completed' ? 'default' :
                  currentProject.status === 'in_progress' ? 'secondary' :
                  currentProject.status === 'on_hold' ? 'destructive' : 'outline'
                }>
                  {currentProject.status.replace('_', ' ')}
                </Badge>
              </CardTitle>
              <p className="text-muted-foreground">
                {currentProject.client.company} • {currentProject.client.name}
              </p>
            </div>
            
            <div className="text-right">
              <p className="text-2xl font-bold">{currentProject.progress}%</p>
              <p className="text-sm text-muted-foreground">Complete</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <span className="text-sm text-muted-foreground">Start Date</span>
              <p className="font-medium">{currentProject.startDate.toLocaleDateString()}</p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Expected Completion</span>
              <p className="font-medium">{currentProject.expectedCompletion.toLocaleDateString()}</p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Budget</span>
              <p className="font-medium">${currentProject.budget.toLocaleString()}</p>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progress</span>
              <span>{currentProject.progress}%</span>
            </div>
            <div className="w-full bg-secondary rounded-full h-2">
              <div 
                className="bg-primary h-2 rounded-full transition-all"
                style={{ width: `${currentProject.progress}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="updates">Updates</TabsTrigger>
          <TabsTrigger value="messages">Messages</TabsTrigger>
          <TabsTrigger value="schedule">Schedule</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Recent Updates</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {projectUpdates.slice(0, 3).map(renderUpdateCard)}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button className="w-full justify-start" variant="outline">
                  <Calendar className="h-4 w-4 mr-2" />
                  Schedule Site Visit
                </Button>
                <Button className="w-full justify-start" variant="outline">
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Request Update
                </Button>
                <Button className="w-full justify-start" variant="outline">
                  <FileText className="h-4 w-4 mr-2" />
                  View Documents
                </Button>
                <Button className="w-full justify-start" variant="outline">
                  <Camera className="h-4 w-4 mr-2" />
                  Progress Photos
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="updates" className="space-y-4">
          {projectUpdates.map(renderUpdateCard)}
        </TabsContent>

        <TabsContent value="messages" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Project Communication</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 mb-4 max-h-96 overflow-y-auto">
                {projectMessages.map(renderMessageBubble)}
              </div>
              
              <div className="flex gap-2">
                <Textarea
                  placeholder="Type your message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="min-h-[60px]"
                />
                <Button onClick={sendMessage} size="icon" className="mt-auto">
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="schedule">
          <Card>
            <CardHeader>
              <CardTitle>Project Schedule</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                Interactive project schedule coming soon
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents">
          <Card>
            <CardHeader>
              <CardTitle>Project Documents</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                Document library and sharing coming soon
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};