import React from "react";
import { Helmet } from "react-helmet-async";
import { PageLayout } from "@/components/layouts/PageLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Camera, Upload, Eye, TrendingUp, AlertTriangle, CheckCircle } from "lucide-react";

// Simple mock data for demonstration
const mockMetrics = {
  overall_quality_score: 87,
  total_inspections: 24,
  critical_defects: 2,
  resolved_defects: 18,
  pending_inspections: 3,
  compliance_score: 94,
};

const mockInspections = [
  {
    id: "1",
    date: "2024-01-10",
    type: "Foundation",
    score: 92,
    status: "completed",
    defects: 1,
  },
  {
    id: "2", 
    date: "2024-01-08",
    type: "Framing",
    score: 88,
    status: "completed",
    defects: 0,
  },
  {
    id: "3",
    date: "2024-01-05",
    type: "Electrical",
    score: 85,
    status: "requires_attention",
    defects: 2,
  },
];

export default function AIQualityControlPage() {
  return (
    <>
      <Helmet>
        <title>AI Quality Control | Construction Management Platform</title>
        <meta
          name="description"
          content="AI-powered quality inspection with computer vision for construction defect detection and quality assessment."
        />
      </Helmet>
      <PageLayout>
        <div className="container mx-auto p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">AI Quality Control</h1>
              <p className="text-muted-foreground">
                Automated quality inspection using computer vision and AI analysis
              </p>
            </div>
            <div className="flex gap-2">
              <Button>
                <Camera className="mr-2 h-4 w-4" />
                Start Inspection
              </Button>
              <Button variant="outline">
                <Upload className="mr-2 h-4 w-4" />
                Upload Photos
              </Button>
            </div>
          </div>

          {/* Quality Metrics Overview */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Overall Quality Score</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{mockMetrics.overall_quality_score}%</div>
                <Progress value={mockMetrics.overall_quality_score} className="mt-2" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Inspections</CardTitle>
                <Eye className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{mockMetrics.total_inspections}</div>
                <p className="text-xs text-muted-foreground">+12% from last month</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Critical Defects</CardTitle>
                <AlertTriangle className="h-4 w-4 text-destructive" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-destructive">{mockMetrics.critical_defects}</div>
                <p className="text-xs text-muted-foreground">Require immediate attention</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Compliance Score</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{mockMetrics.compliance_score}%</div>
                <Progress value={mockMetrics.compliance_score} className="mt-2" />
              </CardContent>
            </Card>
          </div>

          {/* Recent Inspections */}
          <Card>
            <CardHeader>
              <CardTitle>Recent AI Inspections</CardTitle>
              <CardDescription>
                Latest quality inspections performed by AI computer vision
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockInspections.map((inspection) => (
                  <div key={inspection.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div>
                        <p className="font-medium">{inspection.type} Inspection</p>
                        <p className="text-sm text-muted-foreground">{inspection.date}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <p className="font-medium">Score: {inspection.score}%</p>
                        <p className="text-sm text-muted-foreground">{inspection.defects} defects</p>
                      </div>
                      <Badge
                        variant={
                          inspection.status === "completed"
                            ? "default"
                            : inspection.status === "requires_attention"
                            ? "destructive"
                            : "secondary"
                        }
                      >
                        {inspection.status.replace("_", " ")}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* AI Analysis Features */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Computer Vision Analysis</CardTitle>
                <CardDescription>
                  Automated defect detection and quality assessment
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Crack Detection</span>
                    <span className="text-green-600">✓ Active</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Surface Quality</span>
                    <span className="text-green-600">✓ Active</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Alignment Check</span>
                    <span className="text-green-600">✓ Active</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Material Compliance</span>
                    <span className="text-green-600">✓ Active</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quality Trends</CardTitle>
                <CardDescription>
                  Quality score improvements over time
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>This Week</span>
                    <span className="text-green-600">+5% improvement</span>
                  </div>
                  <div className="flex justify-between">
                    <span>This Month</span>
                    <span className="text-green-600">+12% improvement</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Defect Reduction</span>
                    <span className="text-green-600">-15% defects</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Compliance Rate</span>
                    <span className="text-green-600">94% compliant</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </PageLayout>
    </>
  );
}
