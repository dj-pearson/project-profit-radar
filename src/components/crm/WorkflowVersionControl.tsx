import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { History, RotateCcw, Eye, GitBranch, Clock, User, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';

interface WorkflowVersion {
  id: string;
  version: number;
  name: string;
  description?: string;
  workflowData: any;
  createdBy: string;
  createdAt: Date;
  changesSummary?: string;
  isCurrent: boolean;
}

interface WorkflowVersionControlProps {
  workflowId?: string;
  currentWorkflowData: any;
  onRestore: (versionData: any) => void;
}

export function WorkflowVersionControl({
  workflowId,
  currentWorkflowData,
  onRestore,
}: WorkflowVersionControlProps) {
  const [versions, setVersions] = useState<WorkflowVersion[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<WorkflowVersion | null>(null);
  const [loading, setLoading] = useState(false);
  const [compareMode, setCompareMode] = useState(false);

  useEffect(() => {
    if (workflowId) {
      loadVersions();
    }
  }, [workflowId]);

  const loadVersions = async () => {
    if (!workflowId) return;
    
    setLoading(true);
    try {
      // In a real implementation, this would fetch from a workflow_versions table
      // For now, we'll simulate with mock data
      const mockVersions: WorkflowVersion[] = [
        {
          id: 'v1',
          version: 3,
          name: 'Current Version',
          workflowData: currentWorkflowData,
          createdBy: 'John Doe',
          createdAt: new Date(),
          changesSummary: 'Added SMS notification step',
          isCurrent: true,
        },
        {
          id: 'v2',
          version: 2,
          name: 'Version 2',
          workflowData: { nodes: [], edges: [] },
          createdBy: 'John Doe',
          createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
          changesSummary: 'Updated email template and added delay',
          isCurrent: false,
        },
        {
          id: 'v3',
          version: 1,
          name: 'Initial Version',
          workflowData: { nodes: [], edges: [] },
          createdBy: 'Jane Smith',
          createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
          changesSummary: 'Initial workflow creation',
          isCurrent: false,
        },
      ];

      setVersions(mockVersions);
    } finally {
      setLoading(false);
    }
  };

  const saveNewVersion = async (changesSummary: string) => {
    if (!workflowId) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // In a real implementation, this would save to workflow_versions table
      const newVersion: WorkflowVersion = {
        id: `v${Date.now()}`,
        version: versions.length + 1,
        name: `Version ${versions.length + 1}`,
        workflowData: currentWorkflowData,
        createdBy: user.email || 'Unknown',
        createdAt: new Date(),
        changesSummary,
        isCurrent: true,
      };

      setVersions([newVersion, ...versions.map(v => ({ ...v, isCurrent: false }))]);
      toast.success('New version saved');
    } catch (error: any) {
      console.error('Failed to save version:', error);
      toast.error('Failed to save version');
    }
  };

  const restoreVersion = (version: WorkflowVersion) => {
    onRestore(version.workflowData);
    
    const updatedVersions = versions.map(v => ({
      ...v,
      isCurrent: v.id === version.id,
    }));
    setVersions(updatedVersions);
    
    toast.success(`Restored to version ${version.version}`);
  };

  const getChangesBetweenVersions = (v1: WorkflowVersion, v2: WorkflowVersion) => {
    const changes: string[] = [];
    
    const nodes1 = v1.workflowData?.nodes?.length || 0;
    const nodes2 = v2.workflowData?.nodes?.length || 0;
    
    if (nodes1 !== nodes2) {
      changes.push(`${Math.abs(nodes2 - nodes1)} step${Math.abs(nodes2 - nodes1) > 1 ? 's' : ''} ${nodes2 > nodes1 ? 'added' : 'removed'}`);
    }
    
    return changes.length > 0 ? changes : ['No structural changes'];
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="h-5 w-5" />
            <CardTitle>Version History</CardTitle>
          </div>
          <Button
            size="sm"
            onClick={() => setCompareMode(!compareMode)}
            variant="outline"
          >
            <GitBranch className="h-4 w-4 mr-2" />
            {compareMode ? 'Exit Compare' : 'Compare'}
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-20 bg-muted animate-pulse rounded" />
              ))}
            </div>
          ) : versions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <History className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No version history yet</p>
              <p className="text-sm">Versions will appear here as you make changes</p>
            </div>
          ) : (
            <ScrollArea className="h-[500px]">
              <div className="space-y-3 pr-4">
                {versions.map((version, index) => (
                  <Card key={version.id} className={version.isCurrent ? 'border-primary' : ''}>
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant={version.isCurrent ? 'default' : 'outline'}>
                              v{version.version}
                            </Badge>
                            {version.isCurrent && (
                              <Badge variant="secondary">Current</Badge>
                            )}
                          </div>
                          
                          <h4 className="font-semibold mb-1">{version.name}</h4>
                          
                          {version.changesSummary && (
                            <p className="text-sm text-muted-foreground mb-2">
                              {version.changesSummary}
                            </p>
                          )}
                          
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {version.createdBy}
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {format(version.createdAt, 'MMM d, yyyy h:mm a')}
                            </div>
                          </div>

                          {index < versions.length - 1 && (
                            <div className="mt-3 pt-3 border-t">
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <ChevronRight className="h-3 w-3" />
                                <span className="font-medium">Changes from previous:</span>
                                {getChangesBetweenVersions(versions[index + 1], version).map((change, i) => (
                                  <Badge key={i} variant="outline" className="text-xs">
                                    {change}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="flex gap-2 ml-4">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedVersion(version)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl">
                              <DialogHeader>
                                <DialogTitle>Version {version.version} Details</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div>
                                  <h4 className="font-medium mb-2">Workflow Configuration</h4>
                                  <div className="bg-muted p-3 rounded text-sm">
                                    <p>Steps: {version.workflowData?.nodes?.length || 0}</p>
                                    <p>Connections: {version.workflowData?.edges?.length || 0}</p>
                                  </div>
                                </div>
                                
                                <div>
                                  <h4 className="font-medium mb-2">Metadata</h4>
                                  <div className="space-y-1 text-sm">
                                    <p><span className="text-muted-foreground">Created by:</span> {version.createdBy}</p>
                                    <p><span className="text-muted-foreground">Date:</span> {format(version.createdAt, 'PPpp')}</p>
                                    <p><span className="text-muted-foreground">Summary:</span> {version.changesSummary || 'No description'}</p>
                                  </div>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>

                          {!version.isCurrent && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => restoreVersion(version)}
                            >
                              <RotateCcw className="h-4 w-4 mr-2" />
                              Restore
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {compareMode && versions.length >= 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Compare Versions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium mb-2">Version {versions[0].version}</h4>
                <div className="bg-muted p-3 rounded text-sm space-y-1">
                  <p>Steps: {versions[0].workflowData?.nodes?.length || 0}</p>
                  <p>Connections: {versions[0].workflowData?.edges?.length || 0}</p>
                  <p className="text-muted-foreground">{versions[0].changesSummary}</p>
                </div>
              </div>
              <div>
                <h4 className="font-medium mb-2">Version {versions[1].version}</h4>
                <div className="bg-muted p-3 rounded text-sm space-y-1">
                  <p>Steps: {versions[1].workflowData?.nodes?.length || 0}</p>
                  <p>Connections: {versions[1].workflowData?.edges?.length || 0}</p>
                  <p className="text-muted-foreground">{versions[1].changesSummary}</p>
                </div>
              </div>
            </div>
            
            <div className="mt-4 p-3 bg-muted rounded">
              <h4 className="font-medium mb-2">Differences</h4>
              <div className="space-y-1 text-sm">
                {getChangesBetweenVersions(versions[1], versions[0]).map((change, i) => (
                  <p key={i}>• {change}</p>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
