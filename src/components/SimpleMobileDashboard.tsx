import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { DollarSign, TrendingUp, Users, Clock } from 'lucide-react';

const SimpleMobileDashboard = () => {
  return (
    <div className="w-full max-w-md mx-auto space-y-4">
      {/* Simple KPI Cards */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="border border-border/50">
          <CardContent className="p-3">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-4 w-4 text-construction-orange" />
              <div>
                <p className="text-xs text-muted-foreground">Budget</p>
                <p className="text-sm font-bold">$1.05M</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/50">
          <CardContent className="p-3">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4 text-construction-blue" />
              <div>
                <p className="text-xs text-muted-foreground">Spent</p>
                <p className="text-sm font-bold">$840K</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/50">
          <CardContent className="p-3">
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4 text-construction-orange" />
              <div>
                <p className="text-xs text-muted-foreground">Crew</p>
                <p className="text-sm font-bold">14</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/50">
          <CardContent className="p-3">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-construction-blue" />
              <div>
                <p className="text-xs text-muted-foreground">Progress</p>
                <p className="text-sm font-bold">73%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Simple Project List */}
      <Card className="border border-border/50">
        <CardContent className="p-3 space-y-3">
          <h4 className="text-sm font-medium text-construction-dark">Active Projects</h4>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-construction-dark">Downtown Office</span>
              <span className="font-medium text-construction-orange">65%</span>
            </div>
            <div className="w-full bg-muted rounded-full h-1.5">
              <div className="bg-construction-orange h-1.5 rounded-full" style={{ width: '65%' }}></div>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-construction-dark">Retail Complex</span>
              <span className="font-medium text-construction-blue">82%</span>
            </div>
            <div className="w-full bg-muted rounded-full h-1.5">
              <div className="bg-construction-blue h-1.5 rounded-full" style={{ width: '82%' }}></div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Simple Features */}
      <div className="grid grid-cols-2 gap-2 text-center text-xs">
        <div className="p-2 rounded bg-primary/5">
          <Clock className="h-4 w-4 text-construction-blue mx-auto mb-1" />
          <span className="text-construction-dark">Real-Time</span>
        </div>
        <div className="p-2 rounded bg-primary/5">
          <DollarSign className="h-4 w-4 text-construction-orange mx-auto mb-1" />
          <span className="text-construction-dark">Cost Control</span>
        </div>
      </div>
    </div>
  );
};

export default SimpleMobileDashboard;