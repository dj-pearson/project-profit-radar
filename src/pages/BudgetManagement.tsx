import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const BudgetManagement: React.FC = () => {
  return (
    <main className="container mx-auto py-6" role="main" aria-label="Budget Management">
      <Card>
        <CardHeader>
          <CardTitle>Budget Management</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground" role="status">Budget management coming soon...</p>
        </CardContent>
      </Card>
    </main>
  );
};

export default BudgetManagement;