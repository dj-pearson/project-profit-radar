import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const Payroll: React.FC = () => {
  return (
    <div className="container mx-auto py-6">
      <Card>
        <CardHeader>
          <CardTitle>Payroll</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Payroll management coming soon...</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Payroll;