import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const VendorManagement: React.FC = () => {
  return (
    <main className="container mx-auto py-6" aria-label="Vendor management">
      <Card>
        <CardHeader>
          <CardTitle>Vendor Management</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Vendor management coming soon...</p>
        </CardContent>
      </Card>
    </main>
  );
};

export default VendorManagement;