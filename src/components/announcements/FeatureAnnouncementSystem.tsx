import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Megaphone, 
  Plus, 
  Eye, 
  Send, 
  Calendar, 
  Users, 
  Star,
  Zap,
  Info,
  AlertTriangle,
  Gift,
  Sparkles,
  Bell,
  X
} from 'lucide-react';

interface Announcement {
  id: string;
  title: string;
  content: string;
  type: 'feature' | 'update' | 'maintenance' | 'promotion' | 'info';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'draft' | 'scheduled' | 'published' | 'archived';
  target_audience: 'all' | 'admins' | 'premium' | 'trial' | 'specific';
  show_as_popup: boolean;
  show_in_dashboard: boolean;
  expires_at?: string;
  created_at: string;
  published_at?: string;
  image_url?: string;
  action_label?: string;
  action_url?: string;
  views: number;
  dismissals: number;
}

interface UserAnnouncement {
  id: string;
  announcement_id: string;
  user_id: string;
  viewed: boolean;
  dismissed: boolean;
  created_at: string;
}

const FeatureAnnouncementSystem = () => {
  const { userProfile } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [userAnnouncements, setUserAnnouncements] = useState<UserAnnouncement[]>([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [activePopupAnnouncement, setActivePopupAnnouncement] = useState<Announcement | null>(null);
  const [loading, setLoading] = useState(true);

  // Form states
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [type, setType] = useState<string>('feature');
  const [priority, setPriority] = useState<string>('medium');
  const [targetAudience, setTargetAudience] = useState<string>('all');
  const [showAsPopup, setShowAsPopup] = useState(false);
  const [showInDashboard, setShowInDashboard] = useState(true);
  const [expiresAt, setExpiresAt] = useState('');
  const [actionLabel, setActionLabel] = useState('');
  const [actionUrl, setActionUrl] = useState('');

  useEffect(() => {
    loadAnnouncements();
    loadUserAnnouncements();
  }, []);

  const loadAnnouncements = async () => {
    try {
      const { data, error } = await supabase
        .from('feature_announcements' as any)
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading announcements:', error);
        setAnnouncements([]);
      } else {
        const items: Announcement[] = (data || []).map((row: any) => ({
          id: row.id,
          title: row.title,
          content: row.content,
          type: row.type || 'info',
          priority: row.priority || 'medium',
          status: row.status || 'draft',
          target_audience: row.target_audience || 'all',
          show_as_popup: !!row.show_as_popup,
          show_in_dashboard: row.show_in_dashboard ?? true,
          expires_at: row.expires_at || undefined,
          created_at: row.created_at,
          published_at: row.published_at || undefined,
          image_url: row.image_url || undefined,
          action_label: row.action_label || undefined,
          action_url: row.action_url || undefined,
          views: row.views || 0,
          dismissals: row.dismissals || 0,
        }));

        setAnnouncements(items);

        const activePopup = items.find(a => 
          a.show_as_popup && 
          a.status === 'published' && 
          (!a.expires_at || new Date(a.expires_at) > new Date())
        );
        if (activePopup) setActivePopupAnnouncement(activePopup);
      }
    } catch (error) {
      console.error('Error loading announcements:', error);
      setAnnouncements([]);
    } finally {
      setLoading(false);
    }
  };

  const loadUserAnnouncements = async () => {
    if (!userProfile?.id) return;

    try {
      const { data, error } = await supabase
        .from('user_announcements' as any)
        .select('*')
        .eq('user_id', userProfile.id);

      if (error) {
        console.warn('user_announcements table not available, proceeding without per-user dismissals');
        setUserAnnouncements([]);
      } else {
        setUserAnnouncements((data as any) || []);
      }
    } catch (error) {
      console.error('Error loading user announcements:', error);
      setUserAnnouncements([]);
    }
  };

  const createAnnouncement = async () => {
    if (!title || !content) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please fill in all required fields"
      });
      return;
    }

    try {
      const payload: any = {
        title,
        content,
        type,
        priority,
        status: 'draft',
        target_audience: targetAudience,
        show_as_popup: showAsPopup,
        show_in_dashboard: showInDashboard,
        expires_at: expiresAt || null,
        action_label: actionLabel || null,
        action_url: actionUrl || null,
        company_id: userProfile?.company_id || null,
        created_by: userProfile?.id || null,
      };

      const { data, error } = await supabase
        .from('feature_announcements' as any)
        .insert([payload])
        .select('*')
        .single();

      if (error) throw error;

      const newAnnouncement: Announcement = {
        id: data.id,
        title: data.title,
        content: data.content,
        type: data.type,
        priority: data.priority,
        status: data.status,
        target_audience: data.target_audience,
        show_as_popup: !!data.show_as_popup,
        show_in_dashboard: data.show_in_dashboard ?? true,
        expires_at: data.expires_at || undefined,
        created_at: data.created_at,
        published_at: data.published_at || undefined,
        image_url: data.image_url || undefined,
        action_label: data.action_label || undefined,
        action_url: data.action_url || undefined,
        views: data.views || 0,
        dismissals: data.dismissals || 0
      };

      setAnnouncements([newAnnouncement, ...announcements]);
      
      // Reset form
      setTitle('');
      setContent('');
      setType('feature');
      setPriority('medium');
      setTargetAudience('all');
      setShowAsPopup(false);
      setShowInDashboard(true);
      setExpiresAt('');
      setActionLabel('');
      setActionUrl('');
      setShowCreateDialog(false);

      toast({
        title: "Announcement Created",
        description: "Your announcement has been created successfully"
      });
    } catch (error) {
      console.error('Error creating announcement:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to create announcement"
      });
    }
  };

  const publishAnnouncement = async (id: string) => {
    try {
      const { error } = await supabase
        .from('feature_announcements' as any)
        .update({ status: 'published', published_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;

      setAnnouncements(announcements.map(announcement => 
        announcement.id === id 
          ? { ...announcement, status: 'published' as const, published_at: new Date().toISOString() }
          : announcement
      ));

      toast({
        title: "Announcement Published",
        description: "Your announcement is now live"
      });
    } catch (error) {
      console.error('Error publishing announcement:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to publish announcement"
      });
    }
  };

  const dismissAnnouncement = async (announcementId: string) => {
    if (!userProfile?.id) return;

    try {
      const payload: any = {
        announcement_id: announcementId,
        user_id: userProfile.id,
        viewed: true,
        dismissed: true,
      };

      const { data, error } = await supabase
        .from('user_announcements' as any)
        .insert([payload])
        .select('*')
        .single();

      if (!error && data) {
        setUserAnnouncements(prev => [...prev, data as any]);
      }

      setActivePopupAnnouncement(null);
    } catch (error) {
      console.error('Error dismissing announcement:', error);
      setActivePopupAnnouncement(null);
    }
  };

  const getTypeIcon = (type: string) => {
    const icons = {
      feature: Star,
      update: Zap,
      maintenance: AlertTriangle,
      promotion: Gift,
      info: Info
    };
    return icons[type as keyof typeof icons] || Megaphone;
  };

  const getTypeColor = (type: string) => {
    const colors = {
      feature: 'bg-blue-100 text-blue-800',
      update: 'bg-green-100 text-green-800',
      maintenance: 'bg-orange-100 text-orange-800',
      promotion: 'bg-purple-100 text-purple-800',
      info: 'bg-gray-100 text-gray-800'
    };
    return colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getPriorityColor = (priority: string) => {
    const colors = {
      low: 'text-green-600',
      medium: 'text-yellow-600',
      high: 'text-orange-600',
      urgent: 'text-red-600'
    };
    return colors[priority as keyof typeof colors] || 'text-gray-600';
  };

  const isAnnouncementDismissed = (announcementId: string) => {
    return userAnnouncements.some(ua => ua.announcement_id === announcementId && ua.dismissed);
  };

  const publishedAnnouncements = announcements.filter(a => 
    a.status === 'published' && 
    a.show_in_dashboard &&
    !isAnnouncementDismissed(a.id) &&
    (!a.expires_at || new Date(a.expires_at) > new Date())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Megaphone className="h-5 w-5" />
          <h2 className="text-2xl font-semibold">Feature Announcements</h2>
        </div>
        {userProfile?.role === 'admin' && (
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Announcement
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Announcement</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter announcement title"
                  />
                </div>

                <div>
                  <Label htmlFor="content">Content</Label>
                  <Textarea
                    id="content"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Write your announcement content..."
                    rows={4}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="type">Type</Label>
                    <Select value={type} onValueChange={setType}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="feature">New Feature</SelectItem>
                        <SelectItem value="update">Update</SelectItem>
                        <SelectItem value="maintenance">Maintenance</SelectItem>
                        <SelectItem value="promotion">Promotion</SelectItem>
                        <SelectItem value="info">Information</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="priority">Priority</Label>
                    <Select value={priority} onValueChange={setPriority}>
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

                <div>
                  <Label htmlFor="target">Target Audience</Label>
                  <Select value={targetAudience} onValueChange={setTargetAudience}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Users</SelectItem>
                      <SelectItem value="admins">Admins Only</SelectItem>
                      <SelectItem value="premium">Premium Users</SelectItem>
                      <SelectItem value="trial">Trial Users</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="action-label">Action Label (Optional)</Label>
                    <Input
                      id="action-label"
                      value={actionLabel}
                      onChange={(e) => setActionLabel(e.target.value)}
                      placeholder="e.g., Try It Now"
                    />
                  </div>
                  <div>
                    <Label htmlFor="action-url">Action URL (Optional)</Label>
                    <Input
                      id="action-url"
                      value={actionUrl}
                      onChange={(e) => setActionUrl(e.target.value)}
                      placeholder="e.g., /analytics"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="expires">Expires At (Optional)</Label>
                  <Input
                    id="expires"
                    type="datetime-local"
                    value={expiresAt}
                    onChange={(e) => setExpiresAt(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={showAsPopup}
                      onCheckedChange={setShowAsPopup}
                    />
                    <Label>Show as popup</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={showInDashboard}
                      onCheckedChange={setShowInDashboard}
                    />
                    <Label>Show in dashboard</Label>
                  </div>
                </div>

                <div className="flex space-x-2">
                  <Button onClick={createAnnouncement}>
                    Create Announcement
                  </Button>
                  <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Active Announcements for Users */}
      {publishedAnnouncements.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Latest Announcements</h3>
          {publishedAnnouncements.map((announcement) => {
            const TypeIcon = getTypeIcon(announcement.type);
            return (
              <Card key={announcement.id} className="border-l-4 border-l-primary">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      <TypeIcon className="h-5 w-5 mt-1 text-primary" />
                      <div>
                        <CardTitle className="flex items-center space-x-2">
                          <span>{announcement.title}</span>
                          <Badge className={getTypeColor(announcement.type)}>
                            {announcement.type}
                          </Badge>
                        </CardTitle>
                        <CardDescription className="mt-1">
                          {announcement.content}
                        </CardDescription>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => dismissAnnouncement(announcement.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                {announcement.action_label && announcement.action_url && (
                  <CardContent>
                    <Button>
                      {announcement.action_label}
                    </Button>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Admin View - All Announcements */}
      {userProfile?.role === 'admin' && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Manage Announcements</h3>
          <div className="grid gap-4">
            {announcements.map((announcement) => {
              const TypeIcon = getTypeIcon(announcement.type);
              return (
                <Card key={announcement.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <TypeIcon className="h-4 w-4" />
                        <CardTitle>{announcement.title}</CardTitle>
                        <Badge className={getTypeColor(announcement.type)}>
                          {announcement.type}
                        </Badge>
                        <Badge variant={announcement.status === 'published' ? 'default' : 'secondary'}>
                          {announcement.status}
                        </Badge>
                      </div>
                      <div className="flex space-x-2">
                        {announcement.status === 'draft' && (
                          <Button
                            size="sm"
                            onClick={() => publishAnnouncement(announcement.id)}
                          >
                            <Send className="h-4 w-4 mr-2" />
                            Publish
                          </Button>
                        )}
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <CardDescription>{announcement.content}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Priority:</span>
                        <span className={`ml-1 font-medium ${getPriorityColor(announcement.priority)}`}>
                          {announcement.priority}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Views:</span>
                        <span className="ml-1 font-medium">{announcement.views}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Dismissals:</span>
                        <span className="ml-1 font-medium">{announcement.dismissals}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Target:</span>
                        <span className="ml-1 font-medium">{announcement.target_audience}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Popup Announcement */}
      {activePopupAnnouncement && !isAnnouncementDismissed(activePopupAnnouncement.id) && (
        <Dialog open={true} onOpenChange={() => setActivePopupAnnouncement(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <div className="flex items-center space-x-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <DialogTitle>{activePopupAnnouncement.title}</DialogTitle>
              </div>
            </DialogHeader>
            <div className="space-y-4">
              <p>{activePopupAnnouncement.content}</p>
              <div className="flex space-x-2">
                {activePopupAnnouncement.action_label && activePopupAnnouncement.action_url && (
                  <Button className="flex-1">
                    {activePopupAnnouncement.action_label}
                  </Button>
                )}
                <Button 
                  variant="outline" 
                  onClick={() => dismissAnnouncement(activePopupAnnouncement.id)}
                >
                  Dismiss
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default FeatureAnnouncementSystem;