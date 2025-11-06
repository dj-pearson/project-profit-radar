import { useCallback, useState, useEffect } from "react";
import { ReactFlow, MiniMap, Controls, Background, Node, Edge, addEdge, Connection, useNodesState, useEdgesState, BackgroundVariant } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Mail, Phone, MessageSquare, Clock, Webhook, Plus, Save, GitBranch, CheckCircle2, Edit, LayoutTemplate, Activity, TestTube, CalendarClock } from "lucide-react";
import { WorkflowTemplateLibrary } from "./WorkflowTemplateLibrary";
import { WorkflowAnalytics } from "./WorkflowAnalytics";
import { WorkflowTester } from "./WorkflowTester";
import { WorkflowScheduler } from "./WorkflowScheduler";

interface WorkflowBuilderProps {
  workflowId?: string;
}

const actionTypes = [
  { value: "send_email", label: "Send Email", icon: Mail },
  { value: "send_sms", label: "Send SMS", icon: Phone },
  { value: "create_activity", label: "Create Activity", icon: MessageSquare },
  { value: "update_field", label: "Update Field", icon: Plus },
  { value: "wait", label: "Wait/Delay", icon: Clock },
  { value: "webhook", label: "Webhook", icon: Webhook },
  { value: "condition", label: "Condition", icon: GitBranch },
];

const triggerTypes = [
  { value: "record_created", label: "When Record is Created" },
  { value: "record_updated", label: "When Record is Updated" },
  { value: "field_changed", label: "When Field Changes" },
  { value: "time_based", label: "Time-Based (Schedule)" },
  { value: "manual", label: "Manual Trigger" },
];

const initialNodes: Node[] = [
  {
    id: "trigger",
    type: "input",
    data: { label: "Trigger: Record Created" },
    position: { x: 250, y: 50 },
  },
];

