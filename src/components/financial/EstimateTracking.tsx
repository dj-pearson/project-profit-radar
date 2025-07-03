import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  FileText, 
  Clock, 
  CheckCircle, 
  TrendingUp,
  Phone,
  Mail
} from 'lucide-react';

const EstimateTracking = () => {
  // Mock data - replace with real data from Supabase
  const estimateData = {
    totalValue: 425000,
    conversionRate: 68,
    averageValue: 35400,
    followUpNeeded: 5
  };

  const estimates = [
    {
      id: '1',
      client: 'Johnson Residence',
      project: 'Master Bath Renovation',
      value: 28000,
      status: 'pending',
      sentDate: '2024-01-20',
      followUpDate: '2024-01-27',
      needsFollowUp: false
    },
    {
      id: '2',
      client: 'Metro Shopping Center',
      project: 'Store Front Renovation',
      value: 85000,
      status: 'won',
      sentDate: '2024-01-15',
      followUpDate: null,
      needsFollowUp: false
    },
    {
      id: '3',
      client: 'Green Valley Homes',
      project: 'Multiple Unit Renovation',
      value: 145000,
      status: 'pending',
      sentDate: '2024-01-10',
      followUpDate: '2024-01-24',
      needsFollowUp: true
    },
    {
      id: '4',
      client: 'City Hall',
      project: 'Office Space Update',
      value: 65000,
      status: 'lost',
      sentDate: '2024-01-08',
      followUpDate: null,
      needsFollowUp: false
    },
    {
      id: '5',
      client: 'ABC Manufacturing',
      project: 'Warehouse Flooring',
      value: 42000,
      status: 'pending',
      sentDate: '2024-01-18',
      followUpDate: '2024-01-25',
      needsFollowUp: true
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'won': return 'default';
      case 'pending': return 'secondary';
      case 'lost': return 'destructive';
      default: return 'outline';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'won': return <CheckCircle className="h-3 w-3" />;
      case 'pending': return <Clock className="h-3 w-3" />;
      case 'lost': return <FileText className="h-3 w-3" />;
      default: return <FileText className="h-3 w-3" />;
    }
  };

  const getDaysOld = (sentDate: string) => {
    const sent = new Date(sentDate);
    const now = new Date();
    const diffTime = now.getTime() - sent.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const pendingEstimates = estimates.filter(est => est.status === 'pending');
  const pendingValue = pendingEstimates.reduce((sum, est) => sum + est.value, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Estimate Tracking
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="text-center p-3 bg-muted rounded-lg">
            <div className="text-lg font-bold">${estimateData.totalValue.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground">Outstanding Value</div>
          </div>
          <div className="text-center p-3 bg-muted rounded-lg">
            <div className="text-lg font-bold text-green-600">{estimateData.conversionRate}%</div>
            <div className="text-xs text-muted-foreground">Conversion Rate</div>
          </div>
        </div>

        {/* Conversion Rate Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>Win Rate</span>
            <span>{estimateData.conversionRate}%</span>
          </div>
          <Progress value={estimateData.conversionRate} className="h-2" />
        </div>

        {/* Follow-up Alert */}
        {estimateData.followUpNeeded > 0 && (
          <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
            <div className="flex items-center gap-2 text-orange-700">
              <Clock className="h-4 w-4" />
              <span className="text-sm font-medium">
                {estimateData.followUpNeeded} estimates need follow-up
              </span>
            </div>
          </div>
        )}

        {/* Recent Estimates */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Recent Estimates</h4>
          {estimates.slice(0, 4).map(estimate => {
            const daysOld = getDaysOld(estimate.sentDate);
            
            return (
              <div key={estimate.id} className={`p-3 border rounded-lg ${estimate.needsFollowUp ? 'border-orange-300 bg-orange-50' : ''}`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">{estimate.client}</span>
                      <Badge variant={getStatusColor(estimate.status)} className="text-xs">
                        {getStatusIcon(estimate.status)}
                        <span className="ml-1">{estimate.status}</span>
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground mb-1">{estimate.project}</div>
                    <div className="text-xs text-muted-foreground">
                      Sent {daysOld} days ago
                    </div>
                    {estimate.needsFollowUp && (
                      <div className="flex gap-2 mt-2">
                        <Button size="sm" variant="outline" className="h-6 text-xs">
                          <Phone className="h-3 w-3 mr-1" />
                          Call
                        </Button>
                        <Button size="sm" variant="outline" className="h-6 text-xs">
                          <Mail className="h-3 w-3 mr-1" />
                          Email
                        </Button>
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-sm">${estimate.value.toLocaleString()}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Quick Stats */}
        <div className="p-3 border rounded-lg">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Pending Value:</span>
              <div className="font-bold">${pendingValue.toLocaleString()}</div>
            </div>
            <div>
              <span className="text-muted-foreground">Avg. Value:</span>
              <div className="font-bold">${estimateData.averageValue.toLocaleString()}</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default EstimateTracking;