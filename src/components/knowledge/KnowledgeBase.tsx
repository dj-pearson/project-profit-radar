import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Book, 
  Search, 
  FileText, 
  Video, 
  HelpCircle, 
  Star, 
  ThumbsUp, 
  ThumbsDown,
  ExternalLink,
  BookOpen,
  Lightbulb
} from 'lucide-react';

interface Article {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  helpful_votes: number;
  not_helpful_votes: number;
  views: number;
  created_at: string;
  updated_at: string;
  featured: boolean;
}

interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: string;
  helpful_votes: number;
}

interface VideoTutorial {
  id: string;
  title: string;
  description: string;
  video_url: string;
  duration: string;
  category: string;
  thumbnail_url?: string;
}

const KnowledgeBase = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [articles, setArticles] = useState<Article[]>([]);
  const [faqs, setFAQs] = useState<FAQ[]>([]);
  const [videos, setVideos] = useState<VideoTutorial[]>([]);
  const [loading, setLoading] = useState(true);

  const categories = [
    'all', 'getting-started', 'project-management', 'financial', 
    'team-management', 'integrations', 'troubleshooting'
  ];

  useEffect(() => {
    loadKnowledgeBase();
  }, []);

  const loadKnowledgeBase = async () => {
    setLoading(true);
    try {
      // Mock data until we create the knowledge base tables
      const mockArticles: Article[] = [
        {
          id: '1',
          title: 'Getting Started with BuildDesk',
          content: 'Welcome to BuildDesk! This guide will help you set up your first project and navigate the platform...',
          category: 'getting-started',
          tags: ['setup', 'basics', 'first-time'],
          helpful_votes: 45,
          not_helpful_votes: 2,
          views: 1250,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          featured: true
        },
        {
          id: '2',
          title: 'Setting Up Project Budgets',
          content: 'Learn how to create accurate project budgets and track expenses effectively...',
          category: 'financial',
          tags: ['budgets', 'costs', 'tracking'],
          helpful_votes: 32,
          not_helpful_votes: 1,
          views: 890,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          featured: false
        },
        {
          id: '3',
          title: 'Managing Your Team',
          content: 'Best practices for adding team members, setting permissions, and managing roles...',
          category: 'team-management',
          tags: ['team', 'permissions', 'roles'],
          helpful_votes: 28,
          not_helpful_votes: 3,
          views: 654,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          featured: false
        }
      ];

      const mockFAQs: FAQ[] = [
        {
          id: '1',
          question: 'How do I invite team members to my project?',
          answer: 'Go to Team Management, click "Invite Member", enter their email address, and select their role.',
          category: 'team-management',
          helpful_votes: 67
        },
        {
          id: '2',
          question: 'Can I export my project data?',
          answer: 'Yes, you can export project data in CSV, Excel, or PDF formats from the Reports section.',
          category: 'project-management',
          helpful_votes: 45
        },
        {
          id: '3',
          question: 'How do I integrate with QuickBooks?',
          answer: 'Navigate to Integrations > QuickBooks and follow the connection wizard to link your account.',
          category: 'integrations',
          helpful_votes: 89
        }
      ];

      const mockVideos: VideoTutorial[] = [
        {
          id: '1',
          title: 'BuildDesk Platform Overview',
          description: 'A comprehensive walkthrough of all BuildDesk features',
          video_url: 'https://example.com/video1',
          duration: '15:30',
          category: 'getting-started'
        },
        {
          id: '2',
          title: 'Creating Your First Project',
          description: 'Step-by-step guide to setting up a new construction project',
          video_url: 'https://example.com/video2',
          duration: '8:45',
          category: 'project-management'
        },
        {
          id: '3',
          title: 'Financial Tracking and Job Costing',
          description: 'Learn how to track costs and maintain profitable projects',
          video_url: 'https://example.com/video3',
          duration: '12:20',
          category: 'financial'
        }
      ];

      setArticles(mockArticles);
      setFAQs(mockFAQs);
      setVideos(mockVideos);
    } catch (error) {
      console.error('Error loading knowledge base:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredArticles = articles.filter(article => {
    const matchesSearch = article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         article.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         article.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = selectedCategory === 'all' || article.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const filteredFAQs = faqs.filter(faq => {
    const matchesSearch = faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || faq.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const filteredVideos = videos.filter(video => {
    const matchesSearch = video.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         video.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || video.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleVote = async (type: 'article' | 'faq', id: string, vote: 'helpful' | 'not_helpful') => {
    // Implementation for voting would go here
    console.log(`Voted ${vote} for ${type} ${id}`);
  };

  const getCategoryIcon = (category: string) => {
    const icons = {
      'getting-started': BookOpen,
      'project-management': FileText,
      'financial': Star,
      'team-management': HelpCircle,
      'integrations': ExternalLink,
      'troubleshooting': Lightbulb
    };
    return icons[category as keyof typeof icons] || Book;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2">
        <Book className="h-5 w-5" />
        <h2 className="text-2xl font-semibold">Knowledge Base</h2>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search articles, FAQs, and tutorials..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <select
              className="px-3 py-2 border rounded-md bg-background"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              {categories.map(category => (
                <option key={category} value={category}>
                  {category === 'all' ? 'All Categories' : category.replace('-', ' ').toUpperCase()}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="articles" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="articles">Articles</TabsTrigger>
          <TabsTrigger value="faqs">FAQs</TabsTrigger>
          <TabsTrigger value="videos">Video Tutorials</TabsTrigger>
        </TabsList>

        <TabsContent value="articles" className="space-y-4">
          {filteredArticles.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-muted-foreground">No articles found matching your search.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {filteredArticles.map((article) => {
                const CategoryIcon = getCategoryIcon(article.category);
                return (
                  <Card key={article.id} className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <CategoryIcon className="h-4 w-4 text-muted-foreground" />
                            <CardTitle className="text-lg">{article.title}</CardTitle>
                            {article.featured && (
                              <Badge variant="secondary">
                                <Star className="h-3 w-3 mr-1" />
                                Featured
                              </Badge>
                            )}
                          </div>
                          <CardDescription className="line-clamp-2">
                            {article.content}
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center justify-between pt-2">
                        <div className="flex space-x-2">
                          {article.tags.map(tag => (
                            <Badge key={tag} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                          <span>{article.views} views</span>
                          <div className="flex items-center space-x-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleVote('article', article.id, 'helpful')}
                            >
                              <ThumbsUp className="h-3 w-3 mr-1" />
                              {article.helpful_votes}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleVote('article', article.id, 'not_helpful')}
                            >
                              <ThumbsDown className="h-3 w-3 mr-1" />
                              {article.not_helpful_votes}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="faqs" className="space-y-4">
          {filteredFAQs.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-muted-foreground">No FAQs found matching your search.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredFAQs.map((faq) => (
                <Card key={faq.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <HelpCircle className="h-4 w-4" />
                      <span>{faq.question}</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground mb-3">{faq.answer}</p>
                    <div className="flex items-center justify-between">
                      <Badge variant="outline">{faq.category.replace('-', ' ')}</Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleVote('faq', faq.id, 'helpful')}
                      >
                        <ThumbsUp className="h-3 w-3 mr-1" />
                        {faq.helpful_votes} helpful
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="videos" className="space-y-4">
          {filteredVideos.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-muted-foreground">No video tutorials found matching your search.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {filteredVideos.map((video) => (
                <Card key={video.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-center space-x-2">
                      <Video className="h-4 w-4 text-muted-foreground" />
                      <CardTitle className="text-lg">{video.title}</CardTitle>
                    </div>
                    <CardDescription>{video.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <Badge variant="outline">{video.category.replace('-', ' ')}</Badge>
                      <span className="text-sm text-muted-foreground">{video.duration}</span>
                    </div>
                    <Button className="w-full mt-3" variant="outline">
                      <Video className="h-4 w-4 mr-2" />
                      Watch Tutorial
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default KnowledgeBase;