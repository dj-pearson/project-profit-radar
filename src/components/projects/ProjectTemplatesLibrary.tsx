import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Building2,
  Home,
  Wrench,
  Briefcase,
  Search,
  Clock,
  DollarSign,
  CheckCircle2,
  Star,
  Sparkles
} from 'lucide-react';

interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  project_type: string;
  is_global: boolean;
  category: string;
  default_budget: number;
  default_duration_days: number;
  budget_breakdown: any;
  milestones: any[];
  default_materials: any[];
  permit_checklist: string[];
  use_count: number;
}

interface ProjectTemplatesLibraryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectTemplate: (template: ProjectTemplate) => void;
  companyId?: string;
}

export function ProjectTemplatesLibrary({
  open,
  onOpenChange,
  onSelectTemplate,
  companyId
}: ProjectTemplatesLibraryProps) {
  const [templates, setTemplates] = useState<ProjectTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      loadTemplates();
    }
  }, [open, companyId]);

  const loadTemplates = async () => {
    try {
      setLoading(true);

      // Load global templates and company templates
      let query = supabase
        .from('project_templates')
        .select('*')
        .eq('is_active', true);

      // If company_id exists, get both global and company templates
      if (companyId) {
        query = query.or(`is_global.eq.true,company_id.eq.${companyId}`);
      } else {
        query = query.eq('is_global', true);
      }

      const { data, error } = await query.order('use_count', { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error: any) {
      console.error('Error loading templates:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load project templates'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTemplate = async (template: ProjectTemplate) => {
    try {
      // Increment use count
      await supabase.rpc('increment_template_use_count', { template_id: template.id });

      onSelectTemplate(template);
      onOpenChange(false);

      toast({
        title: 'Template Applied',
        description: `${template.name} template has been applied to your project`
      });
    } catch (error) {
      console.error('Error applying template:', error);
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'residential_remodel':
        return <Home className="h-5 w-5" />;
      case 'commercial':
        return <Briefcase className="h-5 w-5" />;
      case 'outdoor':
        return <Building2 className="h-5 w-5" />;
      case 'addition':
        return <Home className="h-5 w-5" />;
      default:
        return <Wrench className="h-5 w-5" />;
    }
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      residential_remodel: 'Residential Remodel',
      commercial: 'Commercial',
      outdoor: 'Outdoor',
      addition: 'Addition',
      all: 'All Templates'
    };
    return labels[category] || category;
  };

  const categories = Array.from(new Set(templates.map(t => t.category))).filter(Boolean);

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = !searchTerm ||
      template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      template.description?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Project Templates
          </DialogTitle>
          <DialogDescription>
            Start your project with a pre-configured template to save time
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search templates..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Category Tabs */}
          <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="flex-1 overflow-hidden flex flex-col">
            <TabsList className="w-full justify-start overflow-x-auto">
              <TabsTrigger value="all">All ({templates.length})</TabsTrigger>
              {categories.map(category => (
                <TabsTrigger key={category} value={category}>
                  {getCategoryLabel(category)} ({templates.filter(t => t.category === category).length})
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value={selectedCategory} className="flex-1 overflow-y-auto mt-4">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Loading templates...</p>
                  </div>
                </div>
              ) : filteredTemplates.length === 0 ? (
                <div className="text-center py-12">
                  <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No templates found</h3>
                  <p className="text-muted-foreground">
                    {searchTerm ? 'Try adjusting your search' : 'No templates available in this category'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4">
                  {filteredTemplates.map((template) => (
                    <Card
                      key={template.id}
                      className="hover:shadow-md transition-shadow cursor-pointer group"
                      onClick={() => handleSelectTemplate(template)}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            <div className="text-primary mt-1">
                              {getCategoryIcon(template.category)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <CardTitle className="text-base leading-tight flex items-center gap-2">
                                {template.name}
                                {template.is_global && (
                                  <Badge variant="secondary" className="text-xs">
                                    <Star className="h-3 w-3 mr-1" />
                                    Featured
                                  </Badge>
                                )}
                              </CardTitle>
                              <CardDescription className="text-sm mt-1 line-clamp-2">
                                {template.description}
                              </CardDescription>
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {/* Key Metrics */}
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                            <span className="text-muted-foreground">Budget:</span>
                            <span className="font-medium">
                              ${template.default_budget?.toLocaleString() || '—'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span className="text-muted-foreground">Duration:</span>
                            <span className="font-medium">
                              {template.default_duration_days || '—'} days
                            </span>
                          </div>
                        </div>

                        {/* Template Features */}
                        <div className="flex flex-wrap gap-2">
                          {template.milestones && template.milestones.length > 0 && (
                            <Badge variant="outline" className="text-xs">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              {template.milestones.length} Milestones
                            </Badge>
                          )}
                          {template.default_materials && template.default_materials.length > 0 && (
                            <Badge variant="outline" className="text-xs">
                              {template.default_materials.length} Materials
                            </Badge>
                          )}
                          {template.permit_checklist && template.permit_checklist.length > 0 && (
                            <Badge variant="outline" className="text-xs">
                              {template.permit_checklist.length} Permits
                            </Badge>
                          )}
                        </div>

                        {/* Use Count */}
                        {template.use_count > 0 && (
                          <div className="text-xs text-muted-foreground">
                            Used {template.use_count} {template.use_count === 1 ? 'time' : 'times'}
                          </div>
                        )}

                        {/* Hover Action */}
                        <div className="pt-2 border-t opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="default" size="sm" className="w-full">
                            Use This Template
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        <div className="flex justify-between items-center pt-4 border-t">
          <p className="text-sm text-muted-foreground">
            {filteredTemplates.length} {filteredTemplates.length === 1 ? 'template' : 'templates'} available
          </p>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
