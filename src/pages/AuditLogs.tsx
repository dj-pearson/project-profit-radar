import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const AuditLogs: React.FC = () => {
  return (
    <main className="container mx-auto py-6" role="main" aria-label="Audit Logs">
      <Card>
        <CardHeader>
          <CardTitle>Audit Logs</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Audit logs coming soon...</p>
        </CardContent>
      </Card>
    </main>
  );
};

export default AuditLogs;