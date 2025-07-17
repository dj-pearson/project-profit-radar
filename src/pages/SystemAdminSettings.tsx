import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Save, Plus, Trash2, Mail, FileText, BarChart3, FolderOpen } from "lucide-react";

interface SystemSettings {
  email_templates: Record<string, any>;
  form_templates: Record<string, any>;
  report_templates: Record<string, any>;
  document_management: Record<string, any>;
  system_preferences: Record<string, any>;
}

export default function SystemAdminSettings() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [settings, setSettings] = useState<SystemSettings>({
    email_templates: {},
    form_templates: {},
    report_templates: {},
    document_management: {},
    system_preferences: {}
  });
  const [loadingData, setLoadingData] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      
      if (user) {
        const { data: profile } = await supabase
          .from("user_profiles")
          .select("role")
          .eq("id", user.id)
          .single();
        setProfile(profile);
        
        if (profile?.role !== "root_admin") {
          navigate("/dashboard");
          return;
        }
      } else {
        navigate("/auth");
        return;
      }
      
      loadSettings();
    };
    
    checkAuth();
  }, [navigate]);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("system_admin_settings")
        .select("*")
        .single();

      if (error) {
        console.error("Error loading system settings:", error);
        toast({
          title: "Error",
          description: "Failed to load system settings",
          variant: "destructive",
        });
        return;
      }

      if (data) {
        setSettings({
          email_templates: (data.email_templates as Record<string, any>) || {},
          form_templates: (data.form_templates as Record<string, any>) || {},
          report_templates: (data.report_templates as Record<string, any>) || {},
          document_management: (data.document_management as Record<string, any>) || {},
          system_preferences: (data.system_preferences as Record<string, any>) || {}
        });
      }
    } catch (error) {
      console.error("Error loading system settings:", error);
      toast({
        title: "Error",
        description: "Failed to load system settings",
        variant: "destructive",
      });
    } finally {
      setLoadingData(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("system_admin_settings")
        .update({
          email_templates: settings.email_templates,
          form_templates: settings.form_templates,
          report_templates: settings.report_templates,
          document_management: settings.document_management,
          system_preferences: settings.system_preferences,
          updated_by: user?.id
        })
        .eq("id", (await supabase.from("system_admin_settings").select("id").single()).data?.id);

      if (error) {
        throw error;
      }

      toast({
        title: "Success",
        description: "System settings saved successfully",
      });
    } catch (error) {
      console.error("Error saving system settings:", error);
      toast({
        title: "Error",
        description: "Failed to save system settings",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const updateEmailTemplate = (templateKey: string, field: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      email_templates: {
        ...prev.email_templates,
        [templateKey]: {
          ...prev.email_templates[templateKey],
          [field]: value
        }
      }
    }));
  };

  const updateFormTemplate = (templateKey: string, field: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      form_templates: {
        ...prev.form_templates,
        [templateKey]: {
          ...prev.form_templates[templateKey],
          [field]: value
        }
      }
    }));
  };

  const updateReportTemplate = (templateKey: string, field: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      report_templates: {
        ...prev.report_templates,
        [templateKey]: {
          ...prev.report_templates[templateKey],
          [field]: value
        }
      }
    }));
  };

  const updateDocumentManagement = (section: string, field: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      document_management: {
        ...prev.document_management,
        [section]: {
          ...prev.document_management[section],
          [field]: value
        }
      }
    }));
  };

  if (loadingData || saving) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-lg">Loading system settings...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">System Admin Settings</h1>
            <p className="text-muted-foreground">
              Configure system-wide settings for email templates, forms, reports, and document management
            </p>
          </div>
          <Button onClick={saveSettings} disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Saving..." : "Save Settings"}
          </Button>
        </div>

        <Tabs defaultValue="email-templates" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="email-templates" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Email Templates
            </TabsTrigger>
            <TabsTrigger value="form-builder" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Form Builder
            </TabsTrigger>
            <TabsTrigger value="reporting-templates" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Reporting Templates
            </TabsTrigger>
            <TabsTrigger value="document-management" className="flex items-center gap-2">
              <FolderOpen className="h-4 w-4" />
              Document Management
            </TabsTrigger>
          </TabsList>

          <TabsContent value="email-templates" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Email Templates</CardTitle>
                <CardDescription>
                  Configure automated email templates for various system events
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {Object.entries(settings.email_templates).map(([key, template]) => (
                  <div key={key} className="border rounded-lg p-4 space-y-4">
                    <div className="flex justify-between items-center">
                      <h4 className="font-medium capitalize">{key.replace(/_/g, ' ')}</h4>
                      <Switch
                        checked={template.enabled}
                        onCheckedChange={(checked) => updateEmailTemplate(key, 'enabled', checked)}
                      />
                    </div>
                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <Label htmlFor={`${key}-subject`}>Subject Line</Label>
                        <Input
                          id={`${key}-subject`}
                          value={template.subject}
                          onChange={(e) => updateEmailTemplate(key, 'subject', e.target.value)}
                          placeholder="Email subject..."
                        />
                      </div>
                      <div>
                        <Label htmlFor={`${key}-template`}>Email Template</Label>
                        <Textarea
                          id={`${key}-template`}
                          value={template.template}
                          onChange={(e) => updateEmailTemplate(key, 'template', e.target.value)}
                          placeholder="Email content..."
                          rows={4}
                        />
                        <p className="text-sm text-muted-foreground mt-1">
                          Use variables like {`{{user_name}}, {{project_name}}, {{company_name}}`}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="form-builder" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Form Builder Templates</CardTitle>
                <CardDescription>
                  Create and manage custom forms for inspections, RFIs, and change orders
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {Object.entries(settings.form_templates).map(([key, template]) => (
                  <div key={key} className="border rounded-lg p-4 space-y-4">
                    <div className="flex justify-between items-center">
                      <h4 className="font-medium">{template.name}</h4>
                      <Switch
                        checked={template.enabled}
                        onCheckedChange={(checked) => updateFormTemplate(key, 'enabled', checked)}
                      />
                    </div>
                    <div>
                      <Label>Form Fields</Label>
                      <div className="space-y-2 mt-2">
                        {template.fields?.map((field: any, index: number) => (
                          <div key={index} className="flex items-center gap-2 p-2 bg-muted rounded">
                            <span className="font-medium">{field.label}</span>
                            <span className="text-sm text-muted-foreground">({field.type})</span>
                            {field.required && (
                              <span className="text-xs bg-destructive text-destructive-foreground px-1 rounded">
                                Required
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reporting-templates" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Reporting Templates</CardTitle>
                <CardDescription>
                  Configure report formats and KPIs for different business areas
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {Object.entries(settings.report_templates).map(([key, template]) => (
                  <div key={key} className="border rounded-lg p-4 space-y-4">
                    <div className="flex justify-between items-center">
                      <h4 className="font-medium">{template.name}</h4>
                      <Switch
                        checked={template.enabled}
                        onCheckedChange={(checked) => updateReportTemplate(key, 'enabled', checked)}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Key Performance Indicators</Label>
                        <div className="space-y-1 mt-2">
                          {template.kpis?.map((kpi: any, index: number) => (
                            <div key={index} className="text-sm flex justify-between">
                              <span>{kpi.label}</span>
                              <span className="text-muted-foreground">{kpi.format}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <Label>Available Charts</Label>
                        <div className="space-y-1 mt-2">
                          {template.charts?.map((chart: string, index: number) => (
                            <div key={index} className="text-sm">
                              {chart.replace(/_/g, ' ')}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="document-management" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Folder Structure</CardTitle>
                  <CardDescription>
                    Configure folder organization and naming conventions
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {Object.entries(settings.document_management.folder_structure || {}).map(([key, folder]) => {
                    const folderData = folder as any;
                    return (
                      <div key={key} className="border rounded p-3 space-y-2">
                        <h5 className="font-medium capitalize">{key}</h5>
                        <div className="text-sm space-y-1">
                          <div><strong>Subfolders:</strong> {folderData.subfolders?.join(', ')}</div>
                          <div><strong>Naming:</strong> {folderData.naming_convention}</div>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Approval Workflows</CardTitle>
                  <CardDescription>
                    Configure document approval processes
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {Object.entries(settings.document_management.approval_workflows || {}).map(([key, workflow]) => {
                    const workflowData = workflow as any;
                    return (
                      <div key={key} className="border rounded p-3 space-y-2">
                        <div className="flex justify-between items-center">
                          <h5 className="font-medium">{key.replace(/_/g, ' ')}</h5>
                          <Switch
                            checked={workflowData.enabled}
                            onCheckedChange={(checked) => 
                              updateDocumentManagement('approval_workflows', key, { ...workflowData, enabled: checked })
                            }
                          />
                        </div>
                        <div className="text-sm space-y-1">
                          {workflowData.steps?.map((step: any, index: number) => (
                            <div key={index} className="flex justify-between">
                              <span>{step.role.replace(/_/g, ' ')}</span>
                              <span className="text-muted-foreground">{step.action}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>

              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle>Retention Policies</CardTitle>
                  <CardDescription>
                    Configure document retention and archiving policies
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {Object.entries(settings.document_management.retention_policies || {}).map(([key, policy]) => {
                      const policyData = policy as any;
                      return (
                        <div key={key} className="border rounded p-3 space-y-2">
                          <h5 className="font-medium text-sm">{key.replace(/_/g, ' ')}</h5>
                          <div className="text-sm text-muted-foreground">
                            {policyData.years} years
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}