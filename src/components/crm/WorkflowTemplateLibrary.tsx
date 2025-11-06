import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { workflowTemplates } from '@/data/workflowTemplates';
import { Mail, DollarSign, TrendingUp, RefreshCw, Calendar, FileText } from 'lucide-react';
import { toast } from 'sonner';

interface WorkflowTemplateLibraryProps {
  onSelectTemplate: (template: any) => void;
}

const iconMap: Record<string, any> = {
  Mail,
  DollarSign,
  TrendingUp,
  RefreshCw,
  Calendar,
  FileText
};

const categoryColors: Record<string, string> = {
  lead_nurture: 'bg-blue-500/10 text-blue-500',
  follow_up: 'bg-green-500/10 text-green-500',
  engagement: 'bg-purple-500/10 text-purple-500',
  sales: 'bg-orange-500/10 text-orange-500'
};

export function WorkflowTemplateLibrary({ onSelectTemplate }: WorkflowTemplateLibraryProps) {
  const handleUseTemplate = (template: any) => {
    onSelectTemplate(template);
    toast.success('Template loaded! Customize and save your workflow.');
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Workflow Templates</h2>
        <p className="text-muted-foreground">Start with pre-built automation templates</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {workflowTemplates.map((template) => {
          const Icon = iconMap[template.icon];
          return (
            <Card key={template.id} className="hover:border-primary transition-colors">
              <CardHeader>
                <div className="flex items-start justify-between mb-2">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <Badge className={categoryColors[template.category]} variant="secondary">
                    {template.category.replace('_', ' ')}
                  </Badge>
                </div>
                <CardTitle className="text-lg">{template.name}</CardTitle>
                <CardDescription>{template.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={() => handleUseTemplate(template)}
                  className="w-full"
                  variant="outline"
                >
                  Use Template
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
