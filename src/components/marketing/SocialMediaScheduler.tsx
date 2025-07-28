import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Clock, Send, Image, Video, Link, Plus, Edit, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface SocialPost {
  id: string;
  content: string;
  platforms: string[];
  scheduledDate: Date;
  status: "draft" | "scheduled" | "published" | "failed";
  mediaUrls?: string[];
  engagement?: {
    likes: number;
    shares: number;
    comments: number;
  };
}

const mockPosts: SocialPost[] = [
  {
    id: "1",
    content: "🚀 Exciting project update! Our new construction management features are helping teams save 40% more time on project coordination. #ConstructionTech #ProjectManagement",
    platforms: ["twitter", "linkedin"],
    scheduledDate: new Date("2024-01-15T10:00:00"),
    status: "scheduled",
    engagement: { likes: 0, shares: 0, comments: 0 }
  },
  {
    id: "2",
    content: "Behind the scenes of our latest residential project in downtown. From blueprint to completion - efficiency at every step! 🏗️",
    platforms: ["instagram", "facebook"],
    scheduledDate: new Date("2024-01-14T14:30:00"),
    status: "published",
    mediaUrls: ["/placeholder.svg"],
    engagement: { likes: 24, shares: 8, comments: 5 }
  }
];

const platformIcons = {
  twitter: "🐦",
  linkedin: "💼",
  facebook: "📘",
  instagram: "📸"
};

export const SocialMediaScheduler = () => {
  const [posts, setPosts] = useState<SocialPost[]>(mockPosts);
  const [newPost, setNewPost] = useState({
    content: "",
    platforms: [] as string[],
    scheduledDate: new Date(),
    scheduledTime: "09:00"
  });
  const [isCreating, setIsCreating] = useState(false);

  const handleCreatePost = () => {
    const post: SocialPost = {
      id: Date.now().toString(),
      content: newPost.content,
      platforms: newPost.platforms,
      scheduledDate: new Date(`${format(newPost.scheduledDate, 'yyyy-MM-dd')}T${newPost.scheduledTime}:00`),
      status: "scheduled",
      engagement: { likes: 0, shares: 0, comments: 0 }
    };
    
    setPosts([...posts, post]);
    setNewPost({
      content: "",
      platforms: [],
      scheduledDate: new Date(),
      scheduledTime: "09:00"
    });
    setIsCreating(false);
  };

  const togglePlatform = (platform: string) => {
    const current = newPost.platforms;
    const updated = current.includes(platform)
      ? current.filter(p => p !== platform)
      : [...current, platform];
    setNewPost({ ...newPost, platforms: updated });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "published": return "bg-success text-success-foreground";
      case "scheduled": return "bg-warning text-warning-foreground";
      case "failed": return "bg-destructive text-destructive-foreground";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const upcomingPosts = posts.filter(post => 
    post.status === "scheduled" && post.scheduledDate > new Date()
  );

  const publishedPosts = posts.filter(post => post.status === "published");

  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{upcomingPosts.length}</div>
            <div className="text-sm text-muted-foreground">Scheduled Posts</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{publishedPosts.length}</div>
            <div className="text-sm text-muted-foreground">Published Today</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">
              {publishedPosts.reduce((sum, post) => sum + (post.engagement?.likes || 0), 0)}
            </div>
            <div className="text-sm text-muted-foreground">Total Engagement</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">4</div>
            <div className="text-sm text-muted-foreground">Active Platforms</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="create" className="w-full">
        <TabsList>
          <TabsTrigger value="create">Create Post</TabsTrigger>
          <TabsTrigger value="scheduled">Scheduled ({upcomingPosts.length})</TabsTrigger>
          <TabsTrigger value="published">Published ({publishedPosts.length})</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Create Post Tab */}
        <TabsContent value="create" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Create New Post</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Content</label>
                <Textarea
                  placeholder="What's happening in your construction projects?"
                  value={newPost.content}
                  onChange={(e) => setNewPost({ ...newPost, content: e.target.value })}
                  className="mt-1"
                  rows={4}
                />
                <div className="text-xs text-muted-foreground mt-1">
                  {newPost.content.length}/280 characters
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Platforms</label>
                <div className="flex gap-2 mt-2">
                  {Object.entries(platformIcons).map(([platform, icon]) => (
                    <Button
                      key={platform}
                      variant={newPost.platforms.includes(platform) ? "default" : "outline"}
                      size="sm"
                      onClick={() => togglePlatform(platform)}
                    >
                      {icon} {platform}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Schedule Date</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal mt-1",
                          !newPost.scheduledDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {newPost.scheduledDate ? format(newPost.scheduledDate, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={newPost.scheduledDate}
                        onSelect={(date) => date && setNewPost({ ...newPost, scheduledDate: date })}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div>
                  <label className="text-sm font-medium">Schedule Time</label>
                  <Input
                    type="time"
                    value={newPost.scheduledTime}
                    onChange={(e) => setNewPost({ ...newPost, scheduledTime: e.target.value })}
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={handleCreatePost} disabled={!newPost.content || newPost.platforms.length === 0}>
                  <Clock className="h-4 w-4 mr-2" />
                  Schedule Post
                </Button>
                <Button variant="outline">
                  <Image className="h-4 w-4 mr-2" />
                  Add Media
                </Button>
                <Button variant="outline">
                  <Send className="h-4 w-4 mr-2" />
                  Post Now
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Scheduled Posts Tab */}
        <TabsContent value="scheduled" className="space-y-4">
          {upcomingPosts.map((post) => (
            <Card key={post.id}>
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex gap-2">
                    {post.platforms.map(platform => (
                      <Badge key={platform} variant="secondary">
                        {platformIcons[platform as keyof typeof platformIcons]} {platform}
                      </Badge>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline">
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button size="sm" variant="outline">
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <p className="text-sm mb-3">{post.content}</p>
                <div className="flex justify-between items-center text-xs text-muted-foreground">
                  <span>Scheduled for {format(post.scheduledDate, "PPP 'at' HH:mm")}</span>
                  <Badge className={getStatusColor(post.status)}>{post.status}</Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Published Posts Tab */}
        <TabsContent value="published" className="space-y-4">
          {publishedPosts.map((post) => (
            <Card key={post.id}>
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex gap-2">
                    {post.platforms.map(platform => (
                      <Badge key={platform} variant="secondary">
                        {platformIcons[platform as keyof typeof platformIcons]} {platform}
                      </Badge>
                    ))}
                  </div>
                  <Badge className={getStatusColor(post.status)}>{post.status}</Badge>
                </div>
                <p className="text-sm mb-3">{post.content}</p>
                {post.mediaUrls && (
                  <div className="mb-3">
                    <img 
                      src={post.mediaUrls[0]} 
                      alt="Post media" 
                      className="rounded-md max-h-32 object-cover"
                    />
                  </div>
                )}
                <div className="grid grid-cols-3 gap-4 text-center text-xs">
                  <div>
                    <div className="font-medium">{post.engagement?.likes}</div>
                    <div className="text-muted-foreground">Likes</div>
                  </div>
                  <div>
                    <div className="font-medium">{post.engagement?.shares}</div>
                    <div className="text-muted-foreground">Shares</div>
                  </div>
                  <div>
                    <div className="font-medium">{post.engagement?.comments}</div>
                    <div className="text-muted-foreground">Comments</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Platform Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(platformIcons).map(([platform, icon]) => (
                    <div key={platform} className="flex justify-between items-center">
                      <span className="flex items-center gap-2">
                        {icon} {platform}
                      </span>
                      <div className="text-right">
                        <div className="font-medium">
                          {Math.floor(Math.random() * 100) + 20} engagements
                        </div>
                        <div className="text-xs text-muted-foreground">
                          +{Math.floor(Math.random() * 20) + 5}% vs last week
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Best Posting Times</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span>Monday 9:00 AM</span>
                    <span className="text-success">High engagement</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Wednesday 2:00 PM</span>
                    <span className="text-success">High engagement</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Friday 5:00 PM</span>
                    <span className="text-warning">Medium engagement</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};