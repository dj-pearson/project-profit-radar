import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { EnhancedMobileCamera } from '@/components/mobile/EnhancedMobileCamera';
import { Camera, Wand2, Save, X } from 'lucide-react';
import { toast } from 'sonner';

interface PhotoFirstWorkflowProps {
  onSave: (data: WorkflowData) => void;
  onCancel: () => void;
  title?: string;
  description?: string;
}

interface WorkflowData {
  photos: File[];
  category: string;
  description: string;
  amount?: number;
  location?: string;
  tags: string[];
  aiSuggestions?: AISuggestion[];
}

interface AISuggestion {
  type: 'category' | 'description' | 'cost';
  value: string;
  confidence: number;
}

export const PhotoFirstWorkflow: React.FC<PhotoFirstWorkflowProps> = ({
  onSave,
  onCancel,
  title = "Photo-First Entry",
  description = "Take a photo to get started"
}) => {
  const [showCamera, setShowCamera] = useState(false);
  const [photos, setPhotos] = useState<File[]>([]);
  const [workflowData, setWorkflowData] = useState<WorkflowData>({
    photos: [],
    category: '',
    description: '',
    tags: []
  });
  const [aiSuggestions, setAiSuggestions] = useState<AISuggestion[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handlePhotoCapture = async (file: File, metadata?: any) => {
    const newPhotos = [...photos, file];
    setPhotos(newPhotos);
    setWorkflowData(prev => ({ ...prev, photos: newPhotos }));
    setShowCamera(false);

    // Auto-analyze the photo
    await analyzePhoto(file);
  };

  const analyzePhoto = async (file: File) => {
    setIsAnalyzing(true);
    
    try {
      // Simulate AI analysis - in real implementation, this would call an AI service
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Mock AI suggestions based on image analysis
      const mockSuggestions: AISuggestion[] = [
        { type: 'category', value: 'Material Delivery', confidence: 0.85 },
        { type: 'description', value: 'Construction materials delivered to site', confidence: 0.78 },
        { type: 'cost', value: '2500', confidence: 0.65 }
      ];
      
      setAiSuggestions(mockSuggestions);
      
      // Auto-fill high confidence suggestions
      mockSuggestions.forEach(suggestion => {
        if (suggestion.confidence > 0.8) {
          applySuggestion(suggestion);
        }
      });
      
    } catch (error) {
      console.error('Error analyzing photo:', error);
      toast.error('Failed to analyze photo');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const applySuggestion = (suggestion: AISuggestion) => {
    setWorkflowData(prev => {
      switch (suggestion.type) {
        case 'category':
          return { ...prev, category: suggestion.value };
        case 'description':
          return { ...prev, description: suggestion.value };
        case 'cost':
          return { ...prev, amount: parseFloat(suggestion.value) };
        default:
          return prev;
      }
    });
  };

  const addTag = (tag: string) => {
    if (tag && !workflowData.tags.includes(tag)) {
      setWorkflowData(prev => ({
        ...prev,
        tags: [...prev.tags, tag]
      }));
    }
  };

  const removeTag = (tagToRemove: string) => {
    setWorkflowData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleSave = () => {
    if (photos.length === 0) {
      toast.error('Please take at least one photo');
      return;
    }
    
    onSave({ ...workflowData, aiSuggestions });
  };

  if (showCamera) {
    return (
      <EnhancedMobileCamera
        onCapture={handlePhotoCapture}
        onCancel={() => setShowCamera(false)}
        maxPhotos={5}
        currentCount={photos.length}
      />
    );
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Camera className="h-5 w-5" />
          {title}
        </CardTitle>
        <p className="text-muted-foreground">{description}</p>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Photo Section */}
        <div>
          <Label>Photos</Label>
          <div className="mt-2">
            {photos.length === 0 ? (
              <Button
                onClick={() => setShowCamera(true)}
                variant="outline"
                className="w-full h-32 border-dashed"
              >
                <div className="text-center">
                  <Camera className="h-8 w-8 mx-auto mb-2" />
                  <p>Take Photo to Start</p>
                  <p className="text-sm text-muted-foreground">
                    AI will analyze and suggest details
                  </p>
                </div>
              </Button>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {photos.map((photo, index) => (
                    <div key={index} className="relative">
                      <img
                        src={URL.createObjectURL(photo)}
                        alt={`Photo ${index + 1}`}
                        className="w-full h-32 object-cover rounded-lg"
                      />
                    </div>
                  ))}
                </div>
                <Button
                  onClick={() => setShowCamera(true)}
                  variant="outline"
                  size="sm"
                  disabled={photos.length >= 5}
                >
                  <Camera className="h-4 w-4 mr-2" />
                  Add Another Photo ({photos.length}/5)
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* AI Analysis Loading */}
        {isAnalyzing && (
          <div className="bg-muted/50 p-4 rounded-lg">
            <div className="flex items-center gap-2">
              <Wand2 className="h-4 w-4 animate-spin" />
              <span>AI is analyzing your photo...</span>
            </div>
          </div>
        )}

        {/* AI Suggestions */}
        {aiSuggestions.length > 0 && (
          <div className="bg-primary/5 p-4 rounded-lg">
            <h4 className="font-medium mb-3 flex items-center gap-2">
              <Wand2 className="h-4 w-4" />
              AI Suggestions
            </h4>
            <div className="space-y-2">
              {aiSuggestions.map((suggestion, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-background rounded">
                  <div>
                    <span className="text-sm font-medium capitalize">{suggestion.type}:</span>
                    <span className="ml-2">{suggestion.value}</span>
                    <Badge variant="secondary" className="ml-2 text-xs">
                      {Math.round(suggestion.confidence * 100)}% confidence
                    </Badge>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => applySuggestion(suggestion)}
                  >
                    Apply
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Form Fields */}
        <div className="space-y-4">
          <div>
            <Label htmlFor="category">Category</Label>
            <Input
              id="category"
              value={workflowData.category}
              onChange={(e) => setWorkflowData(prev => ({ ...prev, category: e.target.value }))}
              placeholder="e.g., Material Delivery, Progress Update"
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={workflowData.description}
              onChange={(e) => setWorkflowData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Describe what's shown in the photo..."
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="amount">Amount (optional)</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              value={workflowData.amount || ''}
              onChange={(e) => setWorkflowData(prev => ({ ...prev, amount: e.target.value ? parseFloat(e.target.value) : undefined }))}
              placeholder="0.00"
            />
          </div>

          <div>
            <Label htmlFor="location">Location (optional)</Label>
            <Input
              id="location"
              value={workflowData.location || ''}
              onChange={(e) => setWorkflowData(prev => ({ ...prev, location: e.target.value }))}
              placeholder="Building area, floor, etc."
            />
          </div>

          {/* Tags */}
          <div>
            <Label>Tags</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {workflowData.tags.map((tag, index) => (
                <Badge
                  key={index}
                  variant="secondary"
                  className="cursor-pointer"
                  onClick={() => removeTag(tag)}
                >
                  {tag}
                  <X className="h-3 w-3 ml-1" />
                </Badge>
              ))}
            </div>
            <div className="flex gap-2 mt-2">
              {['Materials', 'Progress', 'Issue', 'Completion', 'Inspection'].map(suggestedTag => (
                <Button
                  key={suggestedTag}
                  size="sm"
                  variant="outline"
                  onClick={() => addTag(suggestedTag)}
                  disabled={workflowData.tags.includes(suggestedTag)}
                >
                  + {suggestedTag}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button onClick={onCancel} variant="outline" className="flex-1">
            Cancel
          </Button>
          <Button onClick={handleSave} className="flex-1">
            <Save className="h-4 w-4 mr-2" />
            Save Entry
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};