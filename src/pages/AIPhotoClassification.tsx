import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const classifiedPhotos = [
  {
    id: 1,
    filename: "IMG_20260224_091532.jpg",
    classification: "Foundation Work",
    confidence: 94,
    date: "2026-02-24",
    tags: ["Concrete", "Formwork", "Rebar"],
    project: "Oak Ridge Residence",
  },
  {
    id: 2,
    filename: "IMG_20260224_102145.jpg",
    classification: "Framing - Wall",
    confidence: 91,
    date: "2026-02-24",
    tags: ["Wood Framing", "Interior Wall", "2x6"],
    project: "Oak Ridge Residence",
  },
  {
    id: 3,
    filename: "IMG_20260223_143022.jpg",
    classification: "Electrical Rough-In",
    confidence: 88,
    date: "2026-02-23",
    tags: ["Wiring", "Junction Box", "Conduit"],
    project: "Maple Street Office",
  },
  {
    id: 4,
    filename: "IMG_20260223_155830.jpg",
    classification: "Roofing",
    confidence: 96,
    date: "2026-02-23",
    tags: ["Shingles", "Flashing", "Ridge Vent"],
    project: "Oak Ridge Residence",
  },
  {
    id: 5,
    filename: "IMG_20260222_081215.jpg",
    classification: "Site Work",
    confidence: 85,
    date: "2026-02-22",
    tags: ["Excavation", "Grading", "Equipment"],
    project: "Harbor View Condos",
  },
  {
    id: 6,
    filename: "IMG_20260222_114500.jpg",
    classification: "Plumbing Rough-In",
    confidence: 92,
    date: "2026-02-22",
    tags: ["PVC Pipe", "Drain Line", "Vent Stack"],
    project: "Maple Street Office",
  },
  {
    id: 7,
    filename: "IMG_20260221_093745.jpg",
    classification: "HVAC Installation",
    confidence: 89,
    date: "2026-02-21",
    tags: ["Ductwork", "Air Handler", "Plenum"],
    project: "Oak Ridge Residence",
  },
  {
    id: 8,
    filename: "IMG_20260221_141230.jpg",
    classification: "Safety - PPE Compliance",
    confidence: 78,
    date: "2026-02-21",
    tags: ["Hard Hat", "Safety Vest", "Workers"],
    project: "Harbor View Condos",
  },
  {
    id: 9,
    filename: "IMG_20260220_100015.jpg",
    classification: "Drywall Installation",
    confidence: 93,
    date: "2026-02-20",
    tags: ["Drywall", "Taping", "Interior"],
    project: "Oak Ridge Residence",
  },
];

const classificationStats = [
  { category: "Foundation Work", count: 45 },
  { category: "Framing", count: 82 },
  { category: "Electrical", count: 37 },
  { category: "Plumbing", count: 29 },
  { category: "HVAC", count: 24 },
  { category: "Roofing", count: 31 },
  { category: "Drywall", count: 18 },
  { category: "Site Work", count: 53 },
  { category: "Safety", count: 41 },
];

const confidenceBadge = (confidence: number) => {
  if (confidence >= 90) return "default";
  if (confidence >= 80) return "secondary";
  return "outline";
};

const AIPhotoClassification = () => {
  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            AI Photo Classification
          </h1>
          <p className="text-muted-foreground mt-2">
            Automatically classify and organize construction site photos using
            AI
          </p>
        </div>
        <Button>Upload Photos</Button>
      </div>

      {/* Upload Area */}
      <Card>
        <CardContent className="p-6">
          <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center hover:border-muted-foreground/50 transition-colors cursor-pointer">
            <div className="space-y-3">
              <div className="text-4xl text-muted-foreground/40">&#x1F4F7;</div>
              <div>
                <p className="text-lg font-medium">
                  Drop photos here for AI classification
                </p>
                <p className="text-sm text-muted-foreground">
                  Supports JPG, PNG, HEIC. Max 50 photos at once.
                </p>
              </div>
              <Button variant="outline">Browse Files</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
        {/* Photo Grid */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Classified Photos</h2>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                Grid View
              </Button>
              <Button variant="outline" size="sm">
                List View
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {classifiedPhotos.map((photo) => (
              <Card
                key={photo.id}
                className="hover:shadow-md transition-shadow overflow-hidden"
              >
                {/* Photo Placeholder */}
                <div className="h-40 bg-muted flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-3xl text-muted-foreground/30">
                      &#x1F3D7;
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {photo.filename}
                    </p>
                  </div>
                </div>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-sm">
                        {photo.classification}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {photo.project}
                      </p>
                    </div>
                    <Badge
                      variant={
                        confidenceBadge(photo.confidence) as
                          | "default"
                          | "secondary"
                          | "outline"
                      }
                    >
                      {photo.confidence}%
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {photo.tags.map((tag) => (
                      <Badge
                        key={tag}
                        variant="outline"
                        className="text-[10px] px-1.5 py-0"
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">{photo.date}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Classification Stats Sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Classification Summary</CardTitle>
              <CardDescription>
                Photos classified by category
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {classificationStats.map((stat) => (
                <div
                  key={stat.category}
                  className="flex items-center justify-between"
                >
                  <span className="text-sm">{stat.category}</span>
                  <Badge variant="outline">{stat.count}</Badge>
                </div>
              ))}
              <div className="pt-2 border-t">
                <div className="flex items-center justify-between font-medium">
                  <span className="text-sm">Total</span>
                  <span className="text-sm">
                    {classificationStats.reduce((a, b) => a + b.count, 0)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">AI Model Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Model</span>
                <span>Brikly Vision v2.1</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Accuracy</span>
                <span>94.2%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Categories</span>
                <span>48</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Last Updated</span>
                <span>2026-02-01</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AIPhotoClassification;
