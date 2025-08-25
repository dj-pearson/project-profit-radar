import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, User, ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  featured_image_url: string;
  published_at: string;
  slug: string;
}

const BlogSection = () => {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRecentPosts();
  }, []);

  const loadRecentPosts = async () => {
    try {
      console.log('Loading recent blog posts...');
      const { data, error } = await supabase
        .from('blog_posts')
        .select('id, title, excerpt, featured_image_url, published_at, slug')
        .eq('status', 'published')
        .not('published_at', 'is', null)
        .order('published_at', { ascending: false })
        .limit(3);

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }
      
      console.log('Loaded blog posts:', data);
      console.log('Number of posts:', data?.length || 0);
      console.log('First post details:', data?.[0]);
      console.log('All posts status check:', data?.map(p => ({ title: p.title, status: 'published', published_at: p.published_at })));
      setPosts(data || []);
    } catch (error) {
      console.error('Error loading blog posts:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Latest from Our Blog</h2>
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-white rounded-lg h-64"></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (posts.length === 0) {
    return null; // Don't show section if no posts
  }

  return (
    <section className="py-16 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">Latest from Our Blog</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Stay updated with the latest insights, tips, and trends in construction management
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {posts.map((post) => (
            <Card key={post.id} className="overflow-hidden hover:shadow-lg transition-shadow">
              {post.featured_image_url && (
                <div className="aspect-video overflow-hidden">
                  <img 
                    src={post.featured_image_url} 
                    alt={post.title}
                    className="w-full h-full object-cover hover:scale-105 transition-transform"
                  />
                </div>
              )}
              <CardContent className="p-6">
                <div className="flex items-center text-sm text-muted-foreground mb-3">
                  <Calendar className="h-4 w-4 mr-1" />
                  {new Date(post.published_at).toLocaleDateString()}
                </div>
                <h3 className="font-semibold text-lg mb-3 leading-tight">
                  {post.title}
                </h3>
                <p className="text-muted-foreground text-sm mb-4 line-clamp-3">
                  {post.excerpt}
                </p>
                <Button variant="outline" size="sm" className="group">
                  Read More
                  <ArrowRight className="h-3 w-3 ml-1 group-hover:translate-x-1 transition-transform" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
        
        <div className="text-center mt-12">
          <Button variant="outline" size="lg">
            View All Posts
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>
    </section>
  );
};

export default BlogSection;