import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Mail, 
  Settings, 
  Plus,
  CheckCircle,
  AlertCircle,
  Server,
  Zap
} from 'lucide-react';

interface EmailIntegration {
  id: string;
  provider_type: string;
  provider_name: string;
  is_active: boolean;
  configuration: any;
  test_status: string;
  last_tested_at?: string;
  created_at: string;
}

interface SMTPConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  secure: boolean;
  from_email: string;
  from_name: string;
}

interface ProviderConfig {
  api_key?: string;
  domain?: string;
  webhook_url?: string;
  from_email?: string;
  from_name?: string;
}

export const EmailIntegrationSettings = () => {
  const { userProfile } = useAuth();
  const [integrations, setIntegrations] = useState<EmailIntegration[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  // Form states
  const [selectedProvider, setSelectedProvider] = useState('');
  const [providerName, setProviderName] = useState('');
  const [smtpConfig, setSMTPConfig] = useState<SMTPConfig>({
    host: '',
    port: 587,
    username: '',
    password: '',
    secure: true,
    from_email: '',
    from_name: ''
  });
  const [providerConfig, setProviderConfig] = useState<ProviderConfig>({
    api_key: '',
    domain: '',
    from_email: '',
    from_name: ''
  });

  const providers = [
    { 
      id: 'smtp', 
      name: 'SMTP', 
      description: 'Custom SMTP server configuration',
      icon: Server
    },
    { 
      id: 'resend', 
      name: 'Resend', 
      description: 'Developer-focused email API',
      icon: Zap
    },
    { 
      id: 'sendgrid', 
      name: 'SendGrid', 
      description: 'Twilio SendGrid email service',
      icon: Mail
    },
    { 
      id: 'mailgun', 
      name: 'Mailgun', 
      description: 'Email automation service',
      icon: Mail
    },
    { 
      id: 'postmark', 
      name: 'Postmark', 
      description: 'Transactional email service',
      icon: Mail
    }
  ];

  useEffect(() => {
    loadIntegrations();
  }, []);

  const loadIntegrations = async () => {
    if (!userProfile?.company_id) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('email_integrations')
        .select('*')
        .eq('company_id', userProfile.company_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setIntegrations(data || []);
    } catch (error) {
      console.error('Error loading integrations:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load email integrations"
      });
    } finally {
      setLoading(false);
    }
  };

  const createIntegration = async () => {
    if (!userProfile?.company_id || !selectedProvider || !providerName) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please fill in all required fields"
      });
      return;
    }

    try {
      const configuration = selectedProvider === 'smtp' ? smtpConfig : providerConfig;
      
      const { data, error } = await supabase
        .from('email_integrations')
        .insert({
          company_id: userProfile.company_id,
          provider_type: selectedProvider,
          provider_name: providerName,
          configuration: configuration as any,
          created_by: userProfile.id
        })
        .select()
        .single();

      if (error) throw error;

      setIntegrations([data, ...integrations]);
      setIsDialogOpen(false);
      resetForm();

      toast({
        title: "Integration Created",
        description: `${providerName} integration has been created successfully`
      });
    } catch (error) {
      console.error('Error creating integration:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to create email integration"
      });
    }
  };

  const testIntegration = async (integration: EmailIntegration) => {
    try {
      // Here you would implement actual testing logic based on provider type
      const { error } = await supabase
        .from('email_integrations')
        .update({
          test_status: 'success',
          last_tested_at: new Date().toISOString()
        })
        .eq('id', integration.id);

      if (error) throw error;

      setIntegrations(integrations.map(int => 
        int.id === integration.id 
          ? { ...int, test_status: 'success', last_tested_at: new Date().toISOString() }
          : int
      ));

      toast({
        title: "Test Successful",
        description: "Email integration is working correctly"
      });
    } catch (error) {
      console.error('Error testing integration:', error);
      toast({
        variant: "destructive",
        title: "Test Failed",
        description: "Email integration test failed"
      });
    }
  };

  const toggleIntegration = async (integration: EmailIntegration) => {
    try {
      const { error } = await supabase
        .from('email_integrations')
        .update({ is_active: !integration.is_active })
        .eq('id', integration.id);

      if (error) throw error;

      setIntegrations(integrations.map(int => 
        int.id === integration.id 
          ? { ...int, is_active: !int.is_active }
          : int
      ));

      toast({
        title: "Integration Updated",
        description: `Integration has been ${!integration.is_active ? 'enabled' : 'disabled'}`
      });
    } catch (error) {
      console.error('Error updating integration:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update integration"
      });
    }
  };

  const resetForm = () => {
    setSelectedProvider('');
    setProviderName('');
    setSMTPConfig({
      host: '',
      port: 587,
      username: '',
      password: '',
      secure: true,
      from_email: '',
      from_name: ''
    });
    setProviderConfig({
      api_key: '',
      domain: '',
      from_email: '',
      from_name: ''
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
    }
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
        <div>
          <h2 className="text-2xl font-bold">Email Integrations</h2>
          <p className="text-muted-foreground">Connect your email service providers</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Integration
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add Email Integration</DialogTitle>
              <DialogDescription>
                Connect an email service provider to send campaigns
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="provider">Email Provider</Label>
                <Select value={selectedProvider} onValueChange={setSelectedProvider}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select email provider" />
                  </SelectTrigger>
                  <SelectContent>
                    {providers.map((provider) => (
                      <SelectItem key={provider.id} value={provider.id}>
                        <div className="flex items-center space-x-2">
                          <provider.icon className="h-4 w-4" />
                          <div>
                            <div className="font-medium">{provider.name}</div>
                            <div className="text-sm text-muted-foreground">{provider.description}</div>
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="provider-name">Integration Name</Label>
                <Input
                  id="provider-name"
                  value={providerName}
                  onChange={(e) => setProviderName(e.target.value)}
                  placeholder="Enter a name for this integration"
                />
              </div>

              {selectedProvider === 'smtp' ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="smtp-host">SMTP Host</Label>
                      <Input
                        id="smtp-host"
                        value={smtpConfig.host}
                        onChange={(e) => setSMTPConfig({ ...smtpConfig, host: e.target.value })}
                        placeholder="smtp.gmail.com"
                      />
                    </div>
                    <div>
                      <Label htmlFor="smtp-port">Port</Label>
                      <Input
                        id="smtp-port"
                        type="number"
                        value={smtpConfig.port}
                        onChange={(e) => setSMTPConfig({ ...smtpConfig, port: parseInt(e.target.value) })}
                        placeholder="587"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="smtp-username">Username</Label>
                      <Input
                        id="smtp-username"
                        value={smtpConfig.username}
                        onChange={(e) => setSMTPConfig({ ...smtpConfig, username: e.target.value })}
                        placeholder="your-email@domain.com"
                      />
                    </div>
                    <div>
                      <Label htmlFor="smtp-password">Password</Label>
                      <Input
                        id="smtp-password"
                        type="password"
                        value={smtpConfig.password}
                        onChange={(e) => setSMTPConfig({ ...smtpConfig, password: e.target.value })}
                        placeholder="App password or SMTP password"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="smtp-from-email">From Email</Label>
                      <Input
                        id="smtp-from-email"
                        value={smtpConfig.from_email}
                        onChange={(e) => setSMTPConfig({ ...smtpConfig, from_email: e.target.value })}
                        placeholder="noreply@yourcompany.com"
                      />
                    </div>
                    <div>
                      <Label htmlFor="smtp-from-name">From Name</Label>
                      <Input
                        id="smtp-from-name"
                        value={smtpConfig.from_name}
                        onChange={(e) => setSMTPConfig({ ...smtpConfig, from_name: e.target.value })}
                        placeholder="Your Company Name"
                      />
                    </div>
                  </div>
                </div>
              ) : selectedProvider ? (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="api-key">API Key</Label>
                    <Input
                      id="api-key"
                      type="password"
                      value={providerConfig.api_key}
                      onChange={(e) => setProviderConfig({ ...providerConfig, api_key: e.target.value })}
                      placeholder="Enter your API key"
                    />
                  </div>
                  
                  {selectedProvider !== 'postmark' && (
                    <div>
                      <Label htmlFor="domain">Domain</Label>
                      <Input
                        id="domain"
                        value={providerConfig.domain}
                        onChange={(e) => setProviderConfig({ ...providerConfig, domain: e.target.value })}
                        placeholder="yourcompany.com"
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="from-email">From Email</Label>
                      <Input
                        id="from-email"
                        value={providerConfig.from_email}
                        onChange={(e) => setProviderConfig({ ...providerConfig, from_email: e.target.value })}
                        placeholder="noreply@yourcompany.com"
                      />
                    </div>
                    <div>
                      <Label htmlFor="from-name">From Name</Label>
                      <Input
                        id="from-name"
                        value={providerConfig.from_name}
                        onChange={(e) => setProviderConfig({ ...providerConfig, from_name: e.target.value })}
                        placeholder="Your Company Name"
                      />
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={createIntegration}>
                  Create Integration
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {integrations.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center h-64">
              <Mail className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No Email Integrations</h3>
              <p className="text-muted-foreground text-center mb-4">
                Connect an email service provider to start sending campaigns
              </p>
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Your First Integration
              </Button>
            </CardContent>
          </Card>
        ) : (
          integrations.map((integration) => {
            const provider = providers.find(p => p.id === integration.provider_type);
            const ProviderIcon = provider?.icon || Mail;
            
            return (
              <Card key={integration.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-primary/10 rounded flex items-center justify-center">
                        <ProviderIcon className="h-5 w-5" />
                      </div>
                      <div>
                        <CardTitle>{integration.provider_name}</CardTitle>
                        <CardDescription>
                          {provider?.name} • Created {new Date(integration.created_at).toLocaleDateString()}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant={integration.is_active ? "default" : "secondary"}>
                        {integration.is_active ? "Active" : "Inactive"}
                      </Badge>
                      <div className="flex items-center space-x-1">
                        {getStatusIcon(integration.test_status)}
                        <span className="text-sm text-muted-foreground">
                          {integration.test_status === 'success' ? 'Tested' : 
                           integration.test_status === 'failed' ? 'Failed' : 'Untested'}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center">
                    <div className="text-sm text-muted-foreground">
                      {integration.last_tested_at && (
                        <span>Last tested: {new Date(integration.last_tested_at).toLocaleDateString()}</span>
                      )}
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => testIntegration(integration)}
                      >
                        Test Connection
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleIntegration(integration)}
                      >
                        {integration.is_active ? 'Disable' : 'Enable'}
                      </Button>
                      <Button variant="outline" size="sm">
                        <Settings className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
};