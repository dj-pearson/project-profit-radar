import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const Payroll: React.FC = () => {
  return (
    <main className="container mx-auto py-6" role="main" aria-label="Payroll Management">
      <Card>
        <CardHeader>
          <CardTitle>Payroll</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground" role="status">Payroll management coming soon...</p>
        </CardContent>
      </Card>
    </main>
  );
};

export default Payroll;