import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const LeadManagement: React.FC = () => {
  return (
    <main className="container mx-auto py-6" role="main" aria-label="Lead Management">
      <Card>
        <CardHeader>
          <CardTitle>Lead Management</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Lead management coming soon...</p>
        </CardContent>
      </Card>
    </main>
  );
};

export default LeadManagement;