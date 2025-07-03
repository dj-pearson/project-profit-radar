import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Globe, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Monitor,
  Smartphone,
  Tablet,
  Play
} from 'lucide-react';

interface BrowserTest {
  id: string;
  browser: string;
  version: string;
  platform: string;
  viewport: string;
  status: 'passed' | 'failed' | 'warning' | 'pending';
  issues: string[];
  score: number;
}

const BrowserCompatibilityTestSuite = () => {
  const [browserTests, setBrowserTests] = useState<BrowserTest[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadBrowserTests();
  }, []);

  const loadBrowserTests = async () => {
    const mockTests: BrowserTest[] = [
      {
        id: '1',
        browser: 'Chrome',
        version: '120.0',
        platform: 'Windows 11',
        viewport: '1920x1080',
        status: 'passed',
        issues: [],
        score: 100
      },
      {
        id: '2',
        browser: 'Firefox',
        version: '119.0',
        platform: 'macOS',
        viewport: '1440x900',
        status: 'warning',
        issues: ['Minor CSS rendering differences'],
        score: 95
      },
      {
        id: '3',
        browser: 'Safari',
        version: '17.1',
        platform: 'iOS 17',
        viewport: '375x667',
        status: 'failed',
        issues: ['Navigation menu not responsive', 'Date picker not working'],
        score: 75
      }
    ];
    setBrowserTests(mockTests);
  };

  const runAllTests = async () => {
    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 3000));
    setLoading(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'passed': return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'failed': return <XCircle className="h-4 w-4 text-red-600" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      default: return <Globe className="h-4 w-4 text-gray-400" />;
    }
  };

  const getPlatformIcon = (platform: string) => {
    if (platform.includes('iOS') || platform.includes('Android')) return Smartphone;
    if (platform.includes('iPad')) return Tablet;
    return Monitor;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Globe className="h-5 w-5" />
          <h2 className="text-2xl font-semibold">Browser Compatibility Testing</h2>
        </div>
        <Button onClick={runAllTests} disabled={loading}>
          <Play className="h-4 w-4 mr-2" />
          Run All Tests
        </Button>
      </div>

      <div className="grid gap-4">
        {browserTests.map((test) => {
          const PlatformIcon = getPlatformIcon(test.platform);
          return (
            <Card key={test.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <PlatformIcon className="h-5 w-5" />
                    {getStatusIcon(test.status)}
                    <div>
                      <h4 className="font-medium">{test.browser} {test.version}</h4>
                      <p className="text-sm text-muted-foreground">{test.platform} • {test.viewport}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold">{test.score}%</p>
                    <Progress value={test.score} className="w-20" />
                  </div>
                </div>
                {test.issues.length > 0 && (
                  <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm">
                    <strong>Issues:</strong> {test.issues.join(', ')}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default BrowserCompatibilityTestSuite;