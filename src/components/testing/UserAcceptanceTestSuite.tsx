import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { 
  Users, 
  Star, 
  MessageSquare, 
  ThumbsUp, 
  ThumbsDown, 
  Clock,
  CheckCircle2,
  AlertTriangle,
  User,
  Building,
  Hammer,
  Zap
} from 'lucide-react';

interface UserTestScenario {
  id: string;
  title: string;
  description: string;
  user_type: 'admin' | 'project_manager' | 'field_supervisor' | 'office_staff' | 'client';
  difficulty: 'easy' | 'medium' | 'hard';
  estimated_time: number;
  steps: string[];
  acceptance_criteria: string[];
  status: 'pending' | 'in_review' | 'approved' | 'rejected';
  feedback?: UserFeedback[];
}

interface UserFeedback {
  id: string;
  user_id: string;
  user_name: string;
  user_type: string;
  rating: number;
  completion_time: number;
  comments: string;
  issues_encountered: string[];
  suggestions: string[];
  created_at: string;
}

interface TestSession {
  id: string;
  name: string;
  description: string;
  participants: number;
  scenarios: string[];
  start_date: string;
  end_date: string;
  status: 'planning' | 'active' | 'completed' | 'cancelled';
  completion_rate: number;
  avg_satisfaction: number;
}

