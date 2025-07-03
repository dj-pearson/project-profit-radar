import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown,
  DollarSign
} from 'lucide-react';

const JobProfitabilityOverview = () => {
  const [selectedJob, setSelectedJob] = useState<string | null>(null);

  // Mock data - replace with real data from Supabase
  const jobData = [
    {
      id: '1',
      name: 'Kitchen Renovation - Smith',
      revenue: 25000,
      costs: {
        labor: 8500,
        materials: 6200,
        subcontractors: 4300,
        overhead: 1500
      },
      grossProfit: 4500,
      profitMargin: 18,
      status: 'In Progress'
    },
    {
      id: '2',
      name: 'Office Buildout - Tech Corp',
      revenue: 75000,
      costs: {
        labor: 22000,
        materials: 18500,
        subcontractors: 15000,
        overhead: 4500
      },
      grossProfit: 15000,
      profitMargin: 20,
      status: 'Completed'
    },
    {
      id: '3',
      name: 'Warehouse Extension',
      revenue: 125000,
      costs: {
        labor: 35000,
        materials: 45000,
        subcontractors: 25000,
        overhead: 8000
      },
      grossProfit: 12000,
      profitMargin: 9.6,
      status: 'In Progress'
    }
  ];

  const totalRevenue = jobData.reduce((sum, job) => sum + job.revenue, 0);
  const totalProfit = jobData.reduce((sum, job) => sum + job.grossProfit, 0);
  const overallMargin = (totalProfit / totalRevenue) * 100;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Job Profitability Overview
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-6 p-4 bg-muted rounded-lg">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold">${totalRevenue.toLocaleString()}</div>
              <div className="text-sm text-muted-foreground">Total Revenue</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">${totalProfit.toLocaleString()}</div>
              <div className="text-sm text-muted-foreground">Total Profit</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{overallMargin.toFixed(1)}%</div>
              <div className="text-sm text-muted-foreground">Avg Margin</div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {jobData.map(job => {
            const totalCosts = Object.values(job.costs).reduce((sum, cost) => sum + cost, 0);
            const isPositive = job.grossProfit > 0;
            
            return (
              <div key={job.id} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium">{job.name}</h4>
                  <Badge variant={job.status === 'Completed' ? 'default' : 'secondary'}>
                    {job.status}
                  </Badge>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-sm mb-3">
                  <div>
                    <span className="text-muted-foreground">Revenue:</span>
                    <div className="font-medium">${job.revenue.toLocaleString()}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Costs:</span>
                    <div className="font-medium">${totalCosts.toLocaleString()}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Profit:</span>
                    <div className={`font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                      ${job.grossProfit.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Margin:</span>
                    <div className={`font-medium ${job.profitMargin > 15 ? 'text-green-600' : job.profitMargin > 5 ? 'text-orange-600' : 'text-red-600'}`}>
                      {job.profitMargin}%
                    </div>
                  </div>
                  <div className="flex items-center">
                    {job.profitMargin > 15 ? (
                      <TrendingUp className="h-4 w-4 text-green-500" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-red-500" />
                    )}
                  </div>
                </div>
                
                <Progress value={job.profitMargin > 0 ? job.profitMargin : 0} className="h-2" />
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default JobProfitabilityOverview;