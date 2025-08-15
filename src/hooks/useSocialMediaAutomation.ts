import { useState, useEffect } from "react";
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
  created_by?: string;
  created_at?: string;
  updated_at?: string;
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
  const [settings, setSettings] = useState<SocialAutomationSettings | null>(null);

  // Load automation settings
  const loadSettings = async () => {
    if (!userProfile?.company_id) return;

    try {
      setLoading(true);
      // Load blog-auto social settings and also sync webhook from automated config if present
      const { data: autoConfig, error: autoError } = await supabase
        .from("automated_social_posts_config")
        .select("webhook_url, blog_webhook_url, platforms, enabled, auto_schedule, company_id")
        .eq("company_id", userProfile.company_id)
        .maybeSingle();

      if (autoError && autoError.code !== "PGRST116") throw autoError;

      const merged: SocialAutomationSettings = autoConfig
        ? {
            company_id: autoConfig.company_id || userProfile.company_id,
            is_active: !!autoConfig.enabled,
            auto_post_on_publish: !!autoConfig.auto_schedule,
            webhook_url: autoConfig.blog_webhook_url || "",
            webhook_secret: "",
            ai_content_generation: true,
            platforms_enabled: Array.isArray(autoConfig.platforms)
              ? (autoConfig.platforms as string[])
              : [],
            posting_schedule: {},
            content_templates: {},
          }
        : {
            company_id: userProfile.company_id,
            is_active: false,
            auto_post_on_publish: true,
            webhook_url: "",
            webhook_secret: "",
            ai_content_generation: true,
            platforms_enabled: [],
            posting_schedule: {},
            content_templates: {},
          } as SocialAutomationSettings;

      setSettings(merged);
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

  // Auto-load settings when the authenticated company changes
  useEffect(() => {
    if (userProfile?.company_id) {
      loadSettings();
    }
  }, [userProfile?.company_id]);
  // Save automation settings
  const saveSettings = async (newSettings: Partial<SocialAutomationSettings>) => {
    if (!userProfile?.company_id) {
      throw new Error("Company ID not found");
    }

    try {
      setLoading(true);

      // Upsert into automated social posts config (single source of truth)
      const { data: existingConfig } = await supabase
        .from("automated_social_posts_config")
        .select("id")
        .eq("company_id", userProfile.company_id)
        .maybeSingle();

      let result;

      const updateData: any = {
        ...(newSettings.is_active !== undefined ? { enabled: newSettings.is_active } : {}),
        ...(newSettings.auto_post_on_publish !== undefined
          ? { auto_schedule: newSettings.auto_post_on_publish }
          : {}),
        ...(typeof newSettings.webhook_url === "string" ? { blog_webhook_url: newSettings.webhook_url } : {}),
        ...(Array.isArray(newSettings.platforms_enabled)
          ? { platforms: (newSettings.platforms_enabled as any) }
          : {}),
      };

      if (existingConfig?.id) {
        result = await supabase
          .from("automated_social_posts_config")
          .update(updateData)
          .eq("company_id", userProfile.company_id)
          .select()
          .single();
      } else {
        const insertData: any = {
          company_id: userProfile.company_id,
          enabled: newSettings.is_active ?? false,
          auto_schedule: newSettings.auto_post_on_publish ?? true,
          blog_webhook_url: newSettings.webhook_url ?? "",
          platforms: (newSettings.platforms_enabled || []) as any,
        };

        result = await supabase
          .from("automated_social_posts_config")
          .insert(insertData)
          .select()
          .single();
      }

      if (result.error) throw result.error;

      if (result.data) {
        setSettings({
          company_id: userProfile.company_id,
          is_active: !!result.data.enabled,
          auto_post_on_publish: !!result.data.auto_schedule,
          webhook_url: result.data.blog_webhook_url || "",
          webhook_secret: "",
          ai_content_generation: true,
          platforms_enabled: Array.isArray(result.data.platforms)
            ? result.data.platforms.map(String)
            : [],
          posting_schedule: {},
          content_templates: {},
        } as SocialAutomationSettings);
      }

      toast({
        title: "Success",
        description: "Social media automation settings saved successfully",
      });
    } catch (error) {
      console.error("Error saving automation settings:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to save automation settings";
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

  // Simplified trigger automation function
  const triggerAutomation = async ({ blogPostId }: TriggerAutomationParams) => {
    if (!userProfile?.company_id) {
      throw new Error("Company ID not found");
    }

    try {
      setLoading(true);

      const { data, error } = await supabase.functions.invoke(
        "social-post-scheduler",
        {
          body: {
            manual_trigger: true,
            company_id: userProfile.company_id,
          },
        }
      );

      if (error) throw error;

      toast({
        title: "Success",
        description: "Social media automation triggered successfully",
      });

      return { success: true, data };
    } catch (error: any) {
      console.error("Error triggering automation:", error);
      toast({
        title: "Error",
        description:
          error?.message || "Failed to trigger social media automation",
        variant: "destructive",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const getAutomationLogs = async () => {
    return [];
  };

  const shouldAutoTrigger = (blogStatus: string) => {
    return settings?.is_active && settings?.auto_post_on_publish && blogStatus === "published";
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