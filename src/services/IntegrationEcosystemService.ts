import { toast } from 'sonner';

export interface IntegrationConfig {
  id: string;
  name: string;
  type: 'accounting' | 'calendar' | 'storage' | 'communication' | 'project_management' | 'crm' | 'payment';
  provider: string;
  isActive: boolean;
  credentials: Record<string, any>;
  settings: IntegrationSettings;
  lastSync?: string;
  syncStatus: 'idle' | 'syncing' | 'error' | 'success';
  errorMessage?: string;
}

export interface IntegrationSettings {
  autoSync: boolean;
  syncFrequency: 'realtime' | 'hourly' | 'daily' | 'weekly';
  dataMapping: Record<string, string>;
  filters: Record<string, any>;
  webhookUrl?: string;
  customFields?: Record<string, any>;
}

export interface SyncResult {
  integrationId: string;
  startTime: string;
  endTime: string;
  status: 'success' | 'partial' | 'failed';
  recordsProcessed: number;
  recordsSuccess: number;
  recordsFailed: number;
  errors: string[];
  details: any;
}

export interface WebhookEvent {
  id: string;
  integrationId: string;
  eventType: string;
  payload: any;
  receivedAt: string;
  processed: boolean;
  processedAt?: string;
  error?: string;
}

class IntegrationEcosystemService {
  private integrations: Map<string, IntegrationConfig> = new Map();

  // QuickBooks Integration
  async connectQuickBooks(
    companyId: string,
    credentials: { clientId: string; clientSecret: string; accessToken: string }
  ): Promise<IntegrationConfig> {
    try {
      const config: IntegrationConfig = {
        id: `qb-${Date.now()}`,
        name: 'QuickBooks Online',
        type: 'accounting',
        provider: 'quickbooks',
        isActive: true,
        credentials,
        settings: {
          autoSync: true,
          syncFrequency: 'daily',
          dataMapping: {
            'projects': 'customers',
            'expenses': 'bills',
            'invoices': 'invoices'
          },
          filters: {}
        },
        syncStatus: 'idle'
      };

      this.integrations.set(config.id, config);
      toast.success('QuickBooks integration connected successfully');
      return config;
    } catch (error: any) {
      console.error('Error connecting QuickBooks:', error);
      toast.error('Failed to connect QuickBooks integration');
      throw new Error(`QuickBooks connection failed: ${error.message}`);
    }
  }

  // Google Calendar Integration
  async connectGoogleCalendar(
    companyId: string,
    credentials: { clientId: string; clientSecret: string; refreshToken: string }
  ): Promise<IntegrationConfig> {
    try {
      const config: IntegrationConfig = {
        id: `gcal-${Date.now()}`,
        name: 'Google Calendar',
        type: 'calendar',
        provider: 'google',
        isActive: true,
        credentials,
        settings: {
          autoSync: true,
          syncFrequency: 'realtime',
          dataMapping: {
            'tasks': 'events',
            'milestones': 'events'
          },
          filters: {
            calendarId: 'primary'
          }
        },
        syncStatus: 'idle'
      };

      this.integrations.set(config.id, config);
      toast.success('Google Calendar integration connected successfully');
      return config;
    } catch (error: any) {
      console.error('Error connecting Google Calendar:', error);
      toast.error('Failed to connect Google Calendar integration');
      throw new Error(`Google Calendar connection failed: ${error.message}`);
    }
  }

  // Slack Integration
  async connectSlack(
    companyId: string,
    credentials: { botToken: string; signingSecret: string }
  ): Promise<IntegrationConfig> {
    try {
      const config: IntegrationConfig = {
        id: `slack-${Date.now()}`,
        name: 'Slack',
        type: 'communication',
        provider: 'slack',
        isActive: true,
        credentials,
        settings: {
          autoSync: false,
          syncFrequency: 'realtime',
          dataMapping: {
            'notifications': 'messages',
            'updates': 'messages'
          },
          filters: {
            channels: ['#general', '#projects']
          },
          webhookUrl: '/api/webhooks/slack'
        },
        syncStatus: 'idle'
      };

      this.integrations.set(config.id, config);
      toast.success('Slack integration connected successfully');
      return config;
    } catch (error: any) {
      console.error('Error connecting Slack:', error);
      toast.error('Failed to connect Slack integration');
      throw new Error(`Slack connection failed: ${error.message}`);
    }
  }

