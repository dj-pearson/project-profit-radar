import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertCircle } from 'lucide-react';

/**
 * US-370: this panel used to "run" a workflow by rolling Math.random() for each
 * step (90% success), inventing a duration and fake message ids, then toasting
 * "Test completed". Nothing was executed, so the green ticks meant nothing.
 *
 * There is no dry-run mode in the execute-workflow edge function, and a real
 * run sends real emails and SMS, so this panel does not execute anything. It
 * shows what can be known without running: the order steps would run in,
 * following the edges from the trigger, and which steps are not connected.
 */

interface WorkflowNode {
  id: string;
  data: { label?: string; actionType?: string };
  [key: string]: unknown;
}

interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  [key: string]: unknown;
}

interface WorkflowTesterProps {
  workflowId?: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}

interface PlannedStep {
  nodeId: string;
  label: string;
  actionType?: string;
  reachable: boolean;
}

/**
 * Breadth-first walk from the trigger node along edges. Steps reachable from
 * the trigger come first in walk order; anything else is listed after, flagged
 * unreachable, because it will never run.
 */
function planWorkflowSteps(nodes: WorkflowNode[], edges: WorkflowEdge[]): PlannedStep[] {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const children = new Map<string, string[]>();
  for (const e of edges) {
    children.set(e.source, [...(children.get(e.source) ?? []), e.target]);
  }

  const seen = new Set<string>(['trigger']);
  const order: string[] = [];
  const queue = [...(children.get('trigger') ?? [])];
  while (queue.length) {
    const id = queue.shift() as string;
    if (seen.has(id) || !byId.has(id)) continue;
    seen.add(id);
    order.push(id);
    queue.push(...(children.get(id) ?? []));
  }

  const toStep = (id: string, reachable: boolean): PlannedStep => {
    const node = byId.get(id) as WorkflowNode;
    return {
      nodeId: id,
      label: node.data.label || node.data.actionType || id,
      actionType: node.data.actionType,
      reachable,
    };
  };

  const unreachable = nodes.filter((n) => n.id !== 'trigger' && !seen.has(n.id)).map((n) => n.id);
  return [...order.map((id) => toStep(id, true)), ...unreachable.map((id) => toStep(id, false))];
}

export function WorkflowTester({ nodes, edges }: WorkflowTesterProps) {
  const steps = useMemo(() => planWorkflowSteps(nodes, edges), [nodes, edges]);

  return (
    <div className="grid grid-cols-2 gap-6 h-full">
      <Card className="flex flex-col">
        <CardHeader>
          <CardTitle>Test Runs</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            Test runs aren't available yet. Running a workflow sends real emails and SMS, and there is
            no sandbox mode to run it against sample data.
          </p>
          <p>
            The list on the right is the order your steps will run in when the trigger fires, worked
            out from the connections you've drawn. Nothing has been executed.
          </p>
        </CardContent>
      </Card>

      <Card className="flex flex-col">
        <CardHeader>
          <CardTitle>Run Order</CardTitle>
        </CardHeader>
        <CardContent className="flex-1">
          <ScrollArea className="h-full">
            {steps.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                <AlertCircle className="h-12 w-12 mb-4 opacity-50" />
                <p>No steps yet</p>
                <p className="text-sm">Add workflow actions to see their run order</p>
              </div>
            ) : (
              <ol className="space-y-3">
                {steps.map((step, index) => (
                  <li
                    key={step.nodeId}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <span className="font-medium">
                      {step.reachable ? `Step ${index + 1}: ` : ''}
                      {step.label}
                    </span>
                    {step.reachable ? (
                      <Badge variant="outline">not run</Badge>
                    ) : (
                      <Badge variant="destructive">not connected</Badge>
                    )}
                  </li>
                ))}
              </ol>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
