import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { 
  PlusCircle,
  Edit,
  Trash2,
  Eye,
  Sparkles,
  Settings,
  Image,
  Save,
  Send,
  Bot,
  Zap,
  Bug
} from 'lucide-react';
import { ImageUpload } from '@/components/ui/image-upload';
import BlogAutoGeneration from '@/components/admin/BlogAutoGeneration';
import BlogAIDebugger from '@/components/admin/BlogAIDebugger';

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  body: string;
  excerpt: string;
  featured_image_url: string;
  seo_title: string;
  seo_description: string;
  status: string;
  published_at: string;
  created_at: string;
}

interface AISettings {
  id: string;
  provider: string;
  model: string;
  global_instructions: string;
  blog_instructions: string;
  is_active: boolean;
}

const BlogManager = () => {
  const { user, userProfile, loading } = useAuth();
  const navigate = useNavigate();
  
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [aiSettings, setAiSettings] = useState<AISettings[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false);
  const [isAutoGenDialogOpen, setIsAutoGenDialogOpen] = useState(false);
  const [isDebugDialogOpen, setIsDebugDialogOpen] = useState(false);
  const [generatingAI, setGeneratingAI] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  
  const [newPost, setNewPost] = useState({
    title: '',
    body: '',
    excerpt: '',
    featured_image_url: '',
    seo_title: '',
    seo_description: '',
    status: 'draft'
  });

  const [editPost, setEditPost] = useState({
    title: '',
    body: '',
    excerpt: '',
    featured_image_url: '',
    seo_title: '',
    seo_description: '',
    status: 'draft'
  });

  const [aiTopic, setAiTopic] = useState('');

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
    
    // Check if user is root admin
    if (!loading && userProfile && userProfile.role !== 'root_admin') {
      navigate('/dashboard');
      toast({
        variant: "destructive",
        title: "Access Denied",
        description: "Only root administrators can access the blog manager."
      });
      return;
    }
    
    if (userProfile?.role === 'root_admin') {
      loadData();
    }
  }, [user, userProfile, loading, navigate]);

  const loadData = async () => {
    try {
      setLoadingData(true);
      
      // Load blog posts
      const { data: postsData, error: postsError } = await supabase
        .from('blog_posts')
        .select('*')
        .order('created_at', { ascending: false });

      if (postsError) throw postsError;
      setPosts(postsData || []);

      // Load AI settings
      const { data: settingsData, error: settingsError } = await supabase
        .from('ai_settings')
        .select('*')
        .order('provider');

      if (settingsError) throw settingsError;
      setAiSettings(settingsData || []);

    } catch (error: any) {
      console.error('Error loading data:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load blog data"
      });
    } finally {
      setLoadingData(false);
    }
  };

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9 -]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  };

  const handleCreatePost = async () => {
    if (!newPost.title || !newPost.body) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Please fill in title and body."
      });
      return;
    }

    try {
      const slug = generateSlug(newPost.title);
      
      const { data, error } = await supabase
        .from('blog_posts')
        .insert([{
          ...newPost,
          slug,
          created_by: user?.id,
          published_at: newPost.status === 'published' ? new Date().toISOString() : null
        }])
        .select()
        .single();

      if (error) {
        console.error('Detailed error:', error);
        throw error;
      }

      toast({
        title: "Success",
        description: "Blog post created successfully"
      });

      setIsCreateDialogOpen(false);
      setNewPost({
        title: '',
        body: '',
        excerpt: '',
        featured_image_url: '',
        seo_title: '',
        seo_description: '',
        status: 'draft'
      });
      
      loadData();
    } catch (error: any) {
      console.error('Error creating post:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: `Failed to create blog post: ${error.message || 'Unknown error'}`
      });
    }
  };

  const handleEditPost = (post: BlogPost) => {
    setEditingPost(post);
    setEditPost({
      title: post.title,
      body: post.body,
      excerpt: post.excerpt || '',
      featured_image_url: post.featured_image_url || '',
      seo_title: post.seo_title || '',
      seo_description: post.seo_description || '',
      status: post.status
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdatePost = async () => {
    if (!editingPost || !editPost.title || !editPost.body) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Please fill in title and body."
      });
      return;
    }

    try {
      const slug = generateSlug(editPost.title);
      
      const { data, error } = await supabase
        .from('blog_posts')
        .update({
          ...editPost,
          slug,
          published_at: editPost.status === 'published' ? new Date().toISOString() : null,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingPost.id)
        .select()
        .single();

      if (error) {
        console.error('Detailed error:', error);
        throw error;
      }

      toast({
        title: "Success",
        description: "Blog post updated successfully"
      });

      setIsEditDialogOpen(false);
      setEditingPost(null);
      setEditPost({
        title: '',
        body: '',
        excerpt: '',
        featured_image_url: '',
        seo_title: '',
        seo_description: '',
        status: 'draft'
      });
      
      loadData();
    } catch (error: any) {
      console.error('Error updating post:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: `Failed to update blog post: ${error.message || 'Unknown error'}`
      });
    }
  };

  const handleDeletePost = async (post: BlogPost) => {
    if (!confirm(`Are you sure you want to delete "${post.title}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('blog_posts')
        .delete()
        .eq('id', post.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Blog post deleted successfully"
      });
      
      loadData();
    } catch (error: any) {
      console.error('Error deleting post:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: `Failed to delete blog post: ${error.message || 'Unknown error'}`
      });
    }
  };

  const generateWithAI = async () => {
    if (!aiTopic.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please enter a topic for AI generation"
      });
      return;
    }

    try {
      setGeneratingAI(true);
      
      const { data, error } = await supabase.functions.invoke('blog-ai', {
        body: {
          action: 'generate-content',
          blogTopic: aiTopic
        }
      });

      if (error) throw error;

      if (data.content) {
        setNewPost({
          ...newPost,
          title: data.content.title || '',
          body: data.content.body || '',
          excerpt: data.content.excerpt || '',
          seo_title: data.content.seo_title || '',
          seo_description: data.content.seo_description || '',
        });

        toast({
          title: "Success",
          description: "AI content generated successfully"
        });
      }

    } catch (error: any) {
      console.error('Error generating AI content:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to generate AI content. Make sure API keys are configured."
      });
    } finally {
      setGeneratingAI(false);
    }
  };

  const updateAISettings = async (settingId: string, updates: Partial<AISettings>) => {
    try {
      const { error } = await supabase
        .from('ai_settings')
        .update(updates)
        .eq('id', settingId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "AI settings updated successfully"
      });
      
      loadData();
    } catch (error: any) {
      console.error('Error updating AI settings:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update AI settings"
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'published':
        return <Badge className="bg-green-500">Published</Badge>;
      case 'draft':
        return <Badge variant="secondary">Draft</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading || loadingData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-construction-blue mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading blog manager...</p>
        </div>
      </div>
    );
  }

  return (
    <DashboardLayout title="Blog Manager">
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Create and manage blog articles with AI assistance</p>
          </div>
          <div className="flex items-center space-x-2">
            <Dialog open={isDebugDialogOpen} onOpenChange={setIsDebugDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Bug className="h-4 w-4 mr-2" />
                  Debug AI
                </Button>
              </DialogTrigger>
            </Dialog>
            <Dialog open={isAutoGenDialogOpen} onOpenChange={setIsAutoGenDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Bot className="h-4 w-4 mr-2" />
                  Auto-Generation
                </Button>
              </DialogTrigger>
            </Dialog>
            <Dialog open={isSettingsDialogOpen} onOpenChange={setIsSettingsDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Settings className="h-4 w-4 mr-2" />
                  AI Settings
                </Button>
              </DialogTrigger>
            </Dialog>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <PlusCircle className="h-4 w-4 mr-2" />
                  New Post
                </Button>
              </DialogTrigger>
            </Dialog>
          </div>
        </div>

        {/* Posts List */}
        <div className="space-y-6">
          {posts.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Edit className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No Blog Posts</h3>
                <p className="text-muted-foreground mb-4">Start creating engaging content for your platform</p>
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Create First Post
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6">
              {posts.map((post) => (
                <Card key={post.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <CardTitle className="flex items-center space-x-2">
                          <span>{post.title}</span>
                          {getStatusBadge(post.status)}
                        </CardTitle>
                        <CardDescription>
                          {post.excerpt || 'No excerpt available'}
                        </CardDescription>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button size="sm" variant="outline">
                          <Eye className="h-3 w-3 mr-1" />
                          Preview
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleEditPost(post)}
                        >
                          <Edit className="h-3 w-3 mr-1" />
                          Edit
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleDeletePost(post)}
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-xs text-muted-foreground">
                      Created: {new Date(post.created_at).toLocaleDateString()}
                      {post.published_at && (
                        <span> • Published: {new Date(post.published_at).toLocaleDateString()}</span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create Post Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Blog Post</DialogTitle>
            <DialogDescription>
              Write a new blog article with AI assistance or create manually
            </DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue="content" className="space-y-4">
            <TabsList>
              <TabsTrigger value="content">Content</TabsTrigger>
              <TabsTrigger value="seo">SEO</TabsTrigger>
              <TabsTrigger value="ai">AI Assistant</TabsTrigger>
            </TabsList>

            <TabsContent value="content" className="space-y-4">
              <div>
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  placeholder="Enter blog post title"
                  value={newPost.title}
                  onChange={(e) => setNewPost({...newPost, title: e.target.value})}
                />
              </div>

              <div>
                <Label htmlFor="excerpt">Excerpt</Label>
                <Textarea
                  id="excerpt"
                  placeholder="Brief summary of the post"
                  value={newPost.excerpt}
                  onChange={(e) => setNewPost({...newPost, excerpt: e.target.value})}
                  rows={2}
                />
              </div>

              <ImageUpload
                label="Featured Image"
                value={newPost.featured_image_url}
                onChange={(value) => setNewPost({...newPost, featured_image_url: value})}
                bucket="blog-images"
                path="featured"
                placeholder="Upload an image or enter a URL"
              />

              <div>
                <Label htmlFor="body">Content *</Label>
                <Textarea
                  id="body"
                  placeholder="Write your blog post content here (Markdown supported)"
                  value={newPost.body}
                  onChange={(e) => setNewPost({...newPost, body: e.target.value})}
                  rows={12}
                />
              </div>

              <div>
                <Label htmlFor="status">Status</Label>
                <Select value={newPost.status} onValueChange={(value) => setNewPost({...newPost, status: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>

            <TabsContent value="seo" className="space-y-4">
              <div>
                <Label htmlFor="seo_title">SEO Title</Label>
                <Input
                  id="seo_title"
                  placeholder="SEO optimized title (max 60 characters)"
                  value={newPost.seo_title}
                  onChange={(e) => setNewPost({...newPost, seo_title: e.target.value})}
                  maxLength={60}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {newPost.seo_title.length}/60 characters
                </p>
              </div>

              <div>
                <Label htmlFor="seo_description">SEO Description</Label>
                <Textarea
                  id="seo_description"
                  placeholder="Meta description for search engines (max 160 characters)"
                  value={newPost.seo_description}
                  onChange={(e) => setNewPost({...newPost, seo_description: e.target.value})}
                  maxLength={160}
                  rows={3}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {newPost.seo_description.length}/160 characters
                </p>
              </div>
            </TabsContent>

            <TabsContent value="ai" className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium mb-2 flex items-center">
                  <Sparkles className="h-4 w-4 mr-2 text-blue-600" />
                  AI Content Generation
                </h4>
                <p className="text-sm text-muted-foreground mb-4">
                  Enter a topic and let AI generate a complete blog article for you
                </p>
                
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="ai_topic">Blog Topic</Label>
                    <Input
                      id="ai_topic"
                      placeholder="e.g., Benefits of Digital Project Management in Construction"
                      value={aiTopic}
                      onChange={(e) => setAiTopic(e.target.value)}
                    />
                  </div>
                  
                  <Button 
                    onClick={generateWithAI}
                    disabled={generatingAI || !aiTopic.trim()}
                    className="w-full"
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    {generatingAI ? 'Generating...' : 'Generate with AI'}
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreatePost}>
              <Save className="h-4 w-4 mr-2" />
              Create Post
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Debug Dialog */}
      <Dialog open={isDebugDialogOpen} onOpenChange={setIsDebugDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bug className="h-5 w-5" />
              AI Blog Generation Diagnostics
            </DialogTitle>
            <DialogDescription>
              Diagnose and fix issues with AI blog generation
            </DialogDescription>
          </DialogHeader>
          
          <div className="overflow-y-auto max-h-[75vh]">
            <BlogAIDebugger />
          </div>
        </DialogContent>
      </Dialog>

      {/* Auto-Generation Dialog */}
      <Dialog open={isAutoGenDialogOpen} onOpenChange={setIsAutoGenDialogOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              AI Blog Auto-Generation
            </DialogTitle>
            <DialogDescription>
              Configure automated blog content generation with advanced AI models
            </DialogDescription>
          </DialogHeader>
          
          <div className="overflow-y-auto max-h-[75vh]">
            <BlogAutoGeneration />
          </div>
        </DialogContent>
      </Dialog>

      {/* AI Settings Dialog */}
      <Dialog open={isSettingsDialogOpen} onOpenChange={setIsSettingsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>AI Settings</DialogTitle>
            <DialogDescription>
              Configure AI providers and instructions for content generation
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            {aiSettings.map((setting) => (
              <Card key={setting.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="capitalize">{setting.provider}</CardTitle>
                    <Button
                      size="sm"
                      variant={setting.is_active ? "default" : "outline"}
                      onClick={() => updateAISettings(setting.id, { is_active: !setting.is_active })}
                    >
                      {setting.is_active ? 'Active' : 'Inactive'}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label>Model</Label>
                    <Input value={setting.model} readOnly />
                  </div>
                  <div>
                    <Label>Blog Instructions</Label>
                    <Textarea 
                      value={setting.blog_instructions}
                      onChange={(e) => updateAISettings(setting.id, { blog_instructions: e.target.value })}
                      rows={3}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="flex justify-end">
            <Button onClick={() => setIsSettingsDialogOpen(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Post Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Blog Post</DialogTitle>
            <DialogDescription>
              Update your blog article content and settings
            </DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue="content" className="space-y-4">
            <TabsList>
              <TabsTrigger value="content">Content</TabsTrigger>
              <TabsTrigger value="seo">SEO</TabsTrigger>
            </TabsList>

            <TabsContent value="content" className="space-y-4">
              <div>
                <Label htmlFor="edit_title">Title *</Label>
                <Input
                  id="edit_title"
                  placeholder="Enter blog post title"
                  value={editPost.title}
                  onChange={(e) => setEditPost({...editPost, title: e.target.value})}
                />
              </div>

              <div>
                <Label htmlFor="edit_excerpt">Excerpt</Label>
                <Textarea
                  id="edit_excerpt"
                  placeholder="Brief summary of the post"
                  value={editPost.excerpt}
                  onChange={(e) => setEditPost({...editPost, excerpt: e.target.value})}
                  rows={2}
                />
              </div>

              <ImageUpload
                label="Featured Image"
                value={editPost.featured_image_url}
                onChange={(value) => setEditPost({...editPost, featured_image_url: value})}
                bucket="blog-images"
                path="featured"
                placeholder="Upload an image or enter a URL"
              />

              <div>
                <Label htmlFor="edit_body">Content *</Label>
                <Textarea
                  id="edit_body"
                  placeholder="Write your blog post content here (Markdown supported)"
                  value={editPost.body}
                  onChange={(e) => setEditPost({...editPost, body: e.target.value})}
                  rows={12}
                />
              </div>

              <div>
                <Label htmlFor="edit_status">Status</Label>
                <Select value={editPost.status} onValueChange={(value) => setEditPost({...editPost, status: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>

            <TabsContent value="seo" className="space-y-4">
              <div>
                <Label htmlFor="edit_seo_title">SEO Title</Label>
                <Input
                  id="edit_seo_title"
                  placeholder="SEO optimized title (max 60 characters)"
                  value={editPost.seo_title}
                  onChange={(e) => setEditPost({...editPost, seo_title: e.target.value})}
                  maxLength={60}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {editPost.seo_title.length}/60 characters
                </p>
              </div>

              <div>
                <Label htmlFor="edit_seo_description">SEO Description</Label>
                <Textarea
                  id="edit_seo_description"
                  placeholder="SEO description (max 160 characters)"
                  value={editPost.seo_description}
                  onChange={(e) => setEditPost({...editPost, seo_description: e.target.value})}
                  maxLength={160}
                  rows={3}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {editPost.seo_description.length}/160 characters
                </p>
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdatePost}>
              <Save className="h-4 w-4 mr-2" />
              Update Post
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default BlogManager;