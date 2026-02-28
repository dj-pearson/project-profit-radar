import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useSocialMediaAutomation } from "@/hooks/useSocialMediaAutomation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PlusCircle, Settings, Bot, Bug } from "lucide-react";
import BlogPostList from "@/components/blog/BlogPostList";
import BlogPostFormDialog from "@/components/blog/BlogPostFormDialog";
import type { BlogPostFormData } from "@/components/blog/BlogPostFormDialog";
import BlogKeywordsTab from "@/components/blog/BlogKeywordsTab";
import BlogAISettingsDialog from "@/components/blog/BlogAISettingsDialog";
import BlogToolDialogs from "@/components/blog/BlogToolDialogs";

export interface BlogPost {
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
  scheduled_at?: string;
  created_at: string;
}

export interface AISettings {
  id: string;
  provider: string;
  model: string;
  global_instructions: string;
  blog_instructions: string;
  is_active: boolean;
}

const EMPTY_FORM: BlogPostFormData = {
  title: "",
  body: "",
  excerpt: "",
  featured_image_url: "",
  seo_title: "",
  seo_description: "",
  status: "draft",
  scheduled_at: "",
};

const BlogManager = () => {
  const { user, userProfile, loading } = useAuth();
  const { shouldAutoTrigger, triggerAutomation } = useSocialMediaAutomation();
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

  const [newPost, setNewPost] = useState<BlogPostFormData>({ ...EMPTY_FORM });
  const [editPost, setEditPost] = useState<BlogPostFormData>({ ...EMPTY_FORM });
  const [aiTopic, setAiTopic] = useState("");

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
    if (!loading && userProfile && userProfile.role !== "root_admin") {
      navigate("/dashboard");
      toast({ variant: "destructive", title: "Access Denied", description: "Only root administrators can access the blog manager." });
      return;
    }
    if (userProfile?.role === "root_admin") {
      loadData();
    }
  }, [user, userProfile, loading, navigate]);

  const loadData = useCallback(async () => {
    try {
      setLoadingData(true);
      const { data: postsData, error: postsError } = await supabase
        .from("blog_posts").select("*").order("created_at", { ascending: false });
      if (postsError) throw postsError;
      setPosts((postsData || []).map((post) => ({ ...post, scheduled_at: post.scheduled_at || "" })));
      const { data: settingsData, error: settingsError } = await supabase
        .from("ai_settings").select("*").order("provider");
      if (settingsError) throw settingsError;
      setAiSettings(settingsData || []);
    } catch (error: unknown) {
      console.error("Error loading data:", error);
      toast({ variant: "destructive", title: "Error", description: "Failed to load blog data" });
    } finally {
      setLoadingData(false);
    }
  }, []);

  const generateSlug = (title: string) =>
    title.toLowerCase().replace(/[^a-z0-9 -]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").trim();

  const validateSchedule = (status: string, scheduledAt?: string): boolean => {
    if (status !== "scheduled") return true;
    if (!scheduledAt) {
      toast({ variant: "destructive", title: "Validation Error", description: "Please select a schedule date and time." });
      return false;
    }
    if (new Date(scheduledAt) <= new Date()) {
      toast({ variant: "destructive", title: "Validation Error", description: "Scheduled date must be in the future." });
      return false;
    }
    return true;
  };

  const handleCreatePost = useCallback(async () => {
    if (!newPost.title || !newPost.body) {
      toast({ variant: "destructive", title: "Validation Error", description: "Please fill in title and body." });
      return;
    }
    if (!validateSchedule(newPost.status, newPost.scheduled_at)) return;
    try {
      const postData = {
        title: newPost.title, body: newPost.body, excerpt: newPost.excerpt,
        featured_image_url: newPost.featured_image_url, seo_title: newPost.seo_title,
        seo_description: newPost.seo_description, status: newPost.status,
        slug: generateSlug(newPost.title), created_by: user?.id,
        published_at: newPost.status === "published" ? new Date().toISOString() : null,
        scheduled_at: newPost.status === "scheduled" ? new Date(newPost.scheduled_at || "").toISOString() : null,
      };
      const { data, error } = await supabase.from("blog_posts").insert([postData]).select().single();
      if (error) { console.error("Detailed error:", error); throw error; }
      toast({ title: "Success", description: newPost.status === "scheduled"
        ? `Blog post scheduled for ${new Date(newPost.scheduled_at || "").toLocaleString()}`
        : "Blog post created successfully" });
      if (data && shouldAutoTrigger(data.status)) {
        try { await triggerAutomation({ blogPostId: data.id, triggerType: "auto_publish" }); }
        catch (e) { console.error("Social media automation failed:", e); }
      }
      setIsCreateDialogOpen(false);
      setNewPost({ ...EMPTY_FORM });
      loadData();
    } catch (error: unknown) {
      console.error("Error creating post:", error);
      toast({ variant: "destructive", title: "Error", description: `Failed to create blog post: ${error instanceof Error ? error.message : "Unknown error"}` });
    }
  }, [newPost, user?.id, shouldAutoTrigger, triggerAutomation, loadData]);

  const handleEditPost = useCallback((post: BlogPost) => {
    setEditingPost(post);
    setEditPost({
      title: post.title, body: post.body, excerpt: post.excerpt || "",
      featured_image_url: post.featured_image_url || "",
      seo_title: post.seo_title || "", seo_description: post.seo_description || "",
      status: post.status,
      scheduled_at: post.scheduled_at ? new Date(post.scheduled_at).toISOString().slice(0, 16) : "",
    });
    setIsEditDialogOpen(true);
  }, []);

  const handleUpdatePost = useCallback(async () => {
    if (!editingPost || !editPost.title || !editPost.body) {
      toast({ variant: "destructive", title: "Validation Error", description: "Please fill in title and body." });
      return;
    }
    if (!validateSchedule(editPost.status, editPost.scheduled_at)) return;
    try {
      const updateData = {
        title: editPost.title, body: editPost.body, excerpt: editPost.excerpt,
        featured_image_url: editPost.featured_image_url, seo_title: editPost.seo_title,
        seo_description: editPost.seo_description, status: editPost.status,
        slug: generateSlug(editPost.title),
        published_at: editPost.status === "published" ? new Date().toISOString() : editingPost.published_at,
        scheduled_at: editPost.status === "scheduled" ? new Date(editPost.scheduled_at || "").toISOString() : null,
        updated_at: new Date().toISOString(),
      };
      const { error } = await supabase.from("blog_posts").update(updateData).eq("id", editingPost.id).select().single();
      if (error) { console.error("Detailed error:", error); throw error; }
      toast({ title: "Success", description: editPost.status === "scheduled"
        ? `Blog post scheduled for ${new Date(editPost.scheduled_at || "").toLocaleString()}`
        : "Blog post updated successfully" });
      setIsEditDialogOpen(false);
      setEditingPost(null);
      setEditPost({ ...EMPTY_FORM });
      loadData();
    } catch (error: unknown) {
      console.error("Error updating post:", error);
      toast({ variant: "destructive", title: "Error", description: `Failed to update blog post: ${error instanceof Error ? error.message : "Unknown error"}` });
    }
  }, [editingPost, editPost, loadData]);

  const handleDeletePost = useCallback(async (post: BlogPost) => {
    if (!confirm(`Are you sure you want to delete "${post.title}"? This action cannot be undone.`)) return;
    try {
      const { error } = await supabase.from("blog_posts").delete().eq("id", post.id);
      if (error) throw error;
      toast({ title: "Success", description: "Blog post deleted successfully" });
      loadData();
    } catch (error: unknown) {
      console.error("Error deleting post:", error);
      toast({ variant: "destructive", title: "Error", description: `Failed to delete blog post: ${error instanceof Error ? error.message : "Unknown error"}` });
    }
  }, [loadData]);

  const generateWithAI = useCallback(async () => {
    if (!aiTopic.trim()) {
      toast({ variant: "destructive", title: "Error", description: "Please enter a topic for AI generation" });
      return;
    }
    try {
      setGeneratingAI(true);
      const { data, error } = await supabase.functions.invoke("enhanced-blog-ai-fixed", {
        body: { action: "generate-manual-content", topic: aiTopic, customSettings: { target_word_count: 1200, content_style: "professional" } },
      });
      if (error) throw error;
      if (data.generatedContent) {
        const c = data.generatedContent;
        setNewPost({ ...newPost, title: c.title || "", body: c.body || "", excerpt: c.excerpt || "", seo_title: c.seo_title || "", seo_description: c.seo_description || "" });
        toast({ title: "Success", description: "AI content generated successfully using enhanced generation system" });
      } else { throw new Error("No content generated"); }
    } catch (error: unknown) {
      console.error("Error generating AI content:", error);
      let msg = "Failed to generate AI content. ";
      const errMsg = error instanceof Error ? error.message : "";
      if (errMsg.includes("not enabled or configured")) msg += "Auto-generation settings not configured. Please set up AI auto-generation first.";
      else if (errMsg.includes("API key")) msg += "API keys not configured. Please check your environment variables.";
      else if (errMsg.includes("Authentication")) msg += "Authentication failed. Please check your permissions.";
      else msg += errMsg || "Unknown error occurred.";
      toast({ variant: "destructive", title: "AI Generation Error", description: msg });
    } finally { setGeneratingAI(false); }
  }, [aiTopic, newPost]);

  const updateAISettings = async (settingId: string, updates: Partial<AISettings>) => {
    try {
      const { error } = await supabase.from("ai_settings").update(updates).eq("id", settingId);
      if (error) throw error;
      toast({ title: "Success", description: "AI settings updated successfully" });
      loadData();
    } catch (error: unknown) {
      console.error("Error updating AI settings:", error);
      toast({ variant: "destructive", title: "Error", description: "Failed to update AI settings" });
    }
  };

  const handleSocialShare = useCallback(async (postId: string) => {
    await triggerAutomation({ blogPostId: postId, triggerType: "manual" });
  }, [triggerAutomation]);

  if (loading || loadingData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-construction-blue mx-auto mb-4" role="status" aria-label="Loading blog manager"></div>
          <p className="text-muted-foreground">Loading blog manager...</p>
        </div>
      </div>
    );
  }

  return (
    <DashboardLayout title="Blog Manager">
      <main aria-label="Blog management" className="space-y-6">
        <Tabs defaultValue="posts" className="w-full">
          <TabsList className="grid w-full grid-cols-2" aria-label="Blog manager sections">
            <TabsTrigger value="posts">Blog Posts</TabsTrigger>
            <TabsTrigger value="keywords">Keywords & SEO</TabsTrigger>
          </TabsList>

          <TabsContent value="posts" className="space-y-6">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Create and manage blog articles with AI assistance
              </p>
              <div className="flex items-center space-x-2">
                <Dialog open={isDebugDialogOpen} onOpenChange={setIsDebugDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" aria-label="Debug AI generation">
                      <Bug className="h-4 w-4 mr-2" aria-hidden="true" />Debug AI
                    </Button>
                  </DialogTrigger>
                </Dialog>
                <Dialog open={isAutoGenDialogOpen} onOpenChange={setIsAutoGenDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" aria-label="Configure auto-generation">
                      <Bot className="h-4 w-4 mr-2" aria-hidden="true" />Auto-Generation
                    </Button>
                  </DialogTrigger>
                </Dialog>
                <Dialog open={isSettingsDialogOpen} onOpenChange={setIsSettingsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" aria-label="Configure AI settings">
                      <Settings className="h-4 w-4 mr-2" aria-hidden="true" />AI Settings
                    </Button>
                  </DialogTrigger>
                </Dialog>
                <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                  <DialogTrigger asChild>
                    <Button aria-label="Create new blog post">
                      <PlusCircle className="h-4 w-4 mr-2" aria-hidden="true" />New Post
                    </Button>
                  </DialogTrigger>
                </Dialog>
              </div>
            </div>
            <BlogPostList
              posts={posts}
              loading={loading}
              onEdit={handleEditPost}
              onDelete={handleDeletePost}
              onSocialShare={handleSocialShare}
              onCreateNew={() => setIsCreateDialogOpen(true)}
            />
          </TabsContent>

          <TabsContent value="keywords" className="space-y-6">
            <BlogKeywordsTab />
          </TabsContent>
        </Tabs>

        <BlogPostFormDialog
          mode="create" open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}
          formData={newPost} onFormChange={setNewPost} onSubmit={handleCreatePost}
          aiTopic={aiTopic} onAiTopicChange={setAiTopic}
          onGenerateWithAI={generateWithAI} generatingAI={generatingAI}
        />
        <BlogPostFormDialog
          mode="edit" open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}
          formData={editPost} onFormChange={setEditPost} onSubmit={handleUpdatePost}
        />
        <BlogToolDialogs
          isDebugDialogOpen={isDebugDialogOpen} onDebugDialogChange={setIsDebugDialogOpen}
          isAutoGenDialogOpen={isAutoGenDialogOpen} onAutoGenDialogChange={setIsAutoGenDialogOpen}
        />
        <BlogAISettingsDialog
          open={isSettingsDialogOpen} onOpenChange={setIsSettingsDialogOpen}
          aiSettings={aiSettings} onUpdateSettings={updateAISettings}
        />
      </main>
    </DashboardLayout>
  );
};

export default BlogManager;
