import React from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2, Eye, PlusCircle, Share2 } from "lucide-react";
import type { BlogPost } from "@/pages/BlogManager";

interface BlogPostListProps {
  posts: BlogPost[];
  loading: boolean;
  onEdit: (post: BlogPost) => void;
  onDelete: (post: BlogPost) => void;
  onSocialShare: (postId: string) => Promise<void>;
  onCreateNew: () => void;
}

const getStatusBadge = (status: string) => {
  switch (status) {
    case "published":
      return <Badge className="bg-green-500">Published</Badge>;
    case "scheduled":
      return <Badge className="bg-blue-500">Scheduled</Badge>;
    case "draft":
      return <Badge variant="secondary">Draft</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

const BlogPostList: React.FC<BlogPostListProps> = ({
  posts,
  loading,
  onEdit,
  onDelete,
  onSocialShare,
  onCreateNew,
}) => {
  if (posts.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <Edit
            className="h-12 w-12 text-muted-foreground mx-auto mb-4"
            aria-hidden="true"
          />
          <h3 className="text-lg font-medium mb-2">No Blog Posts</h3>
          <p className="text-muted-foreground mb-4">
            Start creating engaging content for your platform
          </p>
          <Button onClick={onCreateNew}>
            <PlusCircle className="h-4 w-4 mr-2" aria-hidden="true" />
            Create First Post
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-6">
      {posts.map((post) => (
        <Card key={post.id}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <CardTitle className="flex items-center space-x-2">
                  <span>{post.title}</span>
                  {getStatusBadge(post.status)}
                </CardTitle>
                <CardDescription>
                  {post.excerpt || "No excerpt available"}
                </CardDescription>
              </div>
              <div className="flex items-center space-x-2">
                <Button size="sm" variant="outline">
                  <Eye className="h-3 w-3 mr-1" />
                  Preview
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onEdit(post)}
                >
                  <Edit className="h-3 w-3 mr-1" />
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    try {
                      await onSocialShare(post.id);
                    } catch (error) {
                      // Error handling is done in the hook
                    }
                  }}
                  disabled={loading}
                >
                  <Share2 className="h-3 w-3 mr-1" />
                  Social
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onDelete(post)}
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Delete
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground">
              Created: {new Date(post.created_at).toLocaleDateString()}
              {post.published_at && (
                <span>
                  {" "}
                  • Published:{" "}
                  {new Date(post.published_at).toLocaleDateString()}
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default BlogPostList;
