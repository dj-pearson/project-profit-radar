import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useState } from 'react';

interface WorkflowSMSConfigProps {
  config: {
    to?: string;
    message?: string;
  };
  onChange: (config: any) => void;
}

export function WorkflowSMSConfig({ config, onChange }: WorkflowSMSConfigProps) {
  const [to, setTo] = useState(config.to || '');
  const [message, setMessage] = useState(config.message || '');

  const handleToChange = (value: string) => {
    setTo(value);
    onChange({ ...config, to: value });
  };

  const handleMessageChange = (value: string) => {
    setMessage(value);
    onChange({ ...config, message: value });
  };

  const characterCount = message.length;
  const segmentCount = Math.ceil(characterCount / 160);

  return (
    <Card>
      <CardHeader>
        <CardTitle>SMS Configuration</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="sms-to">To Phone Number</Label>
          <Input
            id="sms-to"
            value={to}
            onChange={(e) => handleToChange(e.target.value)}
            placeholder="{{phone}} or +1234567890"
          />
          <p className="text-xs text-muted-foreground">
            Use variables like {'{{phone}}'} to dynamically insert contact phone numbers
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="sms-message">Message</Label>
            <div className="flex gap-2">
              <Badge variant={characterCount > 160 ? 'destructive' : 'secondary'}>
                {characterCount} chars
              </Badge>
              <Badge variant="outline">{segmentCount} SMS</Badge>
            </div>
          </div>
          <Textarea
            id="sms-message"
            value={message}
            onChange={(e) => handleMessageChange(e.target.value)}
            placeholder="Hi {{first_name}}, thanks for your interest..."
            rows={5}
          />
          <p className="text-xs text-muted-foreground">
            Standard SMS: 160 characters. Messages over 160 chars will be sent as multiple segments.
          </p>
        </div>

        <div className="space-y-2 p-3 bg-muted/50 rounded-lg">
          <h4 className="text-sm font-medium">Available Variables</h4>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <code className="p-1 bg-background rounded">{'{{first_name}}'}</code>
            <code className="p-1 bg-background rounded">{'{{last_name}}'}</code>
            <code className="p-1 bg-background rounded">{'{{company_name}}'}</code>
            <code className="p-1 bg-background rounded">{'{{phone}}'}</code>
            <code className="p-1 bg-background rounded">{'{{email}}'}</code>
            <code className="p-1 bg-background rounded">{'{{status}}'}</code>
          </div>
        </div>

        {characterCount > 1600 && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
            <p className="text-sm text-destructive">
              ⚠️ Message exceeds 10 SMS segments (1600 chars). Consider shortening for better delivery rates.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
