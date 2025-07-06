import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { WarrantyClaimForm } from './WarrantyClaimForm';
import { 
  AlertTriangle, 
  Plus, 
  Search, 
  Filter,
  CheckCircle,
  Clock,
  XCircle,
  FileText
} from 'lucide-react';

interface WarrantyClaim {
  id: string;
  claim_number: string;
  claim_date: string;
  issue_description: string;
  issue_category: string;
  severity: string;
  status: string;
  resolution_type: string;
  resolution_cost: number;
  claimant_name: string;
  warranty: {
    item_name: string;
    manufacturer: string;
    project?: { name: string };
  };
}

export const WarrantyClaimsManager: React.FC = () => {
  const { userProfile } = useAuth();
  const [claims, setClaims] = useState<WarrantyClaim[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [selectedClaim, setSelectedClaim] = useState<WarrantyClaim | null>(null);

  useEffect(() => {
    loadClaims();
  }, []);

  const loadClaims = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('warranty_claims')
        .select(`
          *,
          warranty:warranties(
            item_name,
            manufacturer,
            project:projects(name)
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setClaims(data || []);
    } catch (error: any) {
      console.error('Error loading warranty claims:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load warranty claims"
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'submitted':
        return 'bg-blue-500';
      case 'under_review':
        return 'bg-yellow-500';
      case 'approved':
        return 'bg-green-500';
      case 'denied':
        return 'bg-red-500';
      case 'in_progress':
        return 'bg-purple-500';
      case 'resolved':
        return 'bg-green-600';
      case 'closed':
        return 'bg-gray-500';
      default:
        return 'bg-gray-400';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-500';
      case 'high':
        return 'bg-orange-500';
      case 'medium':
        return 'bg-yellow-500';
      case 'low':
        return 'bg-green-500';
      default:
        return 'bg-gray-400';
    }
  };

  const filteredClaims = claims.filter(claim => {
    const matchesSearch = claim.claim_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         claim.warranty.item_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         claim.claimant_name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || claim.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const totalClaims = claims.length;
  const pendingClaims = claims.filter(c => ['submitted', 'under_review', 'in_progress'].includes(c.status)).length;
  const resolvedClaims = claims.filter(c => c.status === 'resolved').length;
  const totalCost = claims.reduce((sum, claim) => sum + (claim.resolution_cost || 0), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-sm text-muted-foreground">Loading warranty claims...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Warranty Claims</h2>
          <p className="text-muted-foreground">Manage and track warranty claims</p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          File New Claim
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <FileText className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Claims</p>
                <p className="text-2xl font-bold">{totalClaims}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold">{pendingClaims}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Resolved</p>
                <p className="text-2xl font-bold">{resolvedClaims}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Cost</p>
                <p className="text-2xl font-bold">${totalCost.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search claims..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="border rounded px-3 py-2 text-sm"
              >
                <option value="all">All Status</option>
                <option value="submitted">Submitted</option>
                <option value="under_review">Under Review</option>
                <option value="approved">Approved</option>
                <option value="denied">Denied</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Claims List */}
      <div className="space-y-4">
        {filteredClaims.map((claim) => (
          <Card key={claim.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">{claim.claim_number}</CardTitle>
                  <CardDescription>
                    {claim.warranty.item_name} 
                    {claim.warranty.manufacturer && ` • ${claim.warranty.manufacturer}`}
                    {claim.warranty.project?.name && ` • ${claim.warranty.project.name}`}
                  </CardDescription>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge className={getSeverityColor(claim.severity)}>
                    {claim.severity.toUpperCase()}
                  </Badge>
                  <Badge className={getStatusColor(claim.status)}>
                    {claim.status.replace('_', ' ').toUpperCase()}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="font-medium text-muted-foreground">Claim Date</p>
                  <p>{new Date(claim.claim_date).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="font-medium text-muted-foreground">Claimant</p>
                  <p>{claim.claimant_name}</p>
                </div>
                <div>
                  <p className="font-medium text-muted-foreground">Category</p>
                  <p>{claim.issue_category?.replace('_', ' ') || 'Not specified'}</p>
                </div>
              </div>

              <div>
                <p className="font-medium text-muted-foreground text-sm mb-1">Issue Description</p>
                <p className="text-sm">{claim.issue_description}</p>
              </div>

              {claim.resolution_type && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="font-medium text-muted-foreground">Resolution Type</p>
                    <p>{claim.resolution_type.replace('_', ' ')}</p>
                  </div>
                  {claim.resolution_cost > 0 && (
                    <div>
                      <p className="font-medium text-muted-foreground">Resolution Cost</p>
                      <p>${claim.resolution_cost.toLocaleString()}</p>
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-end space-x-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedClaim(claim);
                    setShowForm(true);
                  }}
                >
                  Edit
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredClaims.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No warranty claims found</h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm || statusFilter !== 'all' 
                ? 'Try adjusting your search or filters'
                : 'No warranty claims have been filed yet'
              }
            </p>
            {!searchTerm && statusFilter === 'all' && (
              <Button onClick={() => setShowForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                File First Claim
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Claim Form Modal */}
      {showForm && (
        <WarrantyClaimForm
          claim={selectedClaim}
          onClose={() => {
            setShowForm(false);
            setSelectedClaim(null);
          }}
          onSave={() => {
            setShowForm(false);
            setSelectedClaim(null);
            loadClaims();
          }}
        />
      )}
    </div>
  );
};