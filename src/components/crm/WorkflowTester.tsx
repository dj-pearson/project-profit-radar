import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Play, StepForward, RotateCcw, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface WorkflowTesterProps {
  workflowId?: string;
  nodes: any[];
  edges: any[];
}

interface TestStep {
  id: string;
  nodeId: string;
  label: string;
  status: 'pending' | 'running' | 'success' | 'failed' | 'skipped';
  input?: any;
  output?: any;
  error?: string;
  duration?: number;
}

const mockDataTemplates = {
  contact: {
    id: 'contact-123',
    first_name: 'John',
    last_name: 'Doe',
    email: 'john.doe@example.com',
    phone: '+1234567890',
    company_name: 'Acme Corp',
    status: 'lead',
  },
  project: {
    id: 'project-456',
    name: 'Website Redesign',
    status: 'in_progress',
    budget: 50000,
    completion: 65,
  },
  invoice: {
    id: 'invoice-789',
    amount: 5000,
    status: 'pending',
    due_date: '2025-12-31',
  },
};

export function WorkflowTester({ workflowId, nodes, edges }: WorkflowTesterProps) {
  const [mockData, setMockData] = useState(JSON.stringify(mockDataTemplates.contact, null, 2));
  const [testSteps, setTestSteps] = useState<TestStep[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [testMode, setTestMode] = useState<'full' | 'step'>('full');

  const initializeTest = () => {
    try {
      JSON.parse(mockData);
    } catch {
      toast.error('Invalid JSON in mock data');
      return;
    }

    const steps: TestStep[] = nodes
      .filter(node => node.id !== 'trigger')
      .map(node => ({
        id: `step-${node.id}`,
        nodeId: node.id,
        label: node.data.label || node.data.actionType,
        status: 'pending' as const,
      }));

    setTestSteps(steps);
    setCurrentStep(0);
  };

  const runFullTest = async () => {
    initializeTest();
    setIsRunning(true);
    setTestMode('full');

    const steps = nodes.filter(node => node.id !== 'trigger');
    
    for (let i = 0; i < steps.length; i++) {
      await simulateStep(i);
      await new Promise(resolve => setTimeout(resolve, 800));
    }

    setIsRunning(false);
    toast.success('Test completed');
  };

  const runStepByStep = () => {
    if (testSteps.length === 0) {
      initializeTest();
      setTestMode('step');
      return;
    }

    if (currentStep < testSteps.length) {
      simulateStep(currentStep);
      setCurrentStep(prev => prev + 1);
    } else {
      toast.success('Test completed');
    }
  };

  const simulateStep = async (stepIndex: number) => {
    setTestSteps(prev => {
      const updated = [...prev];
      if (updated[stepIndex]) {
        updated[stepIndex] = { ...updated[stepIndex], status: 'running' };
      }
      return updated;
    });

    await new Promise(resolve => setTimeout(resolve, 500));

    const step = nodes.filter(n => n.id !== 'trigger')[stepIndex];
    const actionType = step?.data?.actionType;
    
    // Simulate different outcomes based on action type
    const success = Math.random() > 0.1; // 90% success rate

    setTestSteps(prev => {
      const updated = [...prev];
      if (updated[stepIndex]) {
        updated[stepIndex] = {
          ...updated[stepIndex],
          status: success ? 'success' : 'failed',
          duration: Math.floor(Math.random() * 500) + 100,
          output: success ? getSimulatedOutput(actionType) : undefined,
          error: success ? undefined : 'Simulated error: Action failed validation',
        };
      }
      return updated;
    });
  };

  const getSimulatedOutput = (actionType: string) => {
    switch (actionType) {
      case 'send_email':
        return { message_id: 'msg_' + Math.random().toString(36).substr(2, 9), status: 'sent' };
      case 'send_sms':
        return { sms_id: 'sms_' + Math.random().toString(36).substr(2, 9), status: 'delivered' };
      case 'webhook':
        return { status: 200, response: { success: true } };
      case 'wait':
        return { waited_ms: 1000 };
      case 'condition':
        return { result: Math.random() > 0.5, branch: 'true' };
      default:
        return { success: true };
    }
  };

  const resetTest = () => {
    setTestSteps([]);
    setCurrentStep(0);
    setIsRunning(false);
  };

  const loadMockTemplate = (template: keyof typeof mockDataTemplates) => {
    setMockData(JSON.stringify(mockDataTemplates[template], null, 2));
  };

  return (
    <div className="grid grid-cols-2 gap-6 h-full">
      {/* Left Panel - Mock Data Configuration */}
      <Card className="flex flex-col">
        <CardHeader>
          <CardTitle>Test Configuration</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col space-y-4">
          <div>
            <Label>Mock Data Templates</Label>
            <div className="flex gap-2 mt-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => loadMockTemplate('contact')}
              >
                Contact
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => loadMockTemplate('project')}
              >
                Project
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => loadMockTemplate('invoice')}
              >
                Invoice
              </Button>
            </div>
          </div>

          <div className="flex-1 flex flex-col">
            <Label htmlFor="mock-data">Trigger Data (JSON)</Label>
            <Textarea
              id="mock-data"
              value={mockData}
              onChange={(e) => setMockData(e.target.value)}
              className="flex-1 font-mono text-sm mt-2"
              placeholder='{"field": "value"}'
            />
          </div>

          <div className="flex gap-2">
            <Button
              onClick={runFullTest}
              disabled={isRunning || nodes.length <= 1}
              className="flex-1"
            >
              <Play className="h-4 w-4 mr-2" />
              Run Full Test
            </Button>
            <Button
              onClick={runStepByStep}
              disabled={isRunning || nodes.length <= 1}
              variant="outline"
              className="flex-1"
            >
              <StepForward className="h-4 w-4 mr-2" />
              Step by Step
            </Button>
            <Button
              onClick={resetTest}
              variant="outline"
              disabled={isRunning}
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>

          {nodes.length <= 1 && (
            <div className="p-3 bg-muted rounded-lg text-sm text-muted-foreground text-center">
              Add workflow actions to enable testing
            </div>
          )}
        </CardContent>
      </Card>

      {/* Right Panel - Test Results */}
      <Card className="flex flex-col">
        <CardHeader>
          <CardTitle>Test Results</CardTitle>
        </CardHeader>
        <CardContent className="flex-1">
          <ScrollArea className="h-full">
            {testSteps.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                <AlertCircle className="h-12 w-12 mb-4 opacity-50" />
                <p>No test results yet</p>
                <p className="text-sm">Run a test to see results here</p>
              </div>
            ) : (
              <div className="space-y-3">
                {testSteps.map((step, index) => (
                  <Card key={step.id} className={step.status === 'running' ? 'border-primary' : ''}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {step.status === 'pending' && (
                            <div className="h-5 w-5 rounded-full border-2" />
                          )}
                          {step.status === 'running' && (
                            <div className="h-5 w-5 rounded-full border-2 border-primary animate-pulse" />
                          )}
                          {step.status === 'success' && (
                            <CheckCircle2 className="h-5 w-5 text-green-500" />
                          )}
                          {step.status === 'failed' && (
                            <XCircle className="h-5 w-5 text-red-500" />
                          )}
                          <span className="font-medium">Step {index + 1}: {step.label}</span>
                        </div>
                        <Badge
                          variant={
                            step.status === 'success' ? 'default' :
                            step.status === 'failed' ? 'destructive' :
                            step.status === 'running' ? 'secondary' :
                            'outline'
                          }
                        >
                          {step.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    {(step.output || step.error || step.duration) && (
                      <CardContent className="pt-0">
                        {step.duration && (
                          <p className="text-xs text-muted-foreground mb-2">
                            Duration: {step.duration}ms
                          </p>
                        )}
                        {step.output && (
                          <div className="bg-muted p-2 rounded text-xs font-mono">
                            <pre>{JSON.stringify(step.output, null, 2)}</pre>
                          </div>
                        )}
                        {step.error && (
                          <div className="bg-destructive/10 border border-destructive/20 p-2 rounded text-xs text-destructive">
                            {step.error}
                          </div>
                        )}
                      </CardContent>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
