import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Target } from 'lucide-react';
import React from 'react';
import type { AutoGenSettings } from './types';

interface ContentSettingsTabProps {
  settings: AutoGenSettings;
  setSettings: React.Dispatch<React.SetStateAction<AutoGenSettings>>;
}

/** Content tab: word count, style, focus areas and custom instructions. */
export function ContentSettingsTab({ settings, setSettings }: ContentSettingsTabProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5" />
          Content Configuration
        </CardTitle>
        <CardDescription>
          Define content style, topics, and quality parameters
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="word-count">Target Word Count</Label>
            <Input
              type="number"
              min="500"
              max="3000"
              value={settings.target_word_count}
              onChange={(e) => setSettings(prev => ({ ...prev, target_word_count: parseInt(e.target.value) }))}
            />
          </div>

          <div>
            <Label htmlFor="content-style">Content Style</Label>
            <Select 
              value={settings.content_style} 
              onValueChange={(value) => setSettings(prev => ({ ...prev, content_style: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="professional">Professional</SelectItem>
                <SelectItem value="conversational">Conversational</SelectItem>
                <SelectItem value="technical">Technical</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="analysis-depth">Content Analysis Depth</Label>
            <Select 
              value={settings.content_analysis_depth} 
              onValueChange={(value) => setSettings(prev => ({ ...prev, content_analysis_depth: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="title">Title Only</SelectItem>
                <SelectItem value="excerpt">Title + Excerpt</SelectItem>
                <SelectItem value="full">Full Content</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label htmlFor="industry-focus">Industry Focus</Label>
          <Input
            placeholder="construction, project management, technology"
            value={settings.industry_focus.join(', ')}
            onChange={(e) => setSettings(prev => ({ 
              ...prev, 
              industry_focus: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
            }))}
          />
        </div>

        <div>
          <Label htmlFor="target-keywords">Target Keywords</Label>
          <Input
            placeholder="construction management, project planning, safety protocols"
            value={settings.target_keywords.join(', ')}
            onChange={(e) => setSettings(prev => ({ 
              ...prev, 
              target_keywords: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
            }))}
          />
        </div>

        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Switch
              checked={settings.topic_diversity_enabled}
              onCheckedChange={(checked) => setSettings(prev => ({ ...prev, topic_diversity_enabled: checked }))}
            />
            <Label>Enable topic diversity checking</Label>
          </div>

          {settings.topic_diversity_enabled && (
            <div>
              <Label htmlFor="topic-gap">Minimum days between similar topics</Label>
              <Input
                type="number"
                min="1"
                max="365"
                value={settings.minimum_topic_gap_days}
                onChange={(e) => setSettings(prev => ({ ...prev, minimum_topic_gap_days: parseInt(e.target.value) }))}
              />
            </div>
          )}
        </div>

        <div>
          <Label htmlFor="custom-instructions">Custom Instructions</Label>
          <Textarea
            placeholder="Additional instructions for content generation..."
            value={settings.custom_instructions || ''}
            onChange={(e) => setSettings(prev => ({ ...prev, custom_instructions: e.target.value }))}
            rows={3}
          />
        </div>

        <div>
          <Label htmlFor="brand-voice">Brand Voice Guidelines</Label>
          <Textarea
            placeholder="Describe your brand voice and tone..."
            value={settings.brand_voice_guidelines || ''}
            onChange={(e) => setSettings(prev => ({ ...prev, brand_voice_guidelines: e.target.value }))}
            rows={3}
          />
        </div>
      </CardContent>
    </Card>
  );
}
