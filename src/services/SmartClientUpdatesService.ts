import { supabase } from "@/integrations/supabase/client";

export interface AutomationTrigger {
  type:
    | "phase_completion"
    | "delay_detected"
    | "budget_variance"
    | "milestone_reached";
  project_id: string;
  data: Record<string, any>;
}

export interface CommunicationTemplate {
  id: string;
  name: string;
  subject: string;
  content: string;
  trigger_type: string;
  variables: string[];
  delivery_method: "email" | "portal_notification" | "sms";
}

export interface AutomationRule {
  id: string;
  company_id: string;
  project_id?: string;
  template_id: string;
  trigger_type: string;
  trigger_conditions: Record<string, any>;
  recipient_rules: Record<string, any>;
  is_active: boolean;
}

class SmartClientUpdatesService {
  /**
   * Trigger automated communications based on project events
   */
  async triggerAutomatedCommunications(
    trigger: AutomationTrigger
  ): Promise<number> {
    try {
      const { data, error } = await supabase.rpc(
        "trigger_automated_communications",
        {
          trigger_type_param: trigger.type,
          project_id_param: trigger.project_id,
          trigger_data: trigger.data,
        }
      );

      if (error) throw error;
      return data || 0;
    } catch (error) {
      console.error("Error triggering automated communications:", error);
      throw error;
    }
  }