  // Microsoft Teams Integration
  async connectMicrosoftTeams(
    companyId: string,
    credentials: { clientId: string; clientSecret: string; tenantId: string }
  ): Promise<IntegrationConfig> {
    try {
      const config: IntegrationConfig = {
        id: `teams-${Date.now()}`,
        name: 'Microsoft Teams',
        type: 'communication',
        provider: 'microsoft',
        isActive: true,
        credentials,
        settings: {
          autoSync: false,
          syncFrequency: 'realtime',
          dataMapping: {
            'notifications': 'messages',
            'meetings': 'events'
          },
          filters: {
            teamId: 'construction-team'
          }
        },
        syncStatus: 'idle'
      };

      this.integrations.set(config.id, config);
      toast.success('Microsoft Teams integration connected successfully');
      return config;
    } catch (error: any) {
      console.error('Error connecting Microsoft Teams:', error);
      toast.error('Failed to connect Microsoft Teams integration');
      throw new Error(`Microsoft Teams connection failed: ${error.message}`);
    }
  }

  // Generic sync operation
  async syncIntegration(integrationId: string): Promise<SyncResult> {
    try {
      const integration = this.integrations.get(integrationId);
      if (!integration) {
        throw new Error('Integration not found');
      }

      // Update status to syncing
      integration.syncStatus = 'syncing';
      this.integrations.set(integrationId, integration);

      const startTime = new Date().toISOString();
      
      // Mock sync process
      await new Promise(resolve => setTimeout(resolve, 2000));

      const endTime = new Date().toISOString();
      const recordsProcessed = Math.floor(Math.random() * 100) + 50;
      const recordsSuccess = Math.floor(recordsProcessed * 0.95);
      const recordsFailed = recordsProcessed - recordsSuccess;

      const result: SyncResult = {
        integrationId,
        startTime,
        endTime,
        status: recordsFailed === 0 ? 'success' : 'partial',
        recordsProcessed,
        recordsSuccess,
        recordsFailed,
        errors: recordsFailed > 0 ? ['Some records failed validation'] : [],
        details: {
          syncType: 'full',
          recordTypes: ['projects', 'tasks', 'expenses']
        }
      };

      // Update integration status
      integration.syncStatus = result.status === 'success' ? 'success' : 'error';
      integration.lastSync = endTime;
      if (result.errors.length > 0) {
        integration.errorMessage = result.errors.join(', ');
      }
      this.integrations.set(integrationId, integration);

      toast.success(`Integration sync completed: ${recordsSuccess}/${recordsProcessed} records`);
      return result;
    } catch (error: any) {
      console.error('Error syncing integration:', error);
      toast.error('Integration sync failed');
      throw new Error(`Sync failed: ${error.message}`);
    }
  }

  // Webhook handler
  async handleWebhook(
    integrationId: string,
    eventType: string,
    payload: any
  ): Promise<void> {
    try {
      const webhookEvent: WebhookEvent = {
        id: `webhook-${Date.now()}`,
        integrationId,
        eventType,
        payload,
        receivedAt: new Date().toISOString(),
        processed: false
      };

      // Process webhook based on event type
      switch (eventType) {
        case 'project.created':
          await this.handleProjectCreated(payload);
          break;
        case 'task.updated':
          await this.handleTaskUpdated(payload);
          break;
        case 'invoice.paid':
          await this.handleInvoicePaid(payload);
          break;
        default:
          console.log(`Unknown webhook event type: ${eventType}`);
      }

      webhookEvent.processed = true;
      webhookEvent.processedAt = new Date().toISOString();

    } catch (error: any) {
      console.error('Error handling webhook:', error);
      throw new Error(`Webhook processing failed: ${error.message}`);
    }
  }

  // Get all integrations
  async getIntegrations(companyId: string): Promise<IntegrationConfig[]> {
    try {
      return Array.from(this.integrations.values());
    } catch (error: any) {
      console.error('Error getting integrations:', error);
      toast.error('Failed to load integrations');
      throw new Error(`Failed to get integrations: ${error.message}`);
    }
  }

  // Disconnect integration
  async disconnectIntegration(integrationId: string): Promise<void> {
    try {
      this.integrations.delete(integrationId);
      toast.success('Integration disconnected successfully');
    } catch (error: any) {
      console.error('Error disconnecting integration:', error);
      toast.error('Failed to disconnect integration');
      throw new Error(`Disconnection failed: ${error.message}`);
    }
  }

  // Private webhook handlers
  private async handleProjectCreated(payload: any): Promise<void> {
    console.log('Processing project created webhook:', payload);
  }

  private async handleTaskUpdated(payload: any): Promise<void> {
    console.log('Processing task updated webhook:', payload);
  }

  private async handleInvoicePaid(payload: any): Promise<void> {
    console.log('Processing invoice paid webhook:', payload);
  }
}

export const integrationEcosystemService = new IntegrationEcosystemService();
export default integrationEcosystemService;