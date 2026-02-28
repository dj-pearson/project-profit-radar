import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, Eye, Share2 } from 'lucide-react';

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  body: string;
  excerpt: string;
  featured_image_url: string;
  seo_title: string;
  seo_description: string;
  status: string;
  published_at: string;
  scheduled_at?: string;
  created_at: string;
}

interface BlogPostCardProps {
  post: BlogPost;
  onEdit: (post: BlogPost) => void;
  onDelete: (post: BlogPost) => void;
  onSocialShare?: (postId: string) => void;
}

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'published':
      return <Badge className="bg-green-500">Published</Badge>;
    case 'scheduled':
      return <Badge className="bg-blue-500">Scheduled</Badge>;
    case 'draft':
      return <Badge variant="secondary">Draft</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

export const BlogPostCard: React.FC<BlogPostCardProps> = ({
  post,
  onEdit,
  onDelete,
  onSocialShare,
}) => {
  return (
    <Card key={post.id}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-medium truncate max-w-[60%]">
          {post.title}
        </CardTitle>
        <div className="flex items-center gap-2">
          {getStatusBadge(post.status)}
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
          {post.excerpt || post.body?.substring(0, 150) + '...'}
        </p>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {post.published_at
              ? `Published: ${new Date(post.published_at).toLocaleDateString()}`
              : `Created: ${new Date(post.created_at).toLocaleDateString()}`}
          </span>
          <div className="flex gap-1">
            {post.status === 'published' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.open(`/blog/${post.slug}`, '_blank')}
                aria-label={`View ${post.title}`}
              >
                <Eye className="h-4 w-4" aria-hidden="true" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(post)}
              aria-label={`Edit ${post.title}`}
            >
              <Edit className="h-4 w-4" aria-hidden="true" />
            </Button>
            {onSocialShare && post.status === 'published' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onSocialShare(post.id)}
                aria-label={`Share ${post.title} on social media`}
              >
                <Share2 className="h-4 w-4" aria-hidden="true" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(post)}
              className="text-destructive hover:text-destructive"
              aria-label={`Delete ${post.title}`}
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
