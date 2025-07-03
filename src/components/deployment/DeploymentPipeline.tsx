import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { Settings, Activity, Bell, Calendar } from 'lucide-react';

interface DeploymentEnvironment {
  id: string;
  name: string;
  url?: string;
  status: 'active' | 'inactive' | 'building' | 'failed';
  lastDeploy: string;
  version: string;
  branch: string;
  health: 'healthy' | 'warning' | 'critical';
}

interface DeploymentPipeline {
  id: string;
  name: string;
  stages: DeploymentStage[];
  status: 'idle' | 'running' | 'success' | 'failed';
  lastRun: string;
}

interface DeploymentStage {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'success' | 'failed' | 'skipped';
  duration?: number;
  logs?: string[];
}

const DeploymentPipeline = () => {
  const [environments, setEnvironments] = useState<DeploymentEnvironment[]>([]);
  const [pipelines, setPipelines] = useState<DeploymentPipeline[]>([]);
  const [currentPipeline, setCurrentPipeline] = useState<string>('');
  const [deploying, setDeploying] = useState(false);
  const [deployProgress, setDeployProgress] = useState(0);

  const mockEnvironments: DeploymentEnvironment[] = [
    {
      id: 'dev',
      name: 'Development',
      url: 'https://dev.builddesk.app',
      status: 'active',
      lastDeploy: new Date(Date.now() - 3600000).toISOString(),
      version: 'v1.2.3-dev',
      branch: 'main',
      health: 'healthy'
    },
    {
      id: 'staging',
      name: 'Staging',
      url: 'https://staging.builddesk.app',
      status: 'active',
      lastDeploy: new Date(Date.now() - 7200000).toISOString(),
      version: 'v1.2.2',
      branch: 'release/v1.2.2',
      health: 'healthy'
    },
    {
      id: 'prod',
      name: 'Production',
      url: 'https://app.builddesk.com',
      status: 'active',
      lastDeploy: new Date(Date.now() - 86400000).toISOString(),
      version: 'v1.2.1',
      branch: 'release/v1.2.1',
      health: 'healthy'
    }
  ];

  const mockPipelines: DeploymentPipeline[] = [
    {
      id: 'main',
      name: 'Main Deployment Pipeline',
      status: 'idle',
      lastRun: new Date(Date.now() - 3600000).toISOString(),
      stages: [
        { id: 'test', name: 'Run Tests', status: 'success', duration: 120 },
        { id: 'build', name: 'Build Application', status: 'success', duration: 180 },
        { id: 'security', name: 'Security Scan', status: 'success', duration: 90 },
        { id: 'deploy-staging', name: 'Deploy to Staging', status: 'success', duration: 60 },
        { id: 'e2e-test', name: 'E2E Tests', status: 'success', duration: 300 },
        { id: 'deploy-prod', name: 'Deploy to Production', status: 'pending', duration: 0 }
      ]
    }
  ];

  useEffect(() => {
    setEnvironments(mockEnvironments);
    setPipelines(mockPipelines);
    setCurrentPipeline('main');
  }, []);

  const getStatusColor = (status: string) => {
    const colors = {
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-gray-100 text-gray-800',
      building: 'bg-yellow-100 text-yellow-800',
      failed: 'bg-red-100 text-red-800',
      running: 'bg-blue-100 text-blue-800',
      success: 'bg-green-100 text-green-800',
      idle: 'bg-gray-100 text-gray-800'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getHealthColor = (health: string) => {
    const colors = {
      healthy: 'bg-green-100 text-green-800',
      warning: 'bg-yellow-100 text-yellow-800',
      critical: 'bg-red-100 text-red-800'
    };
    return colors[health as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const startDeployment = async (environmentId: string) => {
    setDeploying(true);
    setDeployProgress(0);

    try {
      // Simulate deployment process
      const stages = ['Building', 'Testing', 'Security Scan', 'Deploying', 'Health Check'];
      
      for (let i = 0; i < stages.length; i++) {
        toast({
          title: "Deployment Progress",
          description: `${stages[i]}...`
        });

        // Simulate stage duration
        await new Promise(resolve => setTimeout(resolve, 2000));
        setDeployProgress(((i + 1) / stages.length) * 100);
      }

      // Update environment status
      setEnvironments(envs => envs.map(env => 
        env.id === environmentId 
          ? { 
              ...env, 
              status: 'active' as const, 
              lastDeploy: new Date().toISOString(),
              version: `v1.2.${Date.now().toString().slice(-3)}`
            }
          : env
      ));

      toast({
        title: "Deployment Complete",
        description: `Successfully deployed to ${environments.find(e => e.id === environmentId)?.name}`
      });

    } catch (error) {
      toast({
        variant: "destructive",
        title: "Deployment Failed",
        description: "An error occurred during deployment"
      });
    } finally {
      setDeploying(false);
      setDeployProgress(0);
    }
  };

  const rollbackDeployment = async (environmentId: string) => {
    toast({
      title: "Rolling Back",
      description: "Initiating rollback to previous version..."
    });

    // Simulate rollback
    setTimeout(() => {
      setEnvironments(envs => envs.map(env => 
        env.id === environmentId 
          ? { 
              ...env, 
              version: `v1.2.${parseInt(env.version.split('.')[2]) - 1}`,
              lastDeploy: new Date().toISOString()
            }
          : env
      ));

      toast({
        title: "Rollback Complete",
        description: "Successfully rolled back to previous version"
      });
    }, 3000);
  };

  const currentPipelineData = pipelines.find(p => p.id === currentPipeline);

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2">
        <Settings className="h-5 w-5" />
        <h2 className="text-2xl font-semibold">Deployment Pipeline</h2>
      </div>

      <Tabs defaultValue="environments" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="environments">Environments</TabsTrigger>
          <TabsTrigger value="pipeline">Pipeline Status</TabsTrigger>
          <TabsTrigger value="configuration">Configuration</TabsTrigger>
        </TabsList>

        <TabsContent value="environments" className="space-y-4">
          {/* Environment Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {environments.map((env) => (
              <Card key={env.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{env.name}</CardTitle>
                    <div className="flex space-x-2">
                      <Badge className={getStatusColor(env.status)}>
                        {env.status}
                      </Badge>
                      <Badge className={getHealthColor(env.health)}>
                        {env.health}
                      </Badge>
                    </div>
                  </div>
                  <CardDescription>
                    {env.url && (
                      <a href={env.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                        {env.url}
                      </a>
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Version:</span>
                      <span className="font-mono">{env.version}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Branch:</span>
                      <span className="font-mono">{env.branch}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Last Deploy:</span>
                      <span>{new Date(env.lastDeploy).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="flex space-x-2">
                    <Button 
                      size="sm" 
                      onClick={() => startDeployment(env.id)}
                      disabled={deploying}
                      className="flex-1"
                    >
                      Deploy
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => rollbackDeployment(env.id)}
                      disabled={deploying}
                    >
                      Rollback
                    </Button>
                  </div>

                  {deploying && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Deploying...</span>
                        <span>{Math.round(deployProgress)}%</span>
                      </div>
                      <Progress value={deployProgress} />
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="pipeline" className="space-y-4">
          {/* Pipeline Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Activity className="h-4 w-4" />
                <span>Pipeline Status</span>
              </CardTitle>
              <CardDescription>
                Current deployment pipeline execution status
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {currentPipelineData && (
                <>
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium">{currentPipelineData.name}</h3>
                    <div className="flex items-center space-x-2">
                      <Badge className={getStatusColor(currentPipelineData.status)}>
                        {currentPipelineData.status}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        Last run: {new Date(currentPipelineData.lastRun).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {currentPipelineData.stages.map((stage, index) => (
                      <div key={stage.id} className="flex items-center space-x-4 p-3 border rounded-lg">
                        <div className="flex items-center space-x-2 flex-1">
                          <div className={`w-3 h-3 rounded-full ${
                            stage.status === 'success' ? 'bg-green-500' :
                            stage.status === 'running' ? 'bg-blue-500 animate-pulse' :
                            stage.status === 'failed' ? 'bg-red-500' :
                            stage.status === 'pending' ? 'bg-gray-300' :
                            'bg-yellow-500'
                          }`} />
                          <span className="font-medium">{stage.name}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge className={getStatusColor(stage.status)}>
                            {stage.status}
                          </Badge>
                          {stage.duration && stage.duration > 0 && (
                            <span className="text-sm text-muted-foreground">
                              {stage.duration}s
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex space-x-2">
                    <Button>Run Pipeline</Button>
                    <Button variant="outline">View Logs</Button>
                    <Button variant="outline">Edit Pipeline</Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="configuration" className="space-y-4">
          {/* Configuration */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Deploy Settings</CardTitle>
                <CardDescription>
                  Configure deployment behavior and settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="deploy-strategy">Deployment Strategy</Label>
                  <Select defaultValue="rolling">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="rolling">Rolling Deployment</SelectItem>
                      <SelectItem value="blue-green">Blue-Green Deployment</SelectItem>
                      <SelectItem value="canary">Canary Deployment</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="auto-rollback">Auto-rollback on Failure</Label>
                  <Select defaultValue="enabled">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="enabled">Enabled</SelectItem>
                      <SelectItem value="disabled">Disabled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="health-check-timeout">Health Check Timeout (seconds)</Label>
                  <Input
                    id="health-check-timeout"
                    type="number"
                    defaultValue="300"
                    placeholder="300"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Environment Variables</CardTitle>
                <CardDescription>
                  Manage environment-specific configuration
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-2 bg-muted rounded">
                    <span className="font-mono text-sm">NODE_ENV</span>
                    <span className="text-sm">production</span>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-muted rounded">
                    <span className="font-mono text-sm">API_URL</span>
                    <span className="text-sm">https://api.builddesk.com</span>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-muted rounded">
                    <span className="font-mono text-sm">CDN_URL</span>
                    <span className="text-sm">https://cdn.builddesk.com</span>
                  </div>
                </div>

                <Button variant="outline" className="w-full">
                  Manage Variables
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DeploymentPipeline;