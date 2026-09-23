import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ContentSEOConfig } from '@/services/ContentSEOGenerator';
import { FileText } from 'lucide-react';

interface SEOContentTabProps {
  contentConfig: Partial<ContentSEOConfig>;
  setContentConfig: (config: Partial<ContentSEOConfig>) => void;
  generateContent: () => void;
  isGenerating: boolean;
  generatedContent: Record<string, unknown> | null;
}

export function SEOContentTab({ contentConfig, setContentConfig, generateContent, isGenerating, generatedContent }: SEOContentTabProps) {
  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Content Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>Content Generator</CardTitle>
            <CardDescription>Generate SEO-optimized content</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Title</label>
              <Input
                placeholder="Enter content title"
                value={contentConfig.title || ''}
                onChange={(e) => setContentConfig({...contentConfig, title: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Primary Keyword</label>
              <Input
                placeholder="e.g., construction management software"
                value={contentConfig.primaryKeyword || ''}
                onChange={(e) => setContentConfig({...contentConfig, primaryKeyword: e.target.value})}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Content Type</label>
                <Select
                  value={contentConfig.contentType}
                  onValueChange={(value) => setContentConfig({...contentConfig, contentType: value as ContentSEOConfig['contentType']})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="blog_post">Blog Post</SelectItem>
                    <SelectItem value="landing_page">Landing Page</SelectItem>
                    <SelectItem value="comparison">Comparison</SelectItem>
                    <SelectItem value="guide">Guide</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Target Audience</label>
                <Select
                  value={contentConfig.targetAudience}
                  onValueChange={(value) => setContentConfig({...contentConfig, targetAudience: value as ContentSEOConfig['targetAudience']})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="contractors">Contractors</SelectItem>
                    <SelectItem value="project_managers">Project Managers</SelectItem>
                    <SelectItem value="business_owners">Business Owners</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button 
              onClick={generateContent} 
              className="w-full" 
              disabled={isGenerating || !contentConfig.title || !contentConfig.primaryKeyword}
            >
              {isGenerating ? 'Generating...' : 'Generate SEO Content'}
            </Button>
          </CardContent>
        </Card>

        {/* Generated Content Preview */}
        <Card>
          <CardHeader>
            <CardTitle>Generated Content</CardTitle>
            <CardDescription>Preview your SEO-optimized content</CardDescription>
          </CardHeader>
          <CardContent>
            {generatedContent ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 border rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {generatedContent.seoScore}
                    </div>
                    <div className="text-sm text-muted-foreground">SEO Score</div>
                  </div>
                  <div className="text-center p-3 border rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {generatedContent.keywordDensity?.toFixed(1) || 0}%
                    </div>
                    <div className="text-sm text-muted-foreground">Keyword Density</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium">Generated Title</h4>
                  <p className="text-sm text-muted-foreground border p-3 rounded">
                    {generatedContent.title}
                  </p>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium">Meta Description</h4>
                  <p className="text-sm text-muted-foreground border p-3 rounded">
                    {generatedContent.metaDescription}
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Generate content to see preview</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
