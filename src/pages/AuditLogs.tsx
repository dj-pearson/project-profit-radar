import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AccessibleTable, type TableColumn } from '@/components/accessibility/AccessibleTable';
import { Badge } from '@/components/ui/badge';
import { FileText } from 'lucide-react';

interface AuditLogEntry {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  resource: string;
  details: string;
}

const AuditLogs: React.FC = () => {
  const auditLogColumns: TableColumn<AuditLogEntry>[] = [
    {
      key: 'timestamp',
      header: 'Timestamp',
      sortable: true,
      render: (value) => (
        <span className="text-sm text-muted-foreground">
          {value ? new Date(value).toLocaleString() : '--'}
        </span>
      ),
    },
    {
      key: 'user',
      header: 'User',
      sortable: true,
      render: (value) => <span className="text-sm">{value || '--'}</span>,
    },
    {
      key: 'action',
      header: 'Action',
      sortable: true,
      render: (value) => (
        <Badge variant="outline">{value || '--'}</Badge>
      ),
    },
    {
      key: 'resource',
      header: 'Resource',
      sortable: true,
      hideOnMobile: true,
      render: (value) => <span className="text-sm font-mono">{value || '--'}</span>,
    },
    {
      key: 'details',
      header: 'Details',
      hideOnMobile: true,
      render: (value) => (
        <span className="text-sm text-muted-foreground">{value || '--'}</span>
      ),
    },
  ];

  return (
    <main className="container mx-auto py-6" role="main" aria-label="Audit Logs">
      <Card>
        <CardHeader>
          <CardTitle>Audit Logs</CardTitle>
        </CardHeader>
        <CardContent>
          <AccessibleTable<AuditLogEntry>
            caption="Audit Logs"
            hideCaption
            columns={auditLogColumns}
            data={[]}
            emptyContent={
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" aria-hidden="true" />
                <h3 className="text-lg font-medium mb-2">No Audit Logs Available</h3>
                <p className="text-muted-foreground">
                  Audit log entries will appear here once activity is recorded.
                </p>
              </div>
            }
          />
        </CardContent>
      </Card>
    </main>
  );
};

export default AuditLogs;