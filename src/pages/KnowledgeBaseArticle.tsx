import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Clock, 
  Eye, 
  Star, 
  ThumbsUp, 
  ThumbsDown,
  Share2,
  BookOpen,
  User,
  Calendar,
  Tag
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import ReactMarkdown from 'react-markdown';

interface Article {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  article_type: string;
  difficulty_level: string;
  estimated_read_time: number;
  view_count: number;
  is_featured: boolean;
  tags: string[];
  published_at: string;
  author_id: string;
  category_id: string;
  knowledge_base_categories?: {
    name: string;
    slug: string;
    icon: string;
  };
}

interface Feedback {
  id: string;
  rating: number;
  feedback_text: string;
  is_helpful: boolean;
  user_id: string;
}

export default function KnowledgeBaseArticle() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [article, setArticle] = useState<Article | null>(null);
  const [relatedArticles, setRelatedArticles] = useState<Article[]>([]);
  const [userFeedback, setUserFeedback] = useState<Feedback | null>(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [rating, setRating] = useState<number>(0);
  const [isHelpful, setIsHelpful] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (slug) {
      fetchArticle();
    }
  }, [slug]);

  useEffect(() => {
    if (article) {
      incrementViewCount();
      fetchRelatedArticles();
      fetchUserFeedback();
    }
  }, [article]);

  const fetchArticle = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('knowledge_base_articles')
        .select(`
          *,
          knowledge_base_categories (
            name,
            slug,
            icon
          )
        `)
        .eq('slug', slug)
        .eq('is_published', true)
        .maybeSingle();

      if (error) throw error;
      
      if (!data) {
        navigate('/knowledge-base');
        toast({
          title: "Article not found",
          description: "The requested article could not be found.",
          variant: "destructive",
        });
        return;
      }

      setArticle(data);
    } catch (error) {
      console.error('Error fetching article:', error);
      toast({
        title: "Error",
        description: "Failed to load article",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const incrementViewCount = async () => {
    if (!article) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.rpc('increment_article_view_count', {
        article_id_param: article.id,
        user_id_param: user?.id || null
      });
    } catch (error) {
      console.error('Error incrementing view count:', error);
    }
  };

  const fetchRelatedArticles = async () => {
    if (!article) return;

    try {
      const { data, error } = await supabase
        .from('knowledge_base_articles')
        .select(`
          *,
          knowledge_base_categories (
            name,
            slug,
            icon
          )
        `)
        .eq('is_published', true)
        .eq('category_id', article.category_id)
        .neq('id', article.id)
        .order('view_count', { ascending: false })
        .limit(3);

      if (error) throw error;
      setRelatedArticles(data || []);
    } catch (error) {
      console.error('Error fetching related articles:', error);
    }
  };

  const fetchUserFeedback = async () => {
    if (!article) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('knowledge_base_feedback')
        .select('*')
        .eq('article_id', article.id)
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      setUserFeedback(data);
    } catch (error) {
      console.error('Error fetching user feedback:', error);
    }
  };

  const submitFeedback = async () => {
    if (!article) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Authentication required",
          description: "Please sign in to submit feedback",
          variant: "destructive",
        });
        return;
      }

      const feedbackData = {
        article_id: article.id,
        user_id: user.id,
        rating: rating || null,
        feedback_text: feedbackText || null,
        is_helpful: isHelpful
      };

      if (userFeedback) {
        // Update existing feedback
        const { error } = await supabase
          .from('knowledge_base_feedback')
          .update(feedbackData)
          .eq('id', userFeedback.id);

        if (error) throw error;
      } else {
        // Create new feedback
        const { error } = await supabase
          .from('knowledge_base_feedback')
          .insert(feedbackData);

        if (error) throw error;
      }

      toast({
        title: "Thank you!",
        description: "Your feedback has been submitted successfully.",
      });

      setFeedbackText('');
      fetchUserFeedback();
    } catch (error) {
      console.error('Error submitting feedback:', error);
      toast({
        title: "Error",
        description: "Failed to submit feedback",
        variant: "destructive",
      });
    }
  };

  const shareArticle = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: article?.title,
          text: article?.excerpt,
          url: window.location.href,
        });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href);
      toast({
        title: "Link copied",
        description: "Article link copied to clipboard",
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

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-1/4 mb-4"></div>
          <div className="h-12 bg-muted rounded w-3/4 mb-4"></div>
          <div className="h-4 bg-muted rounded w-1/2 mb-8"></div>
          <div className="space-y-4">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="h-4 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-2xl font-semibold mb-2">Article not found</h2>
          <p className="text-muted-foreground mb-6">
            The article you're looking for doesn't exist or has been removed.
          </p>
          <Button asChild>
            <Link to="/knowledge-base">Back to Knowledge Base</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="mb-6">
        <Button variant="ghost" asChild className="mb-4">
          <Link to="/knowledge-base">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Knowledge Base
          </Link>
        </Button>

        <div className="flex items-center gap-2 mb-4">
          <span className="text-2xl">{getTypeIcon(article.article_type)}</span>
          <Badge className={getDifficultyColor(article.difficulty_level)}>
            {article.difficulty_level}
          </Badge>
          {article.is_featured && (
            <Badge variant="secondary">
              <Star className="h-3 w-3 mr-1" />
              Featured
            </Badge>
          )}
          {article.knowledge_base_categories && (
            <Link to={`/knowledge-base/category/${article.knowledge_base_categories.slug}`}>
              <Badge variant="outline">
                {article.knowledge_base_categories.name}
              </Badge>
            </Link>
          )}
        </div>

        <h1 className="text-4xl font-bold mb-4">{article.title}</h1>
        
        {article.excerpt && (
          <p className="text-xl text-muted-foreground mb-6">{article.excerpt}</p>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {article.estimated_read_time} min read
            </div>
            <div className="flex items-center gap-1">
              <Eye className="h-4 w-4" />
              {article.view_count} views
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              {new Date(article.published_at).toLocaleDateString()}
            </div>
          </div>
          
          <Button variant="outline" size="sm" onClick={shareArticle}>
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </Button>
        </div>

        {article.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4">
            {article.tags.map((tag, index) => (
              <Badge key={index} variant="outline" className="flex items-center gap-1">
                <Tag className="h-3 w-3" />
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </div>

      <Separator className="mb-8" />

      {/* Article Content */}
      <div className="prose prose-lg max-w-none mb-8">
        <ReactMarkdown>{article.content}</ReactMarkdown>
      </div>

      <Separator className="mb-8" />

      {/* Feedback Section */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Was this article helpful?</CardTitle>
          <CardDescription>
            Your feedback helps us improve our documentation
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Button 
              variant={isHelpful === true ? "default" : "outline"}
              onClick={() => setIsHelpful(true)}
            >
              <ThumbsUp className="h-4 w-4 mr-2" />
              Yes
            </Button>
            <Button 
              variant={isHelpful === false ? "default" : "outline"}
              onClick={() => setIsHelpful(false)}
            >
              <ThumbsDown className="h-4 w-4 mr-2" />
              No
            </Button>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Rate this article (1-5 stars)</label>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <Button
                  key={star}
                  variant="ghost"
                  size="sm"
                  onClick={() => setRating(star)}
                  className="p-1"
                >
                  <Star 
                    className={`h-5 w-5 ${
                      star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
                    }`}
                  />
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Additional feedback (optional)</label>
            <Textarea
              placeholder="Tell us how we can improve this article..."
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
            />
          </div>

          <Button onClick={submitFeedback}>
            Submit Feedback
          </Button>
        </CardContent>
      </Card>

      {/* Related Articles */}
      {relatedArticles.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold mb-6">Related Articles</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {relatedArticles.map((relatedArticle) => (
              <Card key={relatedArticle.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-center gap-2 mb-2">
                    <span>{getTypeIcon(relatedArticle.article_type)}</span>
                    <Badge className={getDifficultyColor(relatedArticle.difficulty_level)}>
                      {relatedArticle.difficulty_level}
                    </Badge>
                  </div>
                  <CardTitle className="line-clamp-2">
                    <Link 
                      to={`/knowledge-base/article/${relatedArticle.slug}`}
                      className="hover:text-primary"
                    >
                      {relatedArticle.title}
                    </Link>
                  </CardTitle>
                  <CardDescription className="line-clamp-2">
                    {relatedArticle.excerpt}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {relatedArticle.estimated_read_time} min
                    </div>
                    <div className="flex items-center gap-1">
                      <Eye className="h-3 w-3" />
                      {relatedArticle.view_count}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}