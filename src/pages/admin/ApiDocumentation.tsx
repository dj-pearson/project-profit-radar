import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Copy, Check, Key, Shield, Clock, Code } from 'lucide-react';

interface EndpointDoc {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  description: string;
  auth: string;
  rateLimit: string;
  request?: string;
  response: string;
}

const endpoints: EndpointDoc[] = [
  {
    method: 'GET',
    path: '/api/projects',
    description: 'List all projects for the authenticated company',
    auth: 'API Key (x-api-key header)',
    rateLimit: '100 requests/minute',
    response: `{
  "projects": [
    {
      "id": "uuid",
      "name": "Project Name",
      "status": "active",
      "budget": 150000,
      "start_date": "2026-01-15",
      "end_date": "2026-06-30",
      "completion_percentage": 45,
      "created_at": "2026-01-10T00:00:00Z"
    }
  ]
}`,
  },
  {
    method: 'POST',
    path: '/api/projects',
    description: 'Create a new project',
    auth: 'API Key with projects:write scope',
    rateLimit: '100 requests/minute',
    request: `{
  "name": "New Project",
  "status": "planning",
  "budget": 200000,
  "start_date": "2026-03-01"
}`,
    response: `{
  "project": {
    "id": "uuid",
    "name": "New Project",
    "status": "planning",
    "budget": 200000,
    "created_at": "2026-02-25T00:00:00Z"
  }
}`,
  },
  {
    method: 'GET',
    path: '/api/estimates',
    description: 'List all estimates for the authenticated company',
    auth: 'API Key with estimates:read scope',
    rateLimit: '100 requests/minute',
    response: `{
  "estimates": [
    {
      "id": "uuid",
      "estimate_number": "EST-001",
      "client_name": "Client Corp",
      "total_amount": 75000,
      "status": "sent",
      "created_at": "2026-02-20T00:00:00Z"
    }
  ]
}`,
  },
  {
    method: 'GET',
    path: '/api/invoices',
    description: 'List all invoices for the authenticated company',
    auth: 'API Key with invoices:read scope',
    rateLimit: '100 requests/minute',
    response: `{
  "invoices": [
    {
      "id": "uuid",
      "invoice_number": "INV-001",
      "client_name": "Client Corp",
      "total_amount": 25000,
      "status": "sent",
      "due_date": "2026-03-15",
      "created_at": "2026-02-01T00:00:00Z"
    }
  ]
}`,
  },
  {
    method: 'POST',
    path: '/api-management/validate-key',
    description: 'Validate an API key and return its permissions',
    auth: 'API Key (x-api-key header)',
    rateLimit: '100 requests/minute',
    response: `{
  "valid": true,
  "company_id": "uuid",
  "permissions": ["projects:read", "estimates:read"],
  "rate_limit": 1000
}`,
  },
  {
    method: 'POST',
    path: '/api-management/create-key',
    description: 'Create a new API key (admin only)',
    auth: 'Bearer JWT Token (admin role required)',
    rateLimit: '100 requests/minute',
    request: `{
  "key_name": "My Integration Key",
  "permissions": ["projects:read", "estimates:read"],
  "expires_at": "2027-01-01T00:00:00Z",
  "rate_limit_per_hour": 1000
}`,
    response: `{
  "id": "uuid",
  "key_name": "My Integration Key",
  "api_key": "bd_live_xxxx...xxxx",
  "api_key_prefix": "bd_live_xxxx...",
  "permissions": ["projects:read", "estimates:read"],
  "rate_limit_per_hour": 1000,
  "created_at": "2026-02-25T00:00:00Z"
}`,
  },
];

const methodColors: Record<string, string> = {
  GET: 'bg-green-100 text-green-800',
  POST: 'bg-blue-100 text-blue-800',
  PUT: 'bg-yellow-100 text-yellow-800',
  DELETE: 'bg-red-100 text-red-800',
};

function CodeBlock({ code, language = 'json' }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="sm"
        className="absolute top-2 right-2"
        onClick={handleCopy}
        aria-label="Copy code"
      >
        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      </Button>
      <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
        <code>{code}</code>
      </pre>
    </div>
  );
}

export default function ApiDocumentation() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">API Documentation</h1>
        <p className="text-muted-foreground mt-1">
          BuildDesk public API reference for third-party integrations
        </p>
      </div>

      {/* Authentication */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Authentication
          </CardTitle>
          <CardDescription>How to authenticate with the BuildDesk API</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm">
            All API requests require authentication via an API key passed in the <code className="bg-muted px-1 rounded">x-api-key</code> header.
          </p>
          <CodeBlock code={`curl -H "x-api-key: bd_live_your_key_here" \\
  https://your-project.supabase.co/functions/v1/api-management/api/projects`} />
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Shield className="h-4 w-4" />
            API keys are scoped to specific permissions and can be revoked at any time.
          </div>
        </CardContent>
      </Card>

      {/* Rate Limiting */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Rate Limiting
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>All API endpoints are rate limited to prevent abuse:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>General API endpoints: <strong>100 requests/minute</strong></li>
            <li>AI endpoints: <strong>20 requests/minute</strong></li>
            <li>Auth endpoints: <strong>10 requests/minute</strong></li>
          </ul>
          <p className="text-muted-foreground">
            Rate-limited responses return HTTP 429 with a <code className="bg-muted px-1 rounded">Retry-After</code> header.
          </p>
        </CardContent>
      </Card>

      {/* Endpoints */}
      <Tabs defaultValue="endpoints">
        <TabsList>
          <TabsTrigger value="endpoints">
            <Code className="h-4 w-4 mr-2" />
            Endpoints
          </TabsTrigger>
        </TabsList>
        <TabsContent value="endpoints" className="space-y-4">
          {endpoints.map((endpoint, index) => (
            <Card key={index}>
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-lg">
                  <Badge className={methodColors[endpoint.method]}>
                    {endpoint.method}
                  </Badge>
                  <code className="font-mono">{endpoint.path}</code>
                </CardTitle>
                <CardDescription>{endpoint.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-4 text-sm">
                  <div className="flex items-center gap-1">
                    <Shield className="h-4 w-4 text-muted-foreground" />
                    {endpoint.auth}
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    {endpoint.rateLimit}
                  </div>
                </div>

                {endpoint.request && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Request Body</h4>
                    <CodeBlock code={endpoint.request} />
                  </div>
                )}

                <div>
                  <h4 className="text-sm font-semibold mb-2">Response</h4>
                  <CodeBlock code={endpoint.response} />
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
