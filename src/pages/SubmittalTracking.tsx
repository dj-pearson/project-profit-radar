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
  { label: "Total Submittals", value: 64, color: "text-foreground" },
  { label: "Under Review", value: 12, color: "text-blue-600" },
  { label: "Approved", value: 41, color: "text-green-600" },
  { label: "Revise & Resubmit", value: 8, color: "text-orange-600" },
  { label: "Rejected", value: 3, color: "text-red-600" },
];

const submittals = [
  {
    id: "SUB-001",
    title: "Structural Steel Shop Drawings",
    specSection: "05 12 00",
    contractor: "Iron Works LLC",
    submitDate: "2026-02-18",
    dueDate: "2026-03-04",
    status: "Under Review",
    reviewer: "Eng. Sarah Chen",
    revision: "Rev A",
  },
  {
    id: "SUB-002",
    title: "HVAC Equipment Submittals",
    specSection: "23 05 00",
    contractor: "Comfort Air HVAC",
    submitDate: "2026-02-15",
    dueDate: "2026-03-01",
    status: "Approved",
    reviewer: "Eng. Mike Johnson",
    revision: "Rev B",
  },
  {
    id: "SUB-003",
    title: "Exterior Window System",
    specSection: "08 51 13",
    contractor: "Crystal Glass Co.",
    submitDate: "2026-02-20",
    dueDate: "2026-03-06",
    status: "Under Review",
    reviewer: "Arch. Tom Rivera",
    revision: "Rev A",
  },
  {
    id: "SUB-004",
    title: "Concrete Mix Design",
    specSection: "03 30 00",
    contractor: "Solid Foundations Inc.",
    submitDate: "2026-02-10",
    dueDate: "2026-02-24",
    status: "Revise & Resubmit",
    reviewer: "Eng. Sarah Chen",
    revision: "Rev A",
  },
  {
    id: "SUB-005",
    title: "Elevator Equipment",
    specSection: "14 20 00",
    contractor: "Vertical Transit Inc.",
    submitDate: "2026-02-12",
    dueDate: "2026-02-26",
    status: "Approved",
    reviewer: "Eng. Mike Johnson",
    revision: "Rev C",
  },
  {
    id: "SUB-006",
    title: "Roofing Materials",
    specSection: "07 50 00",
    contractor: "Skyline Roofing Co.",
    submitDate: "2026-02-08",
    dueDate: "2026-02-22",
    status: "Rejected",
    reviewer: "Arch. Tom Rivera",
    revision: "Rev A",
  },
  {
    id: "SUB-007",
    title: "Fire Alarm System",
    specSection: "28 31 00",
    contractor: "SafeGuard Systems",
    submitDate: "2026-02-22",
    dueDate: "2026-03-08",
    status: "Under Review",
    reviewer: "Eng. Sarah Chen",
    revision: "Rev A",
  },
  {
    id: "SUB-008",
    title: "Plumbing Fixtures",
    specSection: "22 40 00",
    contractor: "Elite Plumbing Services",
    submitDate: "2026-02-14",
    dueDate: "2026-02-28",
    status: "Approved",
    reviewer: "Arch. Tom Rivera",
    revision: "Rev B",
  },
];

const statusBadgeVariant = (status: string) => {
  switch (status) {
    case "Approved":
      return "default";
    case "Under Review":
      return "secondary";
    case "Revise & Resubmit":
      return "warning";
    case "Rejected":
      return "destructive";
    default:
      return "outline";
  }
};

const SubmittalTracking = () => {
  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Submittal Tracking
          </h1>
          <p className="text-muted-foreground mt-2">
            Track and manage construction submittals through the review workflow
          </p>
        </div>
        <Button>New Submittal</Button>
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

      {/* Submittal Log Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Submittal Log</CardTitle>
              <CardDescription>
                Complete log of all project submittals
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                Filter
              </Button>
              <Button variant="outline" size="sm">
                Export PDF
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Spec Section</TableHead>
                <TableHead>Contractor</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead>Due</TableHead>
                <TableHead>Revision</TableHead>
                <TableHead>Reviewer</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {submittals.map((sub) => (
                <TableRow key={sub.id}>
                  <TableCell className="font-medium">{sub.id}</TableCell>
                  <TableCell>
                    <span className="font-medium text-sm">{sub.title}</span>
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {sub.specSection}
                  </TableCell>
                  <TableCell className="text-sm">{sub.contractor}</TableCell>
                  <TableCell className="text-sm">{sub.submitDate}</TableCell>
                  <TableCell className="text-sm">{sub.dueDate}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{sub.revision}</Badge>
                  </TableCell>
                  <TableCell className="text-sm">{sub.reviewer}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        statusBadgeVariant(sub.status) as
                          | "default"
                          | "secondary"
                          | "destructive"
                          | "outline"
                          | "warning"
                      }
                    >
                      {sub.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm">
                      View
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

export default SubmittalTracking;