const UserAcceptanceTestSuite = () => {
  const { userProfile } = useAuth();
  const [testScenarios, setTestScenarios] = useState<UserTestScenario[]>([]);
  const [testSessions, setTestSessions] = useState<TestSession[]>([]);
  const [selectedScenario, setSelectedScenario] = useState<UserTestScenario | null>(null);
  const [scenarioDialogOpen, setScenarioDialogOpen] = useState(false);
  const [newFeedback, setNewFeedback] = useState('');
  const [newRating, setNewRating] = useState(5);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadTestScenarios();
    loadTestSessions();
  }, []);

  const loadTestScenarios = async () => {
    try {
      // Mock test scenarios data
      const mockScenarios: UserTestScenario[] = [
        {
          id: '1',
          title: 'Create New Project as Project Manager',
          description: 'Test the complete project creation workflow from a project manager perspective',
          user_type: 'project_manager',
          difficulty: 'medium',
          estimated_time: 15,
          steps: [
            'Login to the system as a project manager',
            'Navigate to "Create Project" page',
            'Fill in project basic information',
            'Set project timeline and milestones',
            'Assign team members',
            'Upload initial project documents',
            'Review and submit project for approval'
          ],
          acceptance_criteria: [
            'Project is created successfully',
            'All team members receive notifications',
            'Project appears in dashboard',
            'Documents are properly attached',
            'Timeline is correctly displayed'
          ],
          status: 'approved',
          feedback: [
            {
              id: '1',
              user_id: '1',
              user_name: 'John Smith',
              user_type: 'Project Manager',
              rating: 4,
              completion_time: 12,
              comments: 'Overall process was smooth, but the file upload could be more intuitive.',
              issues_encountered: ['File upload button was hard to find'],
              suggestions: ['Add drag-and-drop file upload', 'Better visual feedback during upload'],
              created_at: new Date().toISOString()
            }
          ]
        },
        {
          id: '2',
          title: 'Submit Daily Report from Field',
          description: 'Test mobile daily report submission workflow for field supervisors',
          user_type: 'field_supervisor',
          difficulty: 'easy',
          estimated_time: 8,
          steps: [
            'Open mobile app on site',
            'Navigate to daily reports',
            'Select current project',
            'Fill in work progress details',
            'Add photos of work completed',
            'Record any issues or delays',
            'Submit report'
          ],
          acceptance_criteria: [
            'Report is submitted successfully',
            'Photos are properly attached',
            'Report appears in project timeline',
            'Office staff receives notification',
            'GPS location is captured'
          ],
          status: 'in_review',
          feedback: [
            {
              id: '2',
              user_id: '2',
              user_name: 'Mike Johnson',
              user_type: 'Field Supervisor',
              rating: 5,
              completion_time: 6,
              comments: 'Very easy to use, even with work gloves on. Photo upload works great.',
              issues_encountered: [],
              suggestions: ['Add voice notes option'],
              created_at: new Date().toISOString()
            }
          ]
        },
        {
          id: '3',
          title: 'Review Financial Reports as Admin',
          description: 'Test comprehensive financial reporting and analytics features',
          user_type: 'admin',
          difficulty: 'hard',
          estimated_time: 25,
          steps: [
            'Access financial dashboard',
            'Generate profit/loss report for last quarter',
            'Analyze cost variance by project',
            'Review cash flow projections',
            'Export financial data to Excel',
            'Set up automated report scheduling'
          ],
          acceptance_criteria: [
            'All reports generate correctly',
            'Data matches accounting system',
            'Export functionality works',
            'Automated scheduling is set up',
            'Charts and graphs display properly'
          ],
          status: 'pending',
          feedback: []
        },
        {
          id: '4',
          title: 'Client Portal Project Updates',
          description: 'Test client experience viewing project progress and updates',
          user_type: 'client',
          difficulty: 'easy',
          estimated_time: 10,
          steps: [
            'Login to client portal',
            'View project dashboard',
            'Check latest progress photos',
            'Review project timeline',
            'Download project documents',
            'Submit feedback or questions'
          ],
          acceptance_criteria: [
            'All project information is visible',
            'Photos load quickly',
            'Documents download correctly',
            'Feedback form works',
            'Interface is user-friendly'
          ],
          status: 'approved',
          feedback: [
            {
              id: '3',
              user_id: '3',
              user_name: 'Sarah Wilson',
              user_type: 'Client',
              rating: 4,
              completion_time: 8,
              comments: 'Love being able to see progress in real-time. Very transparent process.',
              issues_encountered: ['Some photos took a while to load'],
              suggestions: ['Add email notifications for updates'],
              created_at: new Date().toISOString()
            }
          ]
        }
      ];

      setTestScenarios(mockScenarios);
    } catch (error) {
      console.error('Error loading test scenarios:', error);
    }
  };

  const loadTestSessions = async () => {
    try {
      // Mock test sessions data
      const mockSessions: TestSession[] = [
        {
          id: '1',
          name: 'Project Management Flow Testing',
          description: 'Complete testing of project creation and management workflows',
          participants: 8,
          scenarios: ['1', '3'],
          start_date: new Date(Date.now() - 86400000).toISOString(),
          end_date: new Date(Date.now() + 86400000).toISOString(),
          status: 'active',
          completion_rate: 75,
          avg_satisfaction: 4.2
        },
        {
          id: '2',
          name: 'Mobile App Usability Testing',
          description: 'Focus on mobile interface and field operations',
          participants: 12,
          scenarios: ['2'],
          start_date: new Date(Date.now() - 259200000).toISOString(),
          end_date: new Date(Date.now() - 172800000).toISOString(),
          status: 'completed',
          completion_rate: 92,
          avg_satisfaction: 4.6
        },
        {
          id: '3',
          name: 'Client Experience Testing',
          description: 'Test client portal and communication features',
          participants: 5,
          scenarios: ['4'],
          start_date: new Date(Date.now() + 86400000).toISOString(),
          end_date: new Date(Date.now() + 345600000).toISOString(),
          status: 'planning',
          completion_rate: 0,
          avg_satisfaction: 0
        }
      ];

      setTestSessions(mockSessions);
    } catch (error) {
      console.error('Error loading test sessions:', error);
    }
  };

  const submitFeedback = async (scenarioId: string) => {
    if (!newFeedback.trim()) return;

    const feedback: UserFeedback = {
      id: Date.now().toString(),
      user_id: userProfile?.id || 'anonymous',
      user_name: userProfile?.first_name + ' ' + userProfile?.last_name || 'Anonymous User',
      user_type: userProfile?.role || 'tester',
      rating: newRating,
      completion_time: Math.floor(Math.random() * 20) + 5,
      comments: newFeedback,
      issues_encountered: [],
      suggestions: [],
      created_at: new Date().toISOString()
    };

    setTestScenarios(prev => prev.map(scenario => 
      scenario.id === scenarioId 
        ? { 
            ...scenario, 
            feedback: [...(scenario.feedback || []), feedback]
          }
        : scenario
    ));

    setNewFeedback('');
    setNewRating(5);
  };

  const getUserTypeIcon = (userType: string) => {
    const icons = {
      admin: User,
      project_manager: Building,
      field_supervisor: Hammer,
      office_staff: Users,
      client: Star
    };
    return icons[userType as keyof typeof icons] || User;
  };

  const getDifficultyColor = (difficulty: string) => {
    const colors = {
      easy: 'bg-green-100 text-green-800',
      medium: 'bg-yellow-100 text-yellow-800',
      hard: 'bg-red-100 text-red-800'
    };
    return colors[difficulty as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getStatusColor = (status: string) => {
    const colors = {
      pending: 'bg-gray-100 text-gray-800',
      in_review: 'bg-blue-100 text-blue-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const renderStarRating = (rating: number, interactive = false, onChange?: (rating: number) => void) => {
    return (
      <div className="flex items-center space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= rating 
                ? 'text-yellow-400 fill-current' 
                : 'text-gray-300'
            } ${interactive ? 'cursor-pointer' : ''}`}
            onClick={() => interactive && onChange && onChange(star)}
          />
        ))}
        <span className="text-sm text-muted-foreground ml-2">({rating}/5)</span>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Users className="h-5 w-5" />
          <h2 className="text-2xl font-semibold">User Acceptance Testing</h2>
        </div>
        <Button>
          <Zap className="h-4 w-4 mr-2" />
          Create Test Session
        </Button>
      </div>

      {/* Test Sessions Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {testSessions.map((session) => (
          <Card key={session.id}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <Badge 
                  variant={session.status === 'completed' ? 'secondary' : 'outline'}
                >
                  {session.status}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {session.participants} participants
                </span>
              </div>
              <h4 className="font-medium mb-2">{session.name}</h4>
              <p className="text-sm text-muted-foreground mb-3">{session.description}</p>
              
              {session.status !== 'planning' && (
                <div className="space-y-2">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Completion</span>
                      <span>{session.completion_rate}%</span>
                    </div>
                    <Progress value={session.completion_rate} />
                  </div>
                  {session.avg_satisfaction > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Satisfaction</span>
                      {renderStarRating(session.avg_satisfaction)}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Test Scenarios */}
      <Card>
        <CardHeader>
          <CardTitle>Test Scenarios</CardTitle>
          <CardDescription>User acceptance test scenarios organized by user type</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            {testScenarios.map((scenario) => {
              const UserIcon = getUserTypeIcon(scenario.user_type);
              const avgRating = scenario.feedback && scenario.feedback.length > 0
                ? scenario.feedback.reduce((sum, f) => sum + f.rating, 0) / scenario.feedback.length
                : 0;
              
              return (
                <div
                  key={scenario.id}
                  className="p-4 border rounded-lg cursor-pointer hover:bg-accent"
                  onClick={() => {
                    setSelectedScenario(scenario);
                    setScenarioDialogOpen(true);
                  }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <UserIcon className="h-5 w-5" />
                      <span className="font-medium">{scenario.title}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge className={getStatusColor(scenario.status)}>
                        {scenario.status}
                      </Badge>
                      <Badge className={getDifficultyColor(scenario.difficulty)}>
                        {scenario.difficulty}
                      </Badge>
                    </div>
                  </div>
                  
                  <p className="text-sm text-muted-foreground mb-3">{scenario.description}</p>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 text-sm">
                      <span>👤 {scenario.user_type.replace('_', ' ')}</span>
                      <span>⏱️ {scenario.estimated_time}min</span>
                      <span>💬 {scenario.feedback?.length || 0} feedback</span>
                    </div>
                    {avgRating > 0 && renderStarRating(avgRating)}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Scenario Details Dialog */}
      <Dialog open={scenarioDialogOpen} onOpenChange={setScenarioDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              {selectedScenario && React.createElement(getUserTypeIcon(selectedScenario.user_type), { className: "h-5 w-5" })}
              <span>{selectedScenario?.title}</span>
            </DialogTitle>
          </DialogHeader>
          {selectedScenario && (
            <div className="space-y-6">
              <div>
                <p className="text-muted-foreground">{selectedScenario.description}</p>
                <div className="flex items-center space-x-4 mt-2">
                  <Badge className={getStatusColor(selectedScenario.status)}>
                    {selectedScenario.status}
                  </Badge>
                  <Badge className={getDifficultyColor(selectedScenario.difficulty)}>
                    {selectedScenario.difficulty}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    Est. {selectedScenario.estimated_time} minutes
                  </span>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">Test Steps:</h4>
                <ol className="list-decimal list-inside space-y-1 text-sm">
                  {selectedScenario.steps.map((step, index) => (
                    <li key={index} className="text-muted-foreground">{step}</li>
                  ))}
                </ol>
              </div>

              <div>
                <h4 className="font-medium mb-2">Acceptance Criteria:</h4>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  {selectedScenario.acceptance_criteria.map((criteria, index) => (
                    <li key={index} className="text-muted-foreground">{criteria}</li>
                  ))}
                </ul>
              </div>

              {/* Feedback Section */}
              <div>
                <h4 className="font-medium mb-3">User Feedback ({selectedScenario.feedback?.length || 0})</h4>
                
                <div className="space-y-4 mb-4">
                  {selectedScenario.feedback?.map((feedback) => (
                    <div key={feedback.id} className="p-3 bg-muted rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <span className="font-medium">{feedback.user_name}</span>
                          <span className="text-sm text-muted-foreground ml-2">
                            ({feedback.user_type})
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          {renderStarRating(feedback.rating)}
                          <span className="text-sm text-muted-foreground">
                            {feedback.completion_time}min
                          </span>
                        </div>
                      </div>
                      <p className="text-sm">{feedback.comments}</p>
                      {feedback.issues_encountered.length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs font-medium text-red-600">Issues:</p>
                          <ul className="text-xs text-red-600 list-disc list-inside">
                            {feedback.issues_encountered.map((issue, i) => (
                              <li key={i}>{issue}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {feedback.suggestions.length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs font-medium text-blue-600">Suggestions:</p>
                          <ul className="text-xs text-blue-600 list-disc list-inside">
                            {feedback.suggestions.map((suggestion, i) => (
                              <li key={i}>{suggestion}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Add Feedback Form */}
                <div className="border-t pt-4">
                  <h5 className="font-medium mb-2">Add Your Feedback</h5>
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium">Rating:</label>
                      {renderStarRating(newRating, true, setNewRating)}
                    </div>
                    <Textarea
                      placeholder="Share your experience with this test scenario..."
                      value={newFeedback}
                      onChange={(e) => setNewFeedback(e.target.value)}
                      rows={3}
                    />
                    <Button 
                      onClick={() => submitFeedback(selectedScenario.id)}
                      disabled={!newFeedback.trim()}
                      size="sm"
                    >
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Submit Feedback
                    </Button>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={() => setScenarioDialogOpen(false)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserAcceptanceTestSuite;