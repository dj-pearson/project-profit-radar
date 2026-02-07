import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const TaxManagement: React.FC = () => {
  return (
    <main className="container mx-auto py-6" role="main" aria-label="Tax Management">
      <Card>
        <CardHeader>
          <CardTitle>Tax Management</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground" role="status">Tax management coming soon...</p>
        </CardContent>
      </Card>
    </main>
  );
};

export default TaxManagement;