import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Play, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertTriangle,
  TestTube,
  Monitor,
  Mouse,
  Globe,
  Database,
  Shield
} from 'lucide-react';

interface TestCase {
  id: string;
  name: string;
  description: string;
  category: 'auth' | 'navigation' | 'forms' | 'api' | 'ui' | 'performance';
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'running' | 'passed' | 'failed' | 'skipped';
  duration?: number;
  error?: string;
  steps: string[];
}

interface TestSuite {
  id: string;
  name: string;
  description: string;
  tests: TestCase[];
  status: 'idle' | 'running' | 'completed' | 'failed';
  startTime?: Date;
  endTime?: Date;
  passRate: number;
}

const EndToEndTestSuite = () => {
  const { userProfile } = useAuth();
  const [testSuites, setTestSuites] = useState<TestSuite[]>([]);
  const [selectedTest, setSelectedTest] = useState<TestCase | null>(null);
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [runningTests, setRunningTests] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadTestSuites();
  }, []);

  const loadTestSuites = async () => {
    setLoading(true);
    try {
      // Mock test suites data
      const mockSuites: TestSuite[] = [
        {
          id: '1',
          name: 'Core User Flows',
          description: 'Critical user journeys and authentication flows',
          status: 'idle',
          passRate: 85,
          tests: [
            {
              id: '1',
              name: 'User Registration Flow',
              description: 'Complete user registration process from start to finish',
              category: 'auth',
              priority: 'high',
              status: 'passed',
              duration: 2500,
              steps: [
                'Navigate to registration page',
                'Fill out registration form',
                'Verify email confirmation',
                'Complete profile setup',
                'Redirect to dashboard'
              ]
            },
            {
              id: '2',
              name: 'Project Creation Workflow',
              description: 'Create a new project with all required fields',
              category: 'forms',
              priority: 'high',
              status: 'failed',
              duration: 1800,
              error: 'Element not found: [data-testid="project-submit"]',
              steps: [
                'Navigate to create project page',
                'Fill project details form',
                'Upload project documents',
                'Set project timeline',
                'Submit and verify creation'
              ]
            },
            {
              id: '3',
              name: 'Financial Dashboard Navigation',
              description: 'Navigate through financial reports and data',
              category: 'navigation',
              priority: 'medium',
              status: 'passed',
              duration: 1200,
              steps: [
                'Access financial dashboard',
                'View profit/loss reports',
                'Filter by date range',
                'Export financial data',
                'Verify calculations'
              ]
            }
          ]
        },
        {
          id: '2',
          name: 'API Integration Tests',
          description: 'Test external API integrations and data flow',
          status: 'idle',
          passRate: 92,
          tests: [
            {
              id: '4',
              name: 'QuickBooks Sync Test',
              description: 'Verify QuickBooks integration and data synchronization',
              category: 'api',
              priority: 'high',
              status: 'passed',
              duration: 3200,
              steps: [
                'Authenticate with QuickBooks',
                'Sync customer data',
                'Sync invoice data',
                'Verify data consistency',
                'Test error handling'
              ]
            },
            {
              id: '5',
              name: 'Payment Processing Flow',
              description: 'Test Stripe payment integration end-to-end',
              category: 'api',
              priority: 'high',
              status: 'pending',
              steps: [
                'Create test invoice',
                'Initiate payment flow',
                'Process test payment',
                'Verify payment confirmation',
                'Update invoice status'
              ]
            }
          ]
        },
        {
          id: '3',
          name: 'UI Responsiveness Tests',
          description: 'Test application across different screen sizes and devices',
          status: 'idle',
          passRate: 78,
          tests: [
            {
              id: '6',
              name: 'Mobile Dashboard Test',
              description: 'Verify dashboard functionality on mobile devices',
              category: 'ui',
              priority: 'medium',
              status: 'failed',
              duration: 1500,
              error: 'Navigation menu not accessible on mobile viewport',
              steps: [
                'Set mobile viewport (375x667)',
                'Navigate to dashboard',
                'Test menu interactions',
                'Verify content scrolling',
                'Test touch interactions'
              ]
            },
            {
              id: '7',
              name: 'Tablet Layout Verification',
              description: 'Ensure proper layout on tablet devices',
              category: 'ui',
              priority: 'low',
              status: 'passed',
              duration: 900,
              steps: [
                'Set tablet viewport (768x1024)',
                'Test navigation layout',
                'Verify content organization',
                'Test form interactions',
                'Check visual consistency'
              ]
            }
          ]
        }
      ];

      setTestSuites(mockSuites);
    } catch (error) {
      console.error('Error loading test suites:', error);
    } finally {
      setLoading(false);
    }
  };

  const runTestSuite = async (suiteId: string) => {
    const suite = testSuites.find(s => s.id === suiteId);
    if (!suite) return;

    setTestSuites(prev => prev.map(s => 
      s.id === suiteId 
        ? { ...s, status: 'running', startTime: new Date() }
        : s
    ));

    // Simulate running tests
    for (let i = 0; i < suite.tests.length; i++) {
      const test = suite.tests[i];
      setRunningTests(prev => new Set([...prev, test.id]));
      
      // Simulate test execution time
      await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
      
      setRunningTests(prev => {
        const newSet = new Set(prev);
        newSet.delete(test.id);
        return newSet;
      });

      // Random test results for demo
      const passed = Math.random() > 0.2;
      setTestSuites(prev => prev.map(s => 
        s.id === suiteId 
          ? {
              ...s,
              tests: s.tests.map(t => 
                t.id === test.id 
                  ? { 
                      ...t, 
                      status: passed ? 'passed' : 'failed',
                      duration: Math.floor(1000 + Math.random() * 2000),
                      error: passed ? undefined : 'Test failed due to timeout or assertion error'
                    }
                  : t
              )
            }
          : s
      ));
    }

    // Update suite completion
    setTestSuites(prev => prev.map(s => {
      if (s.id === suiteId) {
        const passedTests = s.tests.filter(t => t.status === 'passed').length;
        const passRate = Math.round((passedTests / s.tests.length) * 100);
        return {
          ...s,
          status: 'completed',
          endTime: new Date(),
          passRate
        };
      }
      return s;
    }));
  };

  const runSingleTest = async (testId: string) => {
    setRunningTests(prev => new Set([...prev, testId]));
    
    // Simulate test execution
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    setRunningTests(prev => {
      const newSet = new Set(prev);
      newSet.delete(testId);
      return newSet;
    });

    // Update test result
    const passed = Math.random() > 0.3;
    setTestSuites(prev => prev.map(suite => ({
      ...suite,
      tests: suite.tests.map(test => 
        test.id === testId 
          ? { 
              ...test, 
              status: passed ? 'passed' : 'failed',
              duration: Math.floor(1000 + Math.random() * 2000),
              error: passed ? undefined : 'Single test execution failed'
            }
          : test
      )
    })));
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'passed':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'running':
        return <Clock className="h-4 w-4 text-blue-600 animate-spin" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-gray-400" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
    }
  };

  const getCategoryIcon = (category: string) => {
    const icons = {
      auth: Shield,
      navigation: Monitor,
      forms: Mouse,
      api: Database,
      ui: Globe,
      performance: TestTube
    };
    const Icon = icons[category as keyof typeof icons] || TestTube;
    return <Icon className="h-4 w-4" />;
  };

  const getPriorityColor = (priority: string) => {
    const colors = {
      high: 'bg-red-100 text-red-800',
      medium: 'bg-yellow-100 text-yellow-800',
      low: 'bg-green-100 text-green-800'
    };
    return colors[priority as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <TestTube className="h-5 w-5" />
          <h2 className="text-2xl font-semibold">End-to-End Testing Suite</h2>
        </div>
        <Button 
          onClick={() => testSuites.forEach(suite => runTestSuite(suite.id))}
          disabled={runningTests.size > 0}
        >
          <Play className="h-4 w-4 mr-2" />
          Run All Tests
        </Button>
      </div>

      {/* Test Suites */}
      <div className="grid gap-6">
        {testSuites.map((suite) => (
          <Card key={suite.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center space-x-2">
                    <span>{suite.name}</span>
                    <Badge 
                      variant={suite.status === 'completed' ? 'secondary' : 'outline'}
                    >
                      {suite.status}
                    </Badge>
                  </CardTitle>
                  <CardDescription>{suite.description}</CardDescription>
                </div>
                <div className="text-right">
                  <p className="text-lg font-semibold">{suite.passRate}% Pass Rate</p>
                  <Button 
                    onClick={() => runTestSuite(suite.id)}
                    disabled={suite.status === 'running'}
                    size="sm"
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Run Suite
                  </Button>
                </div>
              </div>
              <Progress value={suite.passRate} className="mt-2" />
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-64">
                <div className="space-y-3">
                  {suite.tests.map((test) => (
                    <div
                      key={test.id}
                      className={`p-4 border rounded-lg ${
                        test.status === 'passed' ? 'bg-green-50 border-green-200' : 
                        test.status === 'failed' ? 'bg-red-50 border-red-200' :
                        'hover:bg-accent cursor-pointer'
                      }`}
                      onClick={() => {
                        setSelectedTest(test);
                        setTestDialogOpen(true);
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-start space-x-3">
                          <div className="flex items-center space-x-2">
                            {runningTests.has(test.id) ? (
                              <Clock className="h-5 w-5 text-blue-600 animate-spin" />
                            ) : (
                              getStatusIcon(test.status)
                            )}
                            {getCategoryIcon(test.category)}
                          </div>
                          <div className="flex-1">
                            <h4 className="font-medium">{test.name}</h4>
                            <p className="text-sm text-muted-foreground">{test.description}</p>
                            <div className="flex items-center space-x-2 mt-2">
                              <Badge 
                                variant="outline" 
                                className={`text-xs ${getPriorityColor(test.priority)}`}
                              >
                                {test.priority} priority
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {test.category}
                              </Badge>
                              {test.duration && (
                                <Badge variant="outline" className="text-xs">
                                  {test.duration}ms
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            runSingleTest(test.id);
                          }}
                          disabled={runningTests.has(test.id)}
                        >
                          <Play className="h-3 w-3 mr-1" />
                          Run
                        </Button>
                      </div>
                      {test.error && (
                        <div className="mt-2 p-2 bg-red-100 border border-red-200 rounded text-sm text-red-700">
                          <strong>Error:</strong> {test.error}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Test Details Dialog */}
      <Dialog open={testDialogOpen} onOpenChange={setTestDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              {selectedTest && getCategoryIcon(selectedTest.category)}
              <span>{selectedTest?.name}</span>
            </DialogTitle>
          </DialogHeader>
          {selectedTest && (
            <div className="space-y-4">
              <p className="text-muted-foreground">{selectedTest.description}</p>
              
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  {getStatusIcon(selectedTest.status)}
                  <span className="font-medium">{selectedTest.status}</span>
                </div>
                <Badge className={getPriorityColor(selectedTest.priority)}>
                  {selectedTest.priority} priority
                </Badge>
                <Badge variant="outline">{selectedTest.category}</Badge>
                {selectedTest.duration && (
                  <Badge variant="outline">{selectedTest.duration}ms</Badge>
                )}
              </div>

              <div>
                <h4 className="font-medium mb-2">Test Steps:</h4>
                <ol className="list-decimal list-inside space-y-1 text-sm">
                  {selectedTest.steps.map((step, index) => (
                    <li key={index} className="text-muted-foreground">{step}</li>
                  ))}
                </ol>
              </div>

              {selectedTest.error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded">
                  <h4 className="font-medium text-red-800 mb-1">Error Details:</h4>
                  <p className="text-sm text-red-700">{selectedTest.error}</p>
                </div>
              )}

              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => runSingleTest(selectedTest.id)}
                  disabled={runningTests.has(selectedTest.id)}
                >
                  <Play className="h-4 w-4 mr-2" />
                  Run Test
                </Button>
                <Button onClick={() => setTestDialogOpen(false)}>
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

export default EndToEndTestSuite;