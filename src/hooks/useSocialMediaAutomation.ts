import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface SocialAutomationSettings {
  id?: string;
  company_id: string;
  is_active: boolean;
  auto_post_on_publish: boolean;
  webhook_url?: string;
  webhook_secret?: string;
  ai_content_generation: boolean;
  platforms_enabled: string[];
  posting_schedule: Record<string, unknown>;
  content_templates: Record<string, unknown>;
}

interface TriggerAutomationParams {
  blogPostId: string;
  triggerType?: "manual" | "auto_publish" | "scheduled";
  customWebhookUrl?: string;
}

export const useSocialMediaAutomation = () => {
  const { userProfile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState<SocialAutomationSettings | null>(
    null
  );

  // Load automation settings
  const loadSettings = async () => {
    if (!userProfile?.company_id) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("social_media_automation_settings")
        .select("*")
        .eq("company_id", userProfile.company_id)
        .single();

      if (error && error.code !== "PGRST116") {
        throw error;
      }

      setSettings(data || null);
    } catch (error) {
      console.error("Error loading automation settings:", error);
      toast({
        title: "Error",
        description: "Failed to load social media automation settings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Save automation settings
  const saveSettings = async (
    newSettings: Partial<SocialAutomationSettings>
  ) => {
    if (!userProfile?.company_id) {
      throw new Error("Company ID not found");
    }

    try {
      setLoading(true);

      const settingsData = {
        company_id: userProfile.company_id,
        created_by: userProfile.id,
        ...newSettings,
      };

      let result;
      if (settings?.id) {
        // Update existing settings
        result = await supabase
          .from("social_media_automation_settings")
          .update(settingsData)
          .eq("id", settings.id)
          .select()
          .single();
      } else {
        // Create new settings
        result = await supabase
          .from("social_media_automation_settings")
          .insert(settingsData)
          .select()
          .single();
      }

      if (result.error) throw result.error;

      setSettings(result.data);

      toast({
        title: "Success",
        description: "Social media automation settings saved successfully",
      });

      return result.data;
    } catch (error) {
      console.error("Error saving automation settings:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to save automation settings";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Trigger social media automation for a blog post
  const triggerAutomation = async ({
    blogPostId,
    triggerType = "manual",
    customWebhookUrl,
  }: TriggerAutomationParams) => {
    if (!userProfile?.company_id) {
      throw new Error("Company ID not found");
    }

    try {
      setLoading(true);

      // Log the automation attempt
      const { data: logEntry, error: logError } = await supabase
        .from("social_media_automation_logs")
        .insert({
          company_id: userProfile.company_id,
          blog_post_id: blogPostId,
          trigger_type: triggerType,
          status: "processing",
        })
        .select()
        .single();

      if (logError) throw logError;

      // Call the webhook function
      const { data, error } = await supabase.functions.invoke(
        "blog-social-webhook",
        {
          body: {
            blog_post_id: blogPostId,
            company_id: userProfile.company_id,
            trigger_type: triggerType,
            webhook_url: customWebhookUrl,
          },
        }
      );

      if (error) throw error;

      // Update the log with results
      await supabase
        .from("social_media_automation_logs")
        .update({
          status: "completed",
          platforms_processed: data.platforms_processed || [],
          posts_created: data.social_posts_created || 0,
          webhook_sent: !!customWebhookUrl || !!settings?.webhook_url,
        })
        .eq("id", logEntry.id);

      toast({
        title: "Success",
        description: `Social media automation completed! Created ${data.social_posts_created} posts for ${data.platforms_processed?.length} platforms.`,
      });

      return data;
    } catch (error: any) {
      console.error("Error triggering automation:", error);

      toast({
        title: "Error",
        description:
          error.message || "Failed to trigger social media automation",
        variant: "destructive",
      });

      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Get automation logs
  const getAutomationLogs = async (blogPostId?: string) => {
    if (!userProfile?.company_id) return [];

    try {
      let query = supabase
        .from("social_media_automation_logs")
        .select(
          `
          *,
          blog_posts (title, slug)
        `
        )
        .eq("company_id", userProfile.company_id)
        .order("created_at", { ascending: false });

      if (blogPostId) {
        query = query.eq("blog_post_id", blogPostId);
      }

      const { data, error } = await query.limit(50);

      if (error) throw error;
      return data || [];
    } catch (error: any) {
      console.error("Error fetching automation logs:", error);
      return [];
    }
  };

  // Check if automation should be triggered automatically
  const shouldAutoTrigger = (blogStatus: string) => {
    return (
      settings?.is_active &&
      settings?.auto_post_on_publish &&
      blogStatus === "published"
    );
  };

  return {
    settings,
    loading,
    loadSettings,
    saveSettings,
    triggerAutomation,
    getAutomationLogs,
    shouldAutoTrigger,
  };
};
