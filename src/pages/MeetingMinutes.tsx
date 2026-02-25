import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
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

const meetings = [
  {
    id: "MTG-024",
    title: "Weekly OAC Meeting #24",
    date: "2026-02-24",
    time: "10:00 AM",
    location: "Job Site Trailer",
    project: "Oak Ridge Residence",
    attendees: ["John Smith (Owner)", "Sarah Chen (PM)", "Tom Rivera (Arch)", "Mike Johnson (GC)", "David Kim (Sub)"],
    status: "Completed",
    actionItems: 5,
  },
  {
    id: "MTG-023",
    title: "Safety Committee Meeting",
    date: "2026-02-21",
    time: "8:00 AM",
    location: "Main Office",
    project: "All Projects",
    attendees: ["Sarah Chen (PM)", "Angela Foster (Safety)", "Carlos Mendez (Field)"],
    status: "Completed",
    actionItems: 3,
  },
  {
    id: "MTG-025",
    title: "Subcontractor Coordination",
    date: "2026-02-26",
    time: "2:00 PM",
    location: "Virtual - Zoom",
    project: "Maple Street Office",
    attendees: ["Mike Johnson (GC)", "Lisa Thompson (HVAC)", "James Wilson (Elec)", "Robert Garcia (Plumb)"],
    status: "Scheduled",
    actionItems: 0,
  },
  {
    id: "MTG-022",
    title: "Client Design Review",
    date: "2026-02-19",
    time: "3:00 PM",
    location: "Client Office",
    project: "Harbor View Condos",
    attendees: ["Tom Rivera (Arch)", "Mark Davis (Client)", "Julia Davis (Client)", "Sarah Chen (PM)"],
    status: "Completed",
    actionItems: 7,
  },
  {
    id: "MTG-026",
    title: "Weekly OAC Meeting #25",
    date: "2026-03-03",
    time: "10:00 AM",
    location: "Job Site Trailer",
    project: "Oak Ridge Residence",
    attendees: ["TBD"],
    status: "Scheduled",
    actionItems: 0,
  },
];

const actionItems = [
  {
    id: "AI-047",
    description: "Submit revised HVAC duct layout to architect for approval",
    assignee: "Lisa Thompson",
    meeting: "MTG-024",
    dueDate: "2026-02-28",
    status: "Open",
    priority: "High",
  },
  {
    id: "AI-046",
    description: "Coordinate electrical panel relocation with structural engineer",
    assignee: "James Wilson",
    meeting: "MTG-024",
    dueDate: "2026-03-01",
    status: "Open",
    priority: "High",
  },
  {
    id: "AI-045",
    description: "Provide updated material delivery schedule for framing lumber",
    assignee: "Mike Johnson",
    meeting: "MTG-024",
    dueDate: "2026-02-27",
    status: "In Progress",
    priority: "Medium",
  },
  {
    id: "AI-044",
    description: "Update site safety plan with new fall protection procedures",
    assignee: "Angela Foster",
    meeting: "MTG-023",
    dueDate: "2026-02-28",
    status: "Completed",
    priority: "High",
  },
  {
    id: "AI-043",
    description: "Schedule third-party inspection for fire stopping",
    assignee: "Sarah Chen",
    meeting: "MTG-023",
    dueDate: "2026-03-05",
    status: "Open",
    priority: "Medium",
  },
  {
    id: "AI-042",
    description: "Present three countertop material options to client",
    assignee: "Tom Rivera",
    meeting: "MTG-022",
    dueDate: "2026-02-26",
    status: "Completed",
    priority: "Medium",
  },
  {
    id: "AI-041",
    description: "Get pricing for upgraded window package per client request",
    assignee: "Mike Johnson",
    meeting: "MTG-022",
    dueDate: "2026-02-25",
    status: "In Progress",
    priority: "Low",
  },
];

const statusBadgeVariant = (status: string) => {
  switch (status) {
    case "Completed":
      return "default";
    case "Scheduled":
      return "secondary";
    case "In Progress":
      return "secondary";
    case "Open":
      return "outline";
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

const MeetingMinutes = () => {
  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Meeting Minutes
          </h1>
          <p className="text-muted-foreground mt-2">
            Record, track, and manage meeting minutes and action items
          </p>
        </div>
        <Button>New Meeting</Button>
      </div>

      {/* Meeting List */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Meetings</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {meetings.map((meeting) => (
            <Card
              key={meeting.id}
              className="hover:shadow-md transition-shadow"
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-base">{meeting.title}</CardTitle>
                    <CardDescription>{meeting.project}</CardDescription>
                  </div>
                  <Badge
                    variant={
                      statusBadgeVariant(meeting.status) as
                        | "default"
                        | "secondary"
                        | "outline"
                    }
                  >
                    {meeting.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Date</span>
                  <span>{meeting.date}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Time</span>
                  <span>{meeting.time}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Location</span>
                  <span>{meeting.location}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Attendees</span>
                  <span>{meeting.attendees.length} people</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Action Items</span>
                  <span>{meeting.actionItems}</span>
                </div>
              </CardContent>
              <CardFooter>
                <Button variant="outline" size="sm" className="w-full">
                  {meeting.status === "Completed"
                    ? "View Minutes"
                    : "Prepare Agenda"}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>

      {/* Action Items Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Action Items</CardTitle>
              <CardDescription>
                Track all action items from meetings across projects
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                Filter
              </Button>
              <Button variant="outline" size="sm">
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Assignee</TableHead>
                <TableHead>Meeting</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {actionItems.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.id}</TableCell>
                  <TableCell className="max-w-xs">
                    <span className="text-sm">{item.description}</span>
                  </TableCell>
                  <TableCell className="text-sm">{item.assignee}</TableCell>
                  <TableCell className="text-sm">{item.meeting}</TableCell>
                  <TableCell className="text-sm">{item.dueDate}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        priorityBadgeVariant(item.priority) as
                          | "destructive"
                          | "secondary"
                          | "outline"
                      }
                    >
                      {item.priority}
                    </Badge>
                  </TableCell>
                  <TableCell>
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

export default MeetingMinutes;
