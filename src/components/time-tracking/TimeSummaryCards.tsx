import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, Clock, Briefcase } from 'lucide-react';

interface TimeSummaryCardsProps {
  totalHours: number;
  totalEarnings: number;
  activeProjects: number;
}

export const TimeSummaryCards: React.FC<TimeSummaryCardsProps> = ({
  totalHours,
  totalEarnings,
  activeProjects
}) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            Total Hours This Week
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalHours.toFixed(1)}h</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            Estimated Earnings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            ${totalEarnings.toFixed(2)}
          </div>
        </CardContent>
      </Card>

      <Card className="sm:col-span-2 lg:col-span-1">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Briefcase className="h-4 w-4 text-muted-foreground" />
            Active Projects
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{activeProjects}</div>
        </CardContent>
      </Card>
    </div>
  );
};
