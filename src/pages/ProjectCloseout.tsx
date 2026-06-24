import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

const closeoutChecklist = [
  {
    category: "Final Inspections",
    items: [
      { name: "Building Department Final Inspection", status: "Completed", date: "2026-02-20" },
      { name: "Fire Marshal Inspection", status: "Completed", date: "2026-02-18" },
      { name: "Mechanical Inspection", status: "In Progress", date: null },
      { name: "Electrical Final Inspection", status: "Pending", date: null },
      { name: "Plumbing Final Inspection", status: "Pending", date: null },
    ],
  },
  {
    category: "Documentation",
    items: [
      { name: "As-Built Drawings", status: "In Progress", date: null },
      { name: "O&M Manuals", status: "Completed", date: "2026-02-15" },
      { name: "Warranty Documentation", status: "In Progress", date: null },
      { name: "Equipment Manuals & Cut Sheets", status: "Completed", date: "2026-02-10" },
      { name: "Test & Balance Reports", status: "Pending", date: null },
      { name: "Certificate of Occupancy", status: "Pending", date: null },
    ],
  },
  {
    category: "Financial Closeout",
    items: [
      { name: "Final Pay Application", status: "In Progress", date: null },
      { name: "Final Change Order Log", status: "Completed", date: "2026-02-19" },
      { name: "Lien Waivers (All Subs)", status: "In Progress", date: null },
      { name: "Retainage Release", status: "Pending", date: null },
      { name: "Final Cost Reconciliation", status: "Pending", date: null },
    ],
  },
  {
    category: "Punch List & Completion",
    items: [
      { name: "Punch List Generation", status: "Completed", date: "2026-02-12" },
      { name: "Punch List Items Resolved", status: "In Progress", date: null },
      { name: "Owner Walkthrough", status: "Pending", date: null },
      { name: "Final Cleaning", status: "Pending", date: null },
      { name: "Key & Access Card Turnover", status: "Pending", date: null },
    ],
  },
  {
    category: "Training & Handover",
    items: [
      { name: "HVAC System Training", status: "Completed", date: "2026-02-14" },
      { name: "Fire Alarm System Training", status: "Pending", date: null },
      { name: "Building Automation Training", status: "Pending", date: null },
      { name: "Maintenance Schedule Handover", status: "In Progress", date: null },
    ],
  },
];

const statusBadgeVariant = (status: string) => {
  switch (status) {
    case "Completed":
      return "default";
    case "In Progress":
      return "secondary";
    case "Pending":
      return "outline";
    default:
      return "outline";
  }
};

const allItems = closeoutChecklist.flatMap((c) => c.items);
const completedCount = allItems.filter((i) => i.status === "Completed").length;
const inProgressCount = allItems.filter((i) => i.status === "In Progress").length;
const pendingCount = allItems.filter((i) => i.status === "Pending").length;
const totalItems = allItems.length;
const overallProgress = Math.round((completedCount / totalItems) * 100);

const ProjectCloseout = () => {
  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Project Closeout
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage project closeout tasks, documentation, and handover
          </p>
        </div>
        <Button>Generate Report</Button>
      </div>

      {/* Overall Progress */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Closeout Progress</CardTitle>
              <CardDescription>Oak Ridge Residence - Overall completion status</CardDescription>
            </div>
            <span className="text-2xl font-bold">{overallProgress}%</span>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Progress value={overallProgress} className="h-3" />
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-green-600">{completedCount}</p>
              <p className="text-sm text-muted-foreground">Completed</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-600">{inProgressCount}</p>
              <p className="text-sm text-muted-foreground">In Progress</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-orange-600">{pendingCount}</p>
              <p className="text-sm text-muted-foreground">Pending</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Closeout Checklist by Category */}
      <div className="space-y-4">
        {closeoutChecklist.map((category) => {
          const catCompleted = category.items.filter((i) => i.status === "Completed").length;
          const catTotal = category.items.length;
          const catProgress = Math.round((catCompleted / catTotal) * 100);

          return (
            <Card key={category.category}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">
                      {category.category}
                    </CardTitle>
                    <CardDescription>
                      {catCompleted} of {catTotal} items completed
                    </CardDescription>
                  </div>
                  <Badge
                    variant={
                      catProgress === 100
                        ? "default"
                        : catProgress > 0
                        ? "secondary"
                        : "outline"
                    }
                  >
                    {catProgress}%
                  </Badge>
                </div>
                <Progress value={catProgress} className="h-2 mt-2" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {category.items.map((item) => (
                    <div
                      key={item.name}
                      className="flex items-center justify-between p-3 rounded-lg border"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                            item.status === "Completed"
                              ? "bg-green-500 border-green-500 text-white"
                              : item.status === "In Progress"
                              ? "border-blue-500"
                              : "border-muted-foreground/30"
                          }`}
                        >
                          {item.status === "Completed" && (
                            <span className="text-xs">&#x2713;</span>
                          )}
                        </div>
                        <div>
                          <p
                            className={`text-sm font-medium ${
                              item.status === "Completed"
                                ? "line-through text-muted-foreground"
                                : ""
                            }`}
                          >
                            {item.name}
                          </p>
                          {item.date && (
                            <p className="text-xs text-muted-foreground">
                              Completed {item.date}
                            </p>
                          )}
                        </div>
                      </div>
                      <Badge
                        variant={
                          statusBadgeVariant(item.status) as
                            | "default"
                            | "secondary"
                            | "outline"
                        }
                      >
                        {item.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default ProjectCloseout;
