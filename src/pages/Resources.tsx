import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { 
  Search, 
  Calendar, 
  Clock, 
  ArrowRight, 
  FileText,
  User,
  Tag
} from 'lucide-react';

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  body: string;
  featured_image_url: string | null;
  published_at: string;
  created_at: string;
  status: string;
  seo_title: string | null;
  seo_description: string | null;
}

const Resources = () => {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [filteredPosts, setFilteredPosts] = useState<BlogPost[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBlogPosts();
  }, []);

  useEffect(() => {
    if (searchTerm) {
      const filtered = posts.filter(post =>
        post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        post.excerpt?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredPosts(filtered);
    } else {
      setFilteredPosts(posts);
    }
  }, [searchTerm, posts]);

  const loadBlogPosts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('status', 'published')
        .order('published_at', { ascending: false });

      if (error) throw error;

      setPosts(data || []);
      setFilteredPosts(data || []);
    } catch (error) {
      console.error('Error loading blog posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getReadingTime = (content: string) => {
    const wordsPerMinute = 200;
    const wordCount = content.split(' ').length;
    const readingTime = Math.ceil(wordCount / wordsPerMinute);
    return `${readingTime} min read`;
  };

  if (loading) {
    return (
      <DashboardLayout title="Construction Industry Resources">
        <div className="text-center py-16">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-construction-blue mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading articles...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Construction Industry Resources">
      <div className="space-y-6">
        {/* Header Section */}
        <div className="bg-gradient-to-br from-construction-blue to-construction-blue/80 text-white rounded-lg p-8">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">
              Construction Industry Resources
            </h2>
            <p className="text-lg opacity-90 mb-6">
              Expert insights, best practices, and industry trends to help your construction business thrive
            </p>
            
            {/* Search */}
            <div className="relative max-w-md mx-auto">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                type="text"
                placeholder="Search articles..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-white text-gray-900"
              />
            </div>
          </div>
        </div>

        {/* Article Count */}
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <Badge variant="outline" className="text-construction-blue border-construction-blue">
              {filteredPosts.length} Article{filteredPosts.length !== 1 ? 's' : ''}
            </Badge>
          </div>
        </div>

        {/* Content */}
        <div>
        {filteredPosts.length === 0 && !loading ? (
          <div className="text-center py-16">
            <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-construction-dark mb-2">
              {searchTerm ? 'No articles found' : 'No articles published yet'}
            </h2>
            <p className="text-muted-foreground mb-6">
              {searchTerm 
                ? `No articles match "${searchTerm}". Try a different search term.`
                : 'Our team is working on valuable content for construction professionals. Check back soon!'
              }
            </p>
            {searchTerm && (
              <Button 
                variant="outline" 
                onClick={() => setSearchTerm('')}
                className="text-construction-blue border-construction-blue hover:bg-construction-blue hover:text-white"
              >
                Clear Search
              </Button>
            )}
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Featured Article */}
            {filteredPosts.length > 0 && (
              <div className="lg:col-span-2">
                <Card className="overflow-hidden hover:shadow-lg transition-shadow">
                  {filteredPosts[0].featured_image_url && (
                    <div className="aspect-video overflow-hidden">
                      <img 
                        src={filteredPosts[0].featured_image_url} 
                        alt={filteredPosts[0].title}
                        className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  )}
                  <CardHeader>
                    <div className="flex items-center space-x-4 text-sm text-muted-foreground mb-2">
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-4 w-4" />
                        <span>{formatDate(filteredPosts[0].published_at || filteredPosts[0].created_at)}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Clock className="h-4 w-4" />
                        <span>{getReadingTime(filteredPosts[0].body)}</span>
                      </div>
                    </div>
                    <CardTitle className="text-2xl leading-tight hover:text-construction-blue transition-colors">
                      <Link to={`/resources/${filteredPosts[0].slug}`}>
                        {filteredPosts[0].title}
                      </Link>
                    </CardTitle>
                    <CardDescription className="text-base leading-relaxed">
                      {filteredPosts[0].excerpt}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button variant="outline" className="text-construction-blue border-construction-blue hover:bg-construction-blue hover:text-white" asChild>
                      <Link to={`/resources/${filteredPosts[0].slug}`}>
                        Read Full Article
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Article List */}
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-construction-dark">More Articles</h2>
              {filteredPosts.slice(1).map((post) => (
                <Card key={post.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-center space-x-4 text-xs text-muted-foreground mb-2">
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-3 w-3" />
                        <span>{formatDate(post.published_at || post.created_at)}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Clock className="h-3 w-3" />
                        <span>{getReadingTime(post.body)}</span>
                      </div>
                    </div>
                    <CardTitle className="text-lg leading-tight hover:text-construction-blue transition-colors">
                      <Link to={`/resources/${post.slug}`}>
                        {post.title}
                      </Link>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-sm text-muted-foreground line-clamp-3 mb-3">
                      {post.excerpt}
                    </p>
                    <Link 
                      to={`/resources/${post.slug}`}
                      className="text-sm text-construction-blue hover:text-construction-orange transition-colors inline-flex items-center"
                    >
                      Read more
                      <ArrowRight className="ml-1 h-3 w-3" />
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Resources;