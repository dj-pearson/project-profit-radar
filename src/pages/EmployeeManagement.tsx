import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const EmployeeManagement: React.FC = () => {
  return (
    <div className="container mx-auto py-6">
      <Card>
        <CardHeader>
          <CardTitle>Employee Management</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Employee management coming soon...</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default EmployeeManagement;