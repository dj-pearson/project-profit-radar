import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  EyeOff, 
  Star, 
  StarOff,
  Search,
  Filter,
  BookOpen
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { SimplifiedSidebar } from "@/components/navigation/SimplifiedSidebar";

interface Category {
  id: string;
  name: string;
  description: string;
  slug: string;
  icon: string;
  sort_order: number;
}

interface Article {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  article_type: string;
  difficulty_level: string;
  estimated_read_time: number;
  view_count: number;
  is_published: boolean;
  is_featured: boolean;
  tags: string[];
  published_at: string;
  category_id: string;
  knowledge_base_categories?: {
    name: string;
    slug: string;
  };
}

export default function KnowledgeBaseAdmin() {
  const { toast } = useToast();
  
  const [articles, setArticles] = useState<Article[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [filteredArticles, setFilteredArticles] = useState<Article[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  
  const [newArticle, setNewArticle] = useState({
    title: '',
    slug: '',
    excerpt: '',
    content: '',
    article_type: 'article',
    category_id: '',
    difficulty_level: 'beginner',
    estimated_read_time: 5,
    tags: '',
    is_published: false,
    is_featured: false
  });

  useEffect(() => {
    fetchCategories();
    fetchArticles();
  }, []);

  useEffect(() => {
    filterArticles();
  }, [articles, searchQuery, selectedCategory, selectedStatus]);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('knowledge_base_categories')
        .select('*')
        .order('sort_order');

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast({
        title: "Error",
        description: "Failed to load categories",
        variant: "destructive",
      });
    }
  };

  const fetchArticles = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('knowledge_base_articles')
        .select(`
          *,
          knowledge_base_categories (
            name,
            slug
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setArticles(data || []);
    } catch (error) {
      console.error('Error fetching articles:', error);
      toast({
        title: "Error",
        description: "Failed to load articles",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filterArticles = () => {
    let filtered = articles;

    if (searchQuery) {
      filtered = filtered.filter(article =>
        article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        article.excerpt?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(article => article.category_id === selectedCategory);
    }

    if (selectedStatus !== 'all') {
      if (selectedStatus === 'published') {
        filtered = filtered.filter(article => article.is_published);
      } else if (selectedStatus === 'draft') {
        filtered = filtered.filter(article => !article.is_published);
      } else if (selectedStatus === 'featured') {
        filtered = filtered.filter(article => article.is_featured);
      }
    }

    setFilteredArticles(filtered);
  };

  const togglePublished = async (articleId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('knowledge_base_articles')
        .update({ 
          is_published: !currentStatus,
          published_at: !currentStatus ? new Date().toISOString() : null
        })
        .eq('id', articleId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Article ${!currentStatus ? 'published' : 'unpublished'} successfully`,
      });

      fetchArticles();
    } catch (error) {
      console.error('Error updating article:', error);
      toast({
        title: "Error",
        description: "Failed to update article status",
        variant: "destructive",
      });
    }
  };

  const toggleFeatured = async (articleId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('knowledge_base_articles')
        .update({ is_featured: !currentStatus })
        .eq('id', articleId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Article ${!currentStatus ? 'featured' : 'unfeatured'} successfully`,
      });

      fetchArticles();
    } catch (error) {
      console.error('Error updating article:', error);
      toast({
        title: "Error",
        description: "Failed to update featured status",
        variant: "destructive",
      });
    }
  };

  const deleteArticle = async (articleId: string) => {
    if (!confirm('Are you sure you want to delete this article? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('knowledge_base_articles')
        .delete()
        .eq('id', articleId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Article deleted successfully",
      });

      fetchArticles();
    } catch (error) {
      console.error('Error deleting article:', error);
      toast({
        title: "Error",
        description: "Failed to delete article",
        variant: "destructive",
      });
    }
  };

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9 -]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  };

  const handleTitleChange = (title: string) => {
    setNewArticle({
      ...newArticle,
      title,
      slug: generateSlug(title)
    });
  };

  const createArticle = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const tagsArray = newArticle.tags.split(',').map(tag => tag.trim()).filter(tag => tag);
      
      const { error } = await supabase
        .from('knowledge_base_articles')
        .insert({
          ...newArticle,
          tags: tagsArray,
          author_id: user.id,
          published_at: newArticle.is_published ? new Date().toISOString() : null
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Article created successfully",
      });

      setIsCreateDialogOpen(false);
      setNewArticle({
        title: '',
        slug: '',
        excerpt: '',
        content: '',
        article_type: 'article',
        category_id: '',
        difficulty_level: 'beginner',
        estimated_read_time: 5,
        tags: '',
        is_published: false,
        is_featured: false
      });
      
      fetchArticles();
    } catch (error) {
      console.error('Error creating article:', error);
      toast({
        title: "Error",
        description: "Failed to create article",
        variant: "destructive",
      });
    }
  };

  const getDifficultyColor = (level: string) => {
    switch (level) {
      case 'beginner': return 'bg-green-100 text-green-800';
      case 'intermediate': return 'bg-yellow-100 text-yellow-800';
      case 'advanced': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'how_to': return '📋';
      case 'checklist': return '✅';
      case 'video': return '📹';
      default: return '📄';
    }
  };

  return (
    <div className="flex min-h-screen">
      <SimplifiedSidebar />
      <div className="flex-1 container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Knowledge Base Admin</h1>
          <p className="text-muted-foreground">Manage articles, guides, and documentation</p>
        </div>
        
        <div className="flex items-center gap-4">
          <Button asChild variant="outline">
            <Link to="/knowledge-base">
              <BookOpen className="h-4 w-4 mr-2" />
              View Knowledge Base
            </Link>
          </Button>
          
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Article
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Article</DialogTitle>
                <DialogDescription>
                  Add a new article to the knowledge base
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={newArticle.title}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    placeholder="Article title"
                  />
                </div>
                
                <div>
                  <Label htmlFor="slug">Slug</Label>
                  <Input
                    id="slug"
                    value={newArticle.slug}
                    onChange={(e) => setNewArticle({ ...newArticle, slug: e.target.value })}
                    placeholder="article-slug"
                  />
                </div>
                
                <div>
                  <Label htmlFor="excerpt">Excerpt</Label>
                  <Textarea
                    id="excerpt"
                    value={newArticle.excerpt}
                    onChange={(e) => setNewArticle({ ...newArticle, excerpt: e.target.value })}
                    placeholder="Brief description of the article"
                    rows={3}
                  />
                </div>
                
                <div>
                  <Label htmlFor="content">Content (Markdown)</Label>
                  <Textarea
                    id="content"
                    value={newArticle.content}
                    onChange={(e) => setNewArticle({ ...newArticle, content: e.target.value })}
                    placeholder="# Article Title&#10;&#10;Write your article content in Markdown..."
                    rows={10}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="category">Category</Label>
                    <Select
                      value={newArticle.category_id}
                      onValueChange={(value) => setNewArticle({ ...newArticle, category_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="type">Article Type</Label>
                    <Select
                      value={newArticle.article_type}
                      onValueChange={(value) => setNewArticle({ ...newArticle, article_type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="article">Article</SelectItem>
                        <SelectItem value="how_to">How-to Guide</SelectItem>
                        <SelectItem value="checklist">Checklist</SelectItem>
                        <SelectItem value="video">Video</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="difficulty">Difficulty Level</Label>
                    <Select
                      value={newArticle.difficulty_level}
                      onValueChange={(value) => setNewArticle({ ...newArticle, difficulty_level: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="beginner">Beginner</SelectItem>
                        <SelectItem value="intermediate">Intermediate</SelectItem>
                        <SelectItem value="advanced">Advanced</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="readTime">Estimated Read Time (minutes)</Label>
                    <Input
                      id="readTime"
                      type="number"
                      value={newArticle.estimated_read_time}
                      onChange={(e) => setNewArticle({ ...newArticle, estimated_read_time: parseInt(e.target.value) || 5 })}
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="tags">Tags (comma-separated)</Label>
                  <Input
                    id="tags"
                    value={newArticle.tags}
                    onChange={(e) => setNewArticle({ ...newArticle, tags: e.target.value })}
                    placeholder="tag1, tag2, tag3"
                  />
                </div>
                
                <div className="flex items-center gap-6">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="published"
                      checked={newArticle.is_published}
                      onCheckedChange={(checked) => setNewArticle({ ...newArticle, is_published: checked })}
                    />
                    <Label htmlFor="published">Publish immediately</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="featured"
                      checked={newArticle.is_featured}
                      onCheckedChange={(checked) => setNewArticle({ ...newArticle, is_featured: checked })}
                    />
                    <Label htmlFor="featured">Featured article</Label>
                  </div>
                </div>
                
                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={createArticle}>
                    Create Article
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search articles..."
            className="pl-10 w-64"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <Select value={selectedStatus} onValueChange={setSelectedStatus}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="published">Published</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="featured">Featured</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Articles List */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4">
          {[...Array(5)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
              </CardHeader>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredArticles.map((article) => (
            <Card key={article.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span>{getTypeIcon(article.article_type)}</span>
                      <Badge className={getDifficultyColor(article.difficulty_level)}>
                        {article.difficulty_level}
                      </Badge>
                      {article.knowledge_base_categories && (
                        <Badge variant="outline">
                          {article.knowledge_base_categories.name}
                        </Badge>
                      )}
                      {!article.is_published && (
                        <Badge variant="secondary">Draft</Badge>
                      )}
                      {article.is_featured && (
                        <Badge variant="default">
                          <Star className="h-3 w-3 mr-1" />
                          Featured
                        </Badge>
                      )}
                    </div>
                    
                    <CardTitle className="mb-2">
                      <Link 
                        to={`/knowledge-base/article/${article.slug}`}
                        className="hover:text-primary"
                      >
                        {article.title}
                      </Link>
                    </CardTitle>
                    
                    <CardDescription className="mb-2">
                      {article.excerpt}
                    </CardDescription>
                    
                    <div className="text-sm text-muted-foreground">
                      {article.estimated_read_time} min read • {article.view_count} views
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => togglePublished(article.id, article.is_published)}
                    >
                      {article.is_published ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleFeatured(article.id, article.is_featured)}
                    >
                      {article.is_featured ? (
                        <StarOff className="h-4 w-4" />
                      ) : (
                        <Star className="h-4 w-4" />
                      )}
                    </Button>
                    
                    <Button variant="ghost" size="sm">
                      <Edit className="h-4 w-4" />
                    </Button>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteArticle(article.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
          
          {filteredArticles.length === 0 && (
            <div className="text-center py-12">
              <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No articles found</h3>
              <p className="text-muted-foreground">
                {articles.length === 0 
                  ? "Create your first article to get started"
                  : "Try adjusting your search criteria"
                }
              </p>
            </div>
          )}
        </div>
      )}
      </div>
    </div>
  );
}