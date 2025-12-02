import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  Camera, Upload, Zap, Brain, TrendingUp, AlertTriangle, 
  CheckCircle, Clock, BarChart3, Eye, Target
} from 'lucide-react';

interface ProgressAnalysis {
  id: string;
  projectId: string;
  projectName: string;
  imageUrl: string;
  uploadedAt: Date;
  analyzedAt?: Date;
  status: 'processing' | 'completed' | 'failed';
  aiModel: string;
  confidence: number;
  detectedActivities: DetectedActivity[];
  progressPercentage: number;
  previousProgressPercentage?: number;
  progressChange: number;
  qualityIssues: QualityIssue[];
  safetyObservations: SafetyObservation[];
  recommendations: string[];
  predictedCompletion?: Date;
  riskFactors: RiskFactor[];
}

interface DetectedActivity {
  id: string;
  type: string;
  description: string;
  confidence: number;
  boundingBox: { x: number; y: number; width: number; height: number };
  status: 'active' | 'completed' | 'not_started';
  estimatedProgress: number;
}

interface QualityIssue {
  id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  type: string;
  description: string;
  location: { x: number; y: number };
  confidence: number;
  suggestedAction: string;
}

interface SafetyObservation {
  id: string;
  type: 'violation' | 'concern' | 'good_practice';
  description: string;
  severity: 'low' | 'medium' | 'high';
  confidence: number;
  location: { x: number; y: number };
  recommendation: string;
}

interface RiskFactor {
  id: string;
  category: 'schedule' | 'budget' | 'quality' | 'safety' | 'weather';
  risk: string;
  impact: 'low' | 'medium' | 'high';
  probability: number;
  mitigation: string;
}

interface ProjectMilestone {
  id: string;
  name: string;
  targetDate: Date;
  predictedDate: Date;
  status: 'on_track' | 'at_risk' | 'delayed';
  confidence: number;
}

export const AIProgressAnalyzer: React.FC = () => {
  const [analyses] = useState<ProgressAnalysis[]>([
    {
      id: '1',
      projectId: 'proj-001',
      projectName: 'Downtown Office Building',
      imageUrl: '/images/construction-progress-1.jpg',
      uploadedAt: new Date('2024-01-29T14:30:00'),
      analyzedAt: new Date('2024-01-29T14:32:00'),
      status: 'completed',
      aiModel: 'BuildDesk Vision v2.1',
      confidence: 94.2,
      progressPercentage: 67.5,
      previousProgressPercentage: 62.1,
      progressChange: 5.4,
      detectedActivities: [
        {
          id: 'act1',
          type: 'Concrete Pouring',
          description: 'Foundation concrete pouring in progress',
          confidence: 96.8,
          boundingBox: { x: 150, y: 200, width: 300, height: 200 },
          status: 'active',
          estimatedProgress: 75
        },
        {
          id: 'act2',
          type: 'Steel Framework',
          description: 'Steel beam installation on level 3',
          confidence: 89.3,
          boundingBox: { x: 400, y: 100, width: 250, height: 180 },
          status: 'active',
          estimatedProgress: 45
        }
      ],
      qualityIssues: [
        {
          id: 'qi1',
          severity: 'medium',
          type: 'Surface Defect',
          description: 'Uneven concrete surface detected in section B',
          location: { x: 200, y: 300 },
          confidence: 82.1,
          suggestedAction: 'Schedule grinding and resurfacing'
        }
      ],
      safetyObservations: [
        {
          id: 'so1',
          type: 'violation',
          description: 'Worker without hard hat detected',
          severity: 'high',
          confidence: 91.4,
          location: { x: 350, y: 250 },
          recommendation: 'Immediate safety briefing required'
        }
      ],
      recommendations: [
        'Consider accelerating steel framework installation to maintain schedule',
        'Address concrete surface quality issues before proceeding',
        'Implement additional safety monitoring in high-activity areas'
      ],
      predictedCompletion: new Date('2024-06-15'),
      riskFactors: [
        {
          id: 'rf1',
          category: 'schedule',
          risk: 'Weather delays may impact outdoor work',
          impact: 'medium',
          probability: 65,
          mitigation: 'Adjust work schedule for indoor activities during rain'
        }
      ]
    }
  ]);

  const [milestones] = useState<ProjectMilestone[]>([
    {
      id: 'ms1',
      name: 'Foundation Complete',
      targetDate: new Date('2024-02-15'),
      predictedDate: new Date('2024-02-18'),
      status: 'at_risk',
      confidence: 78.5
    },
    {
      id: 'ms2',
      name: 'Structural Frame Complete',
      targetDate: new Date('2024-04-30'),
      predictedDate: new Date('2024-05-05'),
      status: 'at_risk',
      confidence: 82.3
    },
    {
      id: 'ms3',
      name: 'Mechanical Systems',
      targetDate: new Date('2024-06-15'),
      predictedDate: new Date('2024-06-20'),
      status: 'on_track',
      confidence: 91.2
    }
  ]);

  const [, setSelectedImage] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedProject, setSelectedProject] = useState<string>('proj-001');

  const handleImageUpload = async (file: File) => {
    setSelectedImage(file);
    setIsAnalyzing(true);
    
    // Simulate AI analysis
    setTimeout(() => {
      setIsAnalyzing(false);
      // Add new analysis result here
    }, 3000);
  };

  const getStatusColor = (status: ProgressAnalysis['status']) => {
    switch (status) {
      case 'completed': return 'default';
      case 'processing': return 'secondary';
      case 'failed': return 'destructive';
      default: return 'outline';
    }
  };

  const getSeverityColor = (severity: 'low' | 'medium' | 'high' | 'critical') => {
    switch (severity) {
      case 'low': return 'outline';
      case 'medium': return 'secondary';
      case 'high': return 'default';
      case 'critical': return 'destructive';
      default: return 'outline';
    }
  };

  const getMilestoneStatusColor = (status: ProjectMilestone['status']) => {
    switch (status) {
      case 'on_track': return 'default';
      case 'at_risk': return 'secondary';
      case 'delayed': return 'destructive';
      default: return 'outline';
    }
  };

  const renderAnalysisCard = (analysis: ProgressAnalysis) => {
    return (
      <Card key={analysis.id} className="p-4">
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Brain className="h-4 w-4" />
              <h4 className="font-medium">{analysis.projectName}</h4>
            </div>
            <p className="text-sm text-muted-foreground">{analysis.aiModel}</p>
            <p className="text-xs text-muted-foreground">
              Analyzed: {analysis.analyzedAt?.toLocaleString()}
            </p>
          </div>
          
          <div className="flex flex-col items-end gap-1">
            <Badge variant={getStatusColor(analysis.status)}>
              {analysis.status}
            </Badge>
            <Badge variant="outline">
              {analysis.confidence.toFixed(1)}% confident
            </Badge>
          </div>
        </div>

        <div className="space-y-3 mb-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Project Progress</span>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold">{analysis.progressPercentage.toFixed(1)}%</span>
              {analysis.progressChange > 0 && (
                <div className="flex items-center text-green-600">
                  <TrendingUp className="h-4 w-4" />
                  <span className="text-sm">+{analysis.progressChange.toFixed(1)}%</span>
                </div>
              )}
            </div>
          </div>
          <Progress value={analysis.progressPercentage} className="h-2" />
        </div>

        <div className="grid grid-cols-3 gap-4 text-center mb-4">
          <div>
            <p className="text-lg font-bold text-blue-600">{analysis.detectedActivities.length}</p>
            <p className="text-xs text-muted-foreground">Activities</p>
          </div>
          <div>
            <p className="text-lg font-bold text-orange-500">{analysis.qualityIssues.length}</p>
            <p className="text-xs text-muted-foreground">Quality Issues</p>
          </div>
          <div>
            <p className="text-lg font-bold text-red-600">{analysis.safetyObservations.length}</p>
            <p className="text-xs text-muted-foreground">Safety Items</p>
          </div>
        </div>

        <div className="space-y-2 mb-4">
          <h5 className="font-medium text-sm">Key Insights</h5>
          {analysis.recommendations.slice(0, 2).map((rec, index) => (
            <div key={index} className="flex items-start gap-2 text-sm">
              <Target className="h-3 w-3 mt-1 text-blue-600" />
              <span className="text-muted-foreground">{rec}</span>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <Button size="sm" variant="outline">
            <Eye className="h-3 w-3 mr-1" />
            View Analysis
          </Button>
          <Button size="sm" variant="outline">
            <BarChart3 className="h-3 w-3 mr-1" />
            Compare
          </Button>
          <Button size="sm" variant="ghost">
            Export
          </Button>
        </div>
      </Card>
    );
  };

  const renderQualityIssue = (issue: QualityIssue) => {
    return (
      <Card key={issue.id} className="p-4">
        <div className="flex justify-between items-start mb-2">
          <div className="flex-1">
            <h5 className="font-medium">{issue.type}</h5>
            <p className="text-sm text-muted-foreground">{issue.description}</p>
          </div>
          <Badge variant={getSeverityColor(issue.severity)}>
            {issue.severity}
          </Badge>
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Confidence:</span>
            <span>{issue.confidence.toFixed(1)}%</span>
          </div>
          <div className="text-sm">
            <span className="text-muted-foreground">Suggested Action:</span>
            <p className="font-medium">{issue.suggestedAction}</p>
          </div>
        </div>
      </Card>
    );
  };

  const renderSafetyObservation = (observation: SafetyObservation) => {
    return (
      <Card key={observation.id} className="p-4">
        <div className="flex justify-between items-start mb-2">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              <h5 className="font-medium capitalize">{observation.type.replace('_', ' ')}</h5>
            </div>
            <p className="text-sm text-muted-foreground">{observation.description}</p>
          </div>
          <Badge variant={getSeverityColor(observation.severity)}>
            {observation.severity}
          </Badge>
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Confidence:</span>
            <span>{observation.confidence.toFixed(1)}%</span>
          </div>
          <div className="text-sm">
            <span className="text-muted-foreground">Recommendation:</span>
            <p className="font-medium">{observation.recommendation}</p>
          </div>
        </div>
      </Card>
    );
  };

  const renderMilestone = (milestone: ProjectMilestone) => {
    const daysToTarget = Math.ceil((milestone.targetDate.getTime() - new Date().getTime()) / (1000 * 3600 * 24));
    const daysToPredicted = Math.ceil((milestone.predictedDate.getTime() - new Date().getTime()) / (1000 * 3600 * 24));
    const delay = daysToPredicted - daysToTarget;

    return (
      <Card key={milestone.id} className="p-4">
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1">
            <h5 className="font-medium">{milestone.name}</h5>
            <div className="text-sm text-muted-foreground space-y-1">
              <p>Target: {milestone.targetDate.toLocaleDateString()}</p>
              <p>Predicted: {milestone.predictedDate.toLocaleDateString()}</p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <Badge variant={getMilestoneStatusColor(milestone.status)}>
              {milestone.status.replace('_', ' ')}
            </Badge>
            <Badge variant="outline">
              {milestone.confidence.toFixed(1)}% confident
            </Badge>
          </div>
        </div>

        <div className="space-y-2">
          {delay > 0 && (
            <div className="flex items-center gap-2 text-orange-600">
              <Clock className="h-4 w-4" />
              <span className="text-sm">Predicted {delay} day delay</span>
            </div>
          )}
          {delay <= 0 && (
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-4 w-4" />
              <span className="text-sm">On track or ahead</span>
            </div>
          )}
        </div>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">AI Progress Analyzer</h2>
          <p className="text-muted-foreground">
            Advanced computer vision for construction progress tracking and quality assessment
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <BarChart3 className="h-4 w-4 mr-2" />
            Analytics
          </Button>
          <Button>
            <Camera className="h-4 w-4 mr-2" />
            Capture Progress
          </Button>
        </div>
      </div>

      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload Progress Photos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Select Project</label>
              <select 
                value={selectedProject}
                onChange={(e) => setSelectedProject(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
              >
                <option value="proj-001">Downtown Office Building</option>
                <option value="proj-002">Residential Complex</option>
                <option value="proj-003">Industrial Warehouse</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Upload Image</label>
              <div className="flex gap-2">
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleImageUpload(file);
                  }}
                  className="flex-1"
                />
                <Button disabled={isAnalyzing}>
                  {isAnalyzing ? (
                    <>
                      <Zap className="h-4 w-4 mr-2 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Brain className="h-4 w-4 mr-2" />
                      Analyze
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
          
          {isAnalyzing && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="h-4 w-4 text-blue-600 animate-spin" />
                <span className="font-medium">AI Analysis in Progress</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Processing image with computer vision models for progress detection, quality assessment, and safety analysis...
              </p>
              <Progress value={33} className="mt-2" />
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="analyses" className="space-y-4">
        <TabsList>
          <TabsTrigger value="analyses">Recent Analyses</TabsTrigger>
          <TabsTrigger value="quality">Quality Issues</TabsTrigger>
          <TabsTrigger value="safety">Safety Observations</TabsTrigger>
          <TabsTrigger value="milestones">Milestone Predictions</TabsTrigger>
        </TabsList>

        <TabsContent value="analyses">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">AI Progress Analyses</h3>
              <Badge variant="outline">{analyses.length} analyses completed</Badge>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {analyses.map(renderAnalysisCard)}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="quality">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Quality Issues Detected</h3>
              <div className="flex gap-2">
                <Badge variant="destructive">2 critical</Badge>
                <Badge variant="secondary">5 medium</Badge>
                <Badge variant="outline">3 low</Badge>
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {analyses.flatMap(analysis => 
                analysis.qualityIssues.map(renderQualityIssue)
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="safety">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Safety Observations</h3>
              <div className="flex gap-2">
                <Badge variant="destructive">1 violation</Badge>
                <Badge variant="secondary">2 concerns</Badge>
                <Badge variant="default">3 good practices</Badge>
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {analyses.flatMap(analysis => 
                analysis.safetyObservations.map(renderSafetyObservation)
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="milestones">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Milestone Predictions</h3>
              <Badge variant="outline">AI-powered forecasting</Badge>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {milestones.map(renderMilestone)}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};