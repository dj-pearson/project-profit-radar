import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

const drawingTools = [
  { name: "Select", shortcut: "V", active: true },
  { name: "Pen", shortcut: "P", active: false },
  { name: "Text", shortcut: "T", active: false },
  { name: "Measure", shortcut: "M", active: false },
  { name: "Rectangle", shortcut: "R", active: false },
  { name: "Circle", shortcut: "C", active: false },
  { name: "Arrow", shortcut: "A", active: false },
  { name: "Highlight", shortcut: "H", active: false },
];

const layers = [
  { name: "Architectural", visible: true, color: "#3b82f6", items: 24 },
  { name: "Structural", visible: true, color: "#ef4444", items: 18 },
  { name: "Mechanical", visible: false, color: "#22c55e", items: 12 },
  { name: "Electrical", visible: true, color: "#f59e0b", items: 31 },
  { name: "Plumbing", visible: false, color: "#8b5cf6", items: 15 },
  { name: "Annotations", visible: true, color: "#ec4899", items: 8 },
];

const recentDrawings = [
  { name: "Floor Plan - Level 1", version: "v3.2", updated: "2 hours ago" },
  { name: "Floor Plan - Level 2", version: "v2.1", updated: "5 hours ago" },
  { name: "Elevation - North", version: "v1.4", updated: "1 day ago" },
  { name: "Foundation Plan", version: "v2.0", updated: "2 days ago" },
];

const DrawingViewer = () => {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Drawing Viewer</h1>
        <p className="text-muted-foreground mt-2">
          View, annotate, and markup construction drawings
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">
        <div className="space-y-4">
          {/* Toolbar */}
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center gap-2 flex-wrap">
                {drawingTools.map((tool) => (
                  <Button
                    key={tool.name}
                    variant={tool.active ? "default" : "outline"}
                    size="sm"
                    className="gap-1"
                  >
                    {tool.name}
                    <kbd className="ml-1 text-xs opacity-60 bg-muted px-1 rounded">
                      {tool.shortcut}
                    </kbd>
                  </Button>
                ))}
                <Separator orientation="vertical" className="h-8 mx-2" />
                <Button variant="outline" size="sm">
                  Undo
                </Button>
                <Button variant="outline" size="sm">
                  Redo
                </Button>
                <div className="flex-1" />
                <Button variant="outline" size="sm">
                  Zoom In
                </Button>
                <Button variant="outline" size="sm">
                  Zoom Out
                </Button>
                <Button variant="outline" size="sm">
                  Fit to Screen
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Canvas Area */}
          <Card className="min-h-[500px]">
            <CardContent className="p-0 h-full">
              <div className="flex items-center justify-center h-[500px] bg-muted/30 rounded-lg border-2 border-dashed border-muted-foreground/20">
                <div className="text-center space-y-4">
                  <div className="text-6xl text-muted-foreground/30">
                    &#9633;
                  </div>
                  <div>
                    <p className="text-lg font-medium text-muted-foreground">
                      Drawing Canvas
                    </p>
                    <p className="text-sm text-muted-foreground/70">
                      Select a drawing to view or drag and drop a file here
                    </p>
                  </div>
                  <Button>Upload Drawing</Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Drawings */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Recent Drawings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {recentDrawings.map((drawing) => (
                  <div
                    key={drawing.name}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                  >
                    <div>
                      <p className="font-medium text-sm">{drawing.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Updated {drawing.updated}
                      </p>
                    </div>
                    <Badge variant="outline">{drawing.version}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Layers Panel Sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Layers</CardTitle>
                <Button variant="outline" size="sm">
                  Add Layer
                </Button>
              </div>
              <CardDescription>
                Toggle layer visibility and manage drawing layers
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {layers.map((layer) => (
                <div
                  key={layer.name}
                  className="flex items-center justify-between p-2 rounded-md border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: layer.color }}
                    />
                    <div>
                      <p className="text-sm font-medium">{layer.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {layer.items} items
                      </p>
                    </div>
                  </div>
                  <Badge variant={layer.visible ? "default" : "secondary"}>
                    {layer.visible ? "Visible" : "Hidden"}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Properties</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Select an element on the canvas to view and edit its properties.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Comments</CardTitle>
              <CardDescription>0 comments on this drawing</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full">
                Add Comment
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default DrawingViewer;
