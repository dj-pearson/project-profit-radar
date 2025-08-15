import React, { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { useSocialMediaAutomation } from "@/hooks/useSocialMediaAutomation";
import {
  ExternalLink,
  Zap,
  Settings,
  Globe,
  Webhook,
  TestTube,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const AVAILABLE_PLATFORMS = [
  { id: "linkedin", name: "LinkedIn", description: "Professional networking" },
  { id: "twitter", name: "Twitter/X", description: "Microblogging platform" },
  { id: "facebook", name: "Facebook", description: "Social networking" },
  {
    id: "instagram",
    name: "Instagram",
    description: "Photo and video sharing",
  },
];

const SocialAutomationSettings: React.FC = () => {
  const { settings, loading, loadSettings, saveSettings, triggerAutomation } =
    useSocialMediaAutomation();
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    is_active: false,
    auto_post_on_publish: false,
    webhook_url: "",
    webhook_secret: "",
    ai_content_generation: true,
    platforms_enabled: ["linkedin", "twitter", "facebook", "instagram"],
  });
  const [testWebhookLoading, setTestWebhookLoading] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  useEffect(() => {
    if (settings) {
      setFormData({
        is_active: settings.is_active,
        auto_post_on_publish: settings.auto_post_on_publish,
        webhook_url: settings.webhook_url || "",
        webhook_secret: settings.webhook_secret || "",
        ai_content_generation: settings.ai_content_generation,
        platforms_enabled: settings.platforms_enabled,
      });
    }
  }, [settings]);

  const handleSave = async () => {
    try {
      await saveSettings(formData);
    } catch (error) {
      // Error handling is done in the hook
    }
  };

  const handlePlatformToggle = (platformId: string) => {
    setFormData((prev) => ({
      ...prev,
      platforms_enabled: prev.platforms_enabled.includes(platformId)
        ? prev.platforms_enabled.filter((p) => p !== platformId)
        : [...prev.platforms_enabled, platformId],
    }));
  };

  const testWebhook = async () => {
    if (!formData.webhook_url) {
      toast({
        title: "Error",
        description: "Please enter a webhook URL first",
        variant: "destructive",
      });
      return;
    }

    setTestWebhookLoading(true);
    try {
      const response = await fetch(formData.webhook_url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "BuildDesk-Blog-Social-Test/1.0",
        },
        body: JSON.stringify({
          timestamp: new Date().toISOString(),
          event: "webhook_test",
          data: {
            message:
              "This is a test webhook from BuildDesk Social Media Automation",
            platforms: formData.platforms_enabled,
          },
        }),
      });

      if (response.ok) {
        toast({
          title: "Success",
          description:
            "Webhook test successful! Your endpoint is working correctly.",
        });
      } else {
        throw new Error(`Webhook returned status ${response.status}`);
      }
    } catch (error) {
      toast({
        title: "Webhook Test Failed",
        description:
          error instanceof Error
            ? error.message
            : "Failed to connect to webhook",
        variant: "destructive",
      });
    } finally {
      setTestWebhookLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Social Media Automation
          </CardTitle>
          <CardDescription>
            Automatically create and distribute social media posts when you
            publish blog content
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="general" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="platforms">Platforms</TabsTrigger>
              <TabsTrigger value="webhook">Webhook</TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Enable Automation</Label>
                  <div className="text-sm text-muted-foreground">
                    Turn on social media automation for blog posts
                  </div>
                </div>
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({ ...prev, is_active: checked }))
                  }
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Auto-post on Publish</Label>
                  <div className="text-sm text-muted-foreground">
                    Automatically create social posts when a blog is published
                  </div>
                </div>
                <Switch
                  checked={formData.auto_post_on_publish}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({
                      ...prev,
                      auto_post_on_publish: checked,
                    }))
                  }
                  disabled={!formData.is_active}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">AI Content Generation</Label>
                  <div className="text-sm text-muted-foreground">
                    Use AI to optimize content for each social platform
                  </div>
                </div>
                <Switch
                  checked={formData.ai_content_generation}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({
                      ...prev,
                      ai_content_generation: checked,
                    }))
                  }
                />
              </div>
            </TabsContent>

            <TabsContent value="platforms" className="space-y-4">
              <div>
                <Label className="text-base">Enabled Platforms</Label>
                <p className="text-sm text-muted-foreground">
                  Select which social media platforms to create posts for
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {AVAILABLE_PLATFORMS.map((platform) => (
                  <Card key={platform.id} className="relative">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Label className="font-medium">
                              {platform.name}
                            </Label>
                            {formData.platforms_enabled.includes(
                              platform.id
                            ) && (
                              <Badge variant="secondary" className="text-xs">
                                Enabled
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {platform.description}
                          </p>
                        </div>
                        <Switch
                          checked={formData.platforms_enabled.includes(
                            platform.id
                          )}
                          onCheckedChange={() =>
                            handlePlatformToggle(platform.id)
                          }
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="webhook" className="space-y-4">
              <div>
                <Label className="text-base flex items-center gap-2">
                  <Webhook className="h-4 w-4" />
                  Blog-to-Social Webhook Configuration
                </Label>
                <p className="text-sm text-muted-foreground">
                  Configure webhook for blog-to-social automation. This is separate from automated posts webhook.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="webhook_url">Webhook URL</Label>
                  <div className="flex gap-2">
                    <Input
                      id="webhook_url"
                      placeholder="https://hook.integromat.com/..."
                      value={formData.webhook_url}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          webhook_url: e.target.value,
                        }))
                      }
                    />
                    <Button
                      variant="outline"
                      onClick={testWebhook}
                      disabled={!formData.webhook_url || testWebhookLoading}
                      className="whitespace-nowrap"
                    >
                      <TestTube className="h-4 w-4 mr-2" />
                      {testWebhookLoading ? "Testing..." : "Test"}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    This URL will receive blog-to-social post data when a blog is published.
                    Different from the automated social posts webhook.
                  </p>
                </div>

                <div>
                  <Label htmlFor="webhook_secret">
                    Webhook Secret (Optional)
                  </Label>
                  <Input
                    id="webhook_secret"
                    type="password"
                    placeholder="Enter a secret for webhook verification"
                    value={formData.webhook_secret}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        webhook_secret: e.target.value,
                      }))
                    }
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Used to verify webhook authenticity in external systems
                  </p>
                </div>

                <Card className="bg-muted/50">
                  <CardContent className="p-4">
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      Integration Examples
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div>
                        <strong>Make.com:</strong> Create a "Webhook" trigger
                        module
                        <a
                          href="https://www.make.com/en/integrations/webhook"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-2 inline-flex items-center text-blue-600 hover:text-blue-700"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                      <div>
                        <strong>Zapier:</strong> Use "Webhooks by Zapier"
                        trigger
                        <a
                          href="https://zapier.com/apps/webhook/integrations"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-2 inline-flex items-center text-blue-600 hover:text-blue-700"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                      <div>
                        <strong>Direct API:</strong> Receive structured data for
                        custom processing
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end pt-6">
            <Button onClick={handleSave} disabled={loading}>
              {loading ? "Saving..." : "Save Settings"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SocialAutomationSettings;
