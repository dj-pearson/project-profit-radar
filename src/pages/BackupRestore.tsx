import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const BackupRestore: React.FC = () => {
  return (
    <main className="container mx-auto py-6" aria-label="Backup and restore settings">
      <Card>
        <CardHeader>
          <CardTitle>Backup & Restore</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Backup and restore coming soon...</p>
        </CardContent>
      </Card>
    </main>
  );
};

export default BackupRestore;