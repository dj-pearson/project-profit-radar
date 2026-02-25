import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

const checklistItems = [
  { name: "Business License", description: "Valid and current business license", required: true },
  { name: "General Liability Insurance", description: "Minimum $1M coverage", required: true },
  { name: "Workers Compensation", description: "Active workers comp policy", required: true },
  { name: "Bonding Capacity", description: "Proof of bonding capacity", required: true },
  { name: "Safety Record (EMR)", description: "Experience Modification Rate below 1.0", required: true },
  { name: "Financial Statements", description: "Last 2 years audited financials", required: false },
  { name: "References", description: "Minimum 3 project references", required: true },
  { name: "OSHA Training Certificates", description: "OSHA 10/30 for key personnel", required: false },
  { name: "W-9 Form", description: "Current W-9 tax form", required: true },
  { name: "Minority/DBE Certification", description: "DBE or MBE certification if applicable", required: false },
];

const subcontractors = [
  {
    name: "Elite Plumbing Services",
    trade: "Plumbing",
    contact: "Robert Garcia",
    email: "info@eliteplumbing.com",
    status: "Qualified",
    completedItems: 9,
    totalItems: 10,
    expiryDate: "2026-08-15",
    rating: 4.8,
  },
  {
    name: "Skyline Roofing Co.",
    trade: "Roofing",
    contact: "David Kim",
    email: "david@skylineroofing.com",
    status: "Under Review",
    completedItems: 6,
    totalItems: 10,
    expiryDate: "N/A",
    rating: 4.5,
  },
  {
    name: "Comfort Air HVAC",
    trade: "HVAC",
    contact: "Lisa Thompson",
    email: "lisa@comfortairhvac.com",
    status: "Qualified",
    completedItems: 10,
    totalItems: 10,
    expiryDate: "2026-11-30",
    rating: 4.9,
  },
  {
    name: "Solid Foundations Inc.",
    trade: "Concrete",
    contact: "Carlos Mendez",
    email: "carlos@solidfoundations.com",
    status: "Expired",
    completedItems: 8,
    totalItems: 10,
    expiryDate: "2026-01-15",
    rating: 4.2,
  },
  {
    name: "Precision Electric",
    trade: "Electrical",
    contact: "James Wilson",
    email: "james@precisionelectric.com",
    status: "Pending",
    completedItems: 3,
    totalItems: 10,
    expiryDate: "N/A",
    rating: null,
  },
  {
    name: "Premier Drywall Solutions",
    trade: "Drywall",
    contact: "Angela Foster",
    email: "angela@premierdrywall.com",
    status: "Qualified",
    completedItems: 9,
    totalItems: 10,
    expiryDate: "2026-09-20",
    rating: 4.6,
  },
];

const statusBadgeVariant = (status: string) => {
  switch (status) {
    case "Qualified":
      return "default";
    case "Under Review":
      return "secondary";
    case "Pending":
      return "outline";
    case "Expired":
      return "destructive";
    default:
      return "outline";
  }
};

const SubcontractorPrequalification = () => {
  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Subcontractor Prequalification
          </h1>
          <p className="text-muted-foreground mt-2">
            Evaluate and prequalify subcontractors before project engagement
          </p>
        </div>
        <Button>Invite Subcontractor</Button>
      </div>

      {/* Prequalification Checklist */}
      <Card>
        <CardHeader>
          <CardTitle>Prequalification Checklist</CardTitle>
          <CardDescription>
            Required and optional documents for subcontractor qualification
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {checklistItems.map((item) => (
              <div
                key={item.name}
                className="flex items-start gap-3 p-3 rounded-lg border"
              >
                <div className="mt-0.5 w-5 h-5 rounded border-2 border-muted-foreground/30 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm">{item.name}</p>
                    {item.required && (
                      <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                        Required
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Subcontractor Cards */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Subcontractors</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {subcontractors.map((sub) => (
            <Card key={sub.name} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-base">{sub.name}</CardTitle>
                    <CardDescription>{sub.trade}</CardDescription>
                  </div>
                  <Badge
                    variant={
                      statusBadgeVariant(sub.status) as
                        | "default"
                        | "secondary"
                        | "outline"
                        | "destructive"
                    }
                  >
                    {sub.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Contact</span>
                    <span>{sub.contact}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Email</span>
                    <span className="text-xs">{sub.email}</span>
                  </div>
                  {sub.rating && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Rating</span>
                      <span>{sub.rating} / 5.0</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Expiry</span>
                    <span>{sub.expiryDate}</span>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Compliance</span>
                    <span>
                      {sub.completedItems}/{sub.totalItems} items
                    </span>
                  </div>
                  <Progress
                    value={(sub.completedItems / sub.totalItems) * 100}
                    className="h-2"
                  />
                </div>
              </CardContent>
              <CardFooter className="gap-2">
                <Button variant="outline" size="sm" className="flex-1">
                  View Details
                </Button>
                {sub.status === "Expired" && (
                  <Button size="sm" className="flex-1">
                    Request Renewal
                  </Button>
                )}
                {sub.status === "Under Review" && (
                  <Button size="sm" className="flex-1">
                    Review
                  </Button>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SubcontractorPrequalification;
