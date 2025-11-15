import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Save, Sparkles } from 'lucide-react';

interface SaveAsTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: any;
  companyId?: string;
}

export function SaveAsTemplateDialog({
  open,
  onOpenChange,
  project,
  companyId
}: SaveAsTemplateDialogProps) {
  const [saving, setSaving] = useState(false);
  const [templateName, setTemplateName] = useState(`${project.name} Template`);
  const [description, setDescription] = useState(project.description || '');
  const [category, setCategory] = useState('');
  const [includePermits, setIncludePermits] = useState(true);
  const [includeMilestones, setIncludeMilestones] = useState(true);
  const { toast } = useToast();

  const handleSave = async () => {
    if (!templateName.trim()) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Template name is required'
      });
      return;
    }

    try {
      setSaving(true);

      // Calculate duration
      const startDate = new Date(project.start_date);
      const endDate = new Date(project.end_date);
      const durationDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

      // Prepare template data
      const templateData = {
        company_id: companyId,
        name: templateName.trim(),
        description: description.trim() || null,
        project_type: project.project_type,
        is_global: false,
        category: category || 'custom',
        default_budget: project.budget,
        default_duration_days: durationDays > 0 ? durationDays : null,
        budget_breakdown: null, // Could be enhanced to calculate from actual costs
        milestones: includeMilestones ? [] : null, // Could be enhanced to include actual milestones
        default_materials: null, // Could be enhanced to include materials from project
        permit_checklist: includePermits && project.permit_numbers ? project.permit_numbers : null,
        is_active: true,
        use_count: 0
      };

      const { data, error } = await supabase
        .from('project_templates')
        .insert([templateData])
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Template Created',
        description: `"${templateName}" has been saved as a template`,
        duration: 5000
      });

      onOpenChange(false);

      // Reset form
      setTemplateName('');
      setDescription('');
      setCategory('');
    } catch (error: any) {
      console.error('Error saving template:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to save template'
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Save as Template
          </DialogTitle>
          <DialogDescription>
            Save this project as a reusable template for future projects
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Template Name */}
          <div className="space-y-2">
            <Label htmlFor="template-name">Template Name *</Label>
            <Input
              id="template-name"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="Kitchen Remodel Template"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="template-description">Description</Label>
            <Textarea
              id="template-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what this template is for..."
              rows={3}
            />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label htmlFor="template-category">Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="residential_remodel">Residential Remodel</SelectItem>
                <SelectItem value="commercial">Commercial</SelectItem>
                <SelectItem value="outdoor">Outdoor</SelectItem>
                <SelectItem value="addition">Addition</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* What to Include */}
          <div className="space-y-3 pt-2 border-t">
            <Label>What to Include</Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="include-permits"
                  checked={includePermits}
                  onCheckedChange={(checked) => setIncludePermits(checked as boolean)}
                />
                <label
                  htmlFor="include-permits"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Include permit checklist ({project.permit_numbers?.length || 0} permits)
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="include-milestones"
                  checked={includeMilestones}
                  onCheckedChange={(checked) => setIncludeMilestones(checked as boolean)}
                  disabled
                />
                <label
                  htmlFor="include-milestones"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Include project milestones (coming soon)
                </label>
              </div>
            </div>
          </div>

          {/* Template Preview */}
          <div className="space-y-2 pt-2 border-t">
            <Label>Template Will Include:</Label>
            <div className="text-sm space-y-1 bg-muted p-3 rounded-md">
              <div>• Project Type: <span className="font-medium">{project.project_type || 'Not set'}</span></div>
              <div>• Budget: <span className="font-medium">${project.budget?.toLocaleString() || '0'}</span></div>
              <div>• Duration: <span className="font-medium">
                {project.start_date && project.end_date
                  ? `${Math.ceil((new Date(project.end_date).getTime() - new Date(project.start_date).getTime()) / (1000 * 60 * 60 * 24))} days`
                  : 'Not set'}
              </span></div>
              {includePermits && project.permit_numbers && project.permit_numbers.length > 0 && (
                <div>• {project.permit_numbers.length} permit(s)</div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>Saving...</>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Template
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
