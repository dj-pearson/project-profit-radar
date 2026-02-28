import React from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { AISettings } from "@/pages/BlogManager";

interface BlogAISettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  aiSettings: AISettings[];
  onUpdateSettings: (settingId: string, updates: Partial<AISettings>) => void;
}

const BlogAISettingsDialog: React.FC<BlogAISettingsDialogProps> = ({
  open,
  onOpenChange,
  aiSettings,
  onUpdateSettings,
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>AI Settings</DialogTitle>
          <DialogDescription>
            Configure AI providers and instructions for content generation
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6">
          {aiSettings.map((setting) => (
            <Card key={setting.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="capitalize">{setting.provider}</CardTitle>
                  <Button
                    size="sm"
                    variant={setting.is_active ? "default" : "outline"}
                    onClick={() =>
                      onUpdateSettings(setting.id, {
                        is_active: !setting.is_active,
                      })
                    }
                  >
                    {setting.is_active ? "Active" : "Inactive"}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label>Model</Label>
                  <Input value={setting.model} readOnly />
                </div>
                <div>
                  <Label>Blog Instructions</Label>
                  <Textarea
                    value={setting.blog_instructions}
                    onChange={(e) =>
                      onUpdateSettings(setting.id, {
                        blog_instructions: e.target.value,
                      })
                    }
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="flex justify-end">
          <Button onClick={() => onOpenChange(false)}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BlogAISettingsDialog;
