export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: 'lead_nurture' | 'follow_up' | 'engagement' | 'sales';
  icon: string;
  trigger_config: any;
  steps: any[];
}

export const workflowTemplates: WorkflowTemplate[] = [
  {
    id: 'new-lead-welcome',
    name: 'New Lead Welcome Series',
    description: 'Automatically send a welcome email when a new lead is created',
    category: 'lead_nurture',
    icon: 'Mail',
    trigger_config: {
      trigger_type: 'record_created',
      table: 'leads'
    },
    steps: [
      {
        step_type: 'action',
        config: {
          action_type: 'send_email',
          to: '{{email}}',
          subject: 'Welcome! Let\'s discuss your project',
          body: 'Hi {{first_name}},\n\nThank you for reaching out! We\'re excited to help with your construction project.\n\nOur team will review your requirements and get back to you within 24 hours.\n\nBest regards,\nThe Team'
        },
        position: 0
      }
    ]
  },
  {
    id: 'high-value-lead-alert',
    name: 'High-Value Lead Alert',
    description: 'Create a task and send notification when a high-value lead comes in',
    category: 'sales',
    icon: 'DollarSign',
    trigger_config: {
      trigger_type: 'record_created',
      table: 'leads'
    },
    steps: [
      {
        step_type: 'condition',
        config: {
          conditions: [
            {
              field: 'estimated_budget',
              operator: 'greater_than',
              value: '100000'
            }
          ],
          logic_operator: 'AND'
        },
        position: 0
      },
      {
        step_type: 'action',
        config: {
          action_type: 'create_task',
          title: 'Follow up with high-value lead: {{company_name}}',
          description: 'Priority lead with budget over $100k. Contact within 2 hours.',
          priority: 'high',
          assigned_to: '{{sales_manager_id}}'
        },
        position: 1
      },
      {
        step_type: 'action',
        config: {
          action_type: 'send_notification',
          message: 'New high-value lead: {{company_name}} - ${{estimated_budget}}',
          user_id: '{{sales_manager_id}}'
        },
        position: 2
      }
    ]
  },
  {
    id: 'lead-score-update',
    name: 'Lead Score Automation',
    description: 'Update lead score based on engagement and activity',
    category: 'engagement',
    icon: 'TrendingUp',
    trigger_config: {
      trigger_type: 'field_updated',
      table: 'leads',
      field: 'last_activity_at'
    },
    steps: [
      {
        step_type: 'action',
        config: {
          action_type: 'update_field',
          table: 'leads',
          field: 'lead_score',
          value: '{{lead_score + 10}}'
        },
        position: 0
      }
    ]
  },
  {
    id: 'inactive-lead-reengagement',
    name: 'Re-engage Inactive Leads',
    description: 'Send follow-up email to leads inactive for 7 days',
    category: 'follow_up',
    icon: 'RefreshCw',
    trigger_config: {
      trigger_type: 'schedule',
      schedule: 'daily',
      time: '09:00'
    },
    steps: [
      {
        step_type: 'condition',
        config: {
          conditions: [
            {
              field: 'last_activity_at',
              operator: 'less_than',
              value: '{{now - 7 days}}'
            },
            {
              field: 'status',
              operator: 'not_equals',
              value: 'closed'
            }
          ],
          logic_operator: 'AND'
        },
        position: 0
      },
      {
        step_type: 'action',
        config: {
          action_type: 'send_email',
          to: '{{email}}',
          subject: 'Still interested in your project?',
          body: 'Hi {{first_name}},\n\nWe wanted to follow up on your construction project inquiry.\n\nAre you still looking to move forward? We\'d love to help.\n\nBest regards,\nThe Team'
        },
        position: 1
      }
    ]
  },
  {
    id: 'meeting-scheduled-confirmation',
    name: 'Meeting Confirmation',
    description: 'Send confirmation email when meeting is scheduled',
    category: 'follow_up',
    icon: 'Calendar',
    trigger_config: {
      trigger_type: 'record_created',
      table: 'meetings'
    },
    steps: [
      {
        step_type: 'action',
        config: {
          action_type: 'send_email',
          to: '{{lead_email}}',
          subject: 'Meeting Confirmed: {{meeting_title}}',
          body: 'Hi {{lead_name}},\n\nYour meeting has been confirmed!\n\nDate: {{meeting_date}}\nTime: {{meeting_time}}\nDuration: {{duration}} minutes\n\nWe look forward to speaking with you.\n\nBest regards,\nThe Team'
        },
        position: 0
      }
    ]
  },
  {
    id: 'proposal-sent-followup',
    name: 'Proposal Follow-up',
    description: 'Automatically follow up 3 days after sending a proposal',
    category: 'sales',
    icon: 'FileText',
    trigger_config: {
      trigger_type: 'field_updated',
      table: 'leads',
      field: 'status',
      value: 'proposal_sent'
    },
    steps: [
      {
        step_type: 'delay',
        config: {
          delay_seconds: 259200 // 3 days
        },
        position: 0
      },
      {
        step_type: 'condition',
        config: {
          conditions: [
            {
              field: 'status',
              operator: 'equals',
              value: 'proposal_sent'
            }
          ],
          logic_operator: 'AND'
        },
        position: 1
      },
      {
        step_type: 'action',
        config: {
          action_type: 'send_email',
          to: '{{email}}',
          subject: 'Following up on your proposal',
          body: 'Hi {{first_name}},\n\nI wanted to follow up on the proposal we sent over.\n\nDo you have any questions? We\'re happy to discuss the details.\n\nBest regards,\nThe Team'
        },
        position: 2
      }
    ]
  },
  {
    id: 'urgent-lead-sms',
    name: 'Urgent Lead SMS Alert',
    description: 'Send instant SMS notification for urgent high-priority leads',
    category: 'sales',
    icon: 'MessageSquare',
    trigger_config: {
      trigger_type: 'record_created',
      table: 'leads'
    },
    steps: [
      {
        step_type: 'condition',
        config: {
          conditions: [
            {
              field: 'priority',
              operator: 'equals',
              value: 'urgent'
            }
          ],
          logic_operator: 'AND'
        },
        position: 0
      },
      {
        step_type: 'action',
        config: {
          action_type: 'send_sms',
          to: '{{assigned_to_phone}}',
          message: 'URGENT: New lead from {{company_name}}. Budget: ${{estimated_budget}}. Contact: {{phone}}'
        },
        position: 1
      }
    ]
  },
  {
    id: 'appointment-reminder-sms',
    name: 'Appointment Reminder SMS',
    description: 'Send SMS reminder 24 hours before scheduled meeting',
    category: 'follow_up',
    icon: 'Clock',
    trigger_config: {
      trigger_type: 'schedule',
      schedule: 'hourly'
    },
    steps: [
      {
        step_type: 'action',
        config: {
          action_type: 'send_sms',
          to: '{{lead_phone}}',
          message: 'Hi {{first_name}}, reminder: You have a meeting with us tomorrow at {{meeting_time}}. Reply CONFIRM to confirm. - {{company_name}}'
        },
        position: 0
      }
    ]
  }
];
