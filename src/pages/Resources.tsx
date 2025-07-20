import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { SEOMetaTags } from "@/components/SEOMetaTags";
import { 
  Search, 
  Calendar, 
  Clock, 
  ArrowRight, 
  FileText,
  User,
  Tag,
  Filter,
  X,
  SlidersHorizontal
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
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedTopic, setSelectedTopic] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('newest');
  const [showFilters, setShowFilters] = useState(false);
  const [loading, setLoading] = useState(true);

  // Extract categories and topics from articles
  const categories = useMemo(() => {
    const categorySet = new Set<string>();
    posts.forEach(post => {
      if (post.title.toLowerCase().includes('software')) categorySet.add('Software');
      if (post.title.toLowerCase().includes('management')) categorySet.add('Management');
      if (post.title.toLowerCase().includes('safety')) categorySet.add('Safety');
      if (post.title.toLowerCase().includes('business')) categorySet.add('Business');
      if (post.title.toLowerCase().includes('financial') || post.title.toLowerCase().includes('cost')) categorySet.add('Financial');
      if (post.title.toLowerCase().includes('project')) categorySet.add('Project Management');
      if (post.title.toLowerCase().includes('equipment')) categorySet.add('Equipment');
      if (post.title.toLowerCase().includes('quality') || post.title.toLowerCase().includes('risk')) categorySet.add('Quality & Risk');
    });
    return Array.from(categorySet).sort();
  }, [posts]);

  const topics = useMemo(() => {
    const topicSet = new Set<string>();
    posts.forEach(post => {
      const title = post.title.toLowerCase();
      if (title.includes('estimating') || title.includes('bidding')) topicSet.add('Estimating & Bidding');
      if (title.includes('scheduling') || title.includes('timeline')) topicSet.add('Scheduling');
      if (title.includes('tracking') || title.includes('time')) topicSet.add('Time Tracking');
      if (title.includes('document') || title.includes('digital')) topicSet.add('Documentation');
      if (title.includes('field') || title.includes('mobile')) topicSet.add('Field Operations');
      if (title.includes('communication') || title.includes('client')) topicSet.add('Communication');
      if (title.includes('growth') || title.includes('scale')) topicSet.add('Business Growth');
      if (title.includes('small business') || title.includes('smb')) topicSet.add('Small Business');
    });
    return Array.from(topicSet).sort();
  }, [posts]);

  useEffect(() => {
    loadBlogPosts();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [searchTerm, selectedCategory, selectedTopic, sortBy, posts]);

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

  const applyFilters = () => {
    let filtered = [...posts];

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(post =>
        post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        post.excerpt?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        post.body.toLowerCase().includes(searchTerm.toLowerCase()) ||
        post.seo_description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(post => {
        const title = post.title.toLowerCase();
        switch (selectedCategory) {
          case 'Software':
            return title.includes('software');
          case 'Management':
            return title.includes('management');
          case 'Safety':
            return title.includes('safety');
          case 'Business':
            return title.includes('business');
          case 'Financial':
            return title.includes('financial') || title.includes('cost');
          case 'Project Management':
            return title.includes('project');
          case 'Equipment':
            return title.includes('equipment');
          case 'Quality & Risk':
            return title.includes('quality') || title.includes('risk');
          default:
            return true;
        }
      });
    }

    // Apply topic filter
    if (selectedTopic !== 'all') {
      filtered = filtered.filter(post => {
        const title = post.title.toLowerCase();
        switch (selectedTopic) {
          case 'Estimating & Bidding':
            return title.includes('estimating') || title.includes('bidding');
          case 'Scheduling':
            return title.includes('scheduling') || title.includes('timeline');
          case 'Time Tracking':
            return title.includes('tracking') || title.includes('time');
          case 'Documentation':
            return title.includes('document') || title.includes('digital');
          case 'Field Operations':
            return title.includes('field') || title.includes('mobile');
          case 'Communication':
            return title.includes('communication') || title.includes('client');
          case 'Business Growth':
            return title.includes('growth') || title.includes('scale');
          case 'Small Business':
            return title.includes('small business') || title.includes('smb');
          default:
            return true;
        }
      });
    }

    // Apply sorting
    switch (sortBy) {
      case 'newest':
        filtered.sort((a, b) => new Date(b.published_at || b.created_at).getTime() - new Date(a.published_at || a.created_at).getTime());
        break;
      case 'oldest':
        filtered.sort((a, b) => new Date(a.published_at || a.created_at).getTime() - new Date(b.published_at || b.created_at).getTime());
        break;
      case 'alphabetical':
        filtered.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case 'relevance':
        if (searchTerm) {
          filtered.sort((a, b) => {
            const aScore = (a.title.toLowerCase().includes(searchTerm.toLowerCase()) ? 2 : 0) +
                          (a.excerpt?.toLowerCase().includes(searchTerm.toLowerCase()) ? 1 : 0);
            const bScore = (b.title.toLowerCase().includes(searchTerm.toLowerCase()) ? 2 : 0) +
                          (b.excerpt?.toLowerCase().includes(searchTerm.toLowerCase()) ? 1 : 0);
            return bScore - aScore;
          });
        }
        break;
    }

    setFilteredPosts(filtered);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedCategory('all');
    setSelectedTopic('all');
    setSortBy('newest');
  };

  const hasActiveFilters = searchTerm || selectedCategory !== 'all' || selectedTopic !== 'all' || sortBy !== 'newest';

  const getReadingTime = (content: string) => {
    const wordsPerMinute = 200;
    const wordCount = content.split(' ').length;
    const readingTime = Math.ceil(wordCount / wordsPerMinute);
    return `${readingTime} min read`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <>
        <SEOMetaTags
          title="Construction Industry Resources - BuildDesk"
          description="Expert insights, best practices, and industry trends to help your construction business thrive. Read articles on construction management, safety, and efficiency."
          keywords={['construction resources', 'construction articles', 'construction best practices', 'construction management tips']}
          canonicalUrl="/resources"
        />
        <div className="min-h-screen bg-gradient-to-br from-construction-light via-white to-construction-light/30">
          <Header />
          <div className="container mx-auto px-4 py-8">
            <div className="text-center py-16">
              <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-construction-blue mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading articles...</p>
            </div>
          </div>
          <Footer />
        </div>
      </>
    );
  }

  return (
    <>
      <SEOMetaTags
        title="Construction Industry Resources - BuildDesk"
        description="Expert insights, best practices, and industry trends to help your construction business thrive. Read articles on construction management, safety, and efficiency."
        keywords={['construction resources', 'construction articles', 'construction best practices', 'construction management tips']}
        canonicalUrl="/resources"
      />
      <div className="min-h-screen bg-gradient-to-br from-construction-light via-white to-construction-light/30">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="space-y-4 sm:space-y-6">
            {/* Header Section */}
            <div className="bg-gradient-to-br from-construction-blue to-construction-blue/80 text-white rounded-lg p-6 sm:p-8">
              <div className="max-w-3xl mx-auto text-center">
                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-3 sm:mb-4">
                  Construction Industry Resources
                </h2>
                <p className="text-base sm:text-lg opacity-90 mb-4 sm:mb-6">
                  Expert insights, best practices, and industry trends to help your construction business thrive
                </p>
                
                {/* Main Search */}
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

            {/* Filters Section */}
            <div className="bg-white rounded-lg border p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="h-5 w-5 text-gray-600" />
                  <h3 className="text-lg font-semibold">Filters</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowFilters(!showFilters)}
                    className="sm:hidden"
                  >
                    {showFilters ? 'Hide' : 'Show'}
                  </Button>
                </div>
                
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-construction-blue border-construction-blue">
                    {filteredPosts.length} Article{filteredPosts.length !== 1 ? 's' : ''}
                  </Badge>
                  {hasActiveFilters && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={clearFilters}
                      className="text-xs"
                    >
                      <X className="h-3 w-3 mr-1" />
                      Clear Filters
                    </Button>
                  )}
                </div>
              </div>

              <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 ${showFilters ? 'block' : 'hidden sm:grid'}`}>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Category</label>
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border shadow-lg z-50">
                      <SelectItem value="all">All Categories</SelectItem>
                      {categories.map(category => (
                        <SelectItem key={category} value={category}>{category}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Topic</label>
                  <Select value={selectedTopic} onValueChange={setSelectedTopic}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="All Topics" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border shadow-lg z-50">
                      <SelectItem value="all">All Topics</SelectItem>
                      {topics.map(topic => (
                        <SelectItem key={topic} value={topic}>{topic}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Sort By</label>
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white border shadow-lg z-50">
                      <SelectItem value="newest">Newest First</SelectItem>
                      <SelectItem value="oldest">Oldest First</SelectItem>
                      <SelectItem value="alphabetical">Alphabetical</SelectItem>
                      {searchTerm && <SelectItem value="relevance">Most Relevant</SelectItem>}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-end">
                  <Button
                    variant="outline"
                    onClick={() => setShowFilters(false)}
                    className="w-full sm:hidden"
                  >
                    Apply Filters
                  </Button>
                </div>
              </div>

              {/* Active Filters Display */}
              {hasActiveFilters && (
                <div className="mt-4 pt-4 border-t">
                  <div className="flex flex-wrap gap-2">
                    <span className="text-sm text-gray-600">Active filters:</span>
                    {searchTerm && (
                      <Badge variant="secondary" className="text-xs">
                        Search: "{searchTerm}"
                      </Badge>
                    )}
                    {selectedCategory !== 'all' && (
                      <Badge variant="secondary" className="text-xs">
                        Category: {selectedCategory}
                      </Badge>
                    )}
                    {selectedTopic !== 'all' && (
                      <Badge variant="secondary" className="text-xs">
                        Topic: {selectedTopic}
                      </Badge>
                    )}
                    {sortBy !== 'newest' && (
                      <Badge variant="secondary" className="text-xs">
                        Sort: {sortBy}
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Content */}
            <div>
              {filteredPosts.length === 0 && !loading ? (
                <div className="text-center py-16">
                  <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <h2 className="text-2xl font-bold text-construction-dark mb-2">
                    {hasActiveFilters ? 'No articles match your filters' : 'No articles published yet'}
                  </h2>
                  <p className="text-muted-foreground mb-6">
                    {hasActiveFilters 
                      ? 'Try adjusting your search terms or filters to find what you\'re looking for.'
                      : 'Our team is working on valuable content for construction professionals. Check back soon!'
                    }
                  </p>
                  {hasActiveFilters && (
                    <Button 
                      variant="outline" 
                      onClick={clearFilters}
                      className="text-construction-blue border-construction-blue hover:bg-construction-blue hover:text-white"
                    >
                      Clear All Filters
                    </Button>
                  )}
                </div>
              ) : (
                <div className="grid lg:grid-cols-3 gap-6 sm:gap-8">
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
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs sm:text-sm text-muted-foreground mb-2">
                            <div className="flex items-center space-x-1">
                              <Calendar className="h-3 w-3 sm:h-4 sm:w-4" />
                              <span>{formatDate(filteredPosts[0].published_at || filteredPosts[0].created_at)}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Clock className="h-3 w-3 sm:h-4 sm:w-4" />
                              <span>{getReadingTime(filteredPosts[0].body)}</span>
                            </div>
                          </div>
                          <CardTitle className="text-xl sm:text-2xl leading-tight hover:text-construction-blue transition-colors">
                            <Link to={`/resources/${filteredPosts[0].slug}`}>
                              {filteredPosts[0].title}
                            </Link>
                          </CardTitle>
                          <CardDescription className="text-sm sm:text-base leading-relaxed">
                            {filteredPosts[0].excerpt}
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <Button variant="outline" className="w-full sm:w-auto text-construction-blue border-construction-blue hover:bg-construction-blue hover:text-white" asChild>
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
                  <div className="space-y-4 sm:space-y-6">
                    <h2 className="text-lg sm:text-xl font-bold text-construction-dark">
                      {filteredPosts.length > 1 ? 'More Articles' : 'All Articles'}
                    </h2>
                    {(filteredPosts.length > 1 ? filteredPosts.slice(1) : filteredPosts).map((post) => (
                      <Card key={post.id} className="hover:shadow-md transition-shadow">
                        <CardHeader className="pb-3">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-muted-foreground mb-2">
                            <div className="flex items-center space-x-1">
                              <Calendar className="h-3 w-3" />
                              <span>{formatDate(post.published_at || post.created_at)}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Clock className="h-3 w-3" />
                              <span>{getReadingTime(post.body)}</span>
                            </div>
                          </div>
                          <CardTitle className="text-base sm:text-lg leading-tight hover:text-construction-blue transition-colors">
                            <Link to={`/resources/${post.slug}`}>
                              {post.title}
                            </Link>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <p className="text-xs sm:text-sm text-muted-foreground line-clamp-3 mb-3">
                            {post.excerpt}
                          </p>
                          <Link 
                            to={`/resources/${post.slug}`}
                            className="text-xs sm:text-sm text-construction-blue hover:text-construction-orange transition-colors inline-flex items-center"
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
        </div>
        <Footer />
      </div>
    </>
  );
};

export default Resources;