/**
 * Daily Report Template Manager
 * Create, edit, and manage daily report templates
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Plus,
  Edit,
  Trash2,
  Save,
  Users,
  CheckSquare,
  Package,
  Wrench,
  Shield,
  Camera,
  Loader2,
  FileText,
} from 'lucide-react';
import { useDailyReportTemplates, DailyReportTemplate } from '@/hooks/useDailyReportTemplates';

interface TemplateFormData {
  name: string;
  description: string;
  default_crew_count: number | null;
  default_weather_conditions: string;
  default_safety_notes: string;
  include_crew_section: boolean;
  include_tasks_section: boolean;
  include_materials_section: boolean;
  include_equipment_section: boolean;
  include_safety_section: boolean;
  include_photos_section: boolean;
  auto_populate_crew: boolean;
  auto_populate_tasks: boolean;
  auto_populate_weather: boolean;
  auto_populate_materials: boolean;
  auto_populate_equipment: boolean;
  project_type: string;
}

const defaultFormData: TemplateFormData = {
  name: '',
  description: '',
  default_crew_count: null,
  default_weather_conditions: '',
  default_safety_notes: '',
  include_crew_section: true,
  include_tasks_section: true,
  include_materials_section: true,
  include_equipment_section: true,
  include_safety_section: true,
  include_photos_section: true,
  auto_populate_crew: true,
  auto_populate_tasks: true,
  auto_populate_weather: true,
  auto_populate_materials: false,
  auto_populate_equipment: false,
  project_type: '',
};

const DailyReportTemplateManager = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<DailyReportTemplate | null>(null);
  const [formData, setFormData] = useState<TemplateFormData>(defaultFormData);

  const {
    templates,
    loadingTemplates,
    creatingTemplate,
    updatingTemplate,
    deletingTemplate,
    createTemplate,
    updateTemplate,
    deleteTemplate,
  } = useDailyReportTemplates();

  const handleOpenDialog = (template?: DailyReportTemplate) => {
    if (template) {
      setEditingTemplate(template);
      setFormData({
        name: template.name,
        description: template.description || '',
        default_crew_count: template.default_crew_count,
        default_weather_conditions: template.default_weather_conditions || '',
        default_safety_notes: template.default_safety_notes || '',
        include_crew_section: template.include_crew_section,
        include_tasks_section: template.include_tasks_section,
        include_materials_section: template.include_materials_section,
        include_equipment_section: template.include_equipment_section,
        include_safety_section: template.include_safety_section,
        include_photos_section: template.include_photos_section,
        auto_populate_crew: template.auto_populate_crew,
        auto_populate_tasks: template.auto_populate_tasks,
        auto_populate_weather: template.auto_populate_weather,
        auto_populate_materials: template.auto_populate_materials,
        auto_populate_equipment: template.auto_populate_equipment,
        project_type: template.project_type || '',
      });
    } else {
      setEditingTemplate(null);
      setFormData(defaultFormData);
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingTemplate(null);
    setFormData(defaultFormData);
  };

  const handleSubmit = () => {
    if (editingTemplate) {
      updateTemplate(
        { id: editingTemplate.id, updates: formData },
        {
          onSuccess: () => handleCloseDialog(),
        }
      );
    } else {
      createTemplate(formData, {
        onSuccess: () => handleCloseDialog(),
      });
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this template?')) {
      deleteTemplate(id);
    }
  };

  const SectionToggle = ({
    icon: Icon,
    label,
    includeKey,
    autoPopulateKey,
  }: {
    icon: any;
    label: string;
    includeKey: keyof TemplateFormData;
    autoPopulateKey: keyof TemplateFormData;
  }) => (
    <div className="flex items-center justify-between p-3 border rounded-lg">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <span className="font-medium">{label}</span>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Label htmlFor={`include-${includeKey}`} className="text-sm">
            Include
          </Label>
          <Switch
            id={`include-${includeKey}`}
            checked={formData[includeKey] as boolean}
            onCheckedChange={(checked) =>
              setFormData((prev) => ({ ...prev, [includeKey]: checked }))
            }
          />
        </div>
        {formData[includeKey] && (
          <div className="flex items-center gap-2">
            <Label htmlFor={`auto-${autoPopulateKey}`} className="text-sm">
              Auto-fill
            </Label>
            <Switch
              id={`auto-${autoPopulateKey}`}
              checked={formData[autoPopulateKey] as boolean}
              onCheckedChange={(checked) =>
                setFormData((prev) => ({ ...prev, [autoPopulateKey]: checked }))
              }
            />
          </div>
        )}
      </div>
    </div>
  );

  if (loadingTemplates) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-construction-orange" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Daily Report Templates</h2>
          <p className="text-muted-foreground">
            Create reusable templates with auto-population settings
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="bg-construction-orange">
          <Plus className="mr-2 h-4 w-4" />
          New Template
        </Button>
      </div>

      {/* Templates List */}
      {templates.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No templates created yet</p>
            <p className="text-sm mt-1">Create a template to speed up daily report creation</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Your Templates</CardTitle>
            <CardDescription>{templates.length} templates available</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Template Name</TableHead>
                  <TableHead>Project Type</TableHead>
                  <TableHead>Sections</TableHead>
                  <TableHead>Auto-fill</TableHead>
                  <TableHead>Usage</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.map((template) => {
                  const sections = [
                    template.include_crew_section && 'Crew',
                    template.include_tasks_section && 'Tasks',
                    template.include_materials_section && 'Materials',
                    template.include_equipment_section && 'Equipment',
                    template.include_safety_section && 'Safety',
                    template.include_photos_section && 'Photos',
                  ].filter(Boolean);

                  const autoFills = [
                    template.auto_populate_crew && 'Crew',
                    template.auto_populate_tasks && 'Tasks',
                    template.auto_populate_weather && 'Weather',
                    template.auto_populate_materials && 'Materials',
                    template.auto_populate_equipment && 'Equipment',
                  ].filter(Boolean);

                  return (
                    <TableRow key={template.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{template.name}</div>
                          {template.description && (
                            <div className="text-sm text-muted-foreground">
                              {template.description}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {template.project_type ? (
                          <Badge variant="secondary">{template.project_type}</Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">All Types</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{sections.join(', ')}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{autoFills.join(', ')}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{template.use_count} uses</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenDialog(template)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(template.id)}
                            disabled={deletingTemplate}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? 'Edit Template' : 'Create New Template'}
            </DialogTitle>
            <DialogDescription>
              Configure template sections and auto-population settings
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Basic Info */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Template Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Residential Construction Daily Report"
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, description: e.target.value }))
                  }
                  placeholder="Optional description of when to use this template"
                  rows={2}
                />
              </div>

              <div>
                <Label htmlFor="project_type">Project Type</Label>
                <Input
                  id="project_type"
                  value={formData.project_type}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, project_type: e.target.value }))
                  }
                  placeholder="e.g., Residential, Commercial, Renovation"
                />
              </div>
            </div>

            {/* Sections Configuration */}
            <div className="space-y-3">
              <Label>Sections & Auto-fill Settings</Label>
              <SectionToggle
                icon={Users}
                label="Crew Members"
                includeKey="include_crew_section"
                autoPopulateKey="auto_populate_crew"
              />
              <SectionToggle
                icon={CheckSquare}
                label="Task Progress"
                includeKey="include_tasks_section"
                autoPopulateKey="auto_populate_tasks"
              />
              <SectionToggle
                icon={Package}
                label="Materials"
                includeKey="include_materials_section"
                autoPopulateKey="auto_populate_materials"
              />
              <SectionToggle
                icon={Wrench}
                label="Equipment"
                includeKey="include_equipment_section"
                autoPopulateKey="auto_populate_equipment"
              />
              <SectionToggle
                icon={Shield}
                label="Safety Checklist"
                includeKey="include_safety_section"
                autoPopulateKey="auto_populate_weather"
              />
              <SectionToggle
                icon={Camera}
                label="Photos"
                includeKey="include_photos_section"
                autoPopulateKey="auto_populate_weather"
              />
            </div>

            {/* Default Values */}
            <div className="space-y-4">
              <Label>Default Values (Optional)</Label>
              <div>
                <Label htmlFor="default_crew_count" className="text-sm">
                  Expected Crew Count
                </Label>
                <Input
                  id="default_crew_count"
                  type="number"
                  value={formData.default_crew_count || ''}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      default_crew_count: e.target.value ? parseInt(e.target.value) : null,
                    }))
                  }
                  placeholder="e.g., 5"
                />
              </div>

              <div>
                <Label htmlFor="default_safety_notes" className="text-sm">
                  Default Safety Notes
                </Label>
                <Textarea
                  id="default_safety_notes"
                  value={formData.default_safety_notes}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, default_safety_notes: e.target.value }))
                  }
                  placeholder="Standard safety reminders for this project type"
                  rows={2}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!formData.name || creatingTemplate || updatingTemplate}
              className="bg-construction-orange"
            >
              {creatingTemplate || updatingTemplate ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  {editingTemplate ? 'Update Template' : 'Create Template'}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DailyReportTemplateManager;
