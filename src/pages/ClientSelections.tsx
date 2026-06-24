import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";

const categories = [
  {
    id: "flooring",
    name: "Flooring",
    selections: [
      {
        id: 1,
        name: "Hardwood Oak - Natural Finish",
        location: "Living Room, Dining Room",
        price: "$8.50/sq ft",
        status: "Approved",
        supplier: "Armstrong Flooring",
      },
      {
        id: 2,
        name: "Porcelain Tile - Carrara Marble Look",
        location: "Master Bathroom, Guest Bath",
        price: "$6.25/sq ft",
        status: "Selected",
        supplier: "Daltile",
      },
      {
        id: 3,
        name: "Luxury Vinyl Plank - Weathered Gray",
        location: "Basement, Mudroom",
        price: "$4.75/sq ft",
        status: "Pending",
        supplier: "Shaw Floors",
      },
    ],
  },
  {
    id: "countertops",
    name: "Countertops",
    selections: [
      {
        id: 4,
        name: "Quartz - Calacatta Gold",
        location: "Kitchen Island, Perimeter",
        price: "$75/sq ft",
        status: "Approved",
        supplier: "Caesarstone",
      },
      {
        id: 5,
        name: "Granite - Absolute Black",
        location: "Master Bath Vanity",
        price: "$55/sq ft",
        status: "Selected",
        supplier: "MSI Surfaces",
      },
      {
        id: 6,
        name: "Butcher Block - Walnut",
        location: "Prep Station",
        price: "$40/sq ft",
        status: "Pending",
        supplier: "John Boos",
      },
    ],
  },
  {
    id: "fixtures",
    name: "Fixtures",
    selections: [
      {
        id: 7,
        name: "Freestanding Bathtub - Modern Oval",
        location: "Master Bathroom",
        price: "$2,400",
        status: "Approved",
        supplier: "Kohler",
      },
      {
        id: 8,
        name: "Kitchen Faucet - Touchless Brushed Nickel",
        location: "Kitchen",
        price: "$380",
        status: "Selected",
        supplier: "Moen",
      },
      {
        id: 9,
        name: "Rainfall Showerhead - Chrome",
        location: "Master Shower",
        price: "$275",
        status: "Pending",
        supplier: "Delta",
      },
    ],
  },
  {
    id: "paint",
    name: "Paint Colors",
    selections: [
      {
        id: 10,
        name: "SW 7015 - Repose Gray",
        location: "Main Living Areas",
        price: "$68/gal",
        status: "Approved",
        supplier: "Sherwin-Williams",
      },
      {
        id: 11,
        name: "BM OC-17 - White Dove",
        location: "Trim & Ceilings",
        price: "$72/gal",
        status: "Approved",
        supplier: "Benjamin Moore",
      },
      {
        id: 12,
        name: "SW 6119 - Antique White",
        location: "Kitchen Cabinets",
        price: "$78/gal",
        status: "Pending",
        supplier: "Sherwin-Williams",
      },
    ],
  },
  {
    id: "appliances",
    name: "Appliances",
    selections: [
      {
        id: 13,
        name: '36" Gas Range - Professional Series',
        location: "Kitchen",
        price: "$5,200",
        status: "Selected",
        supplier: "Thermador",
      },
      {
        id: 14,
        name: "French Door Refrigerator - Counter Depth",
        location: "Kitchen",
        price: "$3,800",
        status: "Pending",
        supplier: "Sub-Zero",
      },
      {
        id: 15,
        name: "Built-In Dishwasher - Panel Ready",
        location: "Kitchen",
        price: "$1,450",
        status: "Approved",
        supplier: "Bosch",
      },
    ],
  },
];

const statusBadgeVariant = (status: string) => {
  switch (status) {
    case "Approved":
      return "default";
    case "Selected":
      return "secondary";
    case "Pending":
      return "outline";
    default:
      return "outline";
  }
};

const allSelections = categories.flatMap((c) => c.selections);
const approved = allSelections.filter((s) => s.status === "Approved").length;
const selected = allSelections.filter((s) => s.status === "Selected").length;
const pending = allSelections.filter((s) => s.status === "Pending").length;
const total = allSelections.length;

const ClientSelections = () => {
  return (
    <div className="container mx-auto p-6 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Client Selections
        </h1>
        <p className="text-muted-foreground mt-2">
          Track and manage client material and finish selections
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Selections</CardDescription>
            <CardTitle className="text-3xl">{total}</CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={(approved / total) * 100} className="h-2" />
            <p className="text-xs text-muted-foreground mt-2">
              {Math.round((approved / total) * 100)}% approved
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Approved</CardDescription>
            <CardTitle className="text-3xl text-green-600">{approved}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Ready for ordering</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Selected</CardDescription>
            <CardTitle className="text-3xl text-blue-600">{selected}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Awaiting client approval
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Pending</CardDescription>
            <CardTitle className="text-3xl text-orange-600">{pending}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Client needs to select
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Category Tabs */}
      <Tabs defaultValue="flooring">
        <TabsList>
          {categories.map((category) => (
            <TabsTrigger key={category.id} value={category.id}>
              {category.name}
            </TabsTrigger>
          ))}
        </TabsList>

        {categories.map((category) => (
          <TabsContent key={category.id} value={category.id}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
              {category.selections.map((selection) => (
                <Card
                  key={selection.id}
                  className="hover:shadow-md transition-shadow"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base">
                        {selection.name}
                      </CardTitle>
                      <Badge
                        variant={
                          statusBadgeVariant(selection.status) as
                            | "default"
                            | "secondary"
                            | "outline"
                        }
                      >
                        {selection.status}
                      </Badge>
                    </div>
                    <CardDescription>{selection.location}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Price</span>
                      <span className="font-medium">{selection.price}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Supplier</span>
                      <span>{selection.supplier}</span>
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button size="sm" variant="outline" className="flex-1">
                        View Details
                      </Button>
                      {selection.status === "Pending" && (
                        <Button size="sm" className="flex-1">
                          Make Selection
                        </Button>
                      )}
                      {selection.status === "Selected" && (
                        <Button size="sm" className="flex-1">
                          Approve
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

export default ClientSelections;