export function WorkflowBuilder({ workflowId }: WorkflowBuilderProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [workflowName, setWorkflowName] = useState("");
  const [workflowDescription, setWorkflowDescription] = useState("");
  const [triggerType, setTriggerType] = useState("record_created");
  const [showTemplates, setShowTemplates] = useState(true);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showTester, setShowTester] = useState(false);
  const [showScheduler, setShowScheduler] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (nodes.length > 1) {
      setShowTemplates(false);
    }
  }, [nodes]);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const addActionNode = (actionType: string) => {
    const action = actionTypes.find((a) => a.value === actionType);
    const newNode: Node = {
      id: `${actionType}-${Date.now()}`,
      type: "default",
      data: { 
        label: action?.label || actionType,
        actionType,
        config: {}
      },
      position: { x: Math.random() * 400 + 100, y: Math.random() * 300 + 200 },
    };
    setNodes((nds) => [...nds, newNode]);
  };

  const loadTemplate = (template: any) => {
    setWorkflowName(template.name);
    setWorkflowDescription(template.description);
    setTriggerType(template.trigger_config.trigger_type);
    
    const templateNodes: Node[] = [
      {
        id: "trigger",
        type: "input",
        data: { label: `Trigger: ${template.trigger_config.trigger_type}` },
        position: { x: 250, y: 50 },
      },
      ...template.steps.map((step: any, index: number) => ({
        id: `${step.step_type}-${Date.now()}-${index}`,
        type: "default",
        data: {
          label: step.config.action_type || step.step_type,
          actionType: step.config.action_type,
          config: step.config
        },
        position: { x: 250, y: 200 + (index * 100) },
      }))
    ];

    setNodes(templateNodes);
    setEdges([]);
    setShowTemplates(false);
    toast({
      title: "Template loaded",
      description: "Customize and save your workflow.",
    });
  };

  const saveWorkflowMutation = useMutation({
    mutationFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Not authenticated");

      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", userData.user.id)
        .single();

      if (!profile) throw new Error("Profile not found");

      // Save workflow definition
      const { data: workflow, error: workflowError } = await supabase
        .from("workflow_definitions")
        .insert({
          company_id: profile.company_id,
          name: workflowName,
          description: workflowDescription,
          trigger_type: triggerType,
          trigger_config: {},
          created_by: userData.user.id,
          is_active: true,
        })
        .select()
        .single();

      if (workflowError) throw workflowError;

      // Save workflow steps
      const stepsToInsert = nodes
        .filter((node) => node.id !== "trigger")
        .map((node, index) => ({
          workflow_id: workflow.id,
          step_order: index,
          step_type: "action",
          action_type: node.data.actionType,
          action_config: node.data.config || {},
          position_x: node.position.x,
          position_y: node.position.y,
        }));

      if (stepsToInsert.length > 0) {
        const { error: stepsError } = await supabase
          .from("workflow_steps")
          .insert(stepsToInsert);

        if (stepsError) throw stepsError;
      }

      return workflow;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflows"] });
      toast({
        title: "Workflow saved successfully!",
        description: "Your automation workflow is now active.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to save workflow",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <div className="h-screen flex">
      {!showTemplates && (
        <>
          {/* Left Sidebar - Action Palette */}
          <div className="w-64 border-r bg-background p-4 space-y-4 overflow-y-auto">
        <div>
          <h3 className="font-semibold mb-2">Workflow Details</h3>
          <div className="space-y-3">
            <div>
              <Label htmlFor="workflow-name">Name</Label>
              <Input
                id="workflow-name"
                value={workflowName}
                onChange={(e) => setWorkflowName(e.target.value)}
                placeholder="My Workflow"
              />
            </div>
            <div>
              <Label htmlFor="workflow-desc">Description</Label>
              <Textarea
                id="workflow-desc"
                value={workflowDescription}
                onChange={(e) => setWorkflowDescription(e.target.value)}
                placeholder="What does this workflow do?"
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="trigger-type">Trigger</Label>
              <Select value={triggerType} onValueChange={setTriggerType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {triggerTypes.map((trigger) => (
                    <SelectItem key={trigger.value} value={trigger.value}>
                      {trigger.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t">
          <h3 className="font-semibold mb-2">Add Actions</h3>
          <div className="space-y-2">
            {actionTypes.map((action) => {
              const Icon = action.icon;
              return (
                <Button
                  key={action.value}
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => addActionNode(action.value)}
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {action.label}
                </Button>
              );
            })}
          </div>
        </div>

        <div className="pt-4 border-t space-y-2">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setShowTemplates(true)}
          >
            <LayoutTemplate className="h-4 w-4 mr-2" />
            Browse Templates
          </Button>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setShowAnalytics(true)}
          >
            <Activity className="h-4 w-4 mr-2" />
            View Analytics
          </Button>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setShowTester(true)}
          >
            <TestTube className="h-4 w-4 mr-2" />
            Test Workflow
          </Button>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setShowScheduler(true)}
          >
            <CalendarClock className="h-4 w-4 mr-2" />
            Schedule
          </Button>
          <Button
            className="w-full"
            onClick={() => saveWorkflowMutation.mutate()}
            disabled={!workflowName || saveWorkflowMutation.isPending}
          >
            <Save className="h-4 w-4 mr-2" />
            {saveWorkflowMutation.isPending ? "Saving..." : "Save Workflow"}
          </Button>
        </div>
      </div>
        </>
      )}

      {/* Main Canvas or Templates or Analytics or Tester or Scheduler */}
      {showTemplates ? (
        <div className="flex-1 p-8 overflow-auto">
          <div className="max-w-6xl mx-auto">
            <div className="mb-6">
              <Button variant="outline" onClick={() => setShowTemplates(false)}>
                ← Back to Canvas
              </Button>
            </div>
            <WorkflowTemplateLibrary onSelectTemplate={loadTemplate} />
          </div>
        </div>
      ) : showAnalytics ? (
        <div className="flex-1 p-8 overflow-auto">
          <div className="max-w-6xl mx-auto">
            <div className="mb-6">
              <Button variant="outline" onClick={() => setShowAnalytics(false)}>
                ← Back to Canvas
              </Button>
            </div>
            <WorkflowAnalytics workflowId={workflowId} />
          </div>
        </div>
      ) : showTester ? (
        <div className="flex-1 p-8 overflow-auto">
          <div className="max-w-6xl mx-auto h-full flex flex-col">
            <div className="mb-6">
              <Button variant="outline" onClick={() => setShowTester(false)}>
                ← Back to Canvas
              </Button>
            </div>
            <div className="flex-1 min-h-0">
              <WorkflowTester workflowId={workflowId} nodes={nodes} edges={edges} />
            </div>
          </div>
        </div>
      ) : showScheduler ? (
        <div className="flex-1 p-8 overflow-auto">
          <div className="max-w-4xl mx-auto">
            <div className="mb-6">
              <Button variant="outline" onClick={() => setShowScheduler(false)}>
                ← Back to Canvas
              </Button>
            </div>
            <WorkflowScheduler workflowId={workflowId} />
          </div>
        </div>
      ) : (
        <div className="flex-1 relative">
          <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={(_, node) => setSelectedNode(node)}
          fitView
        >
          <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
          <Controls />
          <MiniMap />
        </ReactFlow>
        </div>
      )}

      {/* Right Sidebar - Node Configuration */}
      {!showTemplates && !showAnalytics && !showTester && !showScheduler && selectedNode && selectedNode.id !== "trigger" && (
        <div className="w-80 border-l bg-background p-4 overflow-y-auto">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Configure Action</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Action Type</Label>
                <p className="text-sm text-muted-foreground">
                  {selectedNode.data.label}
                </p>
              </div>

              {selectedNode.data.actionType === "send_email" && (
                <>
                  <div>
                    <Label htmlFor="email-subject">Subject</Label>
                    <Input id="email-subject" placeholder="Email subject" />
                  </div>
                  <div>
                    <Label htmlFor="email-body">Body</Label>
                    <Textarea
                      id="email-body"
                      placeholder="Email content..."
                      rows={6}
                    />
                  </div>
                </>
              )}

              {selectedNode.data.actionType === "send_sms" && (
                <div>
                  <Label htmlFor="sms-message">Message</Label>
                  <Textarea
                    id="sms-message"
                    placeholder="SMS message (max 160 characters)"
                    rows={4}
                  />
                </div>
              )}

              {selectedNode.data.actionType === "wait" && (
                <>
                  <div>
                    <Label htmlFor="wait-duration">Duration</Label>
                    <Input id="wait-duration" type="number" placeholder="1" />
                  </div>
                  <div>
                    <Label htmlFor="wait-unit">Unit</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select unit" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="minutes">Minutes</SelectItem>
                        <SelectItem value="hours">Hours</SelectItem>
                        <SelectItem value="days">Days</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              {selectedNode.data.actionType === "webhook" && (
                <>
                  <div>
                    <Label htmlFor="webhook-url">Webhook URL</Label>
                    <Input
                      id="webhook-url"
                      placeholder="https://..."
                      type="url"
                    />
                  </div>
                  <div>
                    <Label htmlFor="webhook-method">Method</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="HTTP Method" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="GET">GET</SelectItem>
                        <SelectItem value="POST">POST</SelectItem>
                        <SelectItem value="PUT">PUT</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              {selectedNode.data.actionType === "condition" && (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Add conditions to control workflow branching. Connect the "true" and "false" outputs to different paths.
                  </p>
                  <div>
                    <Label>Field</Label>
                    <Input placeholder="status" />
                  </div>
                  <div>
                    <Label>Operator</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select operator" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="equals">Equals</SelectItem>
                        <SelectItem value="not_equals">Not Equals</SelectItem>
                        <SelectItem value="greater_than">Greater Than</SelectItem>
                        <SelectItem value="less_than">Less Than</SelectItem>
                        <SelectItem value="contains">Contains</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Value</Label>
                    <Input placeholder="completed" />
                  </div>
                </div>
              )}

              <Button variant="outline" className="w-full">
                Save Configuration
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
