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
  FileText,
  Search,
  DollarSign,
  List,
  CheckCircle2,
  Star,
  Sparkles
} from 'lucide-react';

interface EstimateTemplate {
  id: string;
  name: string;
  description: string;
  is_global: boolean;
  category: string;
  default_title: string;
  default_markup_percentage: number;
  default_tax_percentage: number;
  default_terms_and_conditions: string;
  valid_days: number;
  use_count: number;
  line_items?: any[];
}

interface EstimateTemplatesLibraryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectTemplate: (template: EstimateTemplate) => void;
  companyId?: string;
}

export function EstimateTemplatesLibrary({
  open,
  onOpenChange,
  onSelectTemplate,
  companyId
}: EstimateTemplatesLibraryProps) {
  const [templates, setTemplates] = useState<EstimateTemplate[]>([]);
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

      // Load templates with their line items
      let query = supabase
        .from('estimate_templates')
        .select(`
          *,
          line_items:estimate_template_line_items(*)
        `)
        .eq('is_active', true);

      if (companyId) {
        query = query.or(`is_global.eq.true,company_id.eq.${companyId}`);
      } else {
        query = query.eq('is_global', true);
      }

      const { data, error } = await query.order('use_count', { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error: any) {
      console.error('Error loading estimate templates:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load estimate templates'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTemplate = async (template: EstimateTemplate) => {
    try {
      // Increment use count
      await supabase.rpc('increment_estimate_template_use_count', { template_id: template.id });

      onSelectTemplate(template);
      onOpenChange(false);

      toast({
        title: 'Template Applied',
        description: `${template.name} template has been applied`
      });
    } catch (error) {
      console.error('Error applying template:', error);
    }
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      kitchen: 'Kitchen',
      bathroom: 'Bathroom',
      outdoor: 'Outdoor',
      addition: 'Addition',
      custom: 'Custom',
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
            Estimate Templates
          </DialogTitle>
          <DialogDescription>
            Start with a pre-configured estimate template with line items
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
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
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
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {/* Template Info */}
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div className="flex items-center gap-2">
                            <List className="h-4 w-4 text-muted-foreground" />
                            <span className="text-muted-foreground">Line Items:</span>
                            <span className="font-medium">
                              {template.line_items?.length || 0}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                            <span className="text-muted-foreground">Markup:</span>
                            <span className="font-medium">
                              {template.default_markup_percentage}%
                            </span>
                          </div>
                        </div>

                        {/* Template Features */}
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="outline" className="text-xs">
                            Valid {template.valid_days} days
                          </Badge>
                          {template.default_tax_percentage > 0 && (
                            <Badge variant="outline" className="text-xs">
                              Tax {template.default_tax_percentage}%
                            </Badge>
                          )}
                          {template.default_terms_and_conditions && (
                            <Badge variant="outline" className="text-xs">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Terms Included
                            </Badge>
                          )}
                        </div>

                        {/* Line Items Preview */}
                        {template.line_items && template.line_items.length > 0 && (
                          <div className="text-xs text-muted-foreground border-t pt-2">
                            <div className="font-medium mb-1">Includes:</div>
                            <div className="space-y-0.5">
                              {template.line_items.slice(0, 3).map((item: any, idx: number) => (
                                <div key={idx} className="truncate">
                                  • {item.item_name}
                                </div>
                              ))}
                              {template.line_items.length > 3 && (
                                <div className="text-muted-foreground italic">
                                  +{template.line_items.length - 3} more items...
                                </div>
                              )}
                            </div>
                          </div>
                        )}

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
