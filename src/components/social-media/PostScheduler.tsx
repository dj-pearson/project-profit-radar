import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  Calendar, 
  Clock, 
  Edit, 
  Trash2, 
  Play,
  Facebook,
  Linkedin,
  Twitter,
  Instagram,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';
import { format } from 'date-fns';

interface PostSchedulerProps {
  posts: any[];
  accounts: any[];
  onPostUpdated: () => void;
}

export const PostScheduler: React.FC<PostSchedulerProps> = ({
  posts,
  accounts,
  onPostUpdated
}) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const getPlatformIcon = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'linkedin': return <Linkedin className="h-4 w-4" />;
      case 'facebook': return <Facebook className="h-4 w-4" />;
      case 'twitter': return <Twitter className="h-4 w-4" />;
      case 'instagram': return <Instagram className="h-4 w-4" />;
      default: return <Calendar className="h-4 w-4" />;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'published': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'scheduled': return <Clock className="h-4 w-4 text-blue-600" />;
      case 'failed': return <XCircle className="h-4 w-4 text-red-600" />;
      case 'draft': return <AlertCircle className="h-4 w-4 text-yellow-600" />;
      default: return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const scheduledPosts = posts.filter(post => post.status === 'scheduled');
  const draftPosts = posts.filter(post => post.status === 'draft');
  const publishedPosts = posts.filter(post => post.status === 'published');

  return (
    <div className="space-y-6">
      {/* Scheduled Posts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Scheduled Posts ({scheduledPosts.length})
          </CardTitle>
          <CardDescription>
            Posts scheduled to be published automatically
          </CardDescription>
        </CardHeader>
        <CardContent>
          {scheduledPosts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No scheduled posts
            </div>
          ) : (
            <div className="space-y-4">
              {scheduledPosts.map((post) => (
                <div key={post.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(post.status)}
                      <div>
                        <h4 className="font-medium line-clamp-1">
                          {post.title || post.content.substring(0, 50) + '...'}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          Scheduled for {format(new Date(post.scheduled_for), 'PPP p')}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      {JSON.parse(post.platforms || '[]').map((platform: any, index: number) => (
                        <div key={index} className="p-1">
                          {getPlatformIcon(platform.platform)}
                        </div>
                      ))}
                    </div>
                    <Button variant="outline" size="sm" className="gap-2">
                      <Edit className="h-4 w-4" />
                      Edit
                    </Button>
                    <Button variant="outline" size="sm" className="gap-2">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Draft Posts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Draft Posts ({draftPosts.length})
          </CardTitle>
          <CardDescription>
            Posts saved as drafts
          </CardDescription>
        </CardHeader>
        <CardContent>
          {draftPosts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No draft posts
            </div>
          ) : (
            <div className="space-y-4">
              {draftPosts.map((post) => (
                <div key={post.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(post.status)}
                      <div>
                        <h4 className="font-medium line-clamp-1">
                          {post.title || post.content.substring(0, 50) + '...'}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          Created {format(new Date(post.created_at), 'PPP')}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="gap-2">
                      <Edit className="h-4 w-4" />
                      Edit
                    </Button>
                    <Button size="sm" className="gap-2">
                      <Play className="h-4 w-4" />
                      Publish
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Published Posts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            Recently Published ({publishedPosts.slice(0, 5).length})
          </CardTitle>
          <CardDescription>
            Your latest published posts
          </CardDescription>
        </CardHeader>
        <CardContent>
          {publishedPosts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No published posts
            </div>
          ) : (
            <div className="space-y-4">
              {publishedPosts.slice(0, 5).map((post) => (
                <div key={post.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(post.status)}
                      <div>
                        <h4 className="font-medium line-clamp-1">
                          {post.title || post.content.substring(0, 50) + '...'}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          Published {format(new Date(post.published_at || post.created_at), 'PPP')}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      {JSON.parse(post.platforms || '[]').map((platform: any, index: number) => (
                        <div key={index} className="p-1">
                          {getPlatformIcon(platform.platform)}
                        </div>
                      ))}
                    </div>
                    <Badge variant="default">Published</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};