import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Target, Plus } from 'lucide-react';
import type { MetaTag } from './types';

interface SEOMetaTagsTabProps {
  newMetaTag: MetaTag;
  setNewMetaTag: (tag: MetaTag) => void;
  addMetaTag: () => void;
  metaTags: MetaTag[];
}

export function SEOMetaTagsTab({ newMetaTag, setNewMetaTag, addMetaTag, metaTags }: SEOMetaTagsTabProps) {
  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Add New Meta Tag */}
        <Card>
          <CardHeader>
            <CardTitle>Add Meta Tag</CardTitle>
            <CardDescription>Create page-specific SEO meta tags</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Page Path</label>
              <Input
                placeholder="/about-us"
                value={newMetaTag.page_path}
                onChange={(e) => setNewMetaTag({...newMetaTag, page_path: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Title</label>
              <Input
                placeholder="Page title"
                value={newMetaTag.title}
                onChange={(e) => setNewMetaTag({...newMetaTag, title: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Textarea
                placeholder="Page description for search results"
                value={newMetaTag.description}
                onChange={(e) => setNewMetaTag({...newMetaTag, description: e.target.value})}
                rows={3}
              />
            </div>

            <Button onClick={addMetaTag} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Add Meta Tag
            </Button>
          </CardContent>
        </Card>

        {/* Existing Meta Tags */}
        <Card>
          <CardHeader>
            <CardTitle>Existing Meta Tags</CardTitle>
            <CardDescription>Manage page-specific SEO settings</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {metaTags.length > 0 ? (
                metaTags.map((tag, index) => (
                  <div key={index} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">{tag.page_path}</h4>
                      <Badge variant="outline">{tag.title}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{tag.description}</p>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No meta tags configured yet</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
