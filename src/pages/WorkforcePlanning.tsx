import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const weekDays = ["Mon 2/24", "Tue 2/25", "Wed 2/26", "Thu 2/27", "Fri 2/28", "Sat 3/1"];

const resources = [
  {
    name: "Mike Johnson",
    role: "Project Manager",
    allocation: [
      { project: "Oak Ridge", hours: 8 },
      { project: "Oak Ridge", hours: 8 },
      { project: "Maple St", hours: 8 },
      { project: "Maple St", hours: 8 },
      { project: "Oak Ridge", hours: 8 },
      { project: null, hours: 0 },
    ],
    utilization: 100,
  },
  {
    name: "Sarah Chen",
    role: "Site Superintendent",
    allocation: [
      { project: "Oak Ridge", hours: 10 },
      { project: "Oak Ridge", hours: 10 },
      { project: "Oak Ridge", hours: 10 },
      { project: "Oak Ridge", hours: 10 },
      { project: "Oak Ridge", hours: 8 },
      { project: null, hours: 0 },
    ],
    utilization: 120,
  },
  {
    name: "Tom Rivera",
    role: "Foreman - Framing",
    allocation: [
      { project: "Harbor View", hours: 8 },
      { project: "Harbor View", hours: 8 },
      { project: "Harbor View", hours: 8 },
      { project: "Harbor View", hours: 8 },
      { project: "Harbor View", hours: 8 },
      { project: "Harbor View", hours: 4 },
    ],
    utilization: 110,
  },
  {
    name: "Carlos Mendez",
    role: "Electrician Lead",
    allocation: [
      { project: "Oak Ridge", hours: 8 },
      { project: "Oak Ridge", hours: 8 },
      { project: "Maple St", hours: 8 },
      { project: "Maple St", hours: 8 },
      { project: null, hours: 0 },
      { project: null, hours: 0 },
    ],
    utilization: 80,
  },
  {
    name: "Angela Foster",
    role: "Safety Coordinator",
    allocation: [
      { project: "All Sites", hours: 4 },
      { project: "All Sites", hours: 4 },
      { project: "All Sites", hours: 4 },
      { project: "All Sites", hours: 4 },
      { project: "All Sites", hours: 4 },
      { project: null, hours: 0 },
    ],
    utilization: 50,
  },
  {
    name: "James Wilson",
    role: "Plumber Lead",
    allocation: [
      { project: null, hours: 0 },
      { project: "Oak Ridge", hours: 8 },
      { project: "Oak Ridge", hours: 8 },
      { project: "Oak Ridge", hours: 8 },
      { project: "Oak Ridge", hours: 8 },
      { project: null, hours: 0 },
    ],
    utilization: 80,
  },
];

const upcomingNeeds = [
  {
    project: "Oak Ridge Residence",
    role: "Drywall Crew (4 workers)",
    startDate: "2026-03-03",
    duration: "2 weeks",
    status: "Confirmed",
  },
  {
    project: "Maple Street Office",
    role: "Structural Steel Crew (6 workers)",
    startDate: "2026-03-01",
    duration: "3 weeks",
    status: "Confirmed",
  },
  {
    project: "Harbor View Condos",
    role: "Concrete Crew (8 workers)",
    startDate: "2026-03-10",
    duration: "4 weeks",
    status: "Needed",
  },
  {
    project: "Oak Ridge Residence",
    role: "Painter (2 workers)",
    startDate: "2026-03-17",
    duration: "2 weeks",
    status: "Needed",
  },
  {
    project: "Maple Street Office",
    role: "Curtain Wall Installer (3 workers)",
    startDate: "2026-03-24",
    duration: "5 weeks",
    status: "Sourcing",
  },
];

const allocationColor = (project: string | null) => {
  if (!project) return "bg-muted text-muted-foreground";
  switch (project) {
    case "Oak Ridge":
      return "bg-blue-100 text-blue-800";
    case "Maple St":
      return "bg-green-100 text-green-800";
    case "Harbor View":
      return "bg-purple-100 text-purple-800";
    case "All Sites":
      return "bg-orange-100 text-orange-800";
    default:
      return "bg-muted text-muted-foreground";
  }
};

const utilizationBadge = (util: number) => {
  if (util > 100) return "destructive";
  if (util >= 80) return "default";
  return "secondary";
};

const statusBadgeVariant = (status: string) => {
  switch (status) {
    case "Confirmed":
      return "default";
    case "Sourcing":
      return "secondary";
    case "Needed":
      return "outline";
    default:
      return "outline";
  }
};

const WorkforcePlanning = () => {
  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Workforce Planning
          </h1>
          <p className="text-muted-foreground mt-2">
            Plan and manage crew allocation across projects
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">Previous Week</Button>
          <Button variant="outline">Next Week</Button>
          <Button>Add Resource</Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Workers</CardDescription>
            <CardTitle className="text-3xl">24</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Across all projects</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Avg Utilization</CardDescription>
            <CardTitle className="text-3xl">87%</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">This week</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Overallocated</CardDescription>
            <CardTitle className="text-3xl text-red-600">2</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Workers over 100%</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Available</CardDescription>
            <CardTitle className="text-3xl text-green-600">3</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Workers under 80%</p>
          </CardContent>
        </Card>
      </div>

      {/* Resource Allocation Grid */}
      <Card>
        <CardHeader>
          <CardTitle>Resource Allocation - Week of Feb 24, 2026</CardTitle>
          <CardDescription>
            Weekly crew assignments across active projects
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[180px]">Resource</TableHead>
                <TableHead className="w-[120px]">Role</TableHead>
                {weekDays.map((day) => (
                  <TableHead key={day} className="text-center">
                    {day}
                  </TableHead>
                ))}
                <TableHead className="text-center">Utilization</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {resources.map((resource) => (
                <TableRow key={resource.name}>
                  <TableCell className="font-medium">
                    {resource.name}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {resource.role}
                  </TableCell>
                  {resource.allocation.map((day, idx) => (
                    <TableCell key={idx} className="text-center p-1">
                      {day.project ? (
                        <div
                          className={`rounded px-2 py-1 text-xs font-medium ${allocationColor(
                            day.project
                          )}`}
                        >
                          <div>{day.project}</div>
                          <div className="text-[10px] opacity-70">
                            {day.hours}h
                          </div>
                        </div>
                      ) : (
                        <div className="rounded px-2 py-1 text-xs text-muted-foreground bg-muted/50">
                          Off
                        </div>
                      )}
                    </TableCell>
                  ))}
                  <TableCell className="text-center">
                    <Badge
                      variant={
                        utilizationBadge(resource.utilization) as
                          | "default"
                          | "secondary"
                          | "destructive"
                      }
                    >
                      {resource.utilization}%
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Upcoming Workforce Needs */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Upcoming Workforce Needs</CardTitle>
              <CardDescription>
                Planned crew requirements for the next 30 days
              </CardDescription>
            </div>
            <Button variant="outline" size="sm">
              View Calendar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Project</TableHead>
                <TableHead>Role / Crew</TableHead>
                <TableHead>Start Date</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {upcomingNeeds.map((need, idx) => (
                <TableRow key={idx}>
                  <TableCell className="font-medium">{need.project}</TableCell>
                  <TableCell>{need.role}</TableCell>
                  <TableCell>{need.startDate}</TableCell>
                  <TableCell>{need.duration}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        statusBadgeVariant(need.status) as
                          | "default"
                          | "secondary"
                          | "outline"
                      }
                    >
                      {need.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm">
                      Manage
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default WorkforcePlanning;
