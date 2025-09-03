import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, FileText, Check } from 'lucide-react';

export const CreateMissingContent = () => {
  const [isCreating, setIsCreating] = useState(false);
  const [lastResult, setLastResult] = useState<{ created: number; skipped: number } | null>(null);
  const { toast } = useToast();

  const handleCreateContent = async () => {
    setIsCreating(true);
    try {
      toast({
        title: "Creating missing content...",
        description: "This may take a few moments",
      });

      const { data, error } = await supabase.functions.invoke('create-missing-content');
      
      if (error) {
        throw error;
      }

      setLastResult({ created: data.created, skipped: data.skipped });
      
      toast({
        title: "Content created successfully!",
        description: `Created ${data.created} new posts, skipped ${data.skipped} existing ones`,
      });
    } catch (error) {
      console.error('Error creating content:', error);
      toast({
        title: "Error creating content",
        description: error.message || "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Create Missing Content
        </CardTitle>
        <CardDescription>
          Create predefined blog posts that are referenced in the sitemap but don't exist yet
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground">
          This will create the following blog posts if they don't already exist:
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>Construction CRM Implementation Guide</li>
            <li>Construction ROI Calculator Guide</li>
          </ul>
        </div>

        {lastResult && (
          <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg text-green-800 text-sm">
            <Check className="h-4 w-4" />
            Last run: Created {lastResult.created} posts, skipped {lastResult.skipped} existing
          </div>
        )}

        <Button 
          onClick={handleCreateContent}
          disabled={isCreating}
          className="w-full"
        >
          {isCreating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Creating Content...
            </>
          ) : (
            'Create Missing Content'
          )}
        </Button>
      </CardContent>
    </Card>
  );
};