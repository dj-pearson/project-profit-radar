import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const BudgetManagement: React.FC = () => {
  return (
    <div className="container mx-auto py-6">
      <Card>
        <CardHeader>
          <CardTitle>Budget Management</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Budget management coming soon...</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default BudgetManagement;