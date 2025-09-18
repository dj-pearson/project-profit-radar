import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { FileText, Save, Plus, Star, Clock, Copy } from 'lucide-react';
import { SmartFormInput } from './SmartFormInput';
import { toast } from 'sonner';

interface TemplateBasedEntryProps {
  onSave: (data: TemplateEntryData) => void;
  onCancel: () => void;
  category?: string;
  projectId?: string;
}

interface TemplateEntryData {
  templateId?: string;
  templateName?: string;
  category: string;
  fields: Record<string, any>;
  isTemplate?: boolean;
}

interface Template {
  id: string;
  name: string;
  category: string;
  description: string;
  fields: TemplateField[];
  usageCount: number;
  lastUsed: Date;
  isFavorite: boolean;
}

interface TemplateField {
  id: string;
  name: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'textarea' | 'date';
  required: boolean;
  defaultValue?: any;
  options?: string[];
  placeholder?: string;
}

// Predefined templates for common construction tasks
const defaultTemplates: Template[] = [
  {
    id: 'daily-progress',
    name: 'Daily Progress Report',
    category: 'Reports',
    description: 'Standard daily progress report template',
    fields: [
      { id: 'date', name: 'date', label: 'Date', type: 'date', required: true },
      { id: 'weather', name: 'weather', label: 'Weather Conditions', type: 'select', required: true, options: ['Clear', 'Cloudy', 'Rain', 'Snow', 'Windy'] },
      { id: 'crew_size', name: 'crew_size', label: 'Crew Size', type: 'number', required: true },
      { id: 'work_completed', name: 'work_completed', label: 'Work Completed', type: 'textarea', required: true, placeholder: 'Describe work completed today...' },
      { id: 'issues', name: 'issues', label: 'Issues/Delays', type: 'textarea', required: false, placeholder: 'Any issues or delays encountered...' },
      { id: 'next_day_plan', name: 'next_day_plan', label: 'Next Day Plan', type: 'textarea', required: false, placeholder: 'Plan for tomorrow...' }
    ],
    usageCount: 45,
    lastUsed: new Date('2024-01-15'),
    isFavorite: true
  },
  {
    id: 'material-delivery',
    name: 'Material Delivery Log',
    category: 'Logistics',
    description: 'Track material deliveries to the job site',
    fields: [
      { id: 'supplier', name: 'supplier', label: 'Supplier', type: 'text', required: true },
      { id: 'material_type', name: 'material_type', label: 'Material Type', type: 'select', required: true, options: ['Concrete', 'Steel', 'Lumber', 'Electrical', 'Plumbing', 'Other'] },
      { id: 'quantity', name: 'quantity', label: 'Quantity', type: 'number', required: true },
      { id: 'unit', name: 'unit', label: 'Unit', type: 'select', required: true, options: ['pcs', 'lbs', 'tons', 'cubic yards', 'linear feet', 'square feet'] },
      { id: 'delivery_time', name: 'delivery_time', label: 'Delivery Time', type: 'text', required: false, placeholder: '9:00 AM' },
      { id: 'condition', name: 'condition', label: 'Condition', type: 'select', required: true, options: ['Good', 'Damaged', 'Partial Delivery'] },
      { id: 'notes', name: 'notes', label: 'Notes', type: 'textarea', required: false, placeholder: 'Additional notes...' }
    ],
    usageCount: 32,
    lastUsed: new Date('2024-01-12'),
    isFavorite: false
  },
  {
    id: 'safety-inspection',
    name: 'Safety Inspection Checklist',
    category: 'Safety',
    description: 'Daily safety inspection checklist',
    fields: [
      { id: 'inspector', name: 'inspector', label: 'Inspector Name', type: 'text', required: true },
      { id: 'area', name: 'area', label: 'Area Inspected', type: 'text', required: true },
      { id: 'ppe_compliance', name: 'ppe_compliance', label: 'PPE Compliance', type: 'select', required: true, options: ['Compliant', 'Non-Compliant', 'Partial'] },
      { id: 'hazards_identified', name: 'hazards_identified', label: 'Hazards Identified', type: 'textarea', required: false, placeholder: 'List any hazards found...' },
      { id: 'corrective_actions', name: 'corrective_actions', label: 'Corrective Actions', type: 'textarea', required: false, placeholder: 'Actions taken or required...' },
      { id: 'overall_rating', name: 'overall_rating', label: 'Overall Safety Rating', type: 'select', required: true, options: ['Excellent', 'Good', 'Fair', 'Poor'] }
    ],
    usageCount: 28,
    lastUsed: new Date('2024-01-10'),
    isFavorite: true
  },
  {
    id: 'quality-control',
    name: 'Quality Control Check',
    category: 'Quality',
    description: 'Standard quality control inspection',
    fields: [
      { id: 'work_type', name: 'work_type', label: 'Work Type', type: 'select', required: true, options: ['Concrete Pour', 'Framing', 'Electrical', 'Plumbing', 'Drywall', 'Finishing'] },
      { id: 'location', name: 'location', label: 'Location', type: 'text', required: true, placeholder: 'Floor 2, Room 201' },
      { id: 'specifications_met', name: 'specifications_met', label: 'Specifications Met', type: 'select', required: true, options: ['Yes', 'No', 'Partial'] },
      { id: 'defects_found', name: 'defects_found', label: 'Defects Found', type: 'textarea', required: false, placeholder: 'Describe any defects or issues...' },
      { id: 'approval_status', name: 'approval_status', label: 'Approval Status', type: 'select', required: true, options: ['Approved', 'Rejected', 'Conditional'] },
      { id: 'follow_up_required', name: 'follow_up_required', label: 'Follow-up Required', type: 'select', required: false, options: ['Yes', 'No'] }
    ],
    usageCount: 21,
    lastUsed: new Date('2024-01-08'),
    isFavorite: false
  }
];

export const TemplateBasedEntry: React.FC<TemplateBasedEntryProps> = ({
  onSave,
  onCancel,
  category,
  projectId
}) => {
  const [templates, setTemplates] = useState<Template[]>(defaultTemplates);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [showCreateTemplate, setShowCreateTemplate] = useState(false);
  const [templateName, setTemplateName] = useState('');

  // Filter templates by category if provided
  const filteredTemplates = category 
    ? templates.filter(t => t.category.toLowerCase() === category.toLowerCase())
    : templates;

  // Sort templates by favorites first, then usage count
  const sortedTemplates = filteredTemplates.sort((a, b) => {
    if (a.isFavorite && !b.isFavorite) return -1;
    if (!a.isFavorite && b.isFavorite) return 1;
    return b.usageCount - a.usageCount;
  });

  const selectTemplate = (template: Template) => {
    setSelectedTemplate(template);
    
    // Initialize form with default values
    const initialData: Record<string, any> = {};
    template.fields.forEach(field => {
      if (field.defaultValue !== undefined) {
        initialData[field.name] = field.defaultValue;
      } else if (field.type === 'date') {
        initialData[field.name] = new Date().toISOString().split('T')[0];
      }
    });
    setFormData(initialData);

    // Update usage statistics
    const updatedTemplates = templates.map(t => 
      t.id === template.id 
        ? { ...t, usageCount: t.usageCount + 1, lastUsed: new Date() }
        : t
    );
    setTemplates(updatedTemplates);
    
    // Save to localStorage
    localStorage.setItem('entry-templates', JSON.stringify(updatedTemplates));
  };

  const toggleFavorite = (templateId: string) => {
    const updatedTemplates = templates.map(t => 
      t.id === templateId ? { ...t, isFavorite: !t.isFavorite } : t
    );
    setTemplates(updatedTemplates);
    localStorage.setItem('entry-templates', JSON.stringify(updatedTemplates));
  };

  const updateField = (fieldName: string, value: any) => {
    setFormData(prev => ({ ...prev, [fieldName]: value }));
  };

  const handleSave = () => {
    if (!selectedTemplate) return;

    // Validate required fields
    const missingFields = selectedTemplate.fields
      .filter(field => field.required && !formData[field.name])
      .map(field => field.label);

    if (missingFields.length > 0) {
      toast.error(`Please fill in: ${missingFields.join(', ')}`);
      return;
    }

    const entryData: TemplateEntryData = {
      templateId: selectedTemplate.id,
      templateName: selectedTemplate.name,
      category: selectedTemplate.category,
      fields: formData
    };

    onSave(entryData);
  };

  const saveAsTemplate = () => {
    if (!templateName.trim()) {
      toast.error('Please enter a template name');
      return;
    }

    if (!selectedTemplate) return;

    const newTemplate: Template = {
      id: `custom-${Date.now()}`,
      name: templateName,
      category: selectedTemplate.category,
      description: `Custom template based on ${selectedTemplate.name}`,
      fields: selectedTemplate.fields.map(field => ({
        ...field,
        defaultValue: formData[field.name]
      })),
      usageCount: 0,
      lastUsed: new Date(),
      isFavorite: false
    };

    const updatedTemplates = [...templates, newTemplate];
    setTemplates(updatedTemplates);
    localStorage.setItem('entry-templates', JSON.stringify(updatedTemplates));
    
    setShowCreateTemplate(false);
    setTemplateName('');
    toast.success('Template saved successfully');
  };

  // Load templates from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('entry-templates');
    if (stored) {
      try {
        const storedTemplates = JSON.parse(stored);
        setTemplates([...defaultTemplates, ...storedTemplates.filter((t: Template) => t.id.startsWith('custom-'))]);
      } catch (error) {
        console.error('Error loading templates:', error);
      }
    }
  }, []);

  if (!selectedTemplate) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Choose Entry Template
          </CardTitle>
          <p className="text-muted-foreground">
            Select a template to quickly fill out common forms and reports
          </p>
        </CardHeader>
        
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sortedTemplates.map((template) => (
              <Card key={template.id} className="cursor-pointer hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{template.name}</CardTitle>
                      <Badge variant="secondary" className="mt-1">
                        {template.category}
                      </Badge>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={template.isFavorite ? "text-yellow-500" : ""}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(template.id);
                      }}
                    >
                      <Star className={`h-4 w-4 ${template.isFavorite ? 'fill-current' : ''}`} />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-sm text-muted-foreground mb-3">
                    {template.description}
                  </p>
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Used {template.usageCount} times
                    </span>
                    <span>
                      {template.fields.length} fields
                    </span>
                  </div>
                  <Button 
                    onClick={() => selectTemplate(template)}
                    className="w-full"
                    size="sm"
                  >
                    Use Template
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
          
          <div className="flex justify-center mt-6">
            <Button onClick={onCancel} variant="outline">
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {selectedTemplate.name}
            </CardTitle>
            <p className="text-muted-foreground">{selectedTemplate.description}</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCreateTemplate(!showCreateTemplate)}
            >
              <Copy className="h-4 w-4 mr-2" />
              Save as Template
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedTemplate(null)}
            >
              Choose Different
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {showCreateTemplate && (
          <Card className="p-4 bg-muted/50">
            <div className="flex gap-2">
              <Input
                placeholder="Template name"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
              />
              <Button onClick={saveAsTemplate} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Save
              </Button>
              <Button 
                onClick={() => setShowCreateTemplate(false)} 
                variant="outline" 
                size="sm"
              >
                Cancel
              </Button>
            </div>
          </Card>
        )}

        <form className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {selectedTemplate.fields.map((field) => (
              <div key={field.id} className={field.type === 'textarea' ? 'md:col-span-2' : ''}>
                {field.type === 'text' ? (
                  <SmartFormInput
                    label={field.label + (field.required ? ' *' : '')}
                    value={formData[field.name] || ''}
                    onChange={(value) => updateField(field.name, value)}
                    placeholder={field.placeholder}
                    storageKey={`${selectedTemplate.id}-${field.name}`}
                  />
                ) : field.type === 'number' ? (
                  <div>
                    <Label>{field.label}{field.required && ' *'}</Label>
                    <Input
                      type="number"
                      value={formData[field.name] || ''}
                      onChange={(e) => updateField(field.name, e.target.value)}
                      placeholder={field.placeholder}
                    />
                  </div>
                ) : field.type === 'select' ? (
                  <div>
                    <Label>{field.label}{field.required && ' *'}</Label>
                    <Select 
                      value={formData[field.name] || ''} 
                      onValueChange={(value) => updateField(field.name, value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={`Select ${field.label.toLowerCase()}`} />
                      </SelectTrigger>
                      <SelectContent>
                        {field.options?.map((option) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : field.type === 'textarea' ? (
                  <div>
                    <Label>{field.label}{field.required && ' *'}</Label>
                    <Textarea
                      value={formData[field.name] || ''}
                      onChange={(e) => updateField(field.name, e.target.value)}
                      placeholder={field.placeholder}
                      rows={3}
                    />
                  </div>
                ) : field.type === 'date' ? (
                  <div>
                    <Label>{field.label}{field.required && ' *'}</Label>
                    <Input
                      type="date"
                      value={formData[field.name] || ''}
                      onChange={(e) => updateField(field.name, e.target.value)}
                    />
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </form>

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