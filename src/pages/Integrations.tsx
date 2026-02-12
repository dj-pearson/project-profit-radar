import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const Integrations: React.FC = () => {
  return (
    <main className="container mx-auto py-6" aria-label="Integrations settings">
      <Card>
        <CardHeader>
          <CardTitle>Integrations</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Integration management coming soon...</p>
        </CardContent>
      </Card>
    </main>
  );
};

export default Integrations;