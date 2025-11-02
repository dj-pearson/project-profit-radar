import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  FileText,
  Code,
  PlayCircle,
  Search,
  BookOpen,
  Terminal,
  Copy,
  Check,
  TrendingUp,
  Eye,
  Clock
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface APIDoc {
  id: string;
  endpoint: string;
  method: string;
  category: string;
  title: string;
  description: string;
  request_schema: any;
  response_schema: any;
  code_examples: any;
  version: string;
  is_deprecated: boolean;
  usage_count: number;
}

interface CodeExample {
  id: string;
  doc_id: string;
  language: string;
  code: string;
  description: string;
}

export function DeveloperPortal() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [docs, setDocs] = useState<APIDoc[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<APIDoc | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedLanguage, setSelectedLanguage] = useState('javascript');
  const [playgroundEndpoint, setPlaygroundEndpoint] = useState('');
  const [playgroundMethod, setPlaygroundMethod] = useState('GET');
  const [playgroundBody, setPlaygroundBody] = useState('');
  const [playgroundResponse, setPlaygroundResponse] = useState('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch API documentation
  useEffect(() => {
    fetchDocs();
  }, []);

  const fetchDocs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('api_documentation')
        .select('*')
        .order('category', { ascending: true })
        .order('endpoint', { ascending: true });

      if (error) throw error;
      setDocs(data || []);
      if (data && data.length > 0 && !selectedDoc) {
        setSelectedDoc(data[0]);
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Filter docs based on search and category
  const filteredDocs = docs.filter(doc => {
    const matchesSearch = doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          doc.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          doc.endpoint.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || doc.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Get unique categories
  const categories = ['all', ...Array.from(new Set(docs.map(doc => doc.category)))];

  // Get most popular endpoints
  const popularEndpoints = [...docs]
    .sort((a, b) => b.usage_count - a.usage_count)
    .slice(0, 5);

  // Calculate stats
  const totalEndpoints = docs.length;
  const totalRequests = docs.reduce((sum, doc) => sum + doc.usage_count, 0);
  const deprecatedCount = docs.filter(doc => doc.is_deprecated).length;

  const handleCopyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(id);
    toast({
      title: 'Copied!',
      description: 'Code copied to clipboard',
    });
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleTestEndpoint = async () => {
    try {
      setPlaygroundResponse('Testing endpoint...');

      // This is a demo - in production, this would make actual API calls
      // through your API gateway with proper authentication

      const mockResponse = {
        status: 200,
        data: {
          message: 'Success',
          endpoint: playgroundEndpoint,
          method: playgroundMethod,
          timestamp: new Date().toISOString(),
        }
      };

      setPlaygroundResponse(JSON.stringify(mockResponse, null, 2));

      toast({
        title: 'Request Sent',
        description: 'Check the response below',
      });
    } catch (error: any) {
      setPlaygroundResponse(JSON.stringify({ error: error.message }, null, 2));
    }
  };

  const getMethodColor = (method: string) => {
    switch (method.toUpperCase()) {
      case 'GET': return 'bg-blue-500';
      case 'POST': return 'bg-green-500';
      case 'PUT': return 'bg-yellow-500';
      case 'PATCH': return 'bg-orange-500';
      case 'DELETE': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Developer Portal</h1>
          <p className="text-muted-foreground">
            API documentation, code examples, and interactive playground
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Endpoints</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalEndpoints}</div>
              <p className="text-xs text-muted-foreground">
                {deprecatedCount} deprecated
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">API Requests</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatNumber(totalRequests)}</div>
              <p className="text-xs text-muted-foreground">
                Total across all endpoints
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">API Version</CardTitle>
              <Code className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">v1.0</div>
              <p className="text-xs text-muted-foreground">
                Latest stable version
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="documentation" className="space-y-4">
          <TabsList>
            <TabsTrigger value="documentation">
              <BookOpen className="h-4 w-4 mr-2" />
              Documentation
            </TabsTrigger>
            <TabsTrigger value="examples">
              <Code className="h-4 w-4 mr-2" />
              Code Examples
            </TabsTrigger>
            <TabsTrigger value="playground">
              <PlayCircle className="h-4 w-4 mr-2" />
              API Playground
            </TabsTrigger>
            <TabsTrigger value="popular">
              <TrendingUp className="h-4 w-4 mr-2" />
              Popular Endpoints
            </TabsTrigger>
          </TabsList>

          {/* Documentation Tab */}
          <TabsContent value="documentation" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>API Documentation</CardTitle>
                <CardDescription>
                  Browse and search through all available API endpoints
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Search and Filter */}
                <div className="flex gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search endpoints..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-8"
                      />
                    </div>
                  </div>
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category === 'all' ? 'All Categories' : category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Endpoints List */}
                <div className="grid gap-4 md:grid-cols-2">
                  {filteredDocs.length === 0 ? (
                    <div className="col-span-2 text-center py-8 text-muted-foreground">
                      No endpoints found
                    </div>
                  ) : (
                    filteredDocs.map((doc) => (
                      <Card
                        key={doc.id}
                        className={`cursor-pointer transition-all hover:shadow-md ${
                          selectedDoc?.id === doc.id ? 'ring-2 ring-primary' : ''
                        }`}
                        onClick={() => setSelectedDoc(doc)}
                      >
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Badge className={getMethodColor(doc.method)}>
                                {doc.method}
                              </Badge>
                              {doc.is_deprecated && (
                                <Badge variant="destructive">Deprecated</Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Eye className="h-3 w-3" />
                              {formatNumber(doc.usage_count)}
                            </div>
                          </div>
                          <CardTitle className="text-lg">{doc.title}</CardTitle>
                          <code className="text-xs text-muted-foreground">{doc.endpoint}</code>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-muted-foreground">{doc.description}</p>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>

                {/* Selected Endpoint Details */}
                {selectedDoc && (
                  <Card>
                    <CardHeader>
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className={getMethodColor(selectedDoc.method)}>
                          {selectedDoc.method}
                        </Badge>
                        <code className="text-sm">{selectedDoc.endpoint}</code>
                      </div>
                      <CardTitle>{selectedDoc.title}</CardTitle>
                      <CardDescription>{selectedDoc.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Request Schema */}
                      {selectedDoc.request_schema && (
                        <div>
                          <h4 className="font-semibold mb-2">Request Body</h4>
                          <pre className="bg-muted p-4 rounded-lg overflow-x-auto">
                            <code className="text-sm">
                              {JSON.stringify(selectedDoc.request_schema, null, 2)}
                            </code>
                          </pre>
                        </div>
                      )}

                      {/* Response Schema */}
                      {selectedDoc.response_schema && (
                        <div>
                          <h4 className="font-semibold mb-2">Response</h4>
                          <pre className="bg-muted p-4 rounded-lg overflow-x-auto">
                            <code className="text-sm">
                              {JSON.stringify(selectedDoc.response_schema, null, 2)}
                            </code>
                          </pre>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Code Examples Tab */}
          <TabsContent value="examples" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Code Examples</CardTitle>
                <CardDescription>
                  Ready-to-use code examples in multiple programming languages
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Language Selector */}
                <div className="flex gap-2">
                  {['javascript', 'python', 'php', 'ruby', 'curl'].map((lang) => (
                    <Button
                      key={lang}
                      variant={selectedLanguage === lang ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSelectedLanguage(lang)}
                    >
                      {lang.toUpperCase()}
                    </Button>
                  ))}
                </div>

                {/* Example Code */}
                {selectedDoc && (
                  <div className="space-y-4">
                    {selectedLanguage === 'javascript' && (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold">JavaScript / Node.js</h4>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCopyCode(
                              `fetch('https://api.builddesk.com${selectedDoc.endpoint}', {\n  method: '${selectedDoc.method}',\n  headers: {\n    'Authorization': 'Bearer YOUR_API_KEY',\n    'Content-Type': 'application/json'\n  }${selectedDoc.method !== 'GET' ? ',\n  body: JSON.stringify({\n    // Your request data\n  })' : ''}\n})\n.then(response => response.json())\n.then(data => console.log(data))\n.catch(error => console.error(error));`,
                              'js'
                            )}
                          >
                            {copiedCode === 'js' ? (
                              <Check className="h-4 w-4" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                        <pre className="bg-muted p-4 rounded-lg overflow-x-auto">
                          <code className="text-sm">
{`fetch('https://api.builddesk.com${selectedDoc.endpoint}', {
  method: '${selectedDoc.method}',
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY',
    'Content-Type': 'application/json'
  }${selectedDoc.method !== 'GET' ? `,
  body: JSON.stringify({
    // Your request data
  })` : ''}
})
.then(response => response.json())
.then(data => console.log(data))
.catch(error => console.error(error));`}
                          </code>
                        </pre>
                      </div>
                    )}

                    {selectedLanguage === 'python' && (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold">Python</h4>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCopyCode(
                              `import requests\n\nurl = 'https://api.builddesk.com${selectedDoc.endpoint}'\nheaders = {\n    'Authorization': 'Bearer YOUR_API_KEY',\n    'Content-Type': 'application/json'\n}\n${selectedDoc.method !== 'GET' ? `data = {\n    # Your request data\n}\n\nresponse = requests.${selectedDoc.method.toLowerCase()}(url, headers=headers, json=data)` : `\nresponse = requests.get(url, headers=headers)`}\nprint(response.json())`,
                              'py'
                            )}
                          >
                            {copiedCode === 'py' ? (
                              <Check className="h-4 w-4" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                        <pre className="bg-muted p-4 rounded-lg overflow-x-auto">
                          <code className="text-sm">
{`import requests

url = 'https://api.builddesk.com${selectedDoc.endpoint}'
headers = {
    'Authorization': 'Bearer YOUR_API_KEY',
    'Content-Type': 'application/json'
}
${selectedDoc.method !== 'GET' ? `data = {
    # Your request data
}

response = requests.${selectedDoc.method.toLowerCase()}(url, headers=headers, json=data)` : `
response = requests.get(url, headers=headers)`}
print(response.json())`}
                          </code>
                        </pre>
                      </div>
                    )}

                    {selectedLanguage === 'curl' && (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold">cURL</h4>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCopyCode(
                              `curl -X ${selectedDoc.method} 'https://api.builddesk.com${selectedDoc.endpoint}' \\\n  -H 'Authorization: Bearer YOUR_API_KEY' \\\n  -H 'Content-Type: application/json'${selectedDoc.method !== 'GET' ? ` \\\n  -d '{\n    "key": "value"\n  }'` : ''}`,
                              'curl'
                            )}
                          >
                            {copiedCode === 'curl' ? (
                              <Check className="h-4 w-4" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                        <pre className="bg-muted p-4 rounded-lg overflow-x-auto">
                          <code className="text-sm">
{`curl -X ${selectedDoc.method} 'https://api.builddesk.com${selectedDoc.endpoint}' \\
  -H 'Authorization: Bearer YOUR_API_KEY' \\
  -H 'Content-Type: application/json'${selectedDoc.method !== 'GET' ? ` \\
  -d '{
    "key": "value"
  }'` : ''}`}
                          </code>
                        </pre>
                      </div>
                    )}
                  </div>
                )}

                {!selectedDoc && (
                  <div className="text-center py-8 text-muted-foreground">
                    Select an endpoint from the Documentation tab to see code examples
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* API Playground Tab */}
          <TabsContent value="playground" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>API Playground</CardTitle>
                <CardDescription>
                  Test API endpoints in real-time with interactive playground
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4">
                  {/* Method and Endpoint */}
                  <div className="grid gap-4 md:grid-cols-4">
                    <div>
                      <Label>Method</Label>
                      <Select value={playgroundMethod} onValueChange={setPlaygroundMethod}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="GET">GET</SelectItem>
                          <SelectItem value="POST">POST</SelectItem>
                          <SelectItem value="PUT">PUT</SelectItem>
                          <SelectItem value="PATCH">PATCH</SelectItem>
                          <SelectItem value="DELETE">DELETE</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="md:col-span-3">
                      <Label>Endpoint</Label>
                      <Input
                        placeholder="/api/v1/projects"
                        value={playgroundEndpoint}
                        onChange={(e) => setPlaygroundEndpoint(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Request Body */}
                  {playgroundMethod !== 'GET' && (
                    <div>
                      <Label>Request Body (JSON)</Label>
                      <Textarea
                        placeholder='{\n  "key": "value"\n}'
                        value={playgroundBody}
                        onChange={(e) => setPlaygroundBody(e.target.value)}
                        rows={6}
                        className="font-mono text-sm"
                      />
                    </div>
                  )}

                  {/* Send Button */}
                  <Button onClick={handleTestEndpoint} className="w-full">
                    <Terminal className="h-4 w-4 mr-2" />
                    Send Request
                  </Button>

                  {/* Response */}
                  {playgroundResponse && (
                    <div>
                      <Label>Response</Label>
                      <pre className="bg-muted p-4 rounded-lg overflow-x-auto mt-2">
                        <code className="text-sm">{playgroundResponse}</code>
                      </pre>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Popular Endpoints Tab */}
          <TabsContent value="popular" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Popular Endpoints</CardTitle>
                <CardDescription>
                  Most frequently used API endpoints
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {popularEndpoints.map((doc, index) => (
                    <Card key={doc.id} className="cursor-pointer hover:shadow-md transition-all">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold">
                              {index + 1}
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge className={getMethodColor(doc.method)}>
                                {doc.method}
                              </Badge>
                              <code className="text-sm">{doc.endpoint}</code>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Eye className="h-4 w-4" />
                            {formatNumber(doc.usage_count)} requests
                          </div>
                        </div>
                        <CardTitle className="text-base">{doc.title}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground">{doc.description}</p>
                      </CardContent>
                    </Card>
                  ))}

                  {popularEndpoints.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      No usage data available yet
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
