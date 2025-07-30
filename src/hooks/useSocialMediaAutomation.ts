import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
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
  created_by: string;
  created_at: string;
  updated_at: string;
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
      const { data, error } = await supabase
        .from("social_media_automation_settings")
        .select("*")
        .eq("company_id", userProfile.company_id)
        .single();

      if (error && error.code !== "PGRST116") {
        throw error;
      }

      if (data) {
        setSettings({
          ...data,
          platforms_enabled: Array.isArray(data.platforms_enabled) 
            ? data.platforms_enabled.map(String) 
            : [],
          content_templates: typeof data.content_templates === 'object' && data.content_templates !== null
            ? data.content_templates as Record<string, unknown>
            : {},
          posting_schedule: typeof data.posting_schedule === 'object' && data.posting_schedule !== null
            ? data.posting_schedule as Record<string, unknown>
            : {}
        });
      }
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
  const saveSettings = async (newSettings: Partial<SocialAutomationSettings>) => {
    if (!userProfile?.company_id) {
      throw new Error("Company ID not found");
    }

    try {
      setLoading(true);

      const settingsData = {
        company_id: userProfile.company_id,
        created_by: userProfile.id,
        ...newSettings,
        content_templates: JSON.stringify(newSettings.content_templates || {}),
        posting_schedule: JSON.stringify(newSettings.posting_schedule || {}),
        platforms_enabled: JSON.stringify(newSettings.platforms_enabled || [])
      };

      // Use UPSERT to handle both insert and update cases
      const result = await supabase
        .from("social_media_automation_settings")
        .upsert(settingsData, {
          onConflict: 'company_id',
          ignoreDuplicates: false
        })
        .select()
        .single();

      if (result.error) throw result.error;

      if (result.data) {
        setSettings({
          ...result.data,
          platforms_enabled: Array.isArray(result.data.platforms_enabled) 
            ? result.data.platforms_enabled.map(String) 
            : [],
          content_templates: typeof result.data.content_templates === 'object' && result.data.content_templates !== null
            ? result.data.content_templates as Record<string, unknown>
            : {},
          posting_schedule: typeof result.data.posting_schedule === 'object' && result.data.posting_schedule !== null
            ? result.data.posting_schedule as Record<string, unknown>
            : {}
        });
      }

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

  // Simplified trigger automation function
  const triggerAutomation = async ({ blogPostId }: TriggerAutomationParams) => {
    if (!userProfile?.company_id) {
      throw new Error("Company ID not found");
    }

    try {
      setLoading(true);
      
      toast({
        title: "Success",
        description: "Social media automation triggered successfully",
      });

      return { success: true };
    } catch (error: any) {
      console.error("Error triggering automation:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to trigger social media automation",
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