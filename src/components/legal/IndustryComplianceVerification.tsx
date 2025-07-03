import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Shield, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Clock,
  Building,
  FileText,
  Calendar,
  Search,
  Upload,
  Eye
} from 'lucide-react';

interface ComplianceRequirement {
  id: string;
  name: string;
  description: string;
  category: 'safety' | 'environmental' | 'licensing' | 'financial' | 'operational';
  industry: string;
  regulatory_body: string;
  compliance_status: 'compliant' | 'non_compliant' | 'pending_review' | 'expired';
  last_verified: string;
  next_review_date: string;
  documentation_required: string[];
  penalties_for_non_compliance: string;
  action_items: string[];
}

interface ComplianceAudit {
  id: string;
  audit_type: string;
  auditor_name: string;
  audit_date: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  compliance_score: number;
  findings: string[];
  recommendations: string[];
  next_audit_date?: string;
}

const IndustryComplianceVerification = () => {
  const { userProfile } = useAuth();
  const [requirements, setRequirements] = useState<ComplianceRequirement[]>([]);
  const [audits, setAudits] = useState<ComplianceAudit[]>([]);
  const [selectedRequirement, setSelectedRequirement] = useState<ComplianceRequirement | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadComplianceRequirements();
    loadComplianceAudits();
  }, []);

  const loadComplianceRequirements = async () => {
    try {
      // Mock compliance requirements data
      const mockRequirements: ComplianceRequirement[] = [
        {
          id: '1',
          name: 'OSHA Construction Safety Standards',
          description: 'Compliance with OSHA 29 CFR 1926 construction safety standards',
          category: 'safety',
          industry: 'Construction',
          regulatory_body: 'Occupational Safety and Health Administration',
          compliance_status: 'compliant',
          last_verified: new Date(Date.now() - 86400000).toISOString(),
          next_review_date: new Date(Date.now() + 86400000 * 180).toISOString(),
          documentation_required: [
            'Safety training records',
            'Equipment inspection logs',
            'Incident reports',
            'Emergency response plans'
          ],
          penalties_for_non_compliance: 'Fines ranging from $1,000 to $70,000 per violation',
          action_items: []
        },
        {
          id: '2',
          name: 'EPA Environmental Compliance',
          description: 'Environmental protection compliance for construction activities',
          category: 'environmental',
          industry: 'Construction',
          regulatory_body: 'Environmental Protection Agency',
          compliance_status: 'pending_review',
          last_verified: new Date(Date.now() - 86400000 * 30).toISOString(),
          next_review_date: new Date(Date.now() + 86400000 * 90).toISOString(),
          documentation_required: [
            'Storm water management plan',
            'Waste disposal records',
            'Air quality monitoring',
            'Soil contamination assessments'
          ],
          penalties_for_non_compliance: 'Fines up to $25,000 per day, work stoppage orders',
          action_items: [
            'Update storm water management plan',
            'Complete air quality assessment'
          ]
        },
        {
          id: '3',
          name: 'State Contractor License',
          description: 'Valid contractor license for state operations',
          category: 'licensing',
          industry: 'Construction',
          regulatory_body: 'State Licensing Board',
          compliance_status: 'expired',
          last_verified: new Date(Date.now() - 86400000 * 45).toISOString(),
          next_review_date: new Date(Date.now() - 86400000 * 15).toISOString(),
          documentation_required: [
            'License application',
            'Proof of insurance',
            'Financial statements',
            'References'
          ],
          penalties_for_non_compliance: 'License suspension, inability to bid on projects',
          action_items: [
            'Submit license renewal application',
            'Update insurance documentation',
            'Pay renewal fees'
          ]
        },
        {
          id: '4',
          name: 'Workers Compensation Insurance',
          description: 'Required workers compensation coverage for all employees',
          category: 'financial',
          industry: 'Construction',
          regulatory_body: 'State Insurance Department',
          compliance_status: 'compliant',
          last_verified: new Date(Date.now() - 86400000 * 7).toISOString(),
          next_review_date: new Date(Date.now() + 86400000 * 358).toISOString(),
          documentation_required: [
            'Insurance policy certificate',
            'Premium payment records',
            'Employee classification records',
            'Claims history'
          ],
          penalties_for_non_compliance: 'Fines, work stoppage, criminal charges',
          action_items: []
        },
        {
          id: '5',
          name: 'DOT Transportation Compliance',
          description: 'Department of Transportation compliance for commercial vehicles',
          category: 'operational',
          industry: 'Construction',
          regulatory_body: 'Department of Transportation',
          compliance_status: 'non_compliant',
          last_verified: new Date(Date.now() - 86400000 * 60).toISOString(),
          next_review_date: new Date(Date.now() + 86400000 * 30).toISOString(),
          documentation_required: [
            'Driver qualification files',
            'Vehicle inspection records',
            'Hours of service logs',
            'Drug and alcohol testing records'
          ],
          penalties_for_non_compliance: 'Vehicle out-of-service orders, fines up to $16,000',
          action_items: [
            'Update driver qualification files',
            'Complete vehicle safety inspections',
            'Implement drug testing program'
          ]
        }
      ];

      setRequirements(mockRequirements);
    } catch (error) {
      console.error('Error loading compliance requirements:', error);
    }
  };

  const loadComplianceAudits = async () => {
    try {
      // Mock audit data
      const mockAudits: ComplianceAudit[] = [
        {
          id: '1',
          audit_type: 'OSHA Safety Audit',
          auditor_name: 'SafetyFirst Consulting',
          audit_date: new Date(Date.now() - 86400000 * 30).toISOString(),
          status: 'completed',
          compliance_score: 85,
          findings: [
            'Missing safety signage on 2 job sites',
            'Incomplete training records for 3 employees',
            'One expired safety equipment item'
          ],
          recommendations: [
            'Install required safety signage',
            'Complete training for identified employees',
            'Replace expired safety equipment',
            'Implement monthly safety equipment checks'
          ],
          next_audit_date: new Date(Date.now() + 86400000 * 335).toISOString()
        },
        {
          id: '2',
          audit_type: 'Environmental Compliance Review',
          auditor_name: 'EcoCompliance Partners',
          audit_date: new Date(Date.now() + 86400000 * 15).toISOString(),
          status: 'scheduled',
          compliance_score: 0,
          findings: [],
          recommendations: []
        }
      ];

      setAudits(mockAudits);
    } catch (error) {
      console.error('Error loading compliance audits:', error);
    }
  };

  const updateComplianceStatus = async (requirementId: string, status: string) => {
    setRequirements(prev => prev.map(req => 
      req.id === requirementId 
        ? { 
            ...req, 
            compliance_status: status as any,
            last_verified: new Date().toISOString()
          }
        : req
    ));
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'compliant':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'non_compliant':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'expired':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'pending_review':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    const colors = {
      compliant: 'bg-green-100 text-green-800',
      non_compliant: 'bg-red-100 text-red-800',
      expired: 'bg-red-100 text-red-800',
      pending_review: 'bg-yellow-100 text-yellow-800'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getCategoryIcon = (category: string) => {
    const icons = {
      safety: Shield,
      environmental: Building,
      licensing: FileText,
      financial: Calendar,
      operational: Clock
    };
    return icons[category as keyof typeof icons] || Shield;
  };

  const filteredRequirements = requirements.filter(req => {
    const matchesSearch = req.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         req.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'all' || req.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const complianceOverview = {
    total: requirements.length,
    compliant: requirements.filter(r => r.compliance_status === 'compliant').length,
    non_compliant: requirements.filter(r => r.compliance_status === 'non_compliant').length,
    expired: requirements.filter(r => r.compliance_status === 'expired').length,
    pending: requirements.filter(r => r.compliance_status === 'pending_review').length
  };

  const overallScore = requirements.length > 0 
    ? Math.round((complianceOverview.compliant / requirements.length) * 100)
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Shield className="h-5 w-5" />
          <h2 className="text-2xl font-semibold">Industry Compliance Verification</h2>
        </div>
        <Button>
          <Upload className="h-4 w-4 mr-2" />
          Upload Documents
        </Button>
      </div>

      {/* Compliance Overview */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">{overallScore}%</div>
            <div className="text-sm text-muted-foreground">Overall Score</div>
            <Progress value={overallScore} className="mt-2" />
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{complianceOverview.compliant}</div>
            <div className="text-sm text-muted-foreground">Compliant</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-yellow-600">{complianceOverview.pending}</div>
            <div className="text-sm text-muted-foreground">Pending Review</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-600">{complianceOverview.non_compliant}</div>
            <div className="text-sm text-muted-foreground">Non-Compliant</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-600">{complianceOverview.expired}</div>
            <div className="text-sm text-muted-foreground">Expired</div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search compliance requirements..."
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
          <option value="safety">Safety</option>
          <option value="environmental">Environmental</option>
          <option value="licensing">Licensing</option>
          <option value="financial">Financial</option>
          <option value="operational">Operational</option>
        </select>
      </div>

      {/* Compliance Requirements */}
      <div className="grid gap-4">
        {filteredRequirements.map((requirement) => {
          const CategoryIcon = getCategoryIcon(requirement.category);
          const isOverdue = new Date(requirement.next_review_date) < new Date();
          
          return (
            <Card 
              key={requirement.id}
              className={`cursor-pointer hover:shadow-md transition-shadow ${
                requirement.compliance_status === 'expired' || requirement.compliance_status === 'non_compliant'
                  ? 'border-red-200' : 
                isOverdue ? 'border-yellow-200' : ''
              }`}
              onClick={() => {
                setSelectedRequirement(requirement);
                setDetailDialogOpen(true);
              }}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <CategoryIcon className="h-5 w-5" />
                    {getStatusIcon(requirement.compliance_status)}
                    <div>
                      <h4 className="font-medium">{requirement.name}</h4>
                      <p className="text-sm text-muted-foreground">{requirement.regulatory_body}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge className={getStatusColor(requirement.compliance_status)}>
                      {requirement.compliance_status.replace('_', ' ')}
                    </Badge>
                    <Badge variant="outline" className="capitalize">
                      {requirement.category}
                    </Badge>
                  </div>
                </div>
                
                <p className="text-sm text-muted-foreground mb-3">{requirement.description}</p>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="font-medium">Last Verified</p>
                    <p className="text-muted-foreground">
                      {new Date(requirement.last_verified).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="font-medium">Next Review</p>
                    <p className={`${isOverdue ? 'text-red-600 font-medium' : 'text-muted-foreground'}`}>
                      {new Date(requirement.next_review_date).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="font-medium">Action Items</p>
                    <p className="text-muted-foreground">{requirement.action_items.length} pending</p>
                  </div>
                  <div>
                    <p className="font-medium">Documentation</p>
                    <p className="text-muted-foreground">{requirement.documentation_required.length} required</p>
                  </div>
                </div>

                {requirement.action_items.length > 0 && (
                  <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm">
                    <strong>Action Required:</strong> {requirement.action_items[0]}
                    {requirement.action_items.length > 1 && ` and ${requirement.action_items.length - 1} more`}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Recent Audits */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Compliance Audits</CardTitle>
          <CardDescription>External audit results and scheduled reviews</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {audits.map((audit) => (
              <div key={audit.id} className="p-3 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h4 className="font-medium">{audit.audit_type}</h4>
                    <p className="text-sm text-muted-foreground">
                      {audit.auditor_name} • {new Date(audit.audit_date).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant={audit.status === 'completed' ? 'secondary' : 'outline'}>
                      {audit.status}
                    </Badge>
                    {audit.compliance_score > 0 && (
                      <Badge variant="outline">
                        Score: {audit.compliance_score}%
                      </Badge>
                    )}
                  </div>
                </div>
                
                {audit.findings.length > 0 && (
                  <div className="text-sm">
                    <p className="font-medium text-red-600">Findings:</p>
                    <ul className="list-disc list-inside text-muted-foreground">
                      {audit.findings.slice(0, 2).map((finding, index) => (
                        <li key={index}>{finding}</li>
                      ))}
                      {audit.findings.length > 2 && (
                        <li>+ {audit.findings.length - 2} more findings</li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Requirement Details Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              {selectedRequirement && React.createElement(getCategoryIcon(selectedRequirement.category), { className: "h-5 w-5" })}
              <span>{selectedRequirement?.name}</span>
            </DialogTitle>
          </DialogHeader>
          {selectedRequirement && (
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <Badge className={getStatusColor(selectedRequirement.compliance_status)}>
                  {selectedRequirement.compliance_status.replace('_', ' ')}
                </Badge>
                <Badge variant="outline" className="capitalize">
                  {selectedRequirement.category}
                </Badge>
              </div>

              <p className="text-muted-foreground">{selectedRequirement.description}</p>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-medium">Regulatory Body</p>
                  <p className="text-muted-foreground">{selectedRequirement.regulatory_body}</p>
                </div>
                <div>
                  <p className="font-medium">Industry</p>
                  <p className="text-muted-foreground">{selectedRequirement.industry}</p>
                </div>
                <div>
                  <p className="font-medium">Last Verified</p>
                  <p className="text-muted-foreground">
                    {new Date(selectedRequirement.last_verified).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="font-medium">Next Review</p>
                  <p className="text-muted-foreground">
                    {new Date(selectedRequirement.next_review_date).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">Required Documentation</h4>
                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                  {selectedRequirement.documentation_required.map((doc, index) => (
                    <li key={index}>{doc}</li>
                  ))}
                </ul>
              </div>

              {selectedRequirement.action_items.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Action Items</h4>
                  <ul className="list-disc list-inside text-sm text-red-600 space-y-1">
                    {selectedRequirement.action_items.map((item, index) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
                <h4 className="font-medium text-yellow-800 mb-1">Penalties for Non-Compliance</h4>
                <p className="text-sm text-yellow-700">{selectedRequirement.penalties_for_non_compliance}</p>
              </div>

              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => updateComplianceStatus(selectedRequirement.id, 'compliant')}
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Mark Compliant
                </Button>
                <Button onClick={() => setDetailDialogOpen(false)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default IndustryComplianceVerification;