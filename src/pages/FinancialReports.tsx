import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const FinancialReports: React.FC = () => {
  return (
    <main className="container mx-auto py-6" role="main" aria-label="Financial Reports">
      <Card>
        <CardHeader>
          <CardTitle>Financial Reports</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground" role="status">Financial reports coming soon...</p>
        </CardContent>
      </Card>
    </main>
  );
};

export default FinancialReports;