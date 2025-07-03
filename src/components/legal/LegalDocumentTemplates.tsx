import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  FileText, 
  Download, 
  Edit, 
  Copy, 
  Star,
  Search,
  Plus,
  Eye,
  Save,
  Building,
  Users,
  Hammer,
  Shield,
  DollarSign
} from 'lucide-react';

interface LegalTemplate {
  id: string;
  name: string;
  category: 'contracts' | 'forms' | 'agreements' | 'notices' | 'policies' | 'compliance';
  template_type: string;
  description: string;
  content: string;
  variables: TemplateVariable[];
  usage_count: number;
  last_used: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  is_favorite: boolean;
  industry_specific: boolean;
  compliance_related: boolean;
  preview_url?: string;
}

interface TemplateVariable {
  name: string;
  description: string;
  type: 'text' | 'number' | 'date' | 'currency' | 'boolean';
  required: boolean;
  default_value?: string;
  options?: string[];
}

interface GeneratedDocument {
  id: string;
  template_id: string;
  template_name: string;
  generated_content: string;
  variables_used: Record<string, any>;
  generated_by: string;
  generated_at: string;
  project_id?: string;
  client_name?: string;
  status: 'draft' | 'finalized' | 'sent' | 'signed';
}

const LegalDocumentTemplates = () => {
  const { userProfile } = useAuth();
  const [templates, setTemplates] = useState<LegalTemplate[]>([]);
  const [generatedDocs, setGeneratedDocs] = useState<GeneratedDocument[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<LegalTemplate | null>(null);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [templateVariables, setTemplateVariables] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadLegalTemplates();
    loadGeneratedDocuments();
  }, []);

  const loadLegalTemplates = async () => {
    try {
      // Mock legal templates data
      const mockTemplates: LegalTemplate[] = [
        {
          id: '1',
          name: 'Construction Contract Agreement',
          category: 'contracts',
          template_type: 'Service Contract',
          description: 'Standard construction service contract with payment terms, scope of work, and completion deadlines',
          content: `CONSTRUCTION CONTRACT AGREEMENT

This Construction Contract Agreement ("Agreement") is entered into on {{contract_date}} between {{contractor_name}}, a {{contractor_entity_type}} ("Contractor"), and {{client_name}}, a {{client_entity_type}} ("Client").

PROJECT DETAILS:
Project Name: {{project_name}}
Project Address: {{project_address}}
Project Description: {{project_description}}

SCOPE OF WORK:
{{scope_of_work}}

CONTRACT AMOUNT:
Total Contract Price: {{contract_amount}}
Payment Schedule: {{payment_schedule}}

TIMELINE:
Start Date: {{start_date}}
Completion Date: {{completion_date}}

TERMS AND CONDITIONS:
1. The Contractor agrees to provide all labor, materials, equipment, and services necessary for completion of the project.
2. All work shall be performed in accordance with applicable building codes and regulations.
3. Payment shall be made according to the agreed schedule upon completion of specified milestones.
4. Any changes to the scope of work must be documented in writing and signed by both parties.

IN WITNESS WHEREOF, the parties have executed this Agreement on the date first written above.

Contractor: _________________ Date: _________
{{contractor_name}}

Client: _________________ Date: _________
{{client_name}}`,
          variables: [
            { name: 'contract_date', description: 'Date of contract execution', type: 'date', required: true },
            { name: 'contractor_name', description: 'Name of contracting company', type: 'text', required: true },
            { name: 'contractor_entity_type', description: 'Type of business entity', type: 'text', required: true, options: ['Corporation', 'LLC', 'Partnership', 'Sole Proprietorship'] },
            { name: 'client_name', description: 'Client/Customer name', type: 'text', required: true },
            { name: 'client_entity_type', description: 'Client entity type', type: 'text', required: true, options: ['Individual', 'Corporation', 'LLC', 'Government'] },
            { name: 'project_name', description: 'Name of the construction project', type: 'text', required: true },
            { name: 'project_address', description: 'Project location address', type: 'text', required: true },
            { name: 'project_description', description: 'Detailed project description', type: 'text', required: true },
            { name: 'scope_of_work', description: 'Detailed scope of work', type: 'text', required: true },
            { name: 'contract_amount', description: 'Total contract value', type: 'currency', required: true },
            { name: 'payment_schedule', description: 'Payment schedule terms', type: 'text', required: true },
            { name: 'start_date', description: 'Project start date', type: 'date', required: true },
            { name: 'completion_date', description: 'Project completion date', type: 'date', required: true }
          ],
          usage_count: 45,
          last_used: new Date(Date.now() - 86400000 * 2).toISOString(),
          created_by: 'Legal Team',
          created_at: new Date(Date.now() - 86400000 * 30).toISOString(),
          updated_at: new Date(Date.now() - 86400000 * 5).toISOString(),
          is_favorite: true,
          industry_specific: true,
          compliance_related: false
        },
        {
          id: '2',
          name: 'Change Order Form',
          category: 'forms',
          template_type: 'Change Order',
          description: 'Standard change order form for project modifications and cost adjustments',
          content: `CHANGE ORDER

Project: {{project_name}}
Change Order Number: {{change_order_number}}
Date: {{change_order_date}}

Original Contract Amount: {{original_amount}}
Previous Change Orders: {{previous_changes}}
This Change Order: {{change_amount}}
New Contract Total: {{new_total}}

DESCRIPTION OF CHANGE:
{{change_description}}

REASON FOR CHANGE:
{{change_reason}}

IMPACT ON SCHEDULE:
{{schedule_impact}}

APPROVALS:
Contractor: _________________ Date: _________
Client: _________________ Date: _________`,
          variables: [
            { name: 'project_name', description: 'Project name', type: 'text', required: true },
            { name: 'change_order_number', description: 'Change order sequence number', type: 'text', required: true },
            { name: 'change_order_date', description: 'Date of change order', type: 'date', required: true },
            { name: 'original_amount', description: 'Original contract amount', type: 'currency', required: true },
            { name: 'previous_changes', description: 'Sum of previous change orders', type: 'currency', required: true },
            { name: 'change_amount', description: 'Amount of this change', type: 'currency', required: true },
            { name: 'new_total', description: 'New total contract amount', type: 'currency', required: true },
            { name: 'change_description', description: 'Description of the change', type: 'text', required: true },
            { name: 'change_reason', description: 'Reason for the change', type: 'text', required: true },
            { name: 'schedule_impact', description: 'Impact on project schedule', type: 'text', required: false }
          ],
          usage_count: 32,
          last_used: new Date(Date.now() - 86400000).toISOString(),
          created_by: 'Project Management',
          created_at: new Date(Date.now() - 86400000 * 45).toISOString(),
          updated_at: new Date(Date.now() - 86400000 * 10).toISOString(),
          is_favorite: true,
          industry_specific: true,
          compliance_related: false
        },
        {
          id: '3',
          name: 'Subcontractor Agreement',
          category: 'agreements',
          template_type: 'Subcontractor Agreement',
          description: 'Standard agreement for subcontractor services with payment and liability terms',
          content: `SUBCONTRACTOR AGREEMENT

This Subcontractor Agreement is entered into on {{agreement_date}} between {{contractor_name}} ("General Contractor") and {{subcontractor_name}} ("Subcontractor").

PROJECT: {{project_name}}
LOCATION: {{project_location}}

SCOPE OF WORK:
{{subcontractor_scope}}

PAYMENT TERMS:
Total Amount: {{total_amount}}
Payment Schedule: {{payment_terms}}

INSURANCE REQUIREMENTS:
General Liability: {{liability_amount}}
Workers Compensation: Required
Additional Insured: {{contractor_name}}

COMPLETION DATE: {{completion_date}}

Both parties agree to the terms set forth in this agreement.

General Contractor: _________________
Subcontractor: _________________`,
          variables: [
            { name: 'agreement_date', description: 'Agreement execution date', type: 'date', required: true },
            { name: 'contractor_name', description: 'General contractor name', type: 'text', required: true },
            { name: 'subcontractor_name', description: 'Subcontractor company name', type: 'text', required: true },
            { name: 'project_name', description: 'Project name', type: 'text', required: true },
            { name: 'project_location', description: 'Project address/location', type: 'text', required: true },
            { name: 'subcontractor_scope', description: 'Detailed scope of subcontractor work', type: 'text', required: true },
            { name: 'total_amount', description: 'Total subcontractor payment', type: 'currency', required: true },
            { name: 'payment_terms', description: 'Payment schedule and terms', type: 'text', required: true },
            { name: 'liability_amount', description: 'Required liability insurance amount', type: 'currency', required: true },
            { name: 'completion_date', description: 'Work completion deadline', type: 'date', required: true }
          ],
          usage_count: 28,
          last_used: new Date(Date.now() - 86400000 * 7).toISOString(),
          created_by: 'Legal Team',
          created_at: new Date(Date.now() - 86400000 * 60).toISOString(),
          updated_at: new Date(Date.now() - 86400000 * 20).toISOString(),
          is_favorite: false,
          industry_specific: true,
          compliance_related: true
        },
        {
          id: '4',
          name: 'Lien Waiver Form',
          category: 'forms',
          template_type: 'Lien Waiver',
          description: 'Conditional and unconditional lien waiver forms for payment protection',
          content: `CONDITIONAL WAIVER AND RELEASE OF LIEN UPON PROGRESS PAYMENT

Property: {{property_address}}
Owner: {{property_owner}}
Contractor: {{contractor_name}}

The undersigned lien claimant, in consideration of the sum of {{payment_amount}} hereby waives and releases its lien and right to claim a lien for labor, services, equipment, or materials furnished to the above property through {{waiver_date}}.

This waiver and release is conditioned upon the claimant's receipt of payment in the amount stated above.

Date: {{current_date}}
Claimant: {{claimant_name}}
By: _________________
Title: {{title}}`,
          variables: [
            { name: 'property_address', description: 'Property address', type: 'text', required: true },
            { name: 'property_owner', description: 'Property owner name', type: 'text', required: true },
            { name: 'contractor_name', description: 'Contractor name', type: 'text', required: true },
            { name: 'payment_amount', description: 'Payment amount', type: 'currency', required: true },
            { name: 'waiver_date', description: 'Date through which lien is waived', type: 'date', required: true },
            { name: 'current_date', description: 'Current date', type: 'date', required: true },
            { name: 'claimant_name', description: 'Name of lien claimant', type: 'text', required: true },
            { name: 'title', description: 'Title of person signing', type: 'text', required: true }
          ],
          usage_count: 18,
          last_used: new Date(Date.now() - 86400000 * 14).toISOString(),
          created_by: 'Accounting',
          created_at: new Date(Date.now() - 86400000 * 90).toISOString(),
          updated_at: new Date(Date.now() - 86400000 * 30).toISOString(),
          is_favorite: false,
          industry_specific: true,
          compliance_related: true
        },
        {
          id: '5',
          name: 'Safety Policy Notice',
          category: 'notices',
          template_type: 'Safety Notice',
          description: 'OSHA-compliant safety policy notice for construction sites',
          content: `SAFETY POLICY NOTICE

Company: {{company_name}}
Project: {{project_name}}
Date: {{notice_date}}

SAFETY IS OUR TOP PRIORITY

All personnel on this construction site must comply with the following safety requirements:

1. Hard hats, safety glasses, and steel-toed boots are required at all times
2. High-visibility vests must be worn in designated areas
3. All accidents and near-misses must be reported immediately
4. No alcohol or drugs permitted on site
5. Follow all OSHA safety standards and company safety procedures

EMERGENCY CONTACTS:
Site Supervisor: {{supervisor_name}} - {{supervisor_phone}}
Emergency: 911
Company Safety Officer: {{safety_officer}} - {{safety_phone}}

Failure to comply with safety requirements may result in removal from the project.

For questions about safety procedures, contact: {{contact_person}}

Posted by: {{posted_by}}
Date Posted: {{notice_date}}`,
          variables: [
            { name: 'company_name', description: 'Company name', type: 'text', required: true },
            { name: 'project_name', description: 'Project name', type: 'text', required: true },
            { name: 'notice_date', description: 'Date of notice', type: 'date', required: true },
            { name: 'supervisor_name', description: 'Site supervisor name', type: 'text', required: true },
            { name: 'supervisor_phone', description: 'Supervisor phone number', type: 'text', required: true },
            { name: 'safety_officer', description: 'Safety officer name', type: 'text', required: true },
            { name: 'safety_phone', description: 'Safety officer phone', type: 'text', required: true },
            { name: 'contact_person', description: 'Contact for safety questions', type: 'text', required: true },
            { name: 'posted_by', description: 'Person posting the notice', type: 'text', required: true }
          ],
          usage_count: 12,
          last_used: new Date(Date.now() - 86400000 * 21).toISOString(),
          created_by: 'Safety Department',
          created_at: new Date(Date.now() - 86400000 * 120).toISOString(),
          updated_at: new Date(Date.now() - 86400000 * 45).toISOString(),
          is_favorite: false,
          industry_specific: true,
          compliance_related: true
        }
      ];

      setTemplates(mockTemplates);
    } catch (error) {
      console.error('Error loading legal templates:', error);
    }
  };

  const loadGeneratedDocuments = async () => {
    try {
      // Mock generated documents
      const mockDocs: GeneratedDocument[] = [
        {
          id: '1',
          template_id: '1',
          template_name: 'Construction Contract Agreement',
          generated_content: 'Generated contract content...',
          variables_used: {
            contractor_name: 'ABC Construction',
            client_name: 'John Smith',
            project_name: 'Kitchen Renovation',
            contract_amount: '$25,000'
          },
          generated_by: userProfile?.first_name + ' ' + userProfile?.last_name || 'User',
          generated_at: new Date().toISOString(),
          client_name: 'John Smith',
          status: 'draft'
        }
      ];

      setGeneratedDocs(mockDocs);
    } catch (error) {
      console.error('Error loading generated documents:', error);
    }
  };

  const generateDocument = async () => {
    if (!selectedTemplate) return;

    setLoading(true);
    try {
      let generatedContent = selectedTemplate.content;
      
      // Replace template variables with actual values
      Object.entries(templateVariables).forEach(([key, value]) => {
        const regex = new RegExp(`{{${key}}}`, 'g');
        generatedContent = generatedContent.replace(regex, value || `[${key}]`);
      });

      const newDoc: GeneratedDocument = {
        id: Date.now().toString(),
        template_id: selectedTemplate.id,
        template_name: selectedTemplate.name,
        generated_content: generatedContent,
        variables_used: templateVariables,
        generated_by: userProfile?.first_name + ' ' + userProfile?.last_name || 'User',
        generated_at: new Date().toISOString(),
        client_name: templateVariables.client_name || templateVariables.property_owner,
        status: 'draft'
      };

      setGeneratedDocs(prev => [newDoc, ...prev]);
      setGenerateDialogOpen(false);
      setTemplateVariables({});
      
      // Update usage count
      setTemplates(prev => prev.map(template => 
        template.id === selectedTemplate.id 
          ? { ...template, usage_count: template.usage_count + 1, last_used: new Date().toISOString() }
          : template
      ));

    } catch (error) {
      console.error('Error generating document:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleFavorite = (templateId: string) => {
    setTemplates(prev => prev.map(template => 
      template.id === templateId 
        ? { ...template, is_favorite: !template.is_favorite }
        : template
    ));
  };

  const getCategoryIcon = (category: string) => {
    const icons = {
      contracts: FileText,
      forms: Edit,
      agreements: Users,
      notices: Building,
      policies: Shield,
      compliance: DollarSign
    };
    return icons[category as keyof typeof icons] || FileText;
  };

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'all' || template.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <FileText className="h-5 w-5" />
          <h2 className="text-2xl font-semibold">Legal Document Templates</h2>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Create Template
        </Button>
      </div>

      {/* Search and Filter */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search templates..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <select
          className="px-3 py-2 border rounded-md"
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
        >
          <option value="all">All Categories</option>
          <option value="contracts">Contracts</option>
          <option value="forms">Forms</option>
          <option value="agreements">Agreements</option>
          <option value="notices">Notices</option>
          <option value="policies">Policies</option>
          <option value="compliance">Compliance</option>
        </select>
      </div>

      {/* Templates Grid */}
      <div className="grid gap-4">
        {filteredTemplates.map((template) => {
          const CategoryIcon = getCategoryIcon(template.category);
          
          return (
            <Card key={template.id} className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <CategoryIcon className="h-5 w-5" />
                    <div>
                      <h4 className="font-medium">{template.name}</h4>
                      <p className="text-sm text-muted-foreground">{template.template_type}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleFavorite(template.id)}
                    >
                      <Star className={`h-4 w-4 ${template.is_favorite ? 'fill-current text-yellow-500' : ''}`} />
                    </Button>
                    {template.industry_specific && (
                      <Badge variant="outline">Construction</Badge>
                    )}
                    {template.compliance_related && (
                      <Badge variant="outline">Compliance</Badge>
                    )}
                    <Badge variant="outline" className="capitalize">
                      {template.category}
                    </Badge>
                  </div>
                </div>
                
                <p className="text-sm text-muted-foreground mb-3">{template.description}</p>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                    <span>Used {template.usage_count} times</span>
                    <span>Last used: {new Date(template.last_used).toLocaleDateString()}</span>
                    <span>{template.variables.length} variables</span>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedTemplate(template);
                        setTemplateDialogOpen(true);
                      }}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Preview
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        setSelectedTemplate(template);
                        setTemplateVariables({});
                        setGenerateDialogOpen(true);
                      }}
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Generate
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Recent Generated Documents */}
      {generatedDocs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Generated Documents</CardTitle>
            <CardDescription>Recently generated documents from templates</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {generatedDocs.map((doc) => (
                <div key={doc.id} className="p-3 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">{doc.template_name}</h4>
                      <p className="text-sm text-muted-foreground">
                        Generated by {doc.generated_by} • {new Date(doc.generated_at).toLocaleDateString()}
                        {doc.client_name && ` • Client: ${doc.client_name}`}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline">{doc.status}</Badge>
                      <Button variant="outline" size="sm">
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Template Preview Dialog */}
      <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedTemplate?.name}</DialogTitle>
          </DialogHeader>
          {selectedTemplate && (
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <Badge variant="outline" className="capitalize">
                  {selectedTemplate.category}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {selectedTemplate.variables.length} variables
                </span>
              </div>
              
              <p className="text-muted-foreground">{selectedTemplate.description}</p>
              
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-2">Template Variables</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {selectedTemplate.variables.map((variable) => (
                    <div key={variable.name} className="flex justify-between">
                      <span>{variable.description}</span>
                      <span className="text-muted-foreground">{`{{${variable.name}}}`}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Template Preview</h4>
                <ScrollArea className="h-64 p-3 border rounded-lg bg-white">
                  <pre className="text-sm whitespace-pre-wrap">{selectedTemplate.content}</pre>
                </ScrollArea>
              </div>
              
              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setTemplateDialogOpen(false);
                    setGenerateDialogOpen(true);
                  }}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Generate Document
                </Button>
                <Button onClick={() => setTemplateDialogOpen(false)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Generate Document Dialog */}
      <Dialog open={generateDialogOpen} onOpenChange={setGenerateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Generate Document: {selectedTemplate?.name}</DialogTitle>
          </DialogHeader>
          {selectedTemplate && (
            <div className="space-y-4">
              <p className="text-muted-foreground">Fill in the template variables to generate your document.</p>
              
              <div className="space-y-4">
                {selectedTemplate.variables.map((variable) => (
                  <div key={variable.name}>
                    <label className="text-sm font-medium">
                      {variable.description}
                      {variable.required && <span className="text-red-500">*</span>}
                    </label>
                    {variable.type === 'text' && !variable.options && (
                      <Input
                        value={templateVariables[variable.name] || ''}
                        onChange={(e) => setTemplateVariables(prev => ({
                          ...prev,
                          [variable.name]: e.target.value
                        }))}
                        placeholder={variable.default_value}
                      />
                    )}
                    {variable.options && (
                      <select
                        className="w-full p-2 border rounded-md"
                        value={templateVariables[variable.name] || ''}
                        onChange={(e) => setTemplateVariables(prev => ({
                          ...prev,
                          [variable.name]: e.target.value
                        }))}
                      >
                        <option value="">Select {variable.description}</option>
                        {variable.options.map((option) => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                    )}
                    {variable.type === 'date' && (
                      <Input
                        type="date"
                        value={templateVariables[variable.name] || ''}
                        onChange={(e) => setTemplateVariables(prev => ({
                          ...prev,
                          [variable.name]: e.target.value
                        }))}
                      />
                    )}
                    {variable.type === 'currency' && (
                      <Input
                        type="text"
                        placeholder="$0.00"
                        value={templateVariables[variable.name] || ''}
                        onChange={(e) => setTemplateVariables(prev => ({
                          ...prev,
                          [variable.name]: e.target.value
                        }))}
                      />
                    )}
                  </div>
                ))}
              </div>
              
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setGenerateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={generateDocument} disabled={loading}>
                  <Save className="h-4 w-4 mr-2" />
                  Generate Document
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LegalDocumentTemplates;