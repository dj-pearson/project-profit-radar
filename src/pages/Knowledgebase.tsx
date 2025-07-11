import React, { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Plus, 
  Search, 
  BookOpen, 
  FileText, 
  Video, 
  Download,
  Eye,
  ThumbsUp,
  Star,
  Clock,
  Users,
  Tag
} from 'lucide-react';

export default function Knowledgebase() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTab, setSelectedTab] = useState("articles");

  // Mock data
  const articles = [
    {
      id: "1",
      title: "Getting Started with BuildDesk",
      content: "Complete guide to setting up your construction management platform",
      category: "Getting Started",
      type: "guide",
      author: "Support Team",
      created_date: "2024-03-15",
      updated_date: "2024-04-10",
      views: 1247,
      likes: 95,
      rating: 4.8,
      tags: ["setup", "basics", "onboarding"],
      status: "published"
    },
    {
      id: "2",
      title: "QuickBooks Integration Setup",
      content: "Step-by-step instructions for connecting your QuickBooks account",
      category: "Integrations",
      type: "tutorial",
      author: "Tech Team",
      created_date: "2024-03-20",
      updated_date: "2024-04-08",
      views: 892,
      likes: 78,
      rating: 4.6,
      tags: ["quickbooks", "integration", "accounting"],
      status: "published"
    },
    {
      id: "3",
      title: "Mobile App User Guide",
      content: "Comprehensive guide to using the BuildDesk mobile application",
      category: "Mobile",
      type: "guide",
      author: "Product Team",
      created_date: "2024-03-25",
      updated_date: "2024-04-05",
      views: 675,
      likes: 62,
      rating: 4.7,
      tags: ["mobile", "app", "field-work"],
      status: "published"
    },
    {
      id: "4",
      title: "Project Cost Tracking Best Practices",
      content: "Learn how to effectively track project costs and maintain profitability",
      category: "Best Practices",
      type: "article",
      author: "Construction Expert",
      created_date: "2024-04-01",
      updated_date: "2024-04-01",
      views: 423,
      likes: 34,
      rating: 4.5,
      tags: ["cost-tracking", "profitability", "best-practices"],
      status: "draft"
    }
  ];

  const categories = [
    {
      id: "1",
      name: "Getting Started",
      description: "Basic setup and onboarding guides",
      article_count: 8,
      icon: "🚀"
    },
    {
      id: "2",
      name: "Project Management",
      description: "Managing projects from start to finish",
      article_count: 15,
      icon: "📋"
    },
    {
      id: "3",
      name: "Financial Management",
      description: "Cost tracking, invoicing, and financial reporting",
      article_count: 12,
      icon: "💰"
    },
    {
      id: "4",
      name: "Integrations",
      description: "Connecting with third-party tools and services",
      article_count: 6,
      icon: "🔗"
    },
    {
      id: "5",
      name: "Mobile App",
      description: "Using the mobile application effectively",
      article_count: 9,
      icon: "📱"
    },
    {
      id: "6",
      name: "Best Practices",
      description: "Industry best practices and tips",
      article_count: 11,
      icon: "⭐"
    }
  ];

  const videos = [
    {
      id: "1",
      title: "BuildDesk Platform Overview",
      description: "10-minute overview of the BuildDesk platform and its key features",
      duration: "10:32",
      thumbnail: "/placeholder-video.jpg",
      category: "Getting Started",
      views: 2341,
      created_date: "2024-03-10"
    },
    {
      id: "2",
      title: "Creating Your First Project",
      description: "Step-by-step walkthrough of creating a new construction project",
      duration: "8:45",
      thumbnail: "/placeholder-video.jpg",
      category: "Project Management",
      views: 1876,
      created_date: "2024-03-18"
    },
    {
      id: "3",
      title: "Mobile Time Tracking Demo",
      description: "Learn how to track time and manage crews using the mobile app",
      duration: "6:22",
      thumbnail: "/placeholder-video.jpg",
      category: "Mobile App",
      views: 1453,
      created_date: "2024-03-25"
    }
  ];

  const downloads = [
    {
      id: "1",
      name: "Project Setup Checklist",
      description: "Comprehensive checklist for setting up new construction projects",
      file_type: "PDF",
      file_size: "2.3 MB",
      download_count: 567,
      category: "Project Management"
    },
    {
      id: "2",
      name: "Cost Code Templates",
      description: "Standard construction cost codes for different project types",
      file_type: "Excel",
      file_size: "1.8 MB",
      download_count: 423,
      category: "Financial Management"
    },
    {
      id: "3",
      name: "Safety Inspection Forms",
      description: "OSHA-compliant safety inspection and incident report forms",
      file_type: "PDF",
      file_size: "1.2 MB",
      download_count: 789,
      category: "Safety"
    }
  ];

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      published: { variant: "default" as const, label: "Published" },
      draft: { variant: "secondary" as const, label: "Draft" },
      archived: { variant: "outline" as const, label: "Archived" }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig];
    return <Badge variant={config?.variant}>{config?.label || status}</Badge>;
  };

  const getTypeIcon = (type: string) => {
    const typeIcons = {
      article: FileText,
      guide: BookOpen,
      tutorial: Video,
      faq: Users
    };
    return typeIcons[type as keyof typeof typeIcons] || FileText;
  };

  return (
    <DashboardLayout title="Knowledge Base">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Knowledge Base</h1>
            <p className="text-muted-foreground">Manage help articles, guides, and training resources</p>
          </div>
          <div className="flex gap-2">
            <Dialog>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Article
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create Knowledge Base Article</DialogTitle>
                  <DialogDescription>
                    Create a new help article or guide for your knowledge base
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="article-title">Article Title</Label>
                    <Input id="article-title" placeholder="Enter article title" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="category">Category</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="getting-started">Getting Started</SelectItem>
                          <SelectItem value="project-management">Project Management</SelectItem>
                          <SelectItem value="financial-management">Financial Management</SelectItem>
                          <SelectItem value="integrations">Integrations</SelectItem>
                          <SelectItem value="mobile-app">Mobile App</SelectItem>
                          <SelectItem value="best-practices">Best Practices</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="type">Content Type</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="article">Article</SelectItem>
                          <SelectItem value="guide">Guide</SelectItem>
                          <SelectItem value="tutorial">Tutorial</SelectItem>
                          <SelectItem value="faq">FAQ</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="tags">Tags (comma-separated)</Label>
                    <Input id="tags" placeholder="setup, basics, onboarding" />
                  </div>
                  <div>
                    <Label htmlFor="content">Article Content</Label>
                    <Textarea 
                      id="content" 
                      placeholder="Write your article content here..."
                      rows={8}
                    />
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="articles">Articles</TabsTrigger>
            <TabsTrigger value="categories">Categories</TabsTrigger>
            <TabsTrigger value="videos">Videos</TabsTrigger>
            <TabsTrigger value="downloads">Downloads</TabsTrigger>
          </TabsList>

          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search articles, videos, or downloads..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>

          <TabsContent value="articles" className="space-y-4">
            <div className="grid gap-4">
              {articles.map((article) => {
                const TypeIcon = getTypeIcon(article.type);
                return (
                  <Card key={article.id} className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <CardTitle className="text-lg flex items-center gap-2">
                            <TypeIcon className="h-5 w-5" />
                            {article.title}
                          </CardTitle>
                          <CardDescription>
                            {article.content}
                          </CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{article.category}</Badge>
                          {getStatusBadge(article.status)}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                        <div className="flex items-center gap-2">
                          <Eye className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="font-medium text-muted-foreground">Views</div>
                            <div className="font-semibold">{article.views.toLocaleString()}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <ThumbsUp className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="font-medium text-muted-foreground">Likes</div>
                            <div>{article.likes}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Star className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="font-medium text-muted-foreground">Rating</div>
                            <div>{article.rating}/5</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="font-medium text-muted-foreground">Updated</div>
                            <div>{new Date(article.updated_date).toLocaleDateString()}</div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 mb-4">
                        <Tag className="h-4 w-4 text-muted-foreground" />
                        <div className="flex gap-1">
                          {article.tags.map((tag) => (
                            <Badge key={tag} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <div className="text-sm">
                          <span className="font-medium">Author: </span>
                          <span>{article.author}</span>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm">
                            Edit
                          </Button>
                          <Button size="sm">
                            View Article
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="categories" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categories.map((category) => (
                <Card key={category.id} className="hover:shadow-md transition-shadow text-center">
                  <CardHeader>
                    <div className="text-4xl mb-2">{category.icon}</div>
                    <CardTitle className="text-lg">{category.name}</CardTitle>
                    <CardDescription>{category.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold mb-2">{category.article_count}</div>
                    <div className="text-sm text-muted-foreground mb-4">Articles</div>
                    <Button className="w-full" size="sm">
                      View Articles
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="videos" className="space-y-4">
            <div className="grid gap-4">
              {videos.map((video) => (
                <Card key={video.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Video className="h-5 w-5" />
                          {video.title}
                        </CardTitle>
                        <CardDescription>
                          {video.description}
                        </CardDescription>
                      </div>
                      <Badge variant="outline">{video.category}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm mb-4">
                      <div>
                        <div className="font-medium text-muted-foreground">Duration</div>
                        <div>{video.duration}</div>
                      </div>
                      <div>
                        <div className="font-medium text-muted-foreground">Views</div>
                        <div className="font-semibold">{video.views.toLocaleString()}</div>
                      </div>
                      <div>
                        <div className="font-medium text-muted-foreground">Created</div>
                        <div>{new Date(video.created_date).toLocaleDateString()}</div>
                      </div>
                    </div>
                    
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm">
                        Edit
                      </Button>
                      <Button size="sm">
                        <Video className="h-4 w-4 mr-2" />
                        Watch Video
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="downloads" className="space-y-4">
            <div className="grid gap-4">
              {downloads.map((download) => (
                <Card key={download.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Download className="h-5 w-5" />
                          {download.name}
                        </CardTitle>
                        <CardDescription>
                          {download.description}
                        </CardDescription>
                      </div>
                      <Badge variant="outline">{download.category}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm mb-4">
                      <div>
                        <div className="font-medium text-muted-foreground">File Type</div>
                        <div className="font-semibold">{download.file_type}</div>
                      </div>
                      <div>
                        <div className="font-medium text-muted-foreground">File Size</div>
                        <div>{download.file_size}</div>
                      </div>
                      <div>
                        <div className="font-medium text-muted-foreground">Downloads</div>
                        <div className="font-semibold">{download.download_count}</div>
                      </div>
                    </div>
                    
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm">
                        Edit
                      </Button>
                      <Button size="sm">
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}