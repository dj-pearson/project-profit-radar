import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { Activity, Search, Calendar } from 'lucide-react';

interface AuditLog {
  id: string;
  action_type: string;
  resource_type: string;
  resource_name?: string;
  user_id?: string;
  description?: string;
  created_at: string;
  metadata?: any;
}

const ActivityLogger = () => {
  const { userProfile } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadAuditLogs();
  }, [userProfile, filter]);

  const loadAuditLogs = async () => {
    if (!userProfile?.company_id) return;

    try {
      setLoading(true);
      
      let query = supabase
        .from('audit_logs')
        .select('*')
        .eq('company_id', userProfile.company_id)
        .order('created_at', { ascending: false })
        .limit(100);

      if (filter !== 'all') {
        query = query.eq('resource_type', filter);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error loading audit logs:', error);
        setLogs([]);
        return;
      }

      setLogs(data || []);
    } catch (error) {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };


  const getActionColor = (action: string) => {
    const colors = {
      create: 'bg-green-100 text-green-800',
      update: 'bg-blue-100 text-blue-800',
      delete: 'bg-red-100 text-red-800',
      view: 'bg-gray-100 text-gray-800'
    };
    return colors[action as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const filteredLogs = logs.filter(log =>
    log.resource_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2">
        <Activity className="h-5 w-5" />
        <h2 className="text-2xl font-semibold">Activity & Audit Logs</h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>System Activity</CardTitle>
          <CardDescription>
            Track all user actions and system changes
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex space-x-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search activity..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Resources</SelectItem>
                <SelectItem value="project">Projects</SelectItem>
                <SelectItem value="invoice">Invoices</SelectItem>
                <SelectItem value="document">Documents</SelectItem>
                <SelectItem value="user">Users</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {filteredLogs.map((log) => (
                <div key={log.id} className="p-3 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <Badge className={getActionColor(log.action_type)}>
                        {log.action_type}
                      </Badge>
                      <span className="font-medium">{log.resource_type}</span>
                      {log.resource_name && (
                        <span className="text-muted-foreground">• {log.resource_name}</span>
                      )}
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {new Date(log.created_at).toLocaleString()}
                    </span>
                  </div>
                  {log.description && (
                    <p className="text-sm text-muted-foreground">{log.description}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ActivityLogger;