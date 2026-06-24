import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const EmployeeManagement: React.FC = () => {
  return (
    <main className="container mx-auto py-6" aria-label="Employee management settings">
      <Card>
        <CardHeader>
          <CardTitle>Employee Management</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Employee management coming soon...</p>
        </CardContent>
      </Card>
    </main>
  );
};

export default EmployeeManagement;