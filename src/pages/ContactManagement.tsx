import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const ContactManagement: React.FC = () => {
  return (
    <div className="container mx-auto py-6">
      <Card>
        <CardHeader>
          <CardTitle>Contact Management</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Contact management coming soon...</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default ContactManagement;