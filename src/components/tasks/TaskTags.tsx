import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { X, Plus, Tag } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface TaskTagsProps {
  taskId: string;
  initialTags: string[];
  onTagsUpdate: (tags: string[]) => void;
}

export const TaskTags: React.FC<TaskTagsProps> = ({ taskId, initialTags, onTagsUpdate }) => {
  const [tags, setTags] = useState<string[]>(initialTags);
  const [newTag, setNewTag] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setTags(initialTags);
  }, [initialTags]);

  const saveTags = async (updatedTags: string[]) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ tags: updatedTags })
        .eq('id', taskId);

      if (!error) {
        setTags(updatedTags);
        onTagsUpdate(updatedTags);
      }
    } catch (error) {
      console.error('Error updating tags:', error);
    } finally {
      setLoading(false);
    }
  };

  const addTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTag.trim()) return;

    const trimmedTag = newTag.trim().toLowerCase();
    if (tags.includes(trimmedTag)) {
      setNewTag('');
      return;
    }

    const updatedTags = [...tags, trimmedTag];
    await saveTags(updatedTags);
    setNewTag('');
  };

  const removeTag = async (tagToRemove: string) => {
    const updatedTags = tags.filter(tag => tag !== tagToRemove);
    await saveTags(updatedTags);
  };

  const predefinedTags = [
    'urgent', 'blocked', 'review', 'testing', 'documentation',
    'bug', 'feature', 'improvement', 'meeting', 'research'
  ];

  const availablePredefined = predefinedTags.filter(tag => !tags.includes(tag));

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Tag className="h-4 w-4 text-muted-foreground" />
        <Label className="text-sm font-medium">Tags</Label>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-xs"
          onClick={() => setIsEditing(!isEditing)}
        >
          {isEditing ? 'Done' : 'Edit'}
        </Button>
      </div>

      {/* Current Tags */}
      <div className="flex flex-wrap gap-2">
        {tags.length === 0 ? (
          <span className="text-xs text-muted-foreground">No tags yet</span>
        ) : (
          tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="text-xs">
              {tag}
              {isEditing && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-3 w-3 p-0 ml-1 hover:bg-destructive hover:text-destructive-foreground"
                  onClick={() => removeTag(tag)}
                  disabled={loading}
                >
                  <X className="h-2 w-2" />
                </Button>
              )}
            </Badge>
          ))
        )}
      </div>

      {isEditing && (
        <div className="space-y-3">
          {/* Add Custom Tag */}
          <form onSubmit={addTag} className="flex gap-2">
            <Input
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              placeholder="Add a tag..."
              className="flex-1"
              disabled={loading}
            />
            <Button type="submit" size="sm" disabled={loading || !newTag.trim()}>
              <Plus className="h-3 w-3" />
            </Button>
          </form>

          {/* Predefined Tags */}
          {availablePredefined.length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Quick Add:</Label>
              <div className="flex flex-wrap gap-1">
                {availablePredefined.map((tag) => (
                  <Button
                    key={tag}
                    variant="outline"
                    size="sm"
                    className="h-6 px-2 text-xs"
                    onClick={() => saveTags([...tags, tag])}
                    disabled={loading}
                  >
                    {tag}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};