/**
 * Daily Report Template Manager (US-074)
 * Manage daily report templates stored in localStorage
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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
import { Card, CardContent } from '@/components/ui/card';
import { Edit, Trash2, Save, FileText } from 'lucide-react';

const STORAGE_KEY = 'builddesk-daily-report-templates';

export interface DailyReportTemplate {
  id: string;
  name: string;
  weather_conditions: string;
  crew_count: number;
  equipment_used: string;
  materials_delivered: string;
  work_performed: string;
  created_at: string;
}

function generateUUID(): string {
  return crypto.randomUUID?.() ?? (
    'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    })
  );
}

function loadTemplates(): DailyReportTemplate[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveTemplates(templates: DailyReportTemplate[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
}

const emptyForm: Omit<DailyReportTemplate, 'id' | 'created_at'> = {
  name: '',
  weather_conditions: '',
  crew_count: 0,
  equipment_used: '',
  materials_delivered: '',
  work_performed: '',
};

const DailyReportTemplateManager = () => {
  const [templates, setTemplates] = useState<DailyReportTemplate[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<DailyReportTemplate | null>(null);
  const [formData, setFormData] = useState(emptyForm);

  useEffect(() => {
    setTemplates(loadTemplates());
  }, []);

  const handleOpenEdit = (template: DailyReportTemplate) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      weather_conditions: template.weather_conditions,
      crew_count: template.crew_count,
      equipment_used: template.equipment_used,
      materials_delivered: template.materials_delivered,
      work_performed: template.work_performed,
    });
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingTemplate(null);
    setFormData(emptyForm);
  };

  const handleSave = () => {
    if (!formData.name.trim()) return;

    let updated: DailyReportTemplate[];

    if (editingTemplate) {
      updated = templates.map((t) =>
        t.id === editingTemplate.id
          ? { ...t, ...formData, crew_count: Number(formData.crew_count) }
          : t
      );
    } else {
      const newTemplate: DailyReportTemplate = {
        id: generateUUID(),
        ...formData,
        crew_count: Number(formData.crew_count),
        created_at: new Date().toISOString(),
      };
      updated = [...templates, newTemplate];
    }

    saveTemplates(updated);
    setTemplates(updated);
    handleCloseDialog();
  };

  const handleDelete = (id: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;
    const updated = templates.filter((t) => t.id !== id);
    saveTemplates(updated);
    setTemplates(updated);
  };

  return (
    <div className="space-y-4">
      {templates.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" aria-hidden="true" />
            <p>No templates saved yet.</p>
            <p className="text-sm mt-1">
              Save a template from the Create Report dialog to get started.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {templates.map((template) => (
              <TableRow key={template.id}>
                <TableCell className="font-medium">{template.name}</TableCell>
                <TableCell>
                  {new Date(template.created_at).toLocaleDateString()}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenEdit(template)}
                      aria-label={`Edit template ${template.name}`}
                    >
                      <Edit className="h-4 w-4" aria-hidden="true" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(template.id)}
                      aria-label={`Delete template ${template.name}`}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? 'Edit Template' : 'New Template'}
            </DialogTitle>
            <DialogDescription>
              {editingTemplate
                ? 'Update template fields below.'
                : 'Fill in the template details.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="tpl-name">Template Name *</Label>
              <Input
                id="tpl-name"
                value={formData.name}
                onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                placeholder="e.g., Standard Residential"
              />
            </div>
            <div>
              <Label htmlFor="tpl-weather">Weather Conditions</Label>
              <Input
                id="tpl-weather"
                value={formData.weather_conditions}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, weather_conditions: e.target.value }))
                }
                placeholder="e.g., Sunny, 75F"
              />
            </div>
            <div>
              <Label htmlFor="tpl-crew">Crew Count</Label>
              <Input
                id="tpl-crew"
                type="number"
                min="0"
                value={formData.crew_count}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, crew_count: Number(e.target.value) }))
                }
              />
            </div>
            <div>
              <Label htmlFor="tpl-equipment">Equipment Used</Label>
              <Textarea
                id="tpl-equipment"
                value={formData.equipment_used}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, equipment_used: e.target.value }))
                }
                placeholder="List equipment..."
              />
            </div>
            <div>
              <Label htmlFor="tpl-materials">Materials Delivered</Label>
              <Textarea
                id="tpl-materials"
                value={formData.materials_delivered}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, materials_delivered: e.target.value }))
                }
                placeholder="List materials..."
              />
            </div>
            <div>
              <Label htmlFor="tpl-work">Work Performed</Label>
              <Textarea
                id="tpl-work"
                value={formData.work_performed}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, work_performed: e.target.value }))
                }
                placeholder="Describe work performed..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!formData.name.trim()}>
              <Save className="h-4 w-4 mr-2" aria-hidden="true" />
              {editingTemplate ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DailyReportTemplateManager;
