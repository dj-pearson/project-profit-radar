import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { RoleGuard, ROLE_GROUPS } from "@/components/auth/RoleGuard";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { AccessiblePageWrapper } from "@/components/accessibility/AccessiblePageWrapper";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useSystemAdminSettings } from "@/hooks/useSystemAdminSettings";
import { ErrorState } from "@/components/common/ErrorState";
import { Save, Mail, FileText, BarChart3, FolderOpen } from "lucide-react";
import { DataTablePageSkeleton } from '@/components/ui/skeletons';

interface EmailTemplate {
  enabled: boolean;
  subject: string;
  template: string;
}

interface FormField {
  label: string;
  type: string;
  required: boolean;
}

interface FormTemplate {
  name: string;
  enabled: boolean;
  fields?: FormField[];
}

interface KPI {
  label: string;
  format: string;
}

interface ReportTemplate {
  name: string;
  enabled: boolean;
  kpis?: KPI[];
  charts?: string[];
}

interface FolderConfig {
  subfolders?: string[];
  naming_convention: string;
}

interface WorkflowStep {
  role: string;
  action: string;
}

interface ApprovalWorkflow {
  enabled: boolean;
  steps?: WorkflowStep[];
}

interface RetentionPolicy {
  years: number;
}

interface DocumentManagement {
  folder_structure?: Record<string, FolderConfig>;
  approval_workflows?: Record<string, ApprovalWorkflow>;
  retention_policies?: Record<string, RetentionPolicy>;
  [key: string]: Record<string, FolderConfig | ApprovalWorkflow | RetentionPolicy> | undefined;
}

interface SystemSettings {
  email_templates: Record<string, EmailTemplate>;
  form_templates: Record<string, FormTemplate>;
  report_templates: Record<string, ReportTemplate>;
  document_management: DocumentManagement;
  system_preferences: Record<string, string | number | boolean>;
}

export default function SystemAdminSettings() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, userProfile, loading } = useAuth();
  const isRootAdmin = userProfile?.role === "root_admin";
  const system = useSystemAdminSettings({ enabled: isRootAdmin });
  const [settings, setSettings] = useState<SystemSettings>({
    email_templates: {},
    form_templates: {},
    report_templates: {},
    document_management: {},
    system_preferences: {}
  });
  const saving = system.saving;

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate("/auth");
      return;
    }
    if (userProfile && !isRootAdmin) navigate("/dashboard");
  }, [loading, user, userProfile, isRootAdmin, navigate]);

  // Seed the editor from the row once; a refetch must not throw away edits.
  const seeded = useRef(false);
  useEffect(() => {
    if (seeded.current || !system.row) return;
    seeded.current = true;
    const d = system.row.settings;
    setSettings({
      email_templates: d.email_templates as Record<string, EmailTemplate>,
      form_templates: d.form_templates as Record<string, FormTemplate>,
      report_templates: d.report_templates as Record<string, ReportTemplate>,
      document_management: d.document_management as DocumentManagement,
      system_preferences: d.system_preferences as Record<string, string | number | boolean>,
    });
  }, [system.row]);

  const saveSettings = async () => {
    try {
      await system.save(settings);
      toast({
        title: "Success",
        description: "System settings saved successfully",
      });
    } catch (error) {
      console.error("Error saving system settings:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save system settings",
        variant: "destructive",
      });
    }
  };

  const updateEmailTemplate = (templateKey: string, field: string, value: string | boolean) => {
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

  const updateFormTemplate = (templateKey: string, field: string, value: string | boolean) => {
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

  const updateReportTemplate = (templateKey: string, field: string, value: string | boolean) => {
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

  const updateDocumentManagement = (section: string, field: string, value: FolderConfig | ApprovalWorkflow | RetentionPolicy) => {
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

  if (loading || system.isLoading || saving) {
    return (
      <AccessiblePageWrapper pageTitle="System Admin Settings">
      <DashboardLayout hasAccessibleWrapper title="System Admin Settings">
        <DataTablePageSkeleton label="Loading system settings" />
      </DashboardLayout>
      </AccessiblePageWrapper>
    );
  }

  return (
    <RoleGuard allowedRoles={ROLE_GROUPS.ROOT_ADMIN}>
      <AccessiblePageWrapper pageTitle="System Admin Settings">
      <DashboardLayout hasAccessibleWrapper
        title="System Admin Settings"
        description="Configure system-wide settings for email templates, forms, reports, and document management"
        headerActions={
          <Button onClick={saveSettings} disabled={saving || !system.row}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Saving..." : "Save Settings"}
          </Button>
        }
      >
        <div className="space-y-6">
        {system.error && (
          <ErrorState
            inline
            title="System settings could not be loaded"
            error={system.error}
            onRetry={() => { void system.refetch(); }}
          />
        )}
        {!system.error && !system.row && (
          <p className="text-sm text-muted-foreground">There is no system settings row yet, so there is nothing to edit.</p>
        )}
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
                        {template.fields?.map((field: FormField, index: number) => (
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
                          {template.kpis?.map((kpi: KPI, index: number) => (
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
                    const folderData = folder as FolderConfig;
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
                    const workflowData = workflow as ApprovalWorkflow;
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
                          {workflowData.steps?.map((step: WorkflowStep, index: number) => (
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
                      const policyData = policy as RetentionPolicy;
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
    </AccessiblePageWrapper>
    </RoleGuard>
  );
}