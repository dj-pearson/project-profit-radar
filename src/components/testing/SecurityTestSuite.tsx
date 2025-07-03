import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Clock,
  Key,
  Lock,
  Eye,
  Globe,
  Database,
  Server,
  Bug,
  Zap
} from 'lucide-react';

interface SecurityTest {
  id: string;
  name: string;
  description: string;
  category: 'authentication' | 'authorization' | 'injection' | 'xss' | 'csrf' | 'data_exposure' | 'ssl' | 'configuration';
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'running' | 'passed' | 'failed' | 'warning';
  last_run: string;
  duration?: number;
  findings?: string[];
  recommendations?: string[];
}

interface VulnerabilityReport {
  id: string;
  scan_type: string;
  total_tests: number;
  passed: number;
  failed: number;
  warnings: number;
  critical_issues: number;
  risk_score: number;
  created_at: string;
  status: 'running' | 'completed' | 'failed';
}

const SecurityTestSuite = () => {
  const { userProfile } = useAuth();
  const [securityTests, setSecurityTests] = useState<SecurityTest[]>([]);
  const [vulnerabilityReports, setVulnerabilityReports] = useState<VulnerabilityReport[]>([]);
  const [selectedTest, setSelectedTest] = useState<SecurityTest | null>(null);
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [activeScan, setActiveScan] = useState<VulnerabilityReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadSecurityTests();
    loadVulnerabilityReports();
  }, []);

  const loadSecurityTests = async () => {
    try {
      // Mock security tests data
      const mockTests: SecurityTest[] = [
        {
          id: '1',
          name: 'SQL Injection Detection',
          description: 'Test for SQL injection vulnerabilities in forms and API endpoints',
          category: 'injection',
          severity: 'critical',
          status: 'passed',
          last_run: new Date(Date.now() - 86400000).toISOString(),
          duration: 2500,
          findings: [],
          recommendations: ['Continue using parameterized queries', 'Regular security audits']
        },
        {
          id: '2',
          name: 'Cross-Site Scripting (XSS)',
          description: 'Scan for XSS vulnerabilities in user input fields',
          category: 'xss',
          severity: 'high',
          status: 'warning',
          last_run: new Date(Date.now() - 172800000).toISOString(),
          duration: 1800,
          findings: ['Potential XSS in project description field'],
          recommendations: ['Implement content security policy', 'Sanitize user inputs']
        },
        {
          id: '3',
          name: 'Authentication Bypass',
          description: 'Test authentication mechanisms for bypass vulnerabilities',
          category: 'authentication',
          severity: 'critical',
          status: 'passed',
          last_run: new Date(Date.now() - 259200000).toISOString(),
          duration: 3200,
          findings: [],
          recommendations: ['Enable 2FA for admin accounts', 'Implement session timeouts']
        },
        {
          id: '4',
          name: 'CSRF Protection',
          description: 'Verify CSRF token implementation across forms',
          category: 'csrf',
          severity: 'medium',
          status: 'failed',
          last_run: new Date(Date.now() - 345600000).toISOString(),
          duration: 1500,
          findings: ['Missing CSRF tokens on invoice creation form', 'Weak token validation'],
          recommendations: ['Implement CSRF tokens on all forms', 'Use SameSite cookie attributes']
        },
        {
          id: '5',
          name: 'SSL/TLS Configuration',
          description: 'Verify SSL certificate and TLS configuration',
          category: 'ssl',
          severity: 'high',
          status: 'passed',
          last_run: new Date(Date.now() - 432000000).toISOString(),
          duration: 800,
          findings: [],
          recommendations: ['Monitor certificate expiration', 'Enable HSTS headers']
        },
        {
          id: '6',
          name: 'Data Exposure Check',
          description: 'Scan for sensitive data exposure in API responses',
          category: 'data_exposure',
          severity: 'high',
          status: 'warning',
          last_run: new Date(Date.now() - 518400000).toISOString(),
          duration: 2100,
          findings: ['User email exposed in API response'],
          recommendations: ['Filter sensitive data in API responses', 'Implement data classification']
        }
      ];

      setSecurityTests(mockTests);
    } catch (error) {
      console.error('Error loading security tests:', error);
    }
  };

  const loadVulnerabilityReports = async () => {
    try {
      // Mock vulnerability reports
      const mockReports: VulnerabilityReport[] = [
        {
          id: '1',
          scan_type: 'Full Security Scan',
          total_tests: 25,
          passed: 18,
          failed: 2,
          warnings: 4,
          critical_issues: 1,
          risk_score: 7.2,
          created_at: new Date(Date.now() - 86400000).toISOString(),
          status: 'completed'
        },
        {
          id: '2',
          scan_type: 'Authentication Security Audit',
          total_tests: 12,
          passed: 10,
          failed: 1,
          warnings: 1,
          critical_issues: 0,
          risk_score: 4.5,
          created_at: new Date(Date.now() - 259200000).toISOString(),
          status: 'completed'
        },
        {
          id: '3',
          scan_type: 'API Security Assessment',
          total_tests: 18,
          passed: 14,
          failed: 2,
          warnings: 2,
          critical_issues: 1,
          risk_score: 6.8,
          created_at: new Date(Date.now() - 432000000).toISOString(),
          status: 'completed'
        }
      ];

      setVulnerabilityReports(mockReports);
    } catch (error) {
      console.error('Error loading vulnerability reports:', error);
    }
  };

  const runSecurityScan = async (scanType: string = 'full') => {
    setLoading(true);
    
    const newScan: VulnerabilityReport = {
      id: Date.now().toString(),
      scan_type: scanType === 'full' ? 'Full Security Scan' : 'Quick Security Check',
      total_tests: scanType === 'full' ? 25 : 10,
      passed: 0,
      failed: 0,
      warnings: 0,
      critical_issues: 0,
      risk_score: 0,
      created_at: new Date().toISOString(),
      status: 'running'
    };

    setActiveScan(newScan);
    setVulnerabilityReports(prev => [newScan, ...prev]);

    // Simulate scan execution
    await new Promise(resolve => setTimeout(resolve, 8000));

    // Generate random results
    const passed = Math.floor(newScan.total_tests * 0.7);
    const failed = Math.floor(newScan.total_tests * 0.15);
    const warnings = newScan.total_tests - passed - failed;
    const critical = Math.floor(Math.random() * 2);

    const completedScan: VulnerabilityReport = {
      ...newScan,
      passed,
      failed,
      warnings,
      critical_issues: critical,
      risk_score: parseFloat((Math.random() * 10).toFixed(1)),
      status: 'completed'
    };

    setVulnerabilityReports(prev => prev.map(scan => 
      scan.id === newScan.id ? completedScan : scan
    ));
    setActiveScan(null);
    setLoading(false);
  };

  const runSingleTest = async (testId: string) => {
    setSecurityTests(prev => prev.map(test => 
      test.id === testId ? { ...test, status: 'running' } : test
    ));

    // Simulate test execution
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Random result
    const passed = Math.random() > 0.3;
    const hasWarning = Math.random() > 0.7;
    
    setSecurityTests(prev => prev.map(test => 
      test.id === testId 
        ? { 
            ...test, 
            status: passed ? (hasWarning ? 'warning' : 'passed') : 'failed',
            last_run: new Date().toISOString(),
            duration: Math.floor(1000 + Math.random() * 2000)
          }
        : test
    ));
  };

  const getCategoryIcon = (category: string) => {
    const icons = {
      authentication: Key,
      authorization: Lock,
      injection: Bug,
      xss: Globe,
      csrf: Shield,
      data_exposure: Eye,
      ssl: Server,
      configuration: Database
    };
    return icons[category as keyof typeof icons] || Shield;
  };

  const getSeverityColor = (severity: string) => {
    const colors = {
      low: 'bg-green-100 text-green-800',
      medium: 'bg-yellow-100 text-yellow-800',
      high: 'bg-orange-100 text-orange-800',
      critical: 'bg-red-100 text-red-800'
    };
    return colors[severity as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'passed':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'running':
        return <Clock className="h-4 w-4 text-blue-600 animate-spin" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getRiskScoreColor = (score: number) => {
    if (score < 3) return 'text-green-600';
    if (score < 6) return 'text-yellow-600';
    if (score < 8) return 'text-orange-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Shield className="h-5 w-5" />
          <h2 className="text-2xl font-semibold">Security Testing Suite</h2>
        </div>
        <div className="flex space-x-2">
          <Button 
            onClick={() => runSecurityScan('quick')}
            disabled={loading}
            variant="outline"
          >
            Quick Scan
          </Button>
          <Button 
            onClick={() => runSecurityScan('full')}
            disabled={loading}
          >
            <Shield className="h-4 w-4 mr-2" />
            Full Security Scan
          </Button>
        </div>
      </div>

      {/* Active Scan Status */}
      {activeScan && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Shield className="h-5 w-5 animate-pulse text-blue-600" />
              <span>Running: {activeScan.scan_type}</span>
            </CardTitle>
            <CardDescription>
              Executing {activeScan.total_tests} security tests...
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <span>Security scan in progress...</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Security Tests Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {securityTests.map((test) => {
          const CategoryIcon = getCategoryIcon(test.category);
          
          return (
            <Card 
              key={test.id}
              className={`cursor-pointer hover:shadow-md transition-shadow ${
                test.status === 'failed' ? 'border-red-200' : 
                test.status === 'warning' ? 'border-yellow-200' : 
                test.status === 'passed' ? 'border-green-200' : ''
              }`}
              onClick={() => {
                setSelectedTest(test);
                setTestDialogOpen(true);
              }}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <CategoryIcon className="h-5 w-5" />
                    {getStatusIcon(test.status)}
                  </div>
                  <Badge className={getSeverityColor(test.severity)}>
                    {test.severity}
                  </Badge>
                </div>
                
                <h4 className="font-medium mb-2">{test.name}</h4>
                <p className="text-sm text-muted-foreground mb-3">{test.description}</p>
                
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="text-xs">
                    {test.category}
                  </Badge>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      runSingleTest(test.id);
                    }}
                    disabled={test.status === 'running'}
                  >
                    <Zap className="h-3 w-3 mr-1" />
                    Run
                  </Button>
                </div>
                
                {test.findings && test.findings.length > 0 && (
                  <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
                    {test.findings.length} finding(s) detected
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Vulnerability Reports */}
      <Card>
        <CardHeader>
          <CardTitle>Vulnerability Reports</CardTitle>
          <CardDescription>Historical security scan results</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-80">
            <div className="space-y-4">
              {vulnerabilityReports.map((report) => (
                <div key={report.id} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="font-medium">{report.scan_type}</h4>
                      <p className="text-sm text-muted-foreground">
                        {new Date(report.created_at).toLocaleDateString()} • 
                        {report.total_tests} tests
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge 
                        variant={report.status === 'completed' ? 'secondary' : 'outline'}
                      >
                        {report.status}
                      </Badge>
                      {report.status === 'completed' && (
                        <p className={`text-lg font-semibold mt-1 ${getRiskScoreColor(report.risk_score)}`}>
                          Risk: {report.risk_score}/10
                        </p>
                      )}
                    </div>
                  </div>
                  
                  {report.status === 'completed' && (
                    <div className="grid grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="font-medium text-green-600">{report.passed}</p>
                        <p className="text-muted-foreground">Passed</p>
                      </div>
                      <div>
                        <p className="font-medium text-yellow-600">{report.warnings}</p>
                        <p className="text-muted-foreground">Warnings</p>
                      </div>
                      <div>
                        <p className="font-medium text-red-600">{report.failed}</p>
                        <p className="text-muted-foreground">Failed</p>
                      </div>
                      <div>
                        <p className="font-medium text-red-800">{report.critical_issues}</p>
                        <p className="text-muted-foreground">Critical</p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Test Details Dialog */}
      <Dialog open={testDialogOpen} onOpenChange={setTestDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              {selectedTest && React.createElement(getCategoryIcon(selectedTest.category), { className: "h-5 w-5" })}
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
                <Badge className={getSeverityColor(selectedTest.severity)}>
                  {selectedTest.severity} severity
                </Badge>
                <Badge variant="outline">{selectedTest.category}</Badge>
                {selectedTest.duration && (
                  <Badge variant="outline">{selectedTest.duration}ms</Badge>
                )}
              </div>

              <div>
                <p className="text-sm text-muted-foreground">
                  Last run: {new Date(selectedTest.last_run).toLocaleString()}
                </p>
              </div>

              {selectedTest.findings && selectedTest.findings.length > 0 && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
                  <h4 className="font-medium text-yellow-800 mb-2">Findings:</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm text-yellow-700">
                    {selectedTest.findings.map((finding, index) => (
                      <li key={index}>{finding}</li>
                    ))}
                  </ul>
                </div>
              )}

              {selectedTest.recommendations && selectedTest.recommendations.length > 0 && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                  <h4 className="font-medium text-blue-800 mb-2">Recommendations:</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm text-blue-700">
                    {selectedTest.recommendations.map((rec, index) => (
                      <li key={index}>{rec}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => runSingleTest(selectedTest.id)}
                  disabled={selectedTest.status === 'running'}
                >
                  <Zap className="h-4 w-4 mr-2" />
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

export default SecurityTestSuite;