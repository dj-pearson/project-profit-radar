import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  Share2, 
  Calendar, 
  BarChart3, 
  Settings, 
  Plus,
  Facebook,
  Linkedin,
  Twitter,
  Instagram,
  ExternalLink,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';
import { SocialAccountsManager } from '@/components/social-media/SocialAccountsManager';
import { PostComposer } from '@/components/social-media/PostComposer';
import { PostScheduler } from '@/components/social-media/PostScheduler';
import { SocialAnalytics } from '@/components/social-media/SocialAnalytics';
import { TemplateManager } from '@/components/social-media/TemplateManager';

export const SocialMediaManager: React.FC = () => {
  const { userProfile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>({});

  useEffect(() => {
    if (userProfile?.company_id) {
      loadSocialMediaData();
    }
  }, [userProfile?.company_id]);

  const loadSocialMediaData = async () => {
    setLoading(true);
    try {
      // Load social media accounts
      const { data: accountsData } = await supabase
        .from('social_media_accounts')
        .select('*')
        .eq('company_id', userProfile?.company_id)
        .eq('is_active', true);

      // Load recent posts
      const { data: postsData } = await supabase
        .from('social_media_posts')
        .select(`
          *,
          social_media_post_results (*)
        `)
        .eq('company_id', userProfile?.company_id)
        .order('created_at', { ascending: false })
        .limit(10);

      // Load templates
      const { data: templatesData } = await supabase
        .from('social_media_templates')
        .select('*')
        .eq('company_id', userProfile?.company_id)
        .eq('is_active', true);

      setAccounts(accountsData || []);
      setPosts(postsData || []);
      setTemplates(templatesData || []);
    } catch (error: any) {
      toast({
        title: "Error loading social media data",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'linkedin': return <Linkedin className="h-4 w-4" />;
      case 'facebook': return <Facebook className="h-4 w-4" />;
      case 'twitter': return <Twitter className="h-4 w-4" />;
      case 'instagram': return <Instagram className="h-4 w-4" />;
      default: return <Share2 className="h-4 w-4" />;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'published': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'scheduled': return <Clock className="h-4 w-4 text-blue-500" />;
      case 'failed': return <XCircle className="h-4 w-4 text-destructive" />;
      case 'draft': return <AlertCircle className="h-4 w-4 text-amber-500" />;
      default: return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      published: "default",
      scheduled: "secondary", 
      failed: "destructive",
      draft: "outline"
    };
    return (
      <Badge variant={variants[status] || "outline"} className="capitalize">
        {status}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-1/3 bg-muted rounded"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Social Media Management</h1>
          <p className="text-muted-foreground">
            Manage your social media presence across all platforms
          </p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Connect Account
        </Button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Connected Accounts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{accounts.length}</div>
            <div className="flex gap-1 mt-2">
              {accounts.map((account, index) => (
                <div key={index} className="flex items-center gap-1">
                  {getPlatformIcon(account.platform)}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Posts This Month</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {posts.filter(p => new Date(p.created_at).getMonth() === new Date().getMonth()).length}
            </div>
            <p className="text-xs text-muted-foreground">
              {posts.filter(p => p.status === 'scheduled').length} scheduled
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Templates</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{templates.length}</div>
            <p className="text-xs text-muted-foreground">
              Ready to use
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Engagement Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">4.2%</div>
            <p className="text-xs text-muted-foreground">
              +0.5% from last month
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="compose" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="compose" className="gap-2">
            <Share2 className="h-4 w-4" />
            Compose
          </TabsTrigger>
          <TabsTrigger value="schedule" className="gap-2">
            <Calendar className="h-4 w-4" />
            Schedule
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="templates" className="gap-2">
            <Settings className="h-4 w-4" />
            Templates
          </TabsTrigger>
          <TabsTrigger value="accounts" className="gap-2">
            <ExternalLink className="h-4 w-4" />
            Accounts
          </TabsTrigger>
        </TabsList>

        <TabsContent value="compose" className="space-y-6">
          <PostComposer 
            accounts={accounts}
            templates={templates}
            onPostCreated={loadSocialMediaData}
          />
        </TabsContent>

        <TabsContent value="schedule" className="space-y-6">
          <PostScheduler 
            posts={posts}
            accounts={accounts}
            onPostUpdated={loadSocialMediaData}
          />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <SocialAnalytics 
            accounts={accounts}
            posts={posts}
          />
        </TabsContent>

        <TabsContent value="templates" className="space-y-6">
          <TemplateManager 
            templates={templates}
            onTemplateUpdated={loadSocialMediaData}
          />
        </TabsContent>

        <TabsContent value="accounts" className="space-y-6">
          <SocialAccountsManager 
            accounts={accounts}
            onAccountUpdated={loadSocialMediaData}
          />
        </TabsContent>
      </Tabs>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Posts</CardTitle>
          <CardDescription>
            Your latest social media activity
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {posts.slice(0, 5).map((post) => (
              <div key={post.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(post.status)}
                    {getStatusBadge(post.status)}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium line-clamp-1">
                      {post.title || post.content.substring(0, 50) + '...'}
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      {post.scheduled_for 
                        ? `Scheduled for ${new Date(post.scheduled_for).toLocaleString()}`
                        : `Created ${new Date(post.created_at).toLocaleDateString()}`
                      }
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {JSON.parse(post.platforms || '[]').map((platform: any, index: number) => (
                    <div key={index} className="flex items-center gap-1">
                      {getPlatformIcon(platform.platform)}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};