import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const BackupRestore: React.FC = () => {
  return (
    <div className="container mx-auto py-6">
      <Card>
        <CardHeader>
          <CardTitle>Backup & Restore</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Backup and restore coming soon...</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default BackupRestore;