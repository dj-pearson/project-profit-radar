import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "./use-toast";
import { useAuth } from "@/contexts/AuthContext";

export interface AutomatedSocialConfig {
  id?: string;
  company_id: string;
  enabled: boolean;
  post_interval_hours: number;
  next_post_at?: string;
  content_types: string[];
  platforms: string[];
  webhook_url?: string;
  auto_schedule: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface AutomatedSocialQueue {
  id: string;
  company_id: string;
  content_type: string;
  topic: string;
  scheduled_for: string;
  status: "pending" | "processing" | "completed" | "failed";
  platforms_processed?: string[];
  posts_created?: number;
  webhook_sent?: boolean;
  error_message?: string;
  created_at: string;
  processed_at?: string;
}

export interface ContentLibraryItem {
  id: string;
  content_type: string;
  topic: string;
  title: string;
  description: string;
  key_points: string[];
  cta_template: string;
  priority: number;
  active: boolean;
  usage_count: number;
  last_used_at?: string;
  created_at: string;
  updated_at: string;
}

export const useAutomatedSocialPosts = () => {
  const { userProfile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState<AutomatedSocialConfig | null>(null);
  const [queue, setQueue] = useState<AutomatedSocialQueue[]>([]);
  const [contentLibrary, setContentLibrary] = useState<ContentLibraryItem[]>(
    []
  );

  // Load configuration
  const loadConfig = async () => {
    if (!userProfile?.company_id) return;

    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("automated_social_posts_config")
        .select("*")
        .eq("company_id", userProfile.company_id)
        .single();

      if (error && error.code !== "PGRST116") {
        // PGRST116 is "no rows returned"
        throw error;
      }

      setConfig(
        data || {
          company_id: userProfile.company_id,
          enabled: false,
          post_interval_hours: 24,
          content_types: ["features", "benefits", "knowledge"],
          platforms: ["twitter", "linkedin", "facebook", "instagram"],
          auto_schedule: true,
        }
      );
    } catch (error: any) {
      console.error("Error loading automated social config:", error);
      toast({
        title: "Error",
        description: "Failed to load automation settings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Save configuration
  const saveConfig = async (newConfig: Partial<AutomatedSocialConfig>) => {
    if (!userProfile?.company_id) return;

    try {
      setLoading(true);

      const configData = {
        ...config,
        ...newConfig,
        company_id: userProfile.company_id,
      };

      let result;
      if (config?.id) {
        // Update existing
        result = await supabase
          .from("automated_social_posts_config")
          .update(configData)
          .eq("id", config.id)
          .select()
          .single();
      } else {
        // Create new
        result = await supabase
          .from("automated_social_posts_config")
          .insert(configData)
          .select()
          .single();
      }

      if (result.error) throw result.error;

      setConfig(result.data);

      toast({
        title: "Success",
        description: "Automation settings saved successfully",
      });

      return result.data;
    } catch (error: any) {
      console.error("Error saving automated social config:", error);
      toast({
        title: "Error",
        description: "Failed to save automation settings",
        variant: "destructive",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Load queue
  const loadQueue = async () => {
    if (!userProfile?.company_id) return;

    try {
      const { data, error } = await supabase
        .from("automated_social_posts_queue")
        .select("*")
        .eq("company_id", userProfile.company_id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;

      setQueue(data || []);
    } catch (error: any) {
      console.error("Error loading queue:", error);
      toast({
        title: "Error",
        description: "Failed to load post queue",
        variant: "destructive",
      });
    }
  };

  // Load content library
  const loadContentLibrary = async () => {
    try {
      const { data, error } = await supabase
        .from("automated_social_content_library")
        .select("*")
        .eq("active", true)
        .order("content_type")
        .order("priority", { ascending: false });

      if (error) throw error;

      setContentLibrary(data || []);
    } catch (error: any) {
      console.error("Error loading content library:", error);
      toast({
        title: "Error",
        description: "Failed to load content library",
        variant: "destructive",
      });
    }
  };

  // Trigger manual post
  const triggerManualPost = async (contentType?: string) => {
    if (!userProfile?.company_id) return;

    try {
      setLoading(true);

      const { data, error } = await supabase.functions.invoke(
        "social-post-scheduler",
        {
          body: {
            company_id: userProfile.company_id,
            manual_trigger: true,
            content_type: contentType,
          },
        }
      );

      if (error) throw error;

      toast({
        title: "Success",
        description: "Manual post triggered successfully",
      });

      // Refresh queue
      await loadQueue();

      return data;
    } catch (error: any) {
      console.error("Error triggering manual post:", error);
      toast({
        title: "Error",
        description: "Failed to trigger manual post",
        variant: "destructive",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Get next scheduled post time
  const getNextPostTime = () => {
    if (!config?.next_post_at) return null;
    return new Date(config.next_post_at);
  };

  // Check if automation is active
  const isActive = () => {
    return config?.enabled && config?.auto_schedule;
  };

  // Get time until next post
  const getTimeUntilNextPost = () => {
    const nextPost = getNextPostTime();
    if (!nextPost) return null;

    const now = new Date();
    const diff = nextPost.getTime() - now.getTime();

    if (diff <= 0) return "Overdue";

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  };

  // Load initial data
  useEffect(() => {
    if (userProfile?.company_id) {
      loadConfig();
      loadQueue();
      loadContentLibrary();
    }
  }, [userProfile?.company_id]);

  return {
    config,
    queue,
    contentLibrary,
    loading,
    loadConfig,
    saveConfig,
    loadQueue,
    loadContentLibrary,
    triggerManualPost,
    getNextPostTime,
    getTimeUntilNextPost,
    isActive,
  };
};
