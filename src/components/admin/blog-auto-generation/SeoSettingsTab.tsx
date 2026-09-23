import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Globe, Sparkles } from 'lucide-react';
import React from 'react';
import type { AutoGenSettings } from './types';

interface SeoSettingsTabProps {
  settings: AutoGenSettings;
  setSettings: React.Dispatch<React.SetStateAction<AutoGenSettings>>;
}

/** SEO & GEO tab: keyword, local-SEO and generative-engine optimisation settings. */
export function SeoSettingsTab({ settings, setSettings }: SeoSettingsTabProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="h-5 w-5" />
          SEO & GEO Optimization
        </CardTitle>
        <CardDescription>
          Configure traditional SEO, Generative Engine Optimization (GEO), and AI search optimization
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
                        <div>
          <Label htmlFor="seo-focus">Content Strategy Focus</Label>
          <Select 
            value={settings.seo_focus} 
            onValueChange={(value) => setSettings(prev => ({ ...prev, seo_focus: value }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="traditional">Traditional SEO Focus</SelectItem>
              <SelectItem value="geo">Generative Engine Optimization (GEO) Focus</SelectItem>
              <SelectItem value="balanced">Balanced Traditional + GEO</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Generative Engine Optimization (GEO) */}
        <div className="space-y-4 p-4 border rounded-lg bg-blue-50">
          <div className="flex items-center space-x-2">
            <Switch
              checked={settings.geo_optimization}
              onCheckedChange={(checked) => setSettings(prev => ({ ...prev, geo_optimization: checked }))}
            />
            <Label className="font-medium">Enable Generative Engine Optimization (GEO)</Label>
          </div>
          <p className="text-sm text-muted-foreground">
            Optimizes content for AI-powered search engines like ChatGPT, Claude, Perplexity, and Google's AI Overviews. 
            This creates content that AI systems can easily understand, cite, and reference.
          </p>
        </div>

        {/* AI-Specific Optimizations */}
        <div className="space-y-4">
          <h4 className="font-medium">AI Search Engine Optimizations</h4>

          <div className="flex items-center space-x-2">
            <Switch
              checked={settings.perplexity_optimization}
              onCheckedChange={(checked) => setSettings(prev => ({ ...prev, perplexity_optimization: checked }))}
            />
            <Label>Optimize for Perplexity AI & Conversational AI</Label>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              checked={settings.ai_search_optimization}
              onCheckedChange={(checked) => setSettings(prev => ({ ...prev, ai_search_optimization: checked }))}
            />
            <Label>Optimize for Google AI Overviews & Featured Snippets</Label>
          </div>
        </div>

        {/* Geographic/Local SEO */}
        <div className="space-y-4">
          <h4 className="font-medium">Geographic/Local SEO</h4>

          <div className="flex items-center space-x-2">
            <Switch
              checked={settings.optimize_for_geographic}
              onCheckedChange={(checked) => setSettings(prev => ({ ...prev, optimize_for_geographic: checked }))}
            />
            <Label>Enable geographic/local search optimization</Label>
          </div>

          {settings.optimize_for_geographic && (
            <div>
              <Label htmlFor="target-locations">Target Locations</Label>
              <Input
                placeholder="New York, Los Angeles, Chicago"
                value={settings.target_locations.join(', ')}
                onChange={(e) => setSettings(prev => ({ 
                  ...prev, 
                  target_locations: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                }))}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Add specific cities or regions for local SEO optimization
              </p>
            </div>
          )}
        </div>

        <Alert>
          <Sparkles className="h-4 w-4" />
          <AlertDescription>
            <strong>Generative Engine Optimization (GEO)</strong> is the new frontier of content optimization. 
            Unlike traditional SEO that targets search result rankings, GEO optimizes content to be easily 
            understood, cited, and referenced by AI systems when generating responses to user queries.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
