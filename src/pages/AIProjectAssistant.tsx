import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

const initialMessages = [
  {
    id: 1,
    role: "assistant" as const,
    content:
      "Hello! I'm your AI Project Assistant. I can help you with project scheduling, cost estimates, material calculations, safety compliance questions, and more. How can I help you today?",
    timestamp: "10:00 AM",
  },
  {
    id: 2,
    role: "user" as const,
    content:
      "What's the current status of the Oak Ridge Residence project?",
    timestamp: "10:02 AM",
  },
  {
    id: 3,
    role: "assistant" as const,
    content:
      "The Oak Ridge Residence project is currently 68% complete. Here's a quick summary:\n\n- Foundation: 100% complete\n- Framing: 100% complete\n- Roofing: 95% complete\n- Electrical rough-in: 80% complete\n- Plumbing rough-in: 75% complete\n- HVAC installation: 60% complete\n- Drywall: 40% complete\n\nThe project is currently 3 days behind schedule due to material delivery delays for the HVAC system. Budget utilization is at 62% ($186,400 of $300,000). Would you like me to provide more details on any specific area?",
    timestamp: "10:02 AM",
  },
  {
    id: 4,
    role: "user" as const,
    content: "Can you suggest ways to get back on schedule?",
    timestamp: "10:05 AM",
  },
  {
    id: 5,
    role: "assistant" as const,
    content:
      "Based on the current project timeline, here are my recommendations to recover the 3-day delay:\n\n1. **Parallel Work Streams**: Start drywall installation in completed areas while HVAC rough-in continues in other zones. This could save 2 days.\n\n2. **Expedited HVAC Delivery**: Contact the supplier about expedited shipping for remaining components. The cost increase (~$800) is significantly less than the delay penalty.\n\n3. **Weekend Crew**: Schedule a Saturday crew for electrical completion. Estimated overtime cost: $2,400, but recovers a full day.\n\n4. **Adjusted Sequencing**: Begin exterior painting and siding work now instead of waiting for interior completion.\n\nEstimated recovery: 3-4 days, bringing the project back on track. Estimated additional cost: $3,200. Shall I create a revised schedule with these changes?",
    timestamp: "10:05 AM",
  },
];

const quickActions = [
  "Project Status Summary",
  "Budget vs Actual Report",
  "Weather Impact Analysis",
  "Material Cost Estimate",
  "Schedule Optimization",
  "Safety Checklist Review",
  "Subcontractor Performance",
  "Change Order Impact",
];

const AIProjectAssistant = () => {
  const [messages] = useState(initialMessages);
  const [inputValue, setInputValue] = useState("");

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          AI Project Assistant
        </h1>
        <p className="text-muted-foreground mt-2">
          Get intelligent insights and recommendations for your construction
          projects
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
        {/* Chat Interface */}
        <Card className="flex flex-col">
          <CardHeader className="pb-3 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-lg font-bold text-primary">AI</span>
                </div>
                <div>
                  <CardTitle className="text-base">BuildDesk AI</CardTitle>
                  <CardDescription>
                    Construction project intelligence
                  </CardDescription>
                </div>
              </div>
              <Badge variant="default">Online</Badge>
            </div>
          </CardHeader>
          <CardContent className="flex-1 p-4 space-y-4 min-h-[400px] max-h-[500px] overflow-y-auto">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}
                >
                  <p className="text-sm whitespace-pre-line">
                    {message.content}
                  </p>
                  <p
                    className={`text-xs mt-1 ${
                      message.role === "user"
                        ? "text-primary-foreground/70"
                        : "text-muted-foreground"
                    }`}
                  >
                    {message.timestamp}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
          <div className="p-4 border-t">
            <div className="flex gap-2">
              <Input
                placeholder="Ask about your projects..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                className="flex-1"
              />
              <Button>Send</Button>
            </div>
          </div>
        </Card>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Quick Actions */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Quick Actions</CardTitle>
              <CardDescription>
                Common requests to get you started
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {quickActions.map((action) => (
                <Button
                  key={action}
                  variant="outline"
                  size="sm"
                  className="w-full justify-start text-left h-auto py-2"
                >
                  {action}
                </Button>
              ))}
            </CardContent>
          </Card>

          {/* Active Projects */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Active Projects</CardTitle>
              <CardDescription>Select a project context</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {[
                { name: "Oak Ridge Residence", progress: 68 },
                { name: "Maple Street Office", progress: 34 },
                { name: "Harbor View Condos", progress: 12 },
              ].map((project) => (
                <div
                  key={project.name}
                  className="p-2 rounded-md border hover:bg-muted/50 cursor-pointer transition-colors"
                >
                  <p className="text-sm font-medium">{project.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {project.progress}% complete
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* AI Capabilities */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">AI Capabilities</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>- Project status analysis</p>
                <p>- Cost estimation support</p>
                <p>- Schedule optimization</p>
                <p>- Risk identification</p>
                <p>- Material calculations</p>
                <p>- Safety compliance checks</p>
                <p>- Weather impact forecasting</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AIProjectAssistant;
