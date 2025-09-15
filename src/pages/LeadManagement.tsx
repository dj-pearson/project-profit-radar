import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const LeadManagement: React.FC = () => {
  return (
    <div className="container mx-auto py-6">
      <Card>
        <CardHeader>
          <CardTitle>Lead Management</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Lead management coming soon...</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default LeadManagement;