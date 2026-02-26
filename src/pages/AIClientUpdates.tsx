import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const generatedUpdates = [
  {
    id: 1,
    project: "Oak Ridge Residence",
    date: "2026-02-24",
    subject: "Weekly Progress Update - Week 24",
    status: "Draft",
    preview:
      "Dear John and Maria,\n\nGreat progress this week on your home! Here are the highlights:\n\n- Framing is now 100% complete, and the house is taking shape beautifully\n- Roofing crew has finished 95% of the shingle installation\n- Electrical rough-in is progressing well at 80% completion\n- The HVAC ductwork installation has begun in the first floor zones\n\nWe did experience a minor delay with the HVAC equipment delivery (3 days), but we have a recovery plan in place. Current budget utilization stands at 62%, well within projections.\n\nNext week we will focus on completing the roofing, advancing electrical work, and beginning plumbing rough-in on the second floor.\n\nPlease don't hesitate to reach out with any questions!",
    photos: 4,
    sentTo: null,
  },
  {
    id: 2,
    project: "Maple Street Office",
    date: "2026-02-24",
    subject: "Bi-Weekly Client Report - Feb 24",
    status: "Sent",
    preview:
      "Dear Maple Street Development Group,\n\nPlease find below the bi-weekly construction progress update for the Maple Street Office project:\n\nOverall Progress: 34% complete\n\nKey Milestones Achieved:\n- Foundation work completed on schedule\n- Structural steel erection is 60% complete\n- Underground utilities are fully installed\n\nUpcoming Activities:\n- Complete steel erection by March 5\n- Begin metal deck installation\n- Start curtain wall mockup review\n\nBudget Status: On track at 31% utilized ($465,000 of $1,500,000)\nSchedule Status: 2 days ahead of baseline\n\nA formal presentation is available upon request.",
    photos: 6,
    sentTo: "maple-dev@email.com",
  },
  {
    id: 3,
    project: "Harbor View Condos",
    date: "2026-02-23",
    subject: "Monthly Progress Report - February",
    status: "Approved",
    preview:
      "Dear Harbor View Investment Partners,\n\nFebruary Monthly Progress Summary:\n\nProject Phase: Early Construction (12% complete)\n\nAccomplishments This Month:\n- Completed site grading and erosion control measures\n- Foundation excavation is 75% complete\n- Received all structural steel shop drawing approvals\n- Secured all remaining building permits\n\nChallenges & Resolutions:\n- Weather delays totaling 4 days - schedule recovery plan activated\n- Minor design clarification needed for parking garage ramp - RFI submitted\n\nFinancial Summary:\n- Monthly spend: $180,000\n- Total to date: $360,000 of $3,000,000\n- Contingency utilized: 2%\n\nPhotos from the site are attached for your review.",
    photos: 8,
    sentTo: null,
  },
];

const generationControls = [
  { label: "Tone", options: ["Professional", "Friendly", "Formal", "Casual"], selected: "Professional" },
  { label: "Detail Level", options: ["Summary", "Standard", "Detailed", "Comprehensive"], selected: "Standard" },
  { label: "Include Photos", options: ["Yes", "No"], selected: "Yes" },
  { label: "Include Financials", options: ["Yes", "No", "Summary Only"], selected: "Summary Only" },
  { label: "Include Schedule", options: ["Yes", "No", "Summary Only"], selected: "Yes" },
  { label: "Frequency", options: ["Weekly", "Bi-Weekly", "Monthly", "Custom"], selected: "Weekly" },
];

const statusBadgeVariant = (status: string) => {
  switch (status) {
    case "Sent":
      return "default";
    case "Approved":
      return "secondary";
    case "Draft":
      return "outline";
    default:
      return "outline";
  }
};

const AIClientUpdates = () => {
  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            AI Client Updates
          </h1>
          <p className="text-muted-foreground mt-2">
            Generate AI-powered progress updates for clients based on real
            project data
          </p>
        </div>
        <Button>Generate New Update</Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        {/* Update Preview Cards */}
        <div className="space-y-4">
          <Tabs defaultValue="all">
            <TabsList>
              <TabsTrigger value="all">All Updates</TabsTrigger>
              <TabsTrigger value="drafts">Drafts</TabsTrigger>
              <TabsTrigger value="approved">Approved</TabsTrigger>
              <TabsTrigger value="sent">Sent</TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="mt-4 space-y-4">
              {generatedUpdates.map((update) => (
                <Card key={update.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <CardTitle className="text-base">
                          {update.subject}
                        </CardTitle>
                        <CardDescription>
                          {update.project} - {update.date}
                        </CardDescription>
                      </div>
                      <Badge
                        variant={
                          statusBadgeVariant(update.status) as
                            | "default"
                            | "secondary"
                            | "outline"
                        }
                      >
                        {update.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-muted/50 rounded-lg p-4">
                      <pre className="text-sm whitespace-pre-wrap font-sans leading-relaxed">
                        {update.preview}
                      </pre>
                    </div>
                    <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                      <span>{update.photos} photos attached</span>
                      {update.sentTo && (
                        <span>Sent to: {update.sentTo}</span>
                      )}
                    </div>
                  </CardContent>
                  <CardFooter className="gap-2">
                    <Button variant="outline" size="sm">
                      Edit
                    </Button>
                    <Button variant="outline" size="sm">
                      Regenerate
                    </Button>
                    {update.status === "Draft" && (
                      <Button size="sm">Approve & Send</Button>
                    )}
                    {update.status === "Approved" && (
                      <Button size="sm">Send to Client</Button>
                    )}
                    {update.status === "Sent" && (
                      <Button variant="outline" size="sm">
                        View Delivery Status
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="drafts" className="mt-4">
              {generatedUpdates
                .filter((u) => u.status === "Draft")
                .map((update) => (
                  <Card key={update.id}>
                    <CardHeader>
                      <CardTitle className="text-base">
                        {update.subject}
                      </CardTitle>
                      <CardDescription>{update.project}</CardDescription>
                    </CardHeader>
                    <CardFooter className="gap-2">
                      <Button variant="outline" size="sm">Edit</Button>
                      <Button size="sm">Approve & Send</Button>
                    </CardFooter>
                  </Card>
                ))}
            </TabsContent>

            <TabsContent value="approved" className="mt-4">
              {generatedUpdates
                .filter((u) => u.status === "Approved")
                .map((update) => (
                  <Card key={update.id}>
                    <CardHeader>
                      <CardTitle className="text-base">
                        {update.subject}
                      </CardTitle>
                      <CardDescription>{update.project}</CardDescription>
                    </CardHeader>
                    <CardFooter className="gap-2">
                      <Button variant="outline" size="sm">Edit</Button>
                      <Button size="sm">Send to Client</Button>
                    </CardFooter>
                  </Card>
                ))}
            </TabsContent>

            <TabsContent value="sent" className="mt-4">
              {generatedUpdates
                .filter((u) => u.status === "Sent")
                .map((update) => (
                  <Card key={update.id}>
                    <CardHeader>
                      <CardTitle className="text-base">
                        {update.subject}
                      </CardTitle>
                      <CardDescription>
                        {update.project} - Sent to {update.sentTo}
                      </CardDescription>
                    </CardHeader>
                    <CardFooter>
                      <Button variant="outline" size="sm">
                        View Delivery Status
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
            </TabsContent>
          </Tabs>
        </div>

        {/* Generation Controls Sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Generation Settings</CardTitle>
              <CardDescription>
                Configure how AI generates client updates
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {generationControls.map((control) => (
                <div key={control.label} className="space-y-2">
                  <label className="text-sm font-medium">
                    {control.label}
                  </label>
                  <div className="flex flex-wrap gap-1">
                    {control.options.map((option) => (
                      <Badge
                        key={option}
                        variant={
                          option === control.selected ? "default" : "outline"
                        }
                        className="cursor-pointer"
                      >
                        {option}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Auto-Generation</CardTitle>
              <CardDescription>
                Schedule automatic update generation
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status</span>
                <Badge variant="default">Active</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Schedule</span>
                <span>Every Monday 8:00 AM</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Projects</span>
                <span>3 active</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Last Run</span>
                <span>2026-02-24</span>
              </div>
            </CardContent>
            <CardFooter>
              <Button variant="outline" size="sm" className="w-full">
                Configure Schedule
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AIClientUpdates;
