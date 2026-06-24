import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const ContactManagement: React.FC = () => {
  return (
    <main className="container mx-auto py-6" role="main" aria-label="Contact Management">
      <Card>
        <CardHeader>
          <CardTitle>Contact Management</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Contact management coming soon...</p>
        </CardContent>
      </Card>
    </main>
  );
};

export default ContactManagement;