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

const supportedFormats = [
  { name: "Microsoft Project", extension: ".mpp, .xml", icon: "MS" },
  { name: "Primavera P6", extension: ".xer, .xml", icon: "P6" },
  { name: "Excel Schedule", extension: ".xlsx, .csv", icon: "XL" },
  { name: "Asta Powerproject", extension: ".pp", icon: "AP" },
];

const fieldMappings = [
  { source: "Task Name", target: "Activity Name", mapped: true },
  { source: "Start Date", target: "Start Date", mapped: true },
  { source: "Finish Date", target: "End Date", mapped: true },
  { source: "Duration", target: "Duration (days)", mapped: true },
  { source: "% Complete", target: "Progress", mapped: true },
  { source: "Predecessors", target: "Dependencies", mapped: true },
  { source: "Resource Names", target: "Assigned Resources", mapped: false },
  { source: "Cost", target: "Estimated Cost", mapped: false },
  { source: "WBS", target: "Work Breakdown Structure", mapped: true },
  { source: "Milestone", target: "Is Milestone", mapped: true },
];

const previewData = [
  {
    id: 1,
    wbs: "1.0",
    name: "Project Mobilization",
    start: "2026-03-01",
    end: "2026-03-07",
    duration: "5d",
    progress: "0%",
    predecessors: "-",
    milestone: false,
  },
  {
    id: 2,
    wbs: "1.1",
    name: "Site Preparation",
    start: "2026-03-08",
    end: "2026-03-14",
    duration: "5d",
    progress: "0%",
    predecessors: "1",
    milestone: false,
  },
  {
    id: 3,
    wbs: "2.0",
    name: "Foundation",
    start: "2026-03-15",
    end: "2026-04-05",
    duration: "15d",
    progress: "0%",
    predecessors: "2",
    milestone: false,
  },
  {
    id: 4,
    wbs: "2.1",
    name: "Foundation Complete",
    start: "2026-04-05",
    end: "2026-04-05",
    duration: "0d",
    progress: "0%",
    predecessors: "3",
    milestone: true,
  },
  {
    id: 5,
    wbs: "3.0",
    name: "Framing",
    start: "2026-04-06",
    end: "2026-05-01",
    duration: "20d",
    progress: "0%",
    predecessors: "4",
    milestone: false,
  },
  {
    id: 6,
    wbs: "4.0",
    name: "Roofing",
    start: "2026-05-02",
    end: "2026-05-15",
    duration: "10d",
    progress: "0%",
    predecessors: "5",
    milestone: false,
  },
  {
    id: 7,
    wbs: "5.0",
    name: "MEP Rough-In",
    start: "2026-05-16",
    end: "2026-06-12",
    duration: "20d",
    progress: "0%",
    predecessors: "6",
    milestone: false,
  },
];

const ScheduleImport = () => {
  return (
    <div className="container mx-auto p-6 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Schedule Import</h1>
        <p className="text-muted-foreground mt-2">
          Import project schedules from Microsoft Project, Primavera P6, and
          other scheduling tools
        </p>
      </div>

      {/* File Upload Area */}
      <Card>
        <CardHeader>
          <CardTitle>Upload Schedule File</CardTitle>
          <CardDescription>
            Drag and drop your schedule file or click to browse
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-12 text-center hover:border-muted-foreground/50 transition-colors cursor-pointer">
            <div className="space-y-4">
              <div className="text-5xl text-muted-foreground/40">&#x2B06;</div>
              <div>
                <p className="text-lg font-medium">
                  Drop your schedule file here
                </p>
                <p className="text-sm text-muted-foreground">
                  Supports MPP, XER, XML, XLSX, and CSV formats
                </p>
              </div>
              <Button>Browse Files</Button>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
            {supportedFormats.map((format) => (
              <div
                key={format.name}
                className="flex items-center gap-3 p-3 rounded-lg border"
              >
                <div className="w-10 h-10 rounded bg-muted flex items-center justify-center font-bold text-sm">
                  {format.icon}
                </div>
                <div>
                  <p className="text-sm font-medium">{format.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {format.extension}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Import Mapping Configuration */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Field Mapping</CardTitle>
              <CardDescription>
                Map source fields to Brikly schedule fields
              </CardDescription>
            </div>
            <Button variant="outline" size="sm">
              Auto-Map Fields
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {fieldMappings.map((mapping) => (
              <div
                key={mapping.source}
                className="flex items-center justify-between p-3 rounded-lg border"
              >
                <div className="flex items-center gap-3 flex-1">
                  <div className="flex-1">
                    <p className="text-sm font-medium">{mapping.source}</p>
                    <p className="text-xs text-muted-foreground">Source</p>
                  </div>
                  <span className="text-muted-foreground">&#x2192;</span>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{mapping.target}</p>
                    <p className="text-xs text-muted-foreground">Brikly</p>
                  </div>
                </div>
                <Badge variant={mapping.mapped ? "default" : "outline"}>
                  {mapping.mapped ? "Mapped" : "Unmapped"}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Preview Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Import Preview</CardTitle>
              <CardDescription>
                Preview of {previewData.length} activities to be imported
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline">Cancel</Button>
              <Button>Import Schedule</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>WBS</TableHead>
                <TableHead>Activity Name</TableHead>
                <TableHead>Start</TableHead>
                <TableHead>End</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Predecessors</TableHead>
                <TableHead>Type</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {previewData.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-mono text-xs">
                    {row.wbs}
                  </TableCell>
                  <TableCell className="font-medium">{row.name}</TableCell>
                  <TableCell>{row.start}</TableCell>
                  <TableCell>{row.end}</TableCell>
                  <TableCell>{row.duration}</TableCell>
                  <TableCell>{row.progress}</TableCell>
                  <TableCell>{row.predecessors}</TableCell>
                  <TableCell>
                    {row.milestone ? (
                      <Badge variant="secondary">Milestone</Badge>
                    ) : (
                      <Badge variant="outline">Task</Badge>
                    )}
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

export default ScheduleImport;
