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

const stats = [
  { label: "Total RFIs", value: 38, color: "text-foreground" },
  { label: "Open", value: 7, color: "text-blue-600" },
  { label: "Answered", value: 26, color: "text-green-600" },
  { label: "Overdue", value: 3, color: "text-red-600" },
  { label: "Avg Response Time", value: "4.2d", color: "text-orange-600" },
];

const rfis = [
  {
    id: "RFI-038",
    subject: "Structural beam size clarification at grid line C-4",
    project: "Oak Ridge Residence",
    submittedBy: "Mike Johnson (GC)",
    assignedTo: "Eng. Sarah Chen",
    dateSubmitted: "2026-02-23",
    dateDue: "2026-03-02",
    status: "Open",
    priority: "High",
    specSection: "05 12 00",
  },
  {
    id: "RFI-037",
    subject: "Window sill detail at brick veneer transition",
    project: "Oak Ridge Residence",
    submittedBy: "Tom Rivera (Field)",
    assignedTo: "Arch. Lisa Park",
    dateSubmitted: "2026-02-22",
    dateDue: "2026-03-01",
    status: "Open",
    priority: "Medium",
    specSection: "08 51 13",
  },
  {
    id: "RFI-036",
    subject: "Electrical panel location conflict with mechanical duct",
    project: "Maple Street Office",
    submittedBy: "James Wilson (Elec)",
    assignedTo: "Eng. Sarah Chen",
    dateSubmitted: "2026-02-21",
    dateDue: "2026-02-28",
    status: "Answered",
    priority: "High",
    specSection: "26 24 16",
    responseDate: "2026-02-24",
  },
  {
    id: "RFI-035",
    subject: "Concrete mix design for exposed aggregate walkway",
    project: "Harbor View Condos",
    submittedBy: "Carlos Mendez (Sub)",
    assignedTo: "Eng. Sarah Chen",
    dateSubmitted: "2026-02-19",
    dateDue: "2026-02-26",
    status: "Overdue",
    priority: "Medium",
    specSection: "03 30 00",
  },
  {
    id: "RFI-034",
    subject: "Fire rated assembly detail at elevator shaft",
    project: "Maple Street Office",
    submittedBy: "Mike Johnson (GC)",
    assignedTo: "Arch. Lisa Park",
    dateSubmitted: "2026-02-18",
    dateDue: "2026-02-25",
    status: "Answered",
    priority: "High",
    specSection: "07 84 00",
    responseDate: "2026-02-22",
  },
  {
    id: "RFI-033",
    subject: "Handrail mounting detail for exterior stairs",
    project: "Oak Ridge Residence",
    submittedBy: "Tom Rivera (Field)",
    assignedTo: "Arch. Lisa Park",
    dateSubmitted: "2026-02-17",
    dateDue: "2026-02-24",
    status: "Answered",
    priority: "Low",
    specSection: "05 52 13",
    responseDate: "2026-02-20",
  },
  {
    id: "RFI-032",
    subject: "Waterproofing membrane lapping requirement at foundation wall",
    project: "Harbor View Condos",
    submittedBy: "Carlos Mendez (Sub)",
    assignedTo: "Eng. Sarah Chen",
    dateSubmitted: "2026-02-15",
    dateDue: "2026-02-22",
    status: "Overdue",
    priority: "High",
    specSection: "07 10 00",
  },
  {
    id: "RFI-031",
    subject: "Paint finish schedule for interior common areas",
    project: "Harbor View Condos",
    submittedBy: "Angela Foster (GC)",
    assignedTo: "Arch. Lisa Park",
    dateSubmitted: "2026-02-14",
    dateDue: "2026-02-21",
    status: "Answered",
    priority: "Low",
    specSection: "09 91 00",
    responseDate: "2026-02-18",
  },
  {
    id: "RFI-030",
    subject: "HVAC diffuser layout in open office area",
    project: "Maple Street Office",
    submittedBy: "Lisa Thompson (HVAC)",
    assignedTo: "Eng. Sarah Chen",
    dateSubmitted: "2026-02-13",
    dateDue: "2026-02-20",
    status: "Answered",
    priority: "Medium",
    specSection: "23 37 13",
    responseDate: "2026-02-17",
  },
];

const statusBadgeVariant = (status: string) => {
  switch (status) {
    case "Answered":
      return "default";
    case "Open":
      return "secondary";
    case "Overdue":
      return "destructive";
    default:
      return "outline";
  }
};

const priorityBadgeVariant = (priority: string) => {
  switch (priority) {
    case "High":
      return "destructive";
    case "Medium":
      return "secondary";
    case "Low":
      return "outline";
    default:
      return "outline";
  }
};

const RFIManagement = () => {
  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            RFI Management
          </h1>
          <p className="text-muted-foreground mt-2">
            Create, track, and manage Requests for Information across all
            projects
          </p>
        </div>
        <Button>New RFI</Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="pb-2">
              <CardDescription className="text-xs">{stat.label}</CardDescription>
              <CardTitle className={`text-2xl ${stat.color}`}>
                {stat.value}
              </CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      {/* RFI Log Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>RFI Log</CardTitle>
              <CardDescription>
                Complete log of all project RFIs
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                Filter
              </Button>
              <Button variant="outline" size="sm">
                Export PDF
              </Button>
              <Button variant="outline" size="sm">
                Export Excel
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>RFI #</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Submitted By</TableHead>
                <TableHead>Assigned To</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead>Due</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rfis.map((rfi) => (
                <TableRow key={rfi.id}>
                  <TableCell className="font-medium">{rfi.id}</TableCell>
                  <TableCell className="max-w-xs">
                    <div>
                      <p className="text-sm font-medium">{rfi.subject}</p>
                      <p className="text-xs text-muted-foreground">
                        Spec: {rfi.specSection}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{rfi.project}</TableCell>
                  <TableCell className="text-sm">{rfi.submittedBy}</TableCell>
                  <TableCell className="text-sm">{rfi.assignedTo}</TableCell>
                  <TableCell className="text-sm">
                    {rfi.dateSubmitted}
                  </TableCell>
                  <TableCell className="text-sm">{rfi.dateDue}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        priorityBadgeVariant(rfi.priority) as
                          | "destructive"
                          | "secondary"
                          | "outline"
                      }
                    >
                      {rfi.priority}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        statusBadgeVariant(rfi.status) as
                          | "default"
                          | "secondary"
                          | "destructive"
                          | "outline"
                      }
                    >
                      {rfi.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="outline" size="sm">
                        View
                      </Button>
                      {rfi.status === "Open" && (
                        <Button variant="outline" size="sm">
                          Respond
                        </Button>
                      )}
                    </div>
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

export default RFIManagement;
