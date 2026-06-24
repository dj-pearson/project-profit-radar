import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ImageUpload } from "@/components/ui/image-upload";
import { Sparkles, Save } from "lucide-react";

export interface BlogPostFormData {
  title: string;
  body: string;
  excerpt: string;
  featured_image_url: string;
  seo_title: string;
  seo_description: string;
  status: string;
  scheduled_at?: string;
}

interface BlogPostFormDialogProps {
  mode: "create" | "edit";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formData: BlogPostFormData;
  onFormChange: (data: BlogPostFormData) => void;
  onSubmit: () => void;
  /** AI generation fields (only shown in create mode) */
  aiTopic?: string;
  onAiTopicChange?: (topic: string) => void;
  onGenerateWithAI?: () => void;
  generatingAI?: boolean;
}

const BlogPostFormDialog: React.FC<BlogPostFormDialogProps> = ({
  mode,
  open,
  onOpenChange,
  formData,
  onFormChange,
  onSubmit,
  aiTopic = "",
  onAiTopicChange,
  onGenerateWithAI,
  generatingAI = false,
}) => {
  const isCreate = mode === "create";
  const idPrefix = isCreate ? "" : "edit_";

  const updateField = <K extends keyof BlogPostFormData>(
    field: K,
    value: BlogPostFormData[K]
  ) => {
    onFormChange({ ...formData, [field]: value });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isCreate ? "Create New Blog Post" : "Edit Blog Post"}
          </DialogTitle>
          <DialogDescription>
            {isCreate
              ? "Write a new blog article with AI assistance or create manually"
              : "Update your blog article content and settings"}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="content" className="space-y-4">
          <TabsList>
            <TabsTrigger value="content">Content</TabsTrigger>
            <TabsTrigger value="seo">SEO</TabsTrigger>
            {isCreate && <TabsTrigger value="ai">AI Assistant</TabsTrigger>}
          </TabsList>

          <TabsContent value="content" className="space-y-4">
            <div>
              <Label htmlFor={`${idPrefix}title`}>Title *</Label>
              <Input
                id={`${idPrefix}title`}
                placeholder="Enter blog post title"
                value={formData.title}
                onChange={(e) => updateField("title", e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor={`${idPrefix}excerpt`}>Excerpt</Label>
              <Textarea
                id={`${idPrefix}excerpt`}
                placeholder="Brief summary of the post"
                value={formData.excerpt}
                onChange={(e) => updateField("excerpt", e.target.value)}
                rows={2}
              />
            </div>

            <ImageUpload
              label="Featured Image"
              value={formData.featured_image_url}
              onChange={(value) => updateField("featured_image_url", value)}
              bucket="blog-images"
              path="featured"
              placeholder="Upload an image or enter a URL"
            />

            <div>
              <Label htmlFor={`${idPrefix}body`}>Content *</Label>
              <Textarea
                id={`${idPrefix}body`}
                placeholder="Write your blog post content here (Markdown supported)"
                value={formData.body}
                onChange={(e) => updateField("body", e.target.value)}
                rows={12}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor={`${idPrefix}status`}>Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) =>
                    onFormChange({
                      ...formData,
                      status: value,
                      scheduled_at:
                        value !== "scheduled" ? "" : formData.scheduled_at,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.status === "scheduled" && (
                <div>
                  <Label htmlFor={`${idPrefix}scheduled_at`}>
                    Schedule Date & Time
                  </Label>
                  <Input
                    id={`${idPrefix}scheduled_at`}
                    type="datetime-local"
                    value={formData.scheduled_at}
                    onChange={(e) =>
                      updateField("scheduled_at", e.target.value)
                    }
                    min={new Date().toISOString().slice(0, 16)}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Post will be automatically published at this time
                  </p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="seo" className="space-y-4">
            <div>
              <Label htmlFor={`${idPrefix}seo_title`}>SEO Title</Label>
              <Input
                id={`${idPrefix}seo_title`}
                placeholder="SEO optimized title (max 60 characters)"
                value={formData.seo_title}
                onChange={(e) => updateField("seo_title", e.target.value)}
                maxLength={60}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {formData.seo_title.length}/60 characters
              </p>
            </div>

            <div>
              <Label htmlFor={`${idPrefix}seo_description`}>
                SEO Description
              </Label>
              <Textarea
                id={`${idPrefix}seo_description`}
                placeholder={
                  isCreate
                    ? "Meta description for search engines (max 160 characters)"
                    : "SEO description (max 160 characters)"
                }
                value={formData.seo_description}
                onChange={(e) =>
                  updateField("seo_description", e.target.value)
                }
                maxLength={160}
                rows={3}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {formData.seo_description.length}/160 characters
              </p>
            </div>
          </TabsContent>

          {isCreate && (
            <TabsContent value="ai" className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium mb-2 flex items-center">
                  <Sparkles className="h-4 w-4 mr-2 text-blue-600" />
                  AI Content Generation
                </h4>
                <p className="text-sm text-muted-foreground mb-4">
                  Enter a topic and let AI generate a complete blog article for
                  you
                </p>

                <div className="space-y-3">
                  <div>
                    <Label htmlFor="ai_topic">Blog Topic</Label>
                    <Input
                      id="ai_topic"
                      placeholder="e.g., Benefits of Digital Project Management in Construction"
                      value={aiTopic}
                      onChange={(e) => onAiTopicChange?.(e.target.value)}
                    />
                  </div>

                  <Button
                    onClick={onGenerateWithAI}
                    disabled={generatingAI || !aiTopic.trim()}
                    className="w-full"
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    {generatingAI ? "Generating..." : "Generate with AI"}
                  </Button>
                </div>
              </div>
            </TabsContent>
          )}
        </Tabs>

        <div className={`flex justify-end space-x-2${isCreate ? "" : " pt-4"}`}>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onSubmit}>
            <Save className="h-4 w-4 mr-2" />
            {isCreate ? "Create Post" : "Update Post"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BlogPostFormDialog;
