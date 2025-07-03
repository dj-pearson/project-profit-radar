import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Shield, 
  Calendar, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle,
  DollarSign,
  Building,
  Car,
  Hammer,
  Users,
  FileText,
  Bell
} from 'lucide-react';

interface InsurancePolicy {
  id: string;
  policy_type: 'general_liability' | 'workers_compensation' | 'commercial_auto' | 'professional_liability' | 'equipment' | 'builders_risk';
  policy_number: string;
  provider: string;
  coverage_amount: number;
  deductible: number;
  premium_amount: number;
  effective_date: string;
  expiration_date: string;
  status: 'active' | 'expired' | 'cancelled' | 'pending_renewal';
  certificate_url?: string;
  policy_documents: string[];
  renewal_notice_sent: boolean;
  auto_renewal: boolean;
  coverage_details: {
    per_occurrence?: number;
    aggregate?: number;
    medical_expenses?: number;
    personal_injury?: number;
  };
  additional_insureds: string[];
  claims_history: InsuranceClaim[];
}

interface InsuranceClaim {
  id: string;
  claim_number: string;
  claim_date: string;
  claim_type: string;
  status: 'open' | 'closed' | 'pending' | 'denied';
  claim_amount: number;
  settlement_amount?: number;
  description: string;
  project_id?: string;
}

interface ComplianceRequirement {
  id: string;
  requirement_type: string;
  description: string;
  minimum_coverage: number;
  required_by: string;
  deadline: string;
  status: 'met' | 'not_met' | 'expiring_soon';
  related_policies: string[];
}

const InsuranceRequirementsTracker = () => {
  const { userProfile } = useAuth();
  const [policies, setPolicies] = useState<InsurancePolicy[]>([]);
  const [requirements, setRequirements] = useState<ComplianceRequirement[]>([]);
  const [selectedPolicy, setSelectedPolicy] = useState<InsurancePolicy | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadInsurancePolicies();
    loadComplianceRequirements();
  }, []);

  const loadInsurancePolicies = async () => {
    try {
      // Mock insurance policies data
      const mockPolicies: InsurancePolicy[] = [
        {
          id: '1',
          policy_type: 'general_liability',
          policy_number: 'GL-2024-001234',
          provider: 'Liberty Mutual Insurance',
          coverage_amount: 2000000,
          deductible: 5000,
          premium_amount: 18500,
          effective_date: new Date(Date.now() - 86400000 * 30).toISOString(),
          expiration_date: new Date(Date.now() + 86400000 * 335).toISOString(),
          status: 'active',
          policy_documents: ['policy_certificate.pdf', 'coverage_details.pdf'],
          renewal_notice_sent: false,
          auto_renewal: true,
          coverage_details: {
            per_occurrence: 1000000,
            aggregate: 2000000,
            medical_expenses: 10000,
            personal_injury: 1000000
          },
          additional_insureds: ['ABC Construction Client', 'City of Springfield'],
          claims_history: []
        },
        {
          id: '2',
          policy_type: 'workers_compensation',
          policy_number: 'WC-2024-005678',
          provider: 'State Fund Insurance',
          coverage_amount: 1000000,
          deductible: 0,
          premium_amount: 25000,
          effective_date: new Date(Date.now() - 86400000 * 60).toISOString(),
          expiration_date: new Date(Date.now() + 86400000 * 305).toISOString(),
          status: 'active',
          policy_documents: ['workers_comp_policy.pdf', 'experience_rating.pdf'],
          renewal_notice_sent: false,
          auto_renewal: true,
          coverage_details: {
            per_occurrence: 1000000
          },
          additional_insureds: [],
          claims_history: [
            {
              id: '1',
              claim_number: 'WC-2024-001',
              claim_date: new Date(Date.now() - 86400000 * 45).toISOString(),
              claim_type: 'Workplace Injury',
              status: 'closed',
              claim_amount: 15000,
              settlement_amount: 12000,
              description: 'Construction worker injured while operating equipment',
              project_id: 'proj_123'
            }
          ]
        },
        {
          id: '3',
          policy_type: 'commercial_auto',
          policy_number: 'CA-2024-009876',
          provider: 'Progressive Commercial',
          coverage_amount: 1000000,
          deductible: 1000,
          premium_amount: 8500,
          effective_date: new Date(Date.now() - 86400000 * 10).toISOString(),
          expiration_date: new Date(Date.now() + 86400000 * 355).toISOString(),
          status: 'active',
          policy_documents: ['auto_policy.pdf', 'fleet_coverage.pdf'],
          renewal_notice_sent: false,
          auto_renewal: false,
          coverage_details: {
            per_occurrence: 1000000
          },
          additional_insureds: [],
          claims_history: []
        },
        {
          id: '4',
          policy_type: 'builders_risk',
          policy_number: 'BR-2024-112233',
          provider: 'Travelers Insurance',
          coverage_amount: 5000000,
          deductible: 10000,
          premium_amount: 12000,
          effective_date: new Date(Date.now() - 86400000 * 90).toISOString(),
          expiration_date: new Date(Date.now() + 86400000 * 30).toISOString(),
          status: 'active',
          policy_documents: ['builders_risk_policy.pdf'],
          renewal_notice_sent: true,
          auto_renewal: false,
          coverage_details: {
            per_occurrence: 5000000
          },
          additional_insureds: ['Project Owner LLC'],
          claims_history: []
        },
        {
          id: '5',
          policy_type: 'professional_liability',
          policy_number: 'PL-2023-445566',
          provider: 'Hiscox Insurance',
          coverage_amount: 1000000,
          deductible: 2500,
          premium_amount: 3500,
          effective_date: new Date(Date.now() - 86400000 * 380).toISOString(),
          expiration_date: new Date(Date.now() - 86400000 * 15).toISOString(),
          status: 'expired',
          policy_documents: ['professional_liability.pdf'],
          renewal_notice_sent: true,
          auto_renewal: false,
          coverage_details: {
            per_occurrence: 1000000,
            aggregate: 2000000
          },
          additional_insureds: [],
          claims_history: []
        }
      ];

      setPolicies(mockPolicies);
    } catch (error) {
      console.error('Error loading insurance policies:', error);
    }
  };

  const loadComplianceRequirements = async () => {
    try {
      // Mock compliance requirements
      const mockRequirements: ComplianceRequirement[] = [
        {
          id: '1',
          requirement_type: 'General Liability',
          description: 'Minimum $1M general liability coverage required for all construction projects',
          minimum_coverage: 1000000,
          required_by: 'State Licensing Board',
          deadline: new Date(Date.now() + 86400000 * 365).toISOString(),
          status: 'met',
          related_policies: ['1']
        },
        {
          id: '2',
          requirement_type: 'Workers Compensation',
          description: 'Workers compensation insurance required for all employees',
          minimum_coverage: 1000000,
          required_by: 'State Labor Department',
          deadline: new Date(Date.now() + 86400000 * 305).toISOString(),
          status: 'met',
          related_policies: ['2']
        },
        {
          id: '3',
          requirement_type: 'Professional Liability',
          description: 'Professional liability coverage for design-build projects',
          minimum_coverage: 1000000,
          required_by: 'Client Contract Requirements',
          deadline: new Date(Date.now() + 86400000 * 90).toISOString(),
          status: 'not_met',
          related_policies: ['5']
        },
        {
          id: '4',
          requirement_type: 'Commercial Auto',
          description: 'Commercial vehicle insurance for company fleet',
          minimum_coverage: 1000000,
          required_by: 'DOT Regulations',
          deadline: new Date(Date.now() + 86400000 * 355).toISOString(),
          status: 'met',
          related_policies: ['3']
        }
      ];

      setRequirements(mockRequirements);
    } catch (error) {
      console.error('Error loading compliance requirements:', error);
    }
  };

  const getPolicyIcon = (type: string) => {
    const icons = {
      general_liability: Shield,
      workers_compensation: Users,
      commercial_auto: Car,
      professional_liability: Building,
      equipment: Hammer,
      builders_risk: Building
    };
    return icons[type as keyof typeof icons] || Shield;
  };

  const getStatusColor = (status: string) => {
    const colors = {
      active: 'bg-green-100 text-green-800',
      expired: 'bg-red-100 text-red-800',
      cancelled: 'bg-gray-100 text-gray-800',
      pending_renewal: 'bg-yellow-100 text-yellow-800'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getRequirementStatusColor = (status: string) => {
    const colors = {
      met: 'bg-green-100 text-green-800',
      not_met: 'bg-red-100 text-red-800',
      expiring_soon: 'bg-yellow-100 text-yellow-800'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getDaysUntilExpiration = (expirationDate: string) => {
    const days = Math.ceil((new Date(expirationDate).getTime() - new Date().getTime()) / (1000 * 3600 * 24));
    return days;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatPolicyType = (type: string) => {
    return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const totalPremium = policies.reduce((sum, policy) => sum + policy.premium_amount, 0);
  const activePolicies = policies.filter(p => p.status === 'active').length;
  const expiringPolicies = policies.filter(p => {
    const days = getDaysUntilExpiration(p.expiration_date);
    return days <= 30 && days > 0;
  }).length;
  const expiredPolicies = policies.filter(p => p.status === 'expired').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Shield className="h-5 w-5" />
          <h2 className="text-2xl font-semibold">Insurance Requirements Tracker</h2>
        </div>
        <Button>
          <FileText className="h-4 w-4 mr-2" />
          Generate Certificate
        </Button>
      </div>

      {/* Insurance Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{activePolicies}</div>
            <div className="text-sm text-muted-foreground">Active Policies</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-yellow-600">{expiringPolicies}</div>
            <div className="text-sm text-muted-foreground">Expiring Soon</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-600">{expiredPolicies}</div>
            <div className="text-sm text-muted-foreground">Expired</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">{formatCurrency(totalPremium)}</div>
            <div className="text-sm text-muted-foreground">Annual Premium</div>
          </CardContent>
        </Card>
      </div>

      {/* Insurance Policies */}
      <Card>
        <CardHeader>
          <CardTitle>Insurance Policies</CardTitle>
          <CardDescription>Current insurance coverage and policy details</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            {policies.map((policy) => {
              const PolicyIcon = getPolicyIcon(policy.policy_type);
              const daysUntilExpiration = getDaysUntilExpiration(policy.expiration_date);
              const isExpiringSoon = daysUntilExpiration <= 30 && daysUntilExpiration > 0;
              const isExpired = daysUntilExpiration <= 0;
              
              return (
                <div
                  key={policy.id}
                  className={`p-4 border rounded-lg cursor-pointer hover:bg-accent ${
                    isExpired ? 'border-red-200 bg-red-50' : 
                    isExpiringSoon ? 'border-yellow-200 bg-yellow-50' : ''
                  }`}
                  onClick={() => {
                    setSelectedPolicy(policy);
                    setDetailDialogOpen(true);
                  }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <PolicyIcon className="h-5 w-5" />
                      <div>
                        <h4 className="font-medium">{formatPolicyType(policy.policy_type)}</h4>
                        <p className="text-sm text-muted-foreground">
                          {policy.provider} • {policy.policy_number}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge className={getStatusColor(policy.status)}>
                        {policy.status.replace('_', ' ')}
                      </Badge>
                      {isExpiringSoon && (
                        <Badge variant="outline" className="text-yellow-600">
                          <Bell className="h-3 w-3 mr-1" />
                          {daysUntilExpiration} days
                        </Badge>
                      )}
                      {isExpired && (
                        <Badge variant="outline" className="text-red-600">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Expired
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="font-medium">Coverage</p>
                      <p className="text-muted-foreground">{formatCurrency(policy.coverage_amount)}</p>
                    </div>
                    <div>
                      <p className="font-medium">Premium</p>
                      <p className="text-muted-foreground">{formatCurrency(policy.premium_amount)}</p>
                    </div>
                    <div>
                      <p className="font-medium">Expiration</p>
                      <p className="text-muted-foreground">
                        {new Date(policy.expiration_date).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <p className="font-medium">Claims</p>
                      <p className="text-muted-foreground">{policy.claims_history.length} total</p>
                    </div>
                  </div>

                  {policy.renewal_notice_sent && (
                    <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded text-sm">
                      <strong>Renewal Notice:</strong> Renewal notice has been sent for this policy
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Compliance Requirements */}
      <Card>
        <CardHeader>
          <CardTitle>Compliance Requirements</CardTitle>
          <CardDescription>Insurance requirements and compliance status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {requirements.map((requirement) => (
              <div key={requirement.id} className="p-3 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h4 className="font-medium">{requirement.requirement_type}</h4>
                    <p className="text-sm text-muted-foreground">{requirement.required_by}</p>
                  </div>
                  <Badge className={getRequirementStatusColor(requirement.status)}>
                    {requirement.status === 'met' && <CheckCircle2 className="h-3 w-3 mr-1" />}
                    {requirement.status === 'not_met' && <XCircle className="h-3 w-3 mr-1" />}
                    {requirement.status === 'expiring_soon' && <AlertTriangle className="h-3 w-3 mr-1" />}
                    {requirement.status.replace('_', ' ')}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-2">{requirement.description}</p>
                <div className="flex items-center justify-between text-sm">
                  <span>Minimum Coverage: {formatCurrency(requirement.minimum_coverage)}</span>
                  <span>Deadline: {new Date(requirement.deadline).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Policy Details Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              {selectedPolicy && React.createElement(getPolicyIcon(selectedPolicy.policy_type), { className: "h-5 w-5" })}
              <span>{selectedPolicy && formatPolicyType(selectedPolicy.policy_type)}</span>
            </DialogTitle>
          </DialogHeader>
          {selectedPolicy && (
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <Badge className={getStatusColor(selectedPolicy.status)}>
                  {selectedPolicy.status.replace('_', ' ')}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  Policy #{selectedPolicy.policy_number}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-medium">Provider</p>
                  <p className="text-muted-foreground">{selectedPolicy.provider}</p>
                </div>
                <div>
                  <p className="font-medium">Coverage Amount</p>
                  <p className="text-muted-foreground">{formatCurrency(selectedPolicy.coverage_amount)}</p>
                </div>
                <div>
                  <p className="font-medium">Deductible</p>
                  <p className="text-muted-foreground">{formatCurrency(selectedPolicy.deductible)}</p>
                </div>
                <div>
                  <p className="font-medium">Annual Premium</p>
                  <p className="text-muted-foreground">{formatCurrency(selectedPolicy.premium_amount)}</p>
                </div>
                <div>
                  <p className="font-medium">Effective Date</p>
                  <p className="text-muted-foreground">
                    {new Date(selectedPolicy.effective_date).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="font-medium">Expiration Date</p>
                  <p className="text-muted-foreground">
                    {new Date(selectedPolicy.expiration_date).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">Coverage Details</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {selectedPolicy.coverage_details.per_occurrence && (
                    <div>
                      <span className="font-medium">Per Occurrence: </span>
                      <span>{formatCurrency(selectedPolicy.coverage_details.per_occurrence)}</span>
                    </div>
                  )}
                  {selectedPolicy.coverage_details.aggregate && (
                    <div>
                      <span className="font-medium">Aggregate: </span>
                      <span>{formatCurrency(selectedPolicy.coverage_details.aggregate)}</span>
                    </div>
                  )}
                  {selectedPolicy.coverage_details.medical_expenses && (
                    <div>
                      <span className="font-medium">Medical Expenses: </span>
                      <span>{formatCurrency(selectedPolicy.coverage_details.medical_expenses)}</span>
                    </div>
                  )}
                </div>
              </div>

              {selectedPolicy.additional_insureds.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Additional Insureds</h4>
                  <ul className="list-disc list-inside text-sm text-muted-foreground">
                    {selectedPolicy.additional_insureds.map((insured, index) => (
                      <li key={index}>{insured}</li>
                    ))}
                  </ul>
                </div>
              )}

              {selectedPolicy.claims_history.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Claims History</h4>
                  <div className="space-y-2">
                    {selectedPolicy.claims_history.map((claim) => (
                      <div key={claim.id} className="p-2 bg-muted rounded text-sm">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium">Claim #{claim.claim_number}</p>
                            <p className="text-muted-foreground">{claim.description}</p>
                          </div>
                          <Badge variant="outline">{claim.status}</Badge>
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {new Date(claim.claim_date).toLocaleDateString()} • 
                          Claim: {formatCurrency(claim.claim_amount)}
                          {claim.settlement_amount && ` • Settlement: ${formatCurrency(claim.settlement_amount)}`}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-2">
                <Button variant="outline">
                  <FileText className="h-4 w-4 mr-2" />
                  View Certificate
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

export default InsuranceRequirementsTracker;