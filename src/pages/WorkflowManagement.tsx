import React, { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChangeOrderManagement } from '@/components/workflow/ChangeOrderManagement';
import { QualityControlManagement } from '@/components/workflow/QualityControlManagement';
import { RFISubmittalManagement } from '@/components/workflow/RFISubmittalManagement';
import { ClientCommunicationPortal } from '@/components/workflow/ClientCommunicationPortal';
import { Wrench, ClipboardCheck, MessageSquare, Users, TrendingUp, Clock, AlertTriangle, CheckCircle } from 'lucide-react';

const WorkflowManagement = () => {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <DashboardLayout title="Workflow Management">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Workflow Management</h1>
            <p className="text-muted-foreground">
              Streamline your construction workflows with integrated management tools
            </p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="change-orders">Change Orders</TabsTrigger>
            <TabsTrigger value="quality-control">Quality Control</TabsTrigger>
            <TabsTrigger value="rfi-submittals">RFIs & Submittals</TabsTrigger>
            <TabsTrigger value="client-portal">Client Portal</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Change Orders</CardTitle>
                  <Wrench className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">12</div>
                  <p className="text-xs text-muted-foreground">
                    3 pending approval
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Quality Inspections</CardTitle>
                  <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">8</div>
                  <p className="text-xs text-muted-foreground">
                    5 scheduled this week
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Open RFIs</CardTitle>
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">15</div>
                  <p className="text-xs text-muted-foreground">
                    2 high priority
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Client Communications</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">28</div>
                  <p className="text-xs text-muted-foreground">
                    This week
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Workflow Activity</CardTitle>
                  <CardDescription>Latest updates across all workflow areas</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        <Wrench className="h-5 w-5 text-blue-500" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">Change Order CO-2024-008 submitted</p>
                        <p className="text-xs text-muted-foreground">Kitchen layout modification - $2,500</p>
                      </div>
                      <Badge variant="default">New</Badge>
                    </div>

                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        <ClipboardCheck className="h-5 w-5 text-green-500" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">Final inspection completed</p>
                        <p className="text-xs text-muted-foreground">Foundation inspection - Passed</p>
                      </div>
                      <Badge variant="default">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Passed
                      </Badge>
                    </div>

                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        <MessageSquare className="h-5 w-5 text-yellow-500" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">RFI response received</p>
                        <p className="text-xs text-muted-foreground">Electrical outlet specifications clarified</p>
                      </div>
                      <Badge variant="default">Closed</Badge>
                    </div>

                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        <Users className="h-5 w-5 text-purple-500" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">Client update sent</p>
                        <p className="text-xs text-muted-foreground">Weekly progress report with photos</p>
                      </div>
                      <Badge variant="default">Sent</Badge>
                    </div>

                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        <AlertTriangle className="h-5 w-5 text-red-500" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">Punch list item added</p>
                        <p className="text-xs text-muted-foreground">Paint touch-up required in master bedroom</p>
                      </div>
                      <Badge variant="destructive">High</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Workflow Performance</CardTitle>
                  <CardDescription>Key performance indicators for your workflows</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">Avg. Change Order Approval</span>
                      </div>
                      <span className="text-sm font-medium">2.3 days</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-2">
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">Inspection Pass Rate</span>
                      </div>
                      <span className="text-sm font-medium">94%</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-2">
                        <MessageSquare className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">RFI Response Time</span>
                      </div>
                      <span className="text-sm font-medium">1.8 days</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">Client Satisfaction</span>
                      </div>
                      <span className="text-sm font-medium">4.8/5.0</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">Punch List Completion</span>
                      </div>
                      <span className="text-sm font-medium">87%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Workflow Areas</CardTitle>
                <CardDescription>Access different workflow management areas</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card 
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => setActiveTab('change-orders')}
                  >
                    <CardHeader className="text-center">
                      <Wrench className="h-8 w-8 mx-auto text-blue-500" />
                      <CardTitle className="text-lg">Change Orders</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground text-center">
                        Manage project changes, approvals, and cost impacts
                      </p>
                    </CardContent>
                  </Card>

                  <Card 
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => setActiveTab('quality-control')}
                  >
                    <CardHeader className="text-center">
                      <ClipboardCheck className="h-8 w-8 mx-auto text-green-500" />
                      <CardTitle className="text-lg">Quality Control</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground text-center">
                        Schedule inspections and manage punch lists
                      </p>
                    </CardContent>
                  </Card>

                  <Card 
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => setActiveTab('rfi-submittals')}
                  >
                    <CardHeader className="text-center">
                      <MessageSquare className="h-8 w-8 mx-auto text-yellow-500" />
                      <CardTitle className="text-lg">RFIs & Submittals</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground text-center">
                        Handle information requests and submittal workflows
                      </p>
                    </CardContent>
                  </Card>

                  <Card 
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => setActiveTab('client-portal')}
                  >
                    <CardHeader className="text-center">
                      <Users className="h-8 w-8 mx-auto text-purple-500" />
                      <CardTitle className="text-lg">Client Portal</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground text-center">
                        Communicate with clients and share updates
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="change-orders">
            <ChangeOrderManagement />
          </TabsContent>

          <TabsContent value="quality-control">
            <QualityControlManagement />
          </TabsContent>

          <TabsContent value="rfi-submittals">
            <RFISubmittalManagement />
          </TabsContent>

          <TabsContent value="client-portal">
            <ClientCommunicationPortal />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default WorkflowManagement;