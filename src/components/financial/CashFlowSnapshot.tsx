import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Wallet,
  CreditCard,
  AlertCircle
} from 'lucide-react';

const CashFlowSnapshot = () => {
  // Mock data - replace with real data from Supabase
  const cashFlowData = {
    currentBalance: 45750,
    accountsReceivable: 23400,
    accountsPayable: 8900,
    weeklyTrend: [
      { date: '2024-01-01', amount: 42000 },
      { date: '2024-01-08', amount: 44500 },
      { date: '2024-01-15', amount: 43200 },
      { date: '2024-01-22', amount: 45750 }
    ]
  };

  const netCashPosition = cashFlowData.currentBalance + cashFlowData.accountsReceivable - cashFlowData.accountsPayable;
  const isPositive = netCashPosition > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallet className="h-5 w-5" />
          Cash Flow Snapshot
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              ${cashFlowData.currentBalance.toLocaleString()}
            </div>
            <div className="text-sm text-muted-foreground">Current Balance</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              ${cashFlowData.accountsReceivable.toLocaleString()}
            </div>
            <div className="text-sm text-muted-foreground">Money Coming In</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">
              ${cashFlowData.accountsPayable.toLocaleString()}
            </div>
            <div className="text-sm text-muted-foreground">Money Going Out</div>
          </div>
          <div className="text-center">
            <div className={`text-2xl font-bold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
              ${netCashPosition.toLocaleString()}
            </div>
            <div className="text-sm text-muted-foreground">Net Position</div>
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <Badge variant={isPositive ? "default" : "destructive"}>
            {isPositive ? (
              <TrendingUp className="h-3 w-3 mr-1" />
            ) : (
              <TrendingDown className="h-3 w-3 mr-1" />
            )}
            {isPositive ? 'Healthy Cash Flow' : 'Cash Flow Alert'}
          </Badge>
          <Button variant="outline" size="sm">
            View Details
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default CashFlowSnapshot;