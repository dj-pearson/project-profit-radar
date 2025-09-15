import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const QualityControl: React.FC = () => {
  return (
    <div className="container mx-auto py-6">
      <Card>
        <CardHeader>
          <CardTitle>Quality Control</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Quality control coming soon...</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default QualityControl;