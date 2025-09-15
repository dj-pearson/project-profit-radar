import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const PerformanceReviews: React.FC = () => {
  return (
    <div className="container mx-auto py-6">
      <Card>
        <CardHeader>
          <CardTitle>Performance Reviews</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Performance reviews coming soon...</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default PerformanceReviews;