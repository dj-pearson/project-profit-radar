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
  { label: "Documents Sent", value: 47, color: "text-blue-600" },
  { label: "Awaiting Signature", value: 8, color: "text-orange-600" },
  { label: "Completed", value: 35, color: "text-green-600" },
  { label: "Expired", value: 4, color: "text-red-600" },
];

const documents = [
  {
    id: "ES-001",
    name: "Construction Contract - Oak Ridge Residence",
    recipient: "John & Maria Anderson",
    email: "j.anderson@email.com",
    sentDate: "2026-02-23",
    status: "Pending",
    dueDate: "2026-03-02",
  },
  {
    id: "ES-002",
    name: "Change Order #14 - Kitchen Redesign",
    recipient: "Sarah Mitchell",
    email: "s.mitchell@email.com",
    sentDate: "2026-02-22",
    status: "Signed",
    dueDate: "2026-03-01",
    signedDate: "2026-02-23",
  },
  {
    id: "ES-003",
    name: "Subcontractor Agreement - Elite Plumbing",
    recipient: "Robert Garcia",
    email: "r.garcia@eliteplumbing.com",
    sentDate: "2026-02-21",
    status: "Signed",
    dueDate: "2026-02-28",
    signedDate: "2026-02-22",
  },
  {
    id: "ES-004",
    name: "Insurance Waiver - Roofing Phase",
    recipient: "David Kim",
    email: "d.kim@skylineroofing.com",
    sentDate: "2026-02-20",
    status: "Pending",
    dueDate: "2026-02-27",
  },
  {
    id: "ES-005",
    name: "Lien Release - Foundation Work",
    recipient: "Carlos Mendez",
    email: "c.mendez@solidfoundations.com",
    sentDate: "2026-02-15",
    status: "Expired",
    dueDate: "2026-02-22",
  },
  {
    id: "ES-006",
    name: "Permit Application - Electrical",
    recipient: "Building Department",
    email: "permits@cityofpleasanton.gov",
    sentDate: "2026-02-19",
    status: "Signed",
    dueDate: "2026-02-26",
    signedDate: "2026-02-20",
  },
  {
    id: "ES-007",
    name: "Warranty Agreement - HVAC Installation",
    recipient: "Lisa Thompson",
    email: "l.thompson@comfortair.com",
    sentDate: "2026-02-18",
    status: "Pending",
    dueDate: "2026-02-25",
  },
  {
    id: "ES-008",
    name: "Final Walkthrough Acknowledgment",
    recipient: "Mark & Julia Davis",
    email: "m.davis@email.com",
    sentDate: "2026-02-10",
    status: "Expired",
    dueDate: "2026-02-17",
  },
];

const statusBadgeVariant = (status: string) => {
  switch (status) {
    case "Signed":
      return "default";
    case "Pending":
      return "secondary";
    case "Expired":
      return "destructive";
    default:
      return "outline";
  }
};

const ESignature = () => {
  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">E-Signatures</h1>
          <p className="text-muted-foreground mt-2">
            Send, track, and manage document signatures
          </p>
        </div>
        <Button>Send for Signature</Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="pb-2">
              <CardDescription>{stat.label}</CardDescription>
              <CardTitle className={`text-3xl ${stat.color}`}>
                {stat.value}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">Last 30 days</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Document List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Document Signatures</CardTitle>
              <CardDescription>
                All documents sent for electronic signature
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
                <TableHead>Document</TableHead>
                <TableHead>Recipient</TableHead>
                <TableHead>Sent Date</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents.map((doc) => (
                <TableRow key={doc.id}>
                  <TableCell className="font-medium">{doc.id}</TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium text-sm">{doc.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {doc.email}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>{doc.recipient}</TableCell>
                  <TableCell>{doc.sentDate}</TableCell>
                  <TableCell>{doc.dueDate}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        statusBadgeVariant(doc.status) as
                          | "default"
                          | "secondary"
                          | "destructive"
                          | "outline"
                      }
                    >
                      {doc.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="outline" size="sm">
                        View
                      </Button>
                      {doc.status === "Pending" && (
                        <Button variant="outline" size="sm">
                          Remind
                        </Button>
                      )}
                      {doc.status === "Expired" && (
                        <Button variant="outline" size="sm">
                          Resend
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

export default ESignature;
