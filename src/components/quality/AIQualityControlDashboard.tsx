import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Camera,
  Upload,
  Eye,
  AlertTriangle,
  CheckCircle2,
  Clock,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Brain,
  Search,
  Filter,
  Download,
  Settings,
  Zap,
  Target,
  Shield,
  Ruler,
  FileImage,
  Sparkles
} from "lucide-react";
import { 
  aiQualityControlService, 
  QualityInspection, 
  QualityPhoto,
  QualityDefect,
  QualityTrendAnalysis
} from "@/services/AIQualityControlService";
import { toast } from "sonner";
import { useDropzone } from "react-dropzone";

interface AIQualityControlDashboardProps {
  projectId: string;
  taskId?: string;
}

export default function AIQualityControlDashboard({ 
  projectId, 
  taskId 
}: AIQualityControlDashboardProps) {
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(false);
  
  // State for different data types
  const [inspections, setInspections] = useState<QualityInspection[]>([]);
  const [selectedInspection, setSelectedInspection] = useState<QualityInspection | null>(null);
  const [qualityTrends, setQualityTrends] = useState<QualityTrendAnalysis | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [inspectionType, setInspectionType] = useState<"routine" | "milestone" | "final" | "compliance">("routine");
  
  // Dialog states
  const [showInspectionDialog, setShowInspectionDialog] = useState(false);
  const [showPhotoViewer, setShowPhotoViewer] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<QualityPhoto | null>(null);

  useEffect(() => {
    if (projectId) {
      loadQualityData();
    }
  }, [projectId]);

  const loadQualityData = async () => {
    setLoading(true);
    try {
      const [inspectionHistory, trendAnalysis] = await Promise.allSettled([
        aiQualityControlService.getInspectionHistory(projectId, 20),
        aiQualityControlService.analyzeQualityTrends(projectId, 30)
      ]);

      if (inspectionHistory.status === 'fulfilled') {
        setInspections(inspectionHistory.value);
      }
      if (trendAnalysis.status === 'fulfilled') {
        setQualityTrends(trendAnalysis.value);
      }
    } catch (error) {
      console.error("Error loading quality data:", error);
      toast.error("Failed to load quality control data");
    } finally {
      setLoading(false);
    }
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setUploadedFiles(prev => [...prev, ...acceptedFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp']
    },
    multiple: true
  });

  const handleStartInspection = async () => {
    if (uploadedFiles.length === 0) {
      toast.error("Please upload at least one photo for inspection");
      return;
    }

    setLoading(true);
    try {
      const inspection = await aiQualityControlService.performQualityInspection(
        projectId,
        taskId || "default-task",
        uploadedFiles,
        inspectionType
      );

      setInspections(prev => [inspection, ...prev]);
      setUploadedFiles([]);
      setShowInspectionDialog(false);
      
      toast.success(`AI inspection completed with ${inspection.overall_score.toFixed(1)}% quality score`);
      
      // Show critical defects warning if any
      const criticalDefects = inspection.defects_detected.filter(d => d.severity === "critical");
      if (criticalDefects.length > 0) {
        toast.error(`${criticalDefects.length} critical defect(s) detected - immediate attention required`);
      }
      
      await loadQualityData();
    } catch (error) {
      toast.error("Failed to perform quality inspection");
    } finally {
      setLoading(false);
    }
  };

  const removeUploadedFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-green-600";
    if (score >= 80) return "text-blue-600";
    if (score >= 70) return "text-yellow-600";
    if (score >= 60) return "text-orange-600";
    return "text-red-600";
  };

  const getScoreBadgeVariant = (score: number) => {
    if (score >= 90) return "default";
    if (score >= 80) return "secondary";
    if (score >= 70) return "outline";
    return "destructive";
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical": return "destructive";
      case "major": return "destructive";
      case "moderate": return "secondary";
      case "minor": return "outline";
      default: return "outline";
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    }).format(new Date(date));
  };

  const formatFileSize = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Brain className="h-8 w-8 text-purple-600" />
            AI Quality Control
          </h2>
          <p className="text-muted-foreground">
            Computer vision-powered quality inspection and defect detection
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={showInspectionDialog} onOpenChange={setShowInspectionDialog}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Camera className="h-4 w-4" />
                Start Inspection
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>AI Quality Inspection</DialogTitle>
                <DialogDescription>
                  Upload photos for AI-powered quality analysis and defect detection
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="inspection-type">Inspection Type</Label>
                  <Select value={inspectionType} onValueChange={(value: any) => setInspectionType(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="routine">Routine Inspection</SelectItem>
                      <SelectItem value="milestone">Milestone Inspection</SelectItem>
                      <SelectItem value="final">Final Inspection</SelectItem>
                      <SelectItem value="compliance">Compliance Check</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div
                  {...getRootProps()}
                  className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                    isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25"
                  }`}
                >
                  <input {...getInputProps()} />
                  <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  {isDragActive ? (
                    <p>Drop the photos here...</p>
                  ) : (
                    <div>
                      <p className="text-lg font-medium">Drag & drop photos here</p>
                      <p className="text-muted-foreground">or click to select files</p>
                      <p className="text-sm text-muted-foreground mt-2">
                        Supports JPEG, PNG, WebP formats
                      </p>
                    </div>
                  )}
                </div>

                {uploadedFiles.length > 0 && (
                  <div className="space-y-2">
                    <Label>Uploaded Photos ({uploadedFiles.length})</Label>
                    <div className="max-h-40 overflow-y-auto space-y-2">
                      {uploadedFiles.map((file, index) => (
                        <div key={index} className="flex items-center justify-between p-2 border rounded">
                          <div className="flex items-center gap-2">
                            <FileImage className="h-4 w-4" />
                            <div>
                              <div className="text-sm font-medium">{file.name}</div>
                              <div className="text-xs text-muted-foreground">
                                {formatFileSize(file.size)}
                              </div>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeUploadedFile(index)}
                          >
                            Remove
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => setShowInspectionDialog(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleStartInspection}
                    disabled={loading || uploadedFiles.length === 0}
                    className="gap-2"
                  >
                    <Sparkles className="h-4 w-4" />
                    {loading ? "Processing..." : "Start AI Analysis"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          <Button variant="outline" onClick={loadQualityData} disabled={loading}>
            <BarChart3 className="h-4 w-4 mr-2" />
            Refresh Data
          </Button>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Quality Score</CardTitle>
            <Target className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getScoreColor(qualityTrends?.average_score || 0)}`}>
              {qualityTrends?.average_score.toFixed(1) || "0"}%
            </div>
            <p className="text-xs text-muted-foreground">
              {qualityTrends?.quality_improvement ? (
                <span className="text-green-600 flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  Improving
                </span>
              ) : (
                <span className="text-red-600 flex items-center gap-1">
                  <TrendingDown className="h-3 w-3" />
                  Needs attention
                </span>
              )}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Inspections</CardTitle>
            <Eye className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inspections.length}</div>
            <p className="text-xs text-muted-foreground">
              AI-powered analyses completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Defects</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {inspections.reduce((sum, inspection) => 
                sum + inspection.defects_detected.filter(d => d.status === "open").length, 0
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Requiring attention
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">AI Confidence</CardTitle>
            <Brain className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {inspections.length > 0 
                ? (inspections.reduce((sum, i) => sum + i.ai_analysis.overall_confidence, 0) / inspections.length * 100).toFixed(1)
                : "0"
              }%
            </div>
            <p className="text-xs text-muted-foreground">
              Average model confidence
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="inspections">Inspections</TabsTrigger>
          <TabsTrigger value="defects">Defects</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="settings">AI Settings</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Inspections */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5 text-blue-600" />
                  Recent AI Inspections
                </CardTitle>
                <CardDescription>Latest quality control analyses</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {inspections.slice(0, 5).map((inspection) => (
                    <div key={inspection.inspection_id} className="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-muted/50" onClick={() => setSelectedInspection(inspection)}>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Badge variant={getScoreBadgeVariant(inspection.overall_score)}>
                            {inspection.overall_score.toFixed(1)}%
                          </Badge>
                          <span className="font-medium capitalize">{inspection.inspector_type} Inspection</span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {formatDate(inspection.inspection_date)} • {inspection.photos.length} photos
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">
                          {inspection.defects_detected.length} defects
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {inspection.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                  {inspections.length === 0 && (
                    <div className="text-center py-4 text-muted-foreground">
                      No inspections completed yet
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Critical Issues */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  Critical Quality Issues
                </CardTitle>
                <CardDescription>High-priority defects requiring immediate attention</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {inspections
                    .flatMap(i => i.defects_detected)
                    .filter(d => d.severity === "critical" && d.status === "open")
                    .slice(0, 5)
                    .map((defect) => (
                    <div key={defect.defect_id} className="p-3 border rounded-lg border-l-4 border-l-destructive">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-medium text-destructive">{defect.defect_type}</div>
                          <div className="text-sm text-muted-foreground mt-1">
                            {defect.description}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            Location: {defect.location}
                          </div>
                        </div>
                        <Badge variant="destructive">
                          {defect.severity}
                        </Badge>
                      </div>
                    </div>
                  ))}
                  {inspections.flatMap(i => i.defects_detected).filter(d => d.severity === "critical" && d.status === "open").length === 0 && (
                    <div className="text-center py-4 text-green-600">
                      <CheckCircle2 className="h-12 w-12 mx-auto mb-2" />
                      <div className="font-medium">No Critical Issues</div>
                      <div className="text-sm text-muted-foreground">Quality standards are being met</div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Inspections Tab */}
        <TabsContent value="inspections" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Quality Inspection History</CardTitle>
              <CardDescription>
                Complete history of AI-powered quality inspections
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {inspections.map((inspection) => (
                  <Card key={inspection.inspection_id} className="border-l-4" style={{borderLeftColor: inspection.overall_score >= 80 ? '#22c55e' : inspection.overall_score >= 60 ? '#f59e0b' : '#ef4444'}}>
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant={getScoreBadgeVariant(inspection.overall_score)} className="text-lg px-3 py-1">
                              {inspection.overall_score.toFixed(1)}%
                            </Badge>
                            <Badge variant="outline" className="capitalize">
                              {inspection.inspector_type}
                            </Badge>
                            <Badge variant="secondary">
                              {inspection.photos.length} photos
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {formatDate(inspection.inspection_date)} • AI Model: {inspection.ai_analysis.ai_model_version}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedInspection(inspection)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View Details
                          </Button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                        <div>
                          <div className="text-sm font-medium">AI Confidence</div>
                          <div className="text-lg font-bold">
                            {(inspection.ai_analysis.overall_confidence * 100).toFixed(1)}%
                          </div>
                        </div>
                        <div>
                          <div className="text-sm font-medium">Defects Found</div>
                          <div className="text-lg font-bold">
                            {inspection.defects_detected.length}
                          </div>
                        </div>
                        <div>
                          <div className="text-sm font-medium">Processing Time</div>
                          <div className="text-lg font-bold">
                            {(inspection.ai_analysis.processing_time_ms / 1000).toFixed(1)}s
                          </div>
                        </div>
                        <div>
                          <div className="text-sm font-medium">Status</div>
                          <Badge variant={inspection.status === "completed" ? "default" : "secondary"}>
                            {inspection.status}
                          </Badge>
                        </div>
                      </div>

                      {inspection.defects_detected.length > 0 && (
                        <div className="bg-muted p-3 rounded">
                          <div className="text-sm font-medium mb-2">Defects Summary</div>
                          <div className="grid grid-cols-4 gap-2 text-sm">
                            <div>
                              <span className="text-muted-foreground">Critical:</span>{" "}
                              <span className="font-medium text-destructive">
                                {inspection.defects_detected.filter(d => d.severity === "critical").length}
                              </span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Major:</span>{" "}
                              <span className="font-medium text-orange-600">
                                {inspection.defects_detected.filter(d => d.severity === "major").length}
                              </span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Moderate:</span>{" "}
                              <span className="font-medium text-yellow-600">
                                {inspection.defects_detected.filter(d => d.severity === "moderate").length}
                              </span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Minor:</span>{" "}
                              <span className="font-medium text-green-600">
                                {inspection.defects_detected.filter(d => d.severity === "minor").length}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}

                      {inspection.recommendations.length > 0 && (
                        <Alert className="mt-4">
                          <Zap className="h-4 w-4" />
                          <AlertTitle>AI Recommendations</AlertTitle>
                          <AlertDescription>
                            <ul className="list-disc list-inside space-y-1">
                              {inspection.recommendations.slice(0, 3).map((rec, index) => (
                                <li key={index} className="text-sm">{rec}</li>
                              ))}
                            </ul>
                          </AlertDescription>
                        </Alert>
                      )}
                    </CardContent>
                  </Card>
                ))}
                {inspections.length === 0 && (
                  <div className="text-center py-8">
                    <Brain className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium">No Inspections Yet</h3>
                    <p className="text-muted-foreground mb-4">Start your first AI quality inspection</p>
                    <Button onClick={() => setShowInspectionDialog(true)}>
                      <Camera className="h-4 w-4 mr-2" />
                      Start Inspection
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Defects Tab */}
        <TabsContent value="defects" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Quality Defect Management</CardTitle>
              <CardDescription>
                Track and manage defects detected by AI quality control
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {inspections.flatMap(inspection => 
                  inspection.defects_detected.map(defect => ({
                    ...defect,
                    inspection_date: inspection.inspection_date,
                    inspection_id: inspection.inspection_id
                  }))
                ).slice(0, 20).map((defect) => (
                  <Card key={defect.defect_id}>
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant={getSeverityColor(defect.severity)}>
                              {defect.severity}
                            </Badge>
                            <span className="font-semibold capitalize">{defect.defect_type}</span>
                          </div>
                          <p className="text-muted-foreground mb-2">{defect.description}</p>
                          <div className="text-sm text-muted-foreground">
                            Location: {defect.location} • Detected: {formatDate(defect.inspection_date)}
                          </div>
                        </div>
                        <Badge variant={defect.status === "resolved" ? "default" : "secondary"}>
                          {defect.status}
                        </Badge>
                      </div>

                      {defect.remediation_plan && (
                        <div className="bg-muted p-3 rounded mt-3">
                          <div className="text-sm font-medium mb-2">Remediation Plan</div>
                          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                            <div>
                              <span className="text-muted-foreground">Estimated Cost:</span>{" "}
                              <span className="font-medium">${defect.remediation_plan.estimated_cost}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Duration:</span>{" "}
                              <span className="font-medium">{defect.remediation_plan.estimated_duration_hours}h</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Priority:</span>{" "}
                              <Badge variant="outline" className="text-xs">
                                {defect.remediation_plan.priority}
                              </Badge>
                            </div>
                          </div>
                          {defect.due_date && (
                            <div className="text-sm mt-2">
                              <span className="text-muted-foreground">Due Date:</span>{" "}
                              <span className="font-medium">{new Date(defect.due_date).toLocaleDateString()}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
                {inspections.flatMap(i => i.defects_detected).length === 0 && (
                  <div className="text-center py-8">
                    <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto mb-4" />
                    <h3 className="text-lg font-medium">No Defects Detected</h3>
                    <p className="text-muted-foreground">Quality standards are being maintained</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Trends Tab */}
        <TabsContent value="trends" className="space-y-4">
          {qualityTrends && (
            <Card>
              <CardHeader>
                <CardTitle>Quality Trend Analysis</CardTitle>
                <CardDescription>
                  30-day quality performance analysis and insights
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                  <div className="text-center">
                    <div className={`text-3xl font-bold ${getScoreColor(qualityTrends.average_score)}`}>
                      {qualityTrends.average_score.toFixed(1)}%
                    </div>
                    <div className="text-sm text-muted-foreground">Average Quality Score</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold">
                      {qualityTrends.total_inspections}
                    </div>
                    <div className="text-sm text-muted-foreground">Total Inspections</div>
                  </div>
                  <div className="text-center">
                    <div className={`text-3xl font-bold flex items-center justify-center gap-2 ${
                      qualityTrends.quality_improvement ? "text-green-600" : "text-red-600"
                    }`}>
                      {qualityTrends.quality_improvement ? (
                        <TrendingUp className="h-8 w-8" />
                      ) : (
                        <TrendingDown className="h-8 w-8" />
                      )}
                      {Math.abs(qualityTrends.score_trend).toFixed(1)}%
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {qualityTrends.quality_improvement ? "Improving" : "Declining"}
                    </div>
                  </div>
                </div>

                <Separator className="my-6" />

                <div className="space-y-4">
                  <h4 className="font-semibold">Defect Analysis</h4>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="text-center p-4 border rounded">
                      <div className="text-2xl font-bold text-destructive">
                        {qualityTrends.defect_trend.critical_defects}
                      </div>
                      <div className="text-sm text-muted-foreground">Critical Defects</div>
                    </div>
                    <div className="text-center p-4 border rounded">
                      <div className="text-2xl font-bold">
                        {qualityTrends.defect_trend.total_defects}
                      </div>
                      <div className="text-sm text-muted-foreground">Total Defects</div>
                    </div>
                    <div className="text-center p-4 border rounded">
                      <div className="text-2xl font-bold">
                        {qualityTrends.defect_trend.average_defects_per_inspection.toFixed(1)}
                      </div>
                      <div className="text-sm text-muted-foreground">Avg per Inspection</div>
                    </div>
                    <div className="text-center p-4 border rounded">
                      <div className={`text-2xl font-bold ${
                        qualityTrends.defect_trend.defect_rate_trend <= 0 ? "text-green-600" : "text-red-600"
                      }`}>
                        {qualityTrends.defect_trend.defect_rate_trend > 0 ? "+" : ""}
                        {qualityTrends.defect_trend.defect_rate_trend.toFixed(1)}
                      </div>
                      <div className="text-sm text-muted-foreground">Trend Rate</div>
                    </div>
                  </div>
                </div>

                {qualityTrends.recommendations.length > 0 && (
                  <Alert className="mt-6">
                    <TrendingUp className="h-4 w-4" />
                    <AlertTitle>Trend-Based Recommendations</AlertTitle>
                    <AlertDescription>
                      <ul className="list-disc list-inside space-y-1 mt-2">
                        {qualityTrends.recommendations.map((rec, index) => (
                          <li key={index} className="text-sm">{rec}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* AI Settings Tab */}
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>AI Model Configuration</CardTitle>
              <CardDescription>
                Configure AI models and quality control parameters
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <h4 className="font-semibold mb-3">Active AI Models</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 border rounded">
                      <div>
                        <div className="font-medium">Defect Detection Model</div>
                        <div className="text-sm text-muted-foreground">v2.1 - 92% accuracy</div>
                      </div>
                      <Badge variant="default">Active</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded">
                      <div>
                        <div className="font-medium">Quality Assessment Model</div>
                        <div className="text-sm text-muted-foreground">v1.5 - 89% accuracy</div>
                      </div>
                      <Badge variant="default">Active</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded">
                      <div>
                        <div className="font-medium">Measurement Extraction</div>
                        <div className="text-sm text-muted-foreground">v3.0 - 94% accuracy</div>
                      </div>
                      <Badge variant="default">Active</Badge>
                    </div>
                  </div>
                </div>

                <Separator />

                <div>
                  <h4 className="font-semibold mb-3">Detection Thresholds</h4>
                  <div className="space-y-4">
                    <div>
                      <Label>Minimum Confidence Score</Label>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="text-sm">60%</span>
                        <div className="flex-1">
                          <Progress value={80} className="w-full" />
                        </div>
                        <span className="text-sm">100%</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Current: 80% - Only detections above this confidence will be reported
                      </p>
                    </div>

                    <div>
                      <Label>Critical Defect Sensitivity</Label>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="text-sm">Low</span>
                        <div className="flex-1">
                          <Progress value={70} className="w-full" />
                        </div>
                        <span className="text-sm">High</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Current: High - More sensitive detection of critical issues
                      </p>
                    </div>
                  </div>
                </div>

                <Separator />

                <div>
                  <h4 className="font-semibold mb-3">Notification Settings</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">Critical Defect Alerts</div>
                        <div className="text-sm text-muted-foreground">Immediate notifications for critical issues</div>
                      </div>
                      <Badge variant="default">Enabled</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">Low Confidence Warnings</div>
                        <div className="text-sm text-muted-foreground">Alert when AI confidence is below threshold</div>
                      </div>
                      <Badge variant="secondary">Enabled</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">Daily Quality Reports</div>
                        <div className="text-sm text-muted-foreground">Automated daily quality summaries</div>
                      </div>
                      <Badge variant="default">Enabled</Badge>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Inspection Details Dialog */}
      {selectedInspection && (
        <Dialog open={!!selectedInspection} onOpenChange={() => setSelectedInspection(null)}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Inspection Details</DialogTitle>
              <DialogDescription>
                Detailed AI analysis results and findings
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <div className="text-sm font-medium">Quality Score</div>
                  <div className={`text-2xl font-bold ${getScoreColor(selectedInspection.overall_score)}`}>
                    {selectedInspection.overall_score.toFixed(1)}%
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium">AI Confidence</div>
                  <div className="text-2xl font-bold">
                    {(selectedInspection.ai_analysis.overall_confidence * 100).toFixed(1)}%
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium">Photos Analyzed</div>
                  <div className="text-2xl font-bold">{selectedInspection.photos.length}</div>
                </div>
                <div>
                  <div className="text-sm font-medium">Defects Found</div>
                  <div className="text-2xl font-bold">{selectedInspection.defects_detected.length}</div>
                </div>
              </div>

              <Separator />

              <div>
                <h4 className="font-semibold mb-3">Analysis Photos</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {selectedInspection.photos.map((photo) => (
                    <div 
                      key={photo.photo_id} 
                      className="border rounded-lg overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => {
                        setSelectedPhoto(photo);
                        setShowPhotoViewer(true);
                      }}
                    >
                      <div className="aspect-video bg-muted flex items-center justify-center">
                        <FileImage className="h-12 w-12 text-muted-foreground" />
                      </div>
                      <div className="p-2">
                        <div className="text-sm font-medium">
                          Confidence: {(photo.ai_analysis.confidence_score * 100).toFixed(1)}%
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {photo.ai_analysis.defects_found.length} defects detected
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {selectedInspection.defects_detected.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <h4 className="font-semibold mb-3">Detected Defects</h4>
                    <div className="space-y-2">
                      {selectedInspection.defects_detected.map((defect) => (
                        <div key={defect.defect_id} className="flex items-center justify-between p-2 border rounded">
                          <div>
                            <span className="font-medium capitalize">{defect.defect_type}</span>
                            <span className="text-sm text-muted-foreground ml-2">{defect.description}</span>
                          </div>
                          <Badge variant={getSeverityColor(defect.severity)}>
                            {defect.severity}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {selectedInspection.recommendations.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <h4 className="font-semibold mb-3">AI Recommendations</h4>
                    <ul className="list-disc list-inside space-y-1">
                      {selectedInspection.recommendations.map((rec, index) => (
                        <li key={index} className="text-sm">{rec}</li>
                      ))}
                    </ul>
                  </div>
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Photo Viewer Dialog */}
      {selectedPhoto && (
        <Dialog open={showPhotoViewer} onOpenChange={setShowPhotoViewer}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Photo Analysis Details</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                <FileImage className="h-24 w-24 text-muted-foreground" />
                <div className="ml-4">
                  <div className="font-medium">Photo Analysis</div>
                  <div className="text-sm text-muted-foreground">
                    Confidence: {(selectedPhoto.ai_analysis.confidence_score * 100).toFixed(1)}%
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h5 className="font-medium mb-2">Detected Objects</h5>
                  <div className="space-y-1">
                    {selectedPhoto.ai_analysis.detected_objects.map((obj, index) => (
                      <div key={index} className="text-sm">
                        {obj.object_type} ({(obj.confidence * 100).toFixed(1)}%)
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h5 className="font-medium mb-2">Quality Assessment</h5>
                  <div className="text-sm">
                    Overall: <Badge variant="outline">{selectedPhoto.ai_analysis.quality_assessment.overall_quality}</Badge>
                  </div>
                </div>
              </div>

              {selectedPhoto.ai_analysis.defects_found.length > 0 && (
                <div>
                  <h5 className="font-medium mb-2">Defects in Photo</h5>
                  <div className="space-y-2">
                    {selectedPhoto.ai_analysis.defects_found.map((defect, index) => (
                      <div key={index} className="p-2 border rounded">
                        <div className="flex items-center justify-between">
                          <span className="capitalize">{defect.defect_type}</span>
                          <Badge variant={getSeverityColor(defect.severity)}>
                            {defect.severity}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          {defect.description}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