  /**
   * Create a new communication template
   */
  async createTemplate(
    template: Omit<CommunicationTemplate, "id"> & { company_id: string }
  ): Promise<CommunicationTemplate> {
    try {
      const { data, error } = await supabase
        .from("communication_templates")
        .insert({
          ...template,
          variables: template.variables || [],
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Error creating template:", error);
      throw error;
    }
  }

  /**
   * Update an existing communication template
   */
  async updateTemplate(
    id: string,
    updates: Partial<CommunicationTemplate>
  ): Promise<CommunicationTemplate> {
    try {
      const { data, error } = await supabase
        .from("communication_templates")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Error updating template:", error);
      throw error;
    }
  }

  /**
   * Get all templates for a company
   */
  async getTemplates(companyId: string): Promise<CommunicationTemplate[]> {
    try {
      const { data, error } = await supabase
        .from("communication_templates")
        .select("*")
        .eq("company_id", companyId)
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error("Error fetching templates:", error);
      throw error;
    }
  }

  /**
   * Create a new automation rule
   */
  async createAutomationRule(
    rule: Omit<AutomationRule, "id">
  ): Promise<AutomationRule> {
    try {
      const { data, error } = await supabase
        .from("automation_rules")
        .insert(rule)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Error creating automation rule:", error);
      throw error;
    }
  }

  /**
   * Update an automation rule
   */
  async updateAutomationRule(
    id: string,
    updates: Partial<AutomationRule>
  ): Promise<AutomationRule> {
    try {
      const { data, error } = await supabase
        .from("automation_rules")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Error updating automation rule:", error);
      throw error;
    }
  }

  /**
   * Get all automation rules for a company
   */
  async getAutomationRules(companyId: string): Promise<AutomationRule[]> {
    try {
      const { data, error } = await supabase
        .from("automation_rules")
        .select(
          `
          *,
          template:template_id(*)
        `
        )
        .eq("company_id", companyId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error("Error fetching automation rules:", error);
      throw error;
    }
  }

  /**
   * Get communication logs for a company
   */
  async getCommunicationLogs(
    companyId: string,
    projectId?: string
  ): Promise<any[]> {
    try {
      let query = supabase
        .from("automated_communications_log")
        .select(
          `
          *,
          project:project_id(name),
          automation_rule:automation_rule_id(*)
        `
        )
        .eq("company_id", companyId)
        .order("sent_at", { ascending: false });

      if (projectId) {
        query = query.eq("project_id", projectId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error("Error fetching communication logs:", error);
      throw error;
    }
  }

  /**
   * Process template variables for a specific project
   */
  async processTemplateVariables(
    templateContent: string,
    projectId: string,
    companyId: string
  ): Promise<string> {
    try {
      const { data, error } = await supabase.rpc("process_template_variables", {
        template_content: templateContent,
        project_id_param: projectId,
        company_id_param: companyId,
      });

      if (error) throw error;
      return data || templateContent;
    } catch (error) {
      console.error("Error processing template variables:", error);
      return templateContent; // Return original content if processing fails
    }
  }

  /**
   * Preview a template with processed variables
   */
  async previewTemplate(
    templateId: string,
    projectId: string,
    companyId: string
  ): Promise<{ subject: string; content: string }> {
    try {
      // Get the template
      const { data: template, error: templateError } = await supabase
        .from("communication_templates")
        .select("subject, content")
        .eq("id", templateId)
        .single();

      if (templateError) throw templateError;

      // Process variables
      const processedSubject = await this.processTemplateVariables(
        template.subject,
        projectId,
        companyId
      );

      const processedContent = await this.processTemplateVariables(
        template.content,
        projectId,
        companyId
      );

      return {
        subject: processedSubject,
        content: processedContent,
      };
    } catch (error) {
      console.error("Error previewing template:", error);
      throw error;
    }
  }

  /**
   * Get available template variables
   */
  async getTemplateVariables(): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from("template_variables")
        .select("*")
        .eq("is_active", true)
        .order("variable_type", { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error("Error fetching template variables:", error);
      throw error;
    }
  }

  /**
   * Test an automation rule (dry run)
   */
  async testAutomationRule(
    ruleId: string,
    projectId: string
  ): Promise<{
    would_trigger: boolean;
    processed_subject: string;
    processed_content: string;
    recipients: string[];
  }> {
    try {
      // Get the rule and template
      const { data: rule, error: ruleError } = await supabase
        .from("automation_rules")
        .select(
          `
          *,
          template:template_id(*)
        `
        )
        .eq("id", ruleId)
        .single();

      if (ruleError) throw ruleError;

      // Process the template
      const preview = await this.previewTemplate(
        rule.template_id,
        projectId,
        rule.company_id
      );

      return {
        would_trigger: rule.is_active,
        processed_subject: preview.subject,
        processed_content: preview.content,
        recipients: [], // TODO: Implement recipient logic
      };
    } catch (error) {
      console.error("Error testing automation rule:", error);
      throw error;
    }
  }

  /**
   * Manually send a communication using a template
   */
  async sendManualCommunication(
    templateId: string,
    projectId: string,
    recipients: string[],
    customSubject?: string,
    customContent?: string
  ): Promise<void> {
    try {
      // Get template and company info
      const { data: template, error: templateError } = await supabase
        .from("communication_templates")
        .select("*, company_id")
        .eq("id", templateId)
        .single();

      if (templateError) throw templateError;

      // Process template or use custom content
      const finalSubject =
        customSubject ||
        (await this.processTemplateVariables(
          template.subject,
          projectId,
          template.company_id
        ));

      const finalContent =
        customContent ||
        (await this.processTemplateVariables(
          template.content,
          projectId,
          template.company_id
        ));

      // Log the manual communication
      const { error: logError } = await supabase
        .from("automated_communications_log")
        .insert({
          company_id: template.company_id,
          project_id: projectId,
          trigger_event: "manual",
          template_used: template.name,
          message_content: finalContent,
          recipients: recipients,
          delivery_method: template.delivery_method,
          delivery_status: "pending",
        });

      if (logError) throw logError;

      // TODO: Integrate with actual email/SMS sending service
      console.log("Manual communication queued for sending:", {
        subject: finalSubject,
        content: finalContent,
        recipients,
      });
    } catch (error) {
      console.error("Error sending manual communication:", error);
      throw error;
    }
  }
}

export const smartClientUpdatesService = new SmartClientUpdatesService();
