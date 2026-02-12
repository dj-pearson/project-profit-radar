import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const UserManagement: React.FC = () => {
  return (
    <main className="container mx-auto py-6" aria-label="User management settings">
      <Card>
        <CardHeader>
          <CardTitle>User Management</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">User management coming soon...</p>
        </CardContent>
      </Card>
    </main>
  );
};

export default UserManagement;