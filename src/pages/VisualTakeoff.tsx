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

const measurementTools = [
  {
    name: "Area Calculator",
    description: "Measure rectangular, polygonal, and irregular areas on drawings",
    icon: "square",
    unit: "sq ft",
    color: "bg-blue-100 text-blue-700",
  },
  {
    name: "Linear Measurement",
    description: "Measure distances, perimeters, and path lengths along drawings",
    icon: "ruler",
    unit: "lin ft",
    color: "bg-green-100 text-green-700",
  },
  {
    name: "Count Tool",
    description: "Count fixtures, outlets, windows, doors, and other repeating items",
    icon: "hash",
    unit: "count",
    color: "bg-purple-100 text-purple-700",
  },
  {
    name: "Volume Calculator",
    description: "Calculate volumes for concrete, excavation, and fill materials",
    icon: "box",
    unit: "cu yd",
    color: "bg-orange-100 text-orange-700",
  },
];

const measurementHistory = [
  {
    id: "TK-001",
    drawing: "Floor Plan - Level 1",
    measurement: "Living Room Area",
    type: "Area",
    value: "324 sq ft",
    date: "2026-02-24",
    user: "Mike Johnson",
  },
  {
    id: "TK-002",
    drawing: "Floor Plan - Level 1",
    measurement: "Kitchen Perimeter",
    type: "Linear",
    value: "48.5 lin ft",
    date: "2026-02-24",
    user: "Mike Johnson",
  },
  {
    id: "TK-003",
    drawing: "Electrical Plan",
    measurement: "Outlet Count",
    type: "Count",
    value: "37 units",
    date: "2026-02-23",
    user: "Sarah Chen",
  },
  {
    id: "TK-004",
    drawing: "Foundation Plan",
    measurement: "Footing Volume",
    type: "Volume",
    value: "12.8 cu yd",
    date: "2026-02-23",
    user: "Sarah Chen",
  },
  {
    id: "TK-005",
    drawing: "Floor Plan - Level 2",
    measurement: "Bathroom Tile Area",
    type: "Area",
    value: "86 sq ft",
    date: "2026-02-22",
    user: "Tom Rivera",
  },
  {
    id: "TK-006",
    drawing: "Site Plan",
    measurement: "Driveway Area",
    type: "Area",
    value: "540 sq ft",
    date: "2026-02-22",
    user: "Mike Johnson",
  },
  {
    id: "TK-007",
    drawing: "Elevation - North",
    measurement: "Window Count",
    type: "Count",
    value: "12 units",
    date: "2026-02-21",
    user: "Tom Rivera",
  },
];

const typeBadgeVariant = (type: string) => {
  switch (type) {
    case "Area":
      return "default";
    case "Linear":
      return "secondary";
    case "Count":
      return "outline";
    case "Volume":
      return "destructive";
    default:
      return "default";
  }
};

const VisualTakeoff = () => {
  return (
    <div className="container mx-auto p-6 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Visual Takeoff</h1>
        <p className="text-muted-foreground mt-2">
          Measurement tools for construction drawings
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {measurementTools.map((tool) => (
          <Card key={tool.name} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{tool.name}</CardTitle>
                <Badge variant="outline">{tool.unit}</Badge>
              </div>
              <CardDescription>{tool.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full">Select Tool</Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Measurement History</CardTitle>
              <CardDescription>
                Recent measurements taken across all project drawings
              </CardDescription>
            </div>
            <Button variant="outline">Export All</Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Drawing</TableHead>
                <TableHead>Measurement</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>User</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {measurementHistory.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.id}</TableCell>
                  <TableCell>{item.drawing}</TableCell>
                  <TableCell>{item.measurement}</TableCell>
                  <TableCell>
                    <Badge variant={typeBadgeVariant(item.type) as "default" | "secondary" | "outline" | "destructive"}>
                      {item.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono">{item.value}</TableCell>
                  <TableCell>{item.date}</TableCell>
                  <TableCell>{item.user}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default VisualTakeoff;
