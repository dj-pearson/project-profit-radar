import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  Send, 
  Calendar, 
  Image, 
  Video, 
  FileText,
  Facebook,
  Linkedin,
  Twitter,
  Instagram,
  AlertTriangle,
  CheckCircle,
  Clock
} from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { DatePicker } from '@/components/ui/date-picker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface PostComposerProps {
  accounts: any[];
  templates: any[];
  onPostCreated: () => void;
}

export const PostComposer: React.FC<PostComposerProps> = ({
  accounts,
  templates,
  onPostCreated
}) => {
  const { userProfile } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [postData, setPostData] = useState({
    title: '',
    content: '',
    selectedPlatforms: [] as string[],
    scheduledFor: null as Date | null,
    contentType: 'text',
    mediaUrls: [] as string[]
  });
  const [validation, setValidation] = useState<any>({});

  const platformConfig = {
    linkedin: { icon: Linkedin, name: 'LinkedIn', maxLength: 3000 },
    facebook: { icon: Facebook, name: 'Facebook', maxLength: 63206 },
    twitter: { icon: Twitter, name: 'Twitter/X', maxLength: 280 },
    instagram: { icon: Instagram, name: 'Instagram', maxLength: 2200 }
  };

  const validateContent = async () => {
    const results: any = {};
    
    for (const platform of postData.selectedPlatforms) {
      try {
        const { data } = await supabase.rpc('validate_post_for_platform', {
          p_content: postData.content,
          p_platform: platform as any,
          p_media_urls: JSON.stringify(postData.mediaUrls)
        });
        results[platform] = data;
      } catch (error) {
        console.error('Validation error:', error);
      }
    }
    
    setValidation(results);
    return results;
  };

  const handlePlatformToggle = (platform: string, checked: boolean) => {
    setPostData(prev => ({
      ...prev,
      selectedPlatforms: checked 
        ? [...prev.selectedPlatforms, platform]
        : prev.selectedPlatforms.filter(p => p !== platform)
    }));
  };

  const handleSubmit = async (isDraft = false) => {
    if (!userProfile?.company_id) {
      toast({
        title: "Error",
        description: "Company information not found",
        variant: "destructive",
      });
      return;
    }

    if (postData.selectedPlatforms.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one platform",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Validate content for all platforms
      const validationResults = await validateContent();
      
      // Check for errors
      const hasErrors = Object.values(validationResults).some((result: any) => 
        result?.errors?.length > 0
      );
      
      if (hasErrors && !isDraft) {
        toast({
          title: "Validation Failed",
          description: "Please fix the validation errors before publishing",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }

      // Create post
      const { data: post, error } = await supabase
        .from('social_media_posts')
        .insert({
          company_id: userProfile.company_id,
          title: postData.title,
          content: postData.content,
          content_type: postData.contentType as any,
          media_urls: JSON.stringify(postData.mediaUrls),
          platforms: JSON.stringify(postData.selectedPlatforms.map(platform => ({ platform }))),
          scheduled_for: postData.scheduledFor?.toISOString(),
          status: isDraft ? 'draft' : (postData.scheduledFor ? 'scheduled' : 'published'),
          created_by: userProfile.id
        })
        .select()
        .single();

      if (error) throw error;

      // Create post results for each platform
      for (const platform of postData.selectedPlatforms) {
        await supabase
          .from('social_media_post_results')
          .insert({
            post_id: post.id,
            platform: platform as any,
            status: isDraft ? 'draft' : (postData.scheduledFor ? 'scheduled' : 'published')
          });
      }

      toast({
        title: "Success",
        description: isDraft 
          ? "Post saved as draft" 
          : postData.scheduledFor 
            ? "Post scheduled successfully"
            : "Post published successfully",
      });

      // Reset form
      setPostData({
        title: '',
        content: '',
        selectedPlatforms: [],
        scheduledFor: null,
        contentType: 'text',
        mediaUrls: []
      });
      setValidation({});
      onPostCreated();

    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const loadTemplate = (template: any) => {
    setPostData(prev => ({
      ...prev,
      title: template.name,
      content: template.content,
      contentType: template.content_type,
      selectedPlatforms: JSON.parse(template.default_platforms || '[]')
    }));
  };

  const getValidationIcon = (platform: string) => {
    const result = validation[platform];
    if (!result) return null;
    
    if (result.errors?.length > 0) {
      return <AlertTriangle className="h-4 w-4 text-red-500" />;
    }
    if (result.warnings?.length > 0) {
      return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    }
    return <CheckCircle className="h-4 w-4 text-green-500" />;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Compose Post</CardTitle>
          <CardDescription>
            Create and schedule posts across your social media platforms
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Templates */}
          {templates.length > 0 && (
            <div>
              <Label className="text-sm font-medium">Quick Start Templates</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {templates.slice(0, 5).map((template) => (
                  <Button
                    key={template.id}
                    variant="outline"
                    size="sm"
                    onClick={() => loadTemplate(template)}
                    className="gap-2"
                  >
                    <FileText className="h-3 w-3" />
                    {template.name}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Post Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Post Title (Optional)</Label>
            <Input
              id="title"
              placeholder="Enter a title for your post..."
              value={postData.title}
              onChange={(e) => setPostData(prev => ({ ...prev, title: e.target.value }))}
            />
          </div>

          {/* Post Content */}
          <div className="space-y-2">
            <Label htmlFor="content">Content *</Label>
            <Textarea
              id="content"
              placeholder="What's happening in your construction business?"
              value={postData.content}
              onChange={(e) => {
                setPostData(prev => ({ ...prev, content: e.target.value }));
                if (postData.selectedPlatforms.length > 0) {
                  validateContent();
                }
              }}
              rows={6}
            />
            <div className="text-sm text-muted-foreground">
              {postData.content.length} characters
            </div>
          </div>

          {/* Platform Selection */}
          <div className="space-y-3">
            <Label>Select Platforms *</Label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {accounts.map((account) => {
                const config = platformConfig[account.platform as keyof typeof platformConfig];
                if (!config) return null;
                
                const Icon = config.icon;
                const isSelected = postData.selectedPlatforms.includes(account.platform);
                const validationIcon = getValidationIcon(account.platform);
                
                return (
                  <div key={account.id} className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id={account.id}
                        checked={isSelected}
                        onCheckedChange={(checked) => 
                          handlePlatformToggle(account.platform, !!checked)
                        }
                      />
                      <label 
                        htmlFor={account.id} 
                        className="flex items-center gap-2 cursor-pointer text-sm font-medium"
                      >
                        <Icon className="h-4 w-4" />
                        {config.name}
                        {validationIcon}
                      </label>
                    </div>
                    
                    {isSelected && validation[account.platform] && (
                      <div className="text-xs ml-6">
                        <div className="text-muted-foreground">
                          {validation[account.platform].character_count}/{config.maxLength} characters
                        </div>
                        {validation[account.platform].errors?.map((error: string, index: number) => (
                          <div key={index} className="text-red-500">{error}</div>
                        ))}
                        {validation[account.platform].warnings?.map((warning: string, index: number) => (
                          <div key={index} className="text-yellow-600">{warning}</div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Media Upload */}
          <div className="space-y-2">
            <Label>Media (Coming Soon)</Label>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled className="gap-2">
                <Image className="h-4 w-4" />
                Add Photo
              </Button>
              <Button variant="outline" size="sm" disabled className="gap-2">
                <Video className="h-4 w-4" />
                Add Video
              </Button>
            </div>
          </div>

          {/* Scheduling */}
          <div className="space-y-2">
            <Label>Schedule Post (Optional)</Label>
            <div className="flex gap-4">
              <DatePicker
                date={postData.scheduledFor}
                onDateChange={(date) => setPostData(prev => ({ ...prev, scheduledFor: date }))}
              />
              {postData.scheduledFor && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPostData(prev => ({ ...prev, scheduledFor: null }))}
                >
                  Clear
                </Button>
              )}
            </div>
            {postData.scheduledFor && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                Scheduled for {postData.scheduledFor.toLocaleString()}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              onClick={() => handleSubmit(false)}
              disabled={isSubmitting || postData.selectedPlatforms.length === 0}
              className="gap-2"
            >
              {isSubmitting ? (
                <>Loading...</>
              ) : postData.scheduledFor ? (
                <>
                  <Calendar className="h-4 w-4" />
                  Schedule Post
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Publish Now
                </>
              )}
            </Button>
            
            <Button
              variant="outline"
              onClick={() => handleSubmit(true)}
              disabled={isSubmitting}
              className="gap-2"
            >
              Save as Draft
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};