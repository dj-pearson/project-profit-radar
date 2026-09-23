import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Settings2, Cloud, Copy } from 'lucide-react';
import type { TestResult } from './types';

interface EnvironmentTabProps {
  testResult: TestResult | null;
  copyToClipboard: (text: string) => void;
}

/** Environment tab: the env variables the AI service reads and the last test run. */
export function EnvironmentTab({ testResult, copyToClipboard }: EnvironmentTabProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Cloud className="h-5 w-5" />
          Coolify Team Shared Variables
        </CardTitle>
        <CardDescription>
          These environment variables are managed centrally in Coolify and shared across all platforms.
          Changes propagate automatically to all connected services.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <Settings2 className="h-4 w-4" />
          <AlertTitle>How to Configure</AlertTitle>
          <AlertDescription>
            <ol className="list-decimal list-inside space-y-1 mt-2">
              <li>Go to your Coolify dashboard</li>
              <li>Navigate to Team Settings &rarr; Shared Variables</li>
              <li>Add or update the variables listed below</li>
              <li>Redeploy your services to apply changes</li>
            </ol>
          </AlertDescription>
        </Alert>

        <Separator />

        <div className="space-y-4">
          <h3 className="font-semibold">Required Variables</h3>
          <div className="grid gap-3">
            {[
              { key: 'AI_DEFAULT_PROVIDER', value: 'anthropic', desc: 'Default AI provider', coolify: 'AI_DEFAULT_PROVIDER' },
              { key: 'DEFAULT_AI_MODEL', value: 'claude-sonnet-4-5-20250929', desc: 'Model for standard/heavy tasks', coolify: 'DEFAULT_AI_MODEL' },
              { key: 'LIGHTWEIGHT_AI_MODEL', value: 'claude-3-5-haiku-20241022', desc: 'Model for lightweight tasks', coolify: 'LIGHTWEIGHT_AI_MODEL' },
              { key: 'CLAUDE_API_KEY', value: 'sk-ant-...', desc: 'Anthropic/Claude API key', coolify: 'CLAUDE_API_KEY' },
            ].map((env) => (
              <div key={env.key} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <code className="bg-muted px-2 py-0.5 rounded font-mono text-sm">{env.key}</code>
                    <Badge variant="destructive" className="text-xs">Required</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{env.desc}</p>
                  <p className="text-xs text-muted-foreground">
                    Coolify: <code className="bg-muted px-1 rounded">{'{{ team.' + env.coolify + ' }}'}</code>
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => copyToClipboard(`{{ team.${env.coolify} }}`)}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          <h3 className="font-semibold mt-6">Optional Variables</h3>
          <div className="grid gap-3">
            {[
              { key: 'OPENAI_API_KEY', value: 'sk-...', desc: 'OpenAI API key (for OpenAI models)', coolify: 'OPENAI_GLOBAL_API' },
              { key: 'AI_MAX_RETRIES', value: '3', desc: 'Max retry attempts for AI calls', coolify: 'AI_MAX_RETRIES' },
              { key: 'AI_TIMEOUT_MS', value: '30000', desc: 'Timeout in milliseconds', coolify: 'AI_TIMEOUT_MS' },
            ].map((env) => (
              <div key={env.key} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <code className="bg-muted px-2 py-0.5 rounded font-mono text-sm">{env.key}</code>
                    <Badge variant="secondary" className="text-xs">Optional</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{env.desc}</p>
                  <p className="text-xs text-muted-foreground">
                    Coolify: <code className="bg-muted px-1 rounded">{'{{ team.' + env.coolify + ' }}'}</code>
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => copyToClipboard(`{{ team.${env.coolify} }}`)}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        <Separator />

        <div>
          <h3 className="font-semibold mb-3">Current Environment Status</h3>
          {testResult ? (
            <div className="grid gap-2">
              {Object.entries(testResult.environment).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between p-2 bg-muted rounded">
                  <code className="text-sm">{key}</code>
                  <span className={`text-sm ${value === '(not set)' ? 'text-red-500' : 'text-green-500'}`}>
                    {value}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">
              Run the test to see current environment status.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
