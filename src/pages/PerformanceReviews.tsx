import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const PerformanceReviews: React.FC = () => {
  return (
    <main className="container mx-auto py-6" aria-label="Performance reviews settings">
      <Card>
        <CardHeader>
          <CardTitle>Performance Reviews</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Performance reviews coming soon...</p>
        </CardContent>
      </Card>
    </main>
  );
};

export default PerformanceReviews;