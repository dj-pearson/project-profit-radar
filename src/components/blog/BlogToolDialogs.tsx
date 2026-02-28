import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Bug, Bot } from "lucide-react";
import BlogAIDebugger from "@/components/admin/BlogAIDebugger";
import BlogAutoGeneration from "@/components/admin/BlogAutoGeneration";

interface BlogToolDialogsProps {
  isDebugDialogOpen: boolean;
  onDebugDialogChange: (open: boolean) => void;
  isAutoGenDialogOpen: boolean;
  onAutoGenDialogChange: (open: boolean) => void;
}

const BlogToolDialogs: React.FC<BlogToolDialogsProps> = ({
  isDebugDialogOpen,
  onDebugDialogChange,
  isAutoGenDialogOpen,
  onAutoGenDialogChange,
}) => {
  return (
    <>
      {/* Debug Dialog */}
      <Dialog open={isDebugDialogOpen} onOpenChange={onDebugDialogChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bug className="h-5 w-5" />
              AI Blog Generation Diagnostics
            </DialogTitle>
            <DialogDescription>
              Diagnose and fix issues with AI blog generation
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-y-auto max-h-[75vh]">
            <BlogAIDebugger />
          </div>
        </DialogContent>
      </Dialog>

      {/* Auto-Generation Dialog */}
      <Dialog open={isAutoGenDialogOpen} onOpenChange={onAutoGenDialogChange}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              AI Blog Auto-Generation
            </DialogTitle>
            <DialogDescription>
              Configure automated blog content generation with advanced AI
              models
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-y-auto max-h-[75vh]">
            <BlogAutoGeneration />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default BlogToolDialogs;
