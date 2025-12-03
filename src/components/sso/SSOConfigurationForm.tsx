import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Shield, Key, Server, Globe, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

// SAML Configuration Schema
const samlConfigSchema = z.object({
  display_name: z.string().min(1, 'Display name is required'),
  entity_id: z.string().min(1, 'Entity ID is required'),
  sso_url: z.string().url('Invalid SSO URL'),
  slo_url: z.string().url('Invalid SLO URL').optional().or(z.literal('')),
  certificate: z.string().min(1, 'Certificate is required'),
  sign_request: z.boolean().default(false),
  want_assertions_signed: z.boolean().default(true),
  allowed_domains: z.string().optional(),
  default_role: z.string().default('office_staff'),
  is_enabled: z.boolean().default(false),
  is_default: z.boolean().default(false),
});

// OAuth Configuration Schema
const oauthConfigSchema = z.object({
  display_name: z.string().min(1, 'Display name is required'),
  provider: z.enum(['oauth_google', 'oauth_microsoft', 'oauth_github']),
  client_id: z.string().min(1, 'Client ID is required'),
  client_secret: z.string().min(1, 'Client Secret is required'),
  authorize_url: z.string().url('Invalid authorize URL').optional().or(z.literal('')),
  token_url: z.string().url('Invalid token URL').optional().or(z.literal('')),
  scopes: z.string().optional(),
  allowed_domains: z.string().optional(),
  default_role: z.string().default('office_staff'),
  is_enabled: z.boolean().default(false),
  is_default: z.boolean().default(false),
});

// LDAP Configuration Schema
const ldapConfigSchema = z.object({
  display_name: z.string().min(1, 'Display name is required'),
  host: z.string().min(1, 'Host is required'),
  port: z.coerce.number().int().min(1).max(65535).default(389),
  use_ssl: z.boolean().default(false),
  bind_dn: z.string().min(1, 'Bind DN is required'),
  bind_password: z.string().min(1, 'Bind password is required'),
  user_search_base: z.string().min(1, 'User search base is required'),
  user_search_filter: z.string().default('(uid={username})'),
  group_search_base: z.string().optional(),
  email_attribute: z.string().default('mail'),
  name_attribute: z.string().default('cn'),
  allowed_domains: z.string().optional(),
  default_role: z.string().default('office_staff'),
  is_enabled: z.boolean().default(false),
  is_default: z.boolean().default(false),
});

type SAMLConfig = z.infer<typeof samlConfigSchema>;
type OAuthConfig = z.infer<typeof oauthConfigSchema>;
type LDAPConfig = z.infer<typeof ldapConfigSchema>;

interface SSOConfigurationFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
  existingConnection?: any;
}

