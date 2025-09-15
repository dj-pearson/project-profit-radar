import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const InventoryManagement: React.FC = () => {
  return (
    <div className="container mx-auto py-6">
      <Card>
        <CardHeader>
          <CardTitle>Inventory Management</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Inventory management coming soon...</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default InventoryManagement;