import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Send, RotateCcw } from "lucide-react";

interface PostQueueActionsProps {
  queueItem: {
    id: string;
    webhook_sent: boolean;
    status: string;
    company_id: string;
  };
  onUpdate: () => void;
}

export const PostQueueActions: React.FC<PostQueueActionsProps> = ({ 
  queueItem, 
  onUpdate 
}) => {
  const [isDeploying, setIsDeploying] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleDeployWebhook = async () => {
    setIsDeploying(true);
    try {
      const { data, error } = await supabase.functions.invoke('social-webhook-deployer', {
        body: { 
          queueId: queueItem.id,
          forceRedeploy: true 
        }
      });

      if (error) {
        toast.error("Failed to deploy webhook: " + error.message);
        return;
      }

      if (data?.webhook_sent) {
        toast.success("Webhook deployed successfully!");
      } else {
        toast.error("Webhook deployment failed");
      }
      
      onUpdate();
    } catch (error) {
      toast.error("Error deploying webhook");
      console.error(error);
    } finally {
      setIsDeploying(false);
    }
  };

  const handleRegeneratePost = async () => {
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('social-content-generator', {
        body: { 
          company_id: queueItem.company_id,
          template_category: "random",
          trigger_type: "manual"
        }
      });

      if (error) {
        toast.error("Failed to regenerate post: " + error.message);
        return;
      }

      toast.success("Post regenerated successfully!");
      onUpdate();
    } catch (error) {
      toast.error("Error regenerating post");
      console.error(error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex gap-2">
      <Button
        size="sm"
        variant="outline"
        onClick={handleRegeneratePost}
        disabled={isGenerating}
        className="text-xs"
      >
        {isGenerating ? (
          <Loader2 className="h-3 w-3 animate-spin mr-1" />
        ) : (
          <RotateCcw className="h-3 w-3 mr-1" />
        )}
        Send Now
      </Button>
      
      <Button
        size="sm"
        variant="secondary"
        onClick={handleDeployWebhook}
        disabled={isDeploying}
        className="text-xs"
      >
        {isDeploying ? (
          <Loader2 className="h-3 w-3 animate-spin mr-1" />
        ) : (
          <Send className="h-3 w-3 mr-1" />
        )}
        {queueItem.webhook_sent ? "Redeploy" : "Deploy"}
      </Button>
    </div>
  );
};