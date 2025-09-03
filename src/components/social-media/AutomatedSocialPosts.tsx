import React, { useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { PostQueueActions } from "./PostQueueActions";
import { useAutomatedSocialPosts } from "@/hooks/useAutomatedSocialPosts";
import { useAuth } from '@/contexts/AuthContext';
import {
  Clock,
  Play,
  Settings,
  BarChart3,
  Calendar,
  CheckCircle,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";

export const AutomatedSocialPosts = () => {
  const { userProfile } = useAuth();
  const {
    config,
    queue,
    contentLibrary,
    loading,
    saveConfig,
    triggerManualPost,
    getTimeUntilNextPost,
    isActive,
    loadQueue,
  } = useAutomatedSocialPosts();

  const [localConfig, setLocalConfig] = useState(config);

  // Update local config when config changes
  React.useEffect(() => {
    setLocalConfig(config);
  }, [config]);

  const handleSaveConfig = async () => {
    if (!localConfig) return;
    try {
      await saveConfig(localConfig);
    } catch (error) {
      console.error("Error saving config:", error);
    }
  };

  const handleIntervalChange = (value: string) => {
    setLocalConfig((prev) =>
      prev ? { ...prev, post_interval_hours: parseInt(value) } : null
    );
  };

  const handleContentTypeToggle = (contentType: string) => {
    if (!localConfig) return;

    const currentTypes = localConfig.content_types || [];
    const newTypes = currentTypes.includes(contentType)
      ? currentTypes.filter((type) => type !== contentType)
      : [...currentTypes, contentType];

    setLocalConfig({ ...localConfig, content_types: newTypes });
  };

  const handlePlatformToggle = (platform: string) => {
    if (!localConfig) return;

    const currentPlatforms = localConfig.platforms || [];
    const newPlatforms = currentPlatforms.includes(platform)
      ? currentPlatforms.filter((p) => p !== platform)
      : [...currentPlatforms, platform];

    setLocalConfig({ ...localConfig, platforms: newPlatforms });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "processing":
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      default:
        return <Clock className="h-4 w-4 text-blue-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "failed":
        return "bg-red-100 text-red-800";
      case "processing":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-blue-100 text-blue-800";
    }
  };

  if (!localConfig) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="settings" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="content">Content Library</TabsTrigger>
          <TabsTrigger value="queue">Post Queue</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="settings" className="space-y-6">
          {/* Status Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Automation Status
              </CardTitle>
              <CardDescription>
                Current status of your automated social media posting
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className={`h-3 w-3 rounded-full ${
                      isActive() ? "bg-green-500" : "bg-gray-300"
                    }`}
                  />
                  <span className="font-medium">
                    {isActive() ? "Active" : "Inactive"}
                  </span>
                </div>
                {isActive() && (
                  <Badge variant="outline" className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Next post in {getTimeUntilNextPost()}
                  </Badge>
                )}
              </div>

              {isActive() && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {localConfig.post_interval_hours}h
                    </div>
                    <div className="text-sm text-gray-500">Interval</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {localConfig.platforms.length}
                    </div>
                    <div className="text-sm text-gray-500">Platforms</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {localConfig.content_types.length}
                    </div>
                    <div className="text-sm text-gray-500">Content Types</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">
                      {queue.filter((q) => q.status === "completed").length}
                    </div>
                    <div className="text-sm text-gray-500">Posts Sent</div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Configuration */}
          <Card>
            <CardHeader>
              <CardTitle>Automation Configuration</CardTitle>
              <CardDescription>
                Configure how often and what type of content to post
                automatically
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Enable/Disable */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Enable Automation</Label>
                  <div className="text-sm text-gray-500">
                    Automatically generate and schedule social media posts
                  </div>
                </div>
                <Switch
                  checked={localConfig.enabled}
                  onCheckedChange={(checked) =>
                    setLocalConfig({ ...localConfig, enabled: checked })
                  }
                />
              </div>

              <Separator />

              {/* Post Interval */}
              <div className="space-y-2">
                <Label>Post Interval</Label>
                <Select
                  value={localConfig.post_interval_hours.toString()}
                  onValueChange={handleIntervalChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select interval" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="6">Every 6 hours</SelectItem>
                    <SelectItem value="12">Every 12 hours</SelectItem>
                    <SelectItem value="24">Daily</SelectItem>
                    <SelectItem value="48">Every 2 days</SelectItem>
                    <SelectItem value="72">Every 3 days</SelectItem>
                    <SelectItem value="168">Weekly</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Content Types */}
              <div className="space-y-3">
                <Label>Content Types</Label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {["features", "benefits", "knowledge"].map((type) => (
                    <div key={type} className="flex items-center space-x-2">
                      <Switch
                        checked={localConfig.content_types.includes(type)}
                        onCheckedChange={() => handleContentTypeToggle(type)}
                      />
                      <Label className="capitalize">{type}</Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Platforms */}
              <div className="space-y-3">
                <Label>Platforms</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {["twitter", "linkedin", "facebook", "instagram"].map(
                    (platform) => (
                      <div
                        key={platform}
                        className="flex items-center space-x-2"
                      >
                        <Switch
                          checked={localConfig.platforms.includes(platform)}
                          onCheckedChange={() => handlePlatformToggle(platform)}
                        />
                        <Label className="capitalize">{platform}</Label>
                      </div>
                    )
                  )}
                </div>
              </div>

              {/* Webhook URL */}
              <div className="space-y-2">
                <Label htmlFor="webhook-url">Webhook URL</Label>
                <Input
                  id="webhook-url"
                  placeholder="https://hook.make.com/..."
                  value={localConfig.webhook_url || ""}
                  onChange={(e) =>
                    setLocalConfig({
                      ...localConfig,
                      webhook_url: e.target.value,
                    })
                  }
                />
                <p className="text-sm text-gray-500">
                  Same webhook URL as your blog automation for consistent
                  routing
                </p>
              </div>

              {/* Save Button */}
              <div className="flex justify-between">
                <Button
                  variant="outline"
                  onClick={() => triggerManualPost()}
                  disabled={loading}
                  className="flex items-center gap-2"
                >
                  <Play className="h-4 w-4" />
                  Test Post Now
                </Button>
                <Button onClick={handleSaveConfig} disabled={loading}>
                  Save Configuration
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="content" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Content Library</CardTitle>
              <CardDescription>
                Pre-built content templates for automated posting
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                {contentLibrary.map((item) => (
                  <div
                    key={item.id}
                    className="border rounded-lg p-4 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="capitalize">
                          {item.content_type}
                        </Badge>
                        <h3 className="font-medium">{item.title}</h3>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <span>Priority: {item.priority}</span>
                        <span>•</span>
                        <span>Used: {item.usage_count} times</span>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600">{item.description}</p>
                    <div className="flex flex-wrap gap-1">
                      {item.key_points.map((point, index) => (
                        <Badge
                          key={index}
                          variant="secondary"
                          className="text-xs"
                        >
                          {point}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="queue" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Post Queue</CardTitle>
                  <CardDescription>
                    Recent and scheduled automated posts
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  onClick={loadQueue}
                  disabled={loading}
                  size="sm"
                >
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {queue.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No posts in queue yet
                  </div>
                ) : (
                  queue.map((item) => (
                    <div
                      key={item.id}
                      className="border rounded-lg p-4 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(item.status)}
                          <h3 className="font-medium capitalize">
                            {item.topic.replace("-", " ")}
                          </h3>
                          <Badge variant="outline" className="capitalize">
                            {item.content_type}
                          </Badge>
                        </div>
                        <Badge className={getStatusColor(item.status)}>
                          {item.status}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="font-medium">Scheduled:</span>
                          <div className="text-gray-600">
                            {format(
                              new Date(item.scheduled_for),
                              "MMM d, HH:mm"
                            )}
                          </div>
                        </div>
                        {item.platforms_processed && (
                          <div>
                            <span className="font-medium">Platforms:</span>
                            <div className="text-gray-600">
                              {item.platforms_processed.length} platforms
                            </div>
                          </div>
                        )}
                        {item.posts_created && (
                          <div>
                            <span className="font-medium">Posts:</span>
                            <div className="text-gray-600">
                              {item.posts_created} created
                            </div>
                          </div>
                        )}
                        <div>
                          <span className="font-medium">Webhook:</span>
                          <div className="text-gray-600">
                            {item.webhook_sent ? "Sent" : "Pending"}
                          </div>
                        </div>
                      </div>

                        <PostQueueActions 
                          queueItem={{
                            id: item.id,
                            webhook_sent: item.webhook_sent,
                            status: item.status,
                            company_id: userProfile?.company_id || ""
                          }} 
                          onUpdate={loadQueue}
                        />

                      {item.error_message && (
                        <div className="bg-red-50 border border-red-200 rounded p-2">
                          <p className="text-sm text-red-600">
                            {item.error_message}
                          </p>
                        </div>
                      )}

                      {item.processed_at && (
                        <p className="text-xs text-gray-500">
                          Processed{" "}
                          {formatDistanceToNow(new Date(item.processed_at))} ago
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Analytics Overview
              </CardTitle>
              <CardDescription>
                Performance metrics for your automated social media posts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500">
                Analytics dashboard coming soon...
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