export const SSOConfigurationForm: React.FC<SSOConfigurationFormProps> = ({
  onSuccess,
  onCancel,
  existingConnection,
}) => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'saml' | 'oauth' | 'ldap'>(
    existingConnection?.provider?.startsWith('oauth') ? 'oauth' :
    existingConnection?.provider === 'ldap' ? 'ldap' : 'saml'
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // SAML Form
  const samlForm = useForm<SAMLConfig>({
    resolver: zodResolver(samlConfigSchema),
    defaultValues: {
      display_name: existingConnection?.display_name || '',
      entity_id: existingConnection?.config?.entity_id || '',
      sso_url: existingConnection?.config?.sso_url || '',
      slo_url: existingConnection?.config?.slo_url || '',
      certificate: existingConnection?.config?.certificate || '',
      sign_request: existingConnection?.config?.sign_request || false,
      want_assertions_signed: existingConnection?.config?.want_assertions_signed ?? true,
      allowed_domains: existingConnection?.allowed_domains?.join(', ') || '',
      default_role: existingConnection?.default_role || 'office_staff',
      is_enabled: existingConnection?.is_enabled || false,
      is_default: existingConnection?.is_default || false,
    },
  });

  // OAuth Form
  const oauthForm = useForm<OAuthConfig>({
    resolver: zodResolver(oauthConfigSchema),
    defaultValues: {
      display_name: existingConnection?.display_name || '',
      provider: existingConnection?.provider || 'oauth_microsoft',
      client_id: existingConnection?.config?.client_id || '',
      client_secret: '',
      authorize_url: existingConnection?.config?.authorize_url || '',
      token_url: existingConnection?.config?.token_url || '',
      scopes: existingConnection?.config?.scopes?.join(' ') || '',
      allowed_domains: existingConnection?.allowed_domains?.join(', ') || '',
      default_role: existingConnection?.default_role || 'office_staff',
      is_enabled: existingConnection?.is_enabled || false,
      is_default: existingConnection?.is_default || false,
    },
  });

  // LDAP Form
  const ldapForm = useForm<LDAPConfig>({
    resolver: zodResolver(ldapConfigSchema),
    defaultValues: {
      display_name: existingConnection?.display_name || '',
      host: existingConnection?.config?.host || '',
      port: existingConnection?.config?.port || 389,
      use_ssl: existingConnection?.config?.use_ssl || false,
      bind_dn: existingConnection?.config?.bind_dn || '',
      bind_password: '',
      user_search_base: existingConnection?.config?.user_search_base || '',
      user_search_filter: existingConnection?.config?.user_search_filter || '(uid={username})',
      group_search_base: existingConnection?.config?.group_search_base || '',
      email_attribute: existingConnection?.config?.email_attribute || 'mail',
      name_attribute: existingConnection?.config?.name_attribute || 'cn',
      allowed_domains: existingConnection?.allowed_domains?.join(', ') || '',
      default_role: existingConnection?.default_role || 'office_staff',
      is_enabled: existingConnection?.is_enabled || false,
      is_default: existingConnection?.is_default || false,
    },
  });

  const handleSAMLSubmit = async (data: SAMLConfig) => {
    setIsSubmitting(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sso-manage`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.session.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({
            action: existingConnection ? 'update' : 'create',
            id: existingConnection?.id,
            provider: 'saml',
            display_name: data.display_name,
            config: {
              entity_id: data.entity_id,
              sso_url: data.sso_url,
              slo_url: data.slo_url || undefined,
              certificate: data.certificate,
              sign_request: data.sign_request,
              want_assertions_signed: data.want_assertions_signed,
            },
            allowed_domains: data.allowed_domains?.split(',').map(d => d.trim()).filter(Boolean),
            default_role: data.default_role,
            is_enabled: data.is_enabled,
            is_default: data.is_default,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to save SAML configuration');
      }

      toast({
        title: 'Success',
        description: `SAML configuration ${existingConnection ? 'updated' : 'created'} successfully`,
      });

      onSuccess?.();
    } catch (error) {
      console.error('SAML save error:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save configuration',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOAuthSubmit = async (data: OAuthConfig) => {
    setIsSubmitting(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sso-manage`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.session.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({
            action: existingConnection ? 'update' : 'create',
            id: existingConnection?.id,
            provider: data.provider,
            display_name: data.display_name,
            config: {
              client_id: data.client_id,
              client_secret: data.client_secret || existingConnection?.config?.client_secret,
              authorize_url: data.authorize_url || undefined,
              token_url: data.token_url || undefined,
              scopes: data.scopes?.split(' ').filter(Boolean),
            },
            allowed_domains: data.allowed_domains?.split(',').map(d => d.trim()).filter(Boolean),
            default_role: data.default_role,
            is_enabled: data.is_enabled,
            is_default: data.is_default,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to save OAuth configuration');
      }

      toast({
        title: 'Success',
        description: `OAuth configuration ${existingConnection ? 'updated' : 'created'} successfully`,
      });

      onSuccess?.();
    } catch (error) {
      console.error('OAuth save error:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save configuration',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLDAPSubmit = async (data: LDAPConfig) => {
    setIsSubmitting(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sso-manage`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.session.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({
            action: existingConnection ? 'update' : 'create',
            id: existingConnection?.id,
            provider: 'ldap',
            display_name: data.display_name,
            config: {
              host: data.host,
              port: data.port,
              use_ssl: data.use_ssl,
              bind_dn: data.bind_dn,
              bind_password: data.bind_password || existingConnection?.config?.bind_password,
              user_search_base: data.user_search_base,
              user_search_filter: data.user_search_filter,
              group_search_base: data.group_search_base || undefined,
              email_attribute: data.email_attribute,
              name_attribute: data.name_attribute,
            },
            allowed_domains: data.allowed_domains?.split(',').map(d => d.trim()).filter(Boolean),
            default_role: data.default_role,
            is_enabled: data.is_enabled,
            is_default: data.is_default,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to save LDAP configuration');
      }

      toast({
        title: 'Success',
        description: `LDAP configuration ${existingConnection ? 'updated' : 'created'} successfully`,
      });

      onSuccess?.();
    } catch (error) {
      console.error('LDAP save error:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save configuration',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTestConnection = async () => {
    if (!existingConnection?.id) {
      toast({
        title: 'Save First',
        description: 'Please save the configuration before testing',
        variant: 'destructive',
      });
      return;
    }

    setTestResult(null);
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sso-manage`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.session.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({
            action: 'test',
            id: existingConnection.id,
          }),
        }
      );

      const result = await response.json();

      setTestResult({
        success: result.data?.success || false,
        message: result.data?.message || result.error || 'Test failed',
      });
    } catch (error) {
      setTestResult({
        success: false,
        message: error instanceof Error ? error.message : 'Test failed',
      });
    }
  };

  const roleOptions = [
    { value: 'admin', label: 'Admin' },
    { value: 'project_manager', label: 'Project Manager' },
    { value: 'field_supervisor', label: 'Field Supervisor' },
    { value: 'office_staff', label: 'Office Staff' },
    { value: 'accounting', label: 'Accounting' },
    { value: 'client_portal', label: 'Client Portal' },
  ];

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-construction-orange" />
          {existingConnection ? 'Edit SSO Connection' : 'Add SSO Connection'}
        </CardTitle>
        <CardDescription>
          Configure single sign-on with your identity provider
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
          <TabsList className="mb-4">
            <TabsTrigger value="saml" disabled={!!existingConnection && existingConnection.provider !== 'saml'}>
              <Shield className="w-4 h-4 mr-2" />
              SAML 2.0
            </TabsTrigger>
            <TabsTrigger value="oauth" disabled={!!existingConnection && !existingConnection.provider?.startsWith('oauth')}>
              <Globe className="w-4 h-4 mr-2" />
              OAuth 2.0
            </TabsTrigger>
            <TabsTrigger value="ldap" disabled={!!existingConnection && existingConnection.provider !== 'ldap'}>
              <Server className="w-4 h-4 mr-2" />
              LDAP
            </TabsTrigger>
          </TabsList>

          {/* SAML Configuration */}
          <TabsContent value="saml">
            <Form {...samlForm}>
              <form onSubmit={samlForm.handleSubmit(handleSAMLSubmit)} className="space-y-4">
                <FormField
                  control={samlForm.control}
                  name="display_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Display Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Okta SSO" {...field} />
                      </FormControl>
                      <FormDescription>A friendly name for this connection</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={samlForm.control}
                    name="entity_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Entity ID (Issuer)</FormLabel>
                        <FormControl>
                          <Input placeholder="https://your-idp.com/saml" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={samlForm.control}
                    name="sso_url"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>SSO URL</FormLabel>
                        <FormControl>
                          <Input placeholder="https://your-idp.com/sso" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={samlForm.control}
                  name="slo_url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>SLO URL (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="https://your-idp.com/slo" {...field} />
                      </FormControl>
                      <FormDescription>Single logout URL</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={samlForm.control}
                  name="certificate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>X.509 Certificate</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="-----BEGIN CERTIFICATE-----&#10;...&#10;-----END CERTIFICATE-----"
                          rows={5}
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>Paste the IdP certificate from your identity provider</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={samlForm.control}
                    name="sign_request"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <FormLabel>Sign Requests</FormLabel>
                          <FormDescription>Sign SAML authentication requests</FormDescription>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={samlForm.control}
                    name="want_assertions_signed"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <FormLabel>Require Signed Assertions</FormLabel>
                          <FormDescription>Require IdP to sign assertions</FormDescription>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={samlForm.control}
                    name="allowed_domains"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Allowed Domains</FormLabel>
                        <FormControl>
                          <Input placeholder="company.com, subsidiary.com" {...field} />
                        </FormControl>
                        <FormDescription>Comma-separated list of allowed email domains</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={samlForm.control}
                    name="default_role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Default Role</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select role" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {roleOptions.map((role) => (
                              <SelectItem key={role.value} value={role.value}>
                                {role.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>Default role for new SSO users</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={samlForm.control}
                    name="is_enabled"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <FormLabel>Enable Connection</FormLabel>
                          <FormDescription>Allow users to sign in with this SSO</FormDescription>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={samlForm.control}
                    name="is_default"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <FormLabel>Default Connection</FormLabel>
                          <FormDescription>Use as default SSO for this tenant</FormDescription>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex justify-between pt-4">
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" onClick={onCancel}>
                      Cancel
                    </Button>
                    {existingConnection && (
                      <Button type="button" variant="outline" onClick={handleTestConnection}>
                        Test Connection
                      </Button>
                    )}
                  </div>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    {existingConnection ? 'Update' : 'Create'} SAML Connection
                  </Button>
                </div>
              </form>
            </Form>
          </TabsContent>

          {/* OAuth Configuration */}
          <TabsContent value="oauth">
            <Form {...oauthForm}>
              <form onSubmit={oauthForm.handleSubmit(handleOAuthSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={oauthForm.control}
                    name="display_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Display Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Microsoft Entra ID" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={oauthForm.control}
                    name="provider"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Provider</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select provider" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="oauth_microsoft">Microsoft</SelectItem>
                            <SelectItem value="oauth_github">GitHub</SelectItem>
                            <SelectItem value="oauth_google">Google (Custom)</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={oauthForm.control}
                    name="client_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Client ID</FormLabel>
                        <FormControl>
                          <Input placeholder="your-client-id" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={oauthForm.control}
                    name="client_secret"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Client Secret</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder={existingConnection ? '••••••••' : 'your-client-secret'}
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          {existingConnection && 'Leave empty to keep existing secret'}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={oauthForm.control}
                  name="scopes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Scopes (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="openid email profile" {...field} />
                      </FormControl>
                      <FormDescription>Space-separated list of OAuth scopes</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={oauthForm.control}
                    name="allowed_domains"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Allowed Domains</FormLabel>
                        <FormControl>
                          <Input placeholder="company.com, subsidiary.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={oauthForm.control}
                    name="default_role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Default Role</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select role" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {roleOptions.map((role) => (
                              <SelectItem key={role.value} value={role.value}>
                                {role.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={oauthForm.control}
                    name="is_enabled"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <FormLabel>Enable Connection</FormLabel>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={oauthForm.control}
                    name="is_default"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <FormLabel>Default Connection</FormLabel>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex justify-between pt-4">
                  <Button type="button" variant="outline" onClick={onCancel}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    {existingConnection ? 'Update' : 'Create'} OAuth Connection
                  </Button>
                </div>
              </form>
            </Form>
          </TabsContent>

          {/* LDAP Configuration */}
          <TabsContent value="ldap">
            <Form {...ldapForm}>
              <form onSubmit={ldapForm.handleSubmit(handleLDAPSubmit)} className="space-y-4">
                <FormField
                  control={ldapForm.control}
                  name="display_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Display Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Active Directory" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={ldapForm.control}
                    name="host"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Host</FormLabel>
                        <FormControl>
                          <Input placeholder="ldap.company.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={ldapForm.control}
                    name="port"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Port</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={ldapForm.control}
                    name="use_ssl"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border p-3 h-[70px]">
                        <FormLabel>Use SSL/TLS</FormLabel>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={ldapForm.control}
                    name="bind_dn"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bind DN</FormLabel>
                        <FormControl>
                          <Input placeholder="cn=admin,dc=company,dc=com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={ldapForm.control}
                    name="bind_password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bind Password</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder={existingConnection ? '••••••••' : 'password'}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={ldapForm.control}
                    name="user_search_base"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>User Search Base</FormLabel>
                        <FormControl>
                          <Input placeholder="ou=users,dc=company,dc=com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={ldapForm.control}
                    name="user_search_filter"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>User Search Filter</FormLabel>
                        <FormControl>
                          <Input placeholder="(uid={username})" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={ldapForm.control}
                    name="email_attribute"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email Attribute</FormLabel>
                        <FormControl>
                          <Input placeholder="mail" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={ldapForm.control}
                    name="name_attribute"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name Attribute</FormLabel>
                        <FormControl>
                          <Input placeholder="cn" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={ldapForm.control}
                    name="allowed_domains"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Allowed Domains</FormLabel>
                        <FormControl>
                          <Input placeholder="company.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={ldapForm.control}
                    name="default_role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Default Role</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select role" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {roleOptions.map((role) => (
                              <SelectItem key={role.value} value={role.value}>
                                {role.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={ldapForm.control}
                    name="is_enabled"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border p-3">
                        <FormLabel>Enable Connection</FormLabel>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={ldapForm.control}
                    name="is_default"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border p-3">
                        <FormLabel>Default Connection</FormLabel>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex justify-between pt-4">
                  <Button type="button" variant="outline" onClick={onCancel}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    {existingConnection ? 'Update' : 'Create'} LDAP Connection
                  </Button>
                </div>
              </form>
            </Form>
          </TabsContent>
        </Tabs>

        {/* Test Results */}
        {testResult && (
          <div
            className={`mt-4 p-4 rounded-lg flex items-center gap-2 ${
              testResult.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
            }`}
          >
            {testResult.success ? (
              <CheckCircle className="w-5 h-5" />
            ) : (
              <AlertCircle className="w-5 h-5" />
            )}
            <span>{testResult.message}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SSOConfigurationForm;
