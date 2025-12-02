import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Clock, Users, AlertTriangle, FileText, Wrench, CheckCircle, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface WorkflowPhase {
  name: string;
  duration_days: number;
  description: string;
}

interface StandardTask {
  task: string;
  phase: string;
  duration: number;
}

interface RequiredPermit {
  permit_type: string;
  authority: string;
  typical_timeline: string;
}

interface SafetyProtocol {
  protocol: string;
  phase: string;
  requirement: string;
}

interface WorkflowTemplate {
  id: string;
  template_name: string;
  industry_type: string;
  trade_specialization: string | null;
  description: string;
  workflow_phases: WorkflowPhase[];
  standard_tasks: StandardTask[];
  required_permits: RequiredPermit[];
  safety_protocols: SafetyProtocol[];
  typical_duration_days: number | null;
  complexity_level: string | null;
  is_system_template: boolean;
  usage_count: number;
}

export function IndustryWorkflowTemplates() {
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIndustry, setSelectedIndustry] = useState<string>("all");
  const [selectedComplexity, setSelectedComplexity] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<WorkflowTemplate | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('workflow_templates')
        .select('*')
        .eq('is_active', true)
        .order('industry_type, template_name');

      if (error) throw error;
      
      // Transform the data to match our interface
      const transformedData: WorkflowTemplate[] = (data || []).map(item => ({
        id: item.id,
        template_name: item.template_name,
        industry_type: item.industry_type,
        trade_specialization: item.trade_specialization,
        description: item.description,
        workflow_phases: Array.isArray(item.workflow_phases) ? (item.workflow_phases as unknown as WorkflowPhase[]) : [],
        standard_tasks: Array.isArray(item.standard_tasks) ? (item.standard_tasks as unknown as StandardTask[]) : [],
        required_permits: Array.isArray(item.required_permits) ? (item.required_permits as unknown as RequiredPermit[]) : [],
        safety_protocols: Array.isArray(item.safety_protocols) ? (item.safety_protocols as unknown as SafetyProtocol[]) : [],
        typical_duration_days: item.typical_duration_days,
        complexity_level: item.complexity_level,
        is_system_template: item.is_system_template,
        usage_count: item.usage_count,
      }));
      
      setTemplates(transformedData);
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast({
        title: "Error",
        description: "Failed to load workflow templates",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredTemplates = templates.filter(template => {
    const matchesIndustry = selectedIndustry === "all" || template.industry_type === selectedIndustry;
    const matchesComplexity = selectedComplexity === "all" || template.complexity_level === selectedComplexity;
    const matchesSearch = template.template_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.trade_specialization?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesIndustry && matchesComplexity && matchesSearch;
  });

  const groupedTemplates = filteredTemplates.reduce((acc, template) => {
    if (!acc[template.industry_type]) {
      acc[template.industry_type] = [];
    }
    acc[template.industry_type].push(template);
    return acc;
  }, {} as Record<string, WorkflowTemplate[]>);

  const getComplexityColor = (level: string) => {
    switch (level) {
      case 'basic': return 'bg-green-100 text-green-800 border-green-300';
      case 'intermediate': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'advanced': return 'bg-red-100 text-red-800 border-red-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getIndustryIcon = (industry: string) => {
    switch (industry) {
      case 'residential': return '🏠';
      case 'commercial': return '🏢';
      case 'specialty_trades': return '🔧';
      case 'civil': return '🛣️';
      default: return '📋';
    }
  };

  const useTemplate = async (template: WorkflowTemplate) => {
    try {
      // Update usage count
      await supabase
        .from('workflow_templates')
        .update({ usage_count: template.usage_count + 1 })
        .eq('id', template.id);

      toast({
        title: "Template Selected",
        description: `${template.template_name} is ready to use for your next project`,
      });

      // Here you would typically navigate to project creation with this template
    } catch (error) {
      console.error('Error using template:', error);
      toast({
        title: "Error",
        description: "Failed to apply template",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-muted rounded animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-48 bg-muted rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-foreground">Industry Workflow Templates</h2>
        <p className="text-muted-foreground">
          Pre-built workflows for residential, commercial, and specialty trade projects
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search templates..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={selectedIndustry} onValueChange={setSelectedIndustry}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Filter by industry" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Industries</SelectItem>
            <SelectItem value="residential">Residential</SelectItem>
            <SelectItem value="commercial">Commercial</SelectItem>
            <SelectItem value="specialty_trades">Specialty Trades</SelectItem>
            <SelectItem value="civil">Civil/Infrastructure</SelectItem>
          </SelectContent>
        </Select>
        <Select value={selectedComplexity} onValueChange={setSelectedComplexity}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Filter by complexity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Levels</SelectItem>
            <SelectItem value="basic">Basic</SelectItem>
            <SelectItem value="intermediate">Intermediate</SelectItem>
            <SelectItem value="advanced">Advanced</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Template Grid */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all">All ({filteredTemplates.length})</TabsTrigger>
          <TabsTrigger value="residential">
            Residential ({groupedTemplates.residential?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="commercial">
            Commercial ({groupedTemplates.commercial?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="specialty_trades">
            Specialty ({groupedTemplates.specialty_trades?.length || 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTemplates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                onView={setSelectedTemplate}
                onUse={useTemplate}
                getComplexityColor={getComplexityColor}
                getIndustryIcon={getIndustryIcon}
              />
            ))}
          </div>
        </TabsContent>

        {Object.entries(groupedTemplates).map(([industry, industryTemplates]) => (
          <TabsContent key={industry} value={industry} className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {industryTemplates.map((template) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  onView={setSelectedTemplate}
                  onUse={useTemplate}
                  getComplexityColor={getComplexityColor}
                  getIndustryIcon={getIndustryIcon}
                />
              ))}
            </div>
          </TabsContent>
        ))}
      </Tabs>

      {/* Template Details Dialog */}
      {selectedTemplate && (
        <TemplateDetailsDialog
          template={selectedTemplate}
          open={!!selectedTemplate}
          onOpenChange={() => setSelectedTemplate(null)}
          onUse={() => useTemplate(selectedTemplate)}
        />
      )}
    </div>
  );
}

interface TemplateCardProps {
  template: WorkflowTemplate;
  onView: (template: WorkflowTemplate) => void;
  onUse: (template: WorkflowTemplate) => void;
  getComplexityColor: (level: string) => string;
  getIndustryIcon: (industry: string) => string;
}

function TemplateCard({ template, onView, onUse, getComplexityColor, getIndustryIcon }: TemplateCardProps) {
  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{getIndustryIcon(template.industry_type)}</span>
            <Badge className={getComplexityColor(template.complexity_level)}>
              {template.complexity_level}
            </Badge>
          </div>
          {template.is_system_template && (
            <Badge variant="outline" className="text-xs">
              System
            </Badge>
          )}
        </div>
        <CardTitle className="text-lg">{template.template_name}</CardTitle>
        <CardDescription className="text-sm">
          {template.description}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>{template.typical_duration_days} days</span>
            </div>
            <div className="flex items-center gap-1">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span>{template.usage_count} uses</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="capitalize">{template.trade_specialization?.replace('_', ' ')}</span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="flex items-center gap-1">
              <CheckCircle className="h-3 w-3 text-green-600" />
              <span>{template.workflow_phases?.length || 0} phases</span>
            </div>
            <div className="flex items-center gap-1">
              <FileText className="h-3 w-3 text-blue-600" />
              <span>{template.required_permits?.length || 0} permits</span>
            </div>
            <div className="flex items-center gap-1">
              <AlertTriangle className="h-3 w-3 text-orange-600" />
              <span>{template.safety_protocols?.length || 0} safety</span>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onView(template)}
              className="flex-1"
            >
              View Details
            </Button>
            <Button
              size="sm"
              onClick={() => onUse(template)}
              className="flex-1"
            >
              Use Template
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface TemplateDetailsDialogProps {
  template: WorkflowTemplate;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUse: () => void;
}

function TemplateDetailsDialog({ template, open, onOpenChange, onUse }: TemplateDetailsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-2xl">{template.industry_type === 'residential' ? '🏠' : 
                                      template.industry_type === 'commercial' ? '🏢' : 
                                      template.industry_type === 'specialty_trades' ? '🔧' : '📋'}</span>
            {template.template_name}
          </DialogTitle>
          <DialogDescription>
            {template.description}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-6">
            {/* Overview */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{template.typical_duration_days}</div>
                <div className="text-sm text-muted-foreground">Days</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{template.workflow_phases?.length || 0}</div>
                <div className="text-sm text-muted-foreground">Phases</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{template.standard_tasks?.length || 0}</div>
                <div className="text-sm text-muted-foreground">Tasks</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{template.usage_count}</div>
                <div className="text-sm text-muted-foreground">Uses</div>
              </div>
            </div>

            <Separator />

            {/* Workflow Phases */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Workflow Phases</h3>
              <div className="space-y-3">
                {template.workflow_phases?.map((phase, index) => (
                  <div key={index} className="border rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-medium">{phase.name}</h4>
                      <Badge variant="outline">{phase.duration_days} days</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{phase.description}</p>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Required Permits */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Required Permits</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {template.required_permits?.map((permit, index) => (
                  <div key={index} className="border rounded-lg p-3">
                    <h4 className="font-medium">{permit.permit_type}</h4>
                    <p className="text-sm text-muted-foreground">Authority: {permit.authority}</p>
                    <p className="text-xs text-muted-foreground">Timeline: {permit.typical_timeline}</p>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Safety Protocols */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Safety Protocols</h3>
              <div className="space-y-2">
                {template.safety_protocols?.map((protocol, index) => (
                  <div key={index} className="border rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <AlertTriangle className="h-4 w-4 text-orange-600" />
                      <h4 className="font-medium">{protocol.protocol}</h4>
                    </div>
                    <p className="text-sm text-muted-foreground">Phase: {protocol.phase}</p>
                    <p className="text-xs text-muted-foreground">Requirement: {protocol.requirement}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </ScrollArea>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button onClick={onUse}>
            Use This Template
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}