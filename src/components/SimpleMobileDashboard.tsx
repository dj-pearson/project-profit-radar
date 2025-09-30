import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { DollarSign, TrendingUp, Users, Clock } from 'lucide-react';

const SimpleMobileDashboard = () => {
  return (
    <div className="w-full max-w-sm mx-auto space-y-3 sm:space-y-4">
      {/* Mobile-optimized KPI Cards */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        <Card className="border border-border/50">
          <CardContent className="p-2 sm:p-3">
            <div className="flex items-center space-x-1 sm:space-x-2">
              <DollarSign className="h-3 w-3 sm:h-4 sm:w-4 text-construction-orange flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Budget</p>
                <p className="text-sm sm:text-base font-bold truncate">$1.05M</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/50">
          <CardContent className="p-2 sm:p-3">
            <div className="flex items-center space-x-1 sm:space-x-2">
              <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-construction-blue flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Spent</p>
                <p className="text-sm sm:text-base font-bold truncate">$840K</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/50">
          <CardContent className="p-2 sm:p-3">
            <div className="flex items-center space-x-1 sm:space-x-2">
              <Users className="h-3 w-3 sm:h-4 sm:w-4 text-construction-orange flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Crew</p>
                <p className="text-sm sm:text-base font-bold">14</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/50">
          <CardContent className="p-2 sm:p-3">
            <div className="flex items-center space-x-1 sm:space-x-2">
              <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-construction-blue flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Progress</p>
                <p className="text-sm sm:text-base font-bold">73%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Mobile-optimized Project List */}
      <Card className="border border-border/50">
        <CardContent className="p-2 sm:p-3 space-y-2 sm:space-y-3">
          <p className="text-xs sm:text-sm font-medium text-construction-dark">Active Projects</p>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-construction-dark truncate flex-1 mr-2">Downtown Office</span>
              <span className="font-medium text-construction-orange flex-shrink-0">65%</span>
            </div>
            <div className="w-full bg-muted rounded-full h-1.5">
              <div className="bg-construction-orange h-1.5 rounded-full" style={{ width: '65%' }}></div>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-construction-dark truncate flex-1 mr-2">Retail Complex</span>
              <span className="font-medium text-construction-blue flex-shrink-0">82%</span>
            </div>
            <div className="w-full bg-muted rounded-full h-1.5">
              <div className="bg-construction-blue h-1.5 rounded-full" style={{ width: '82%' }}></div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Mobile-optimized Features */}
      <div className="grid grid-cols-2 gap-1 sm:gap-2 text-center text-xs">
        <div className="p-2 rounded bg-primary/5">
          <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-construction-blue mx-auto mb-1" />
          <span className="text-construction-dark">Real-Time</span>
        </div>
        <div className="p-2 rounded bg-primary/5">
          <DollarSign className="h-3 w-3 sm:h-4 sm:w-4 text-construction-orange mx-auto mb-1" />
          <span className="text-construction-dark">Cost Control</span>
        </div>
      </div>
    </div>
  );
};

export default SimpleMobileDashboard;