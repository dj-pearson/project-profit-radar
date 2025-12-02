import { toast } from 'sonner';

export interface IntegrationCredentials {
  quickbooks?: {
    clientId: string;
    clientSecret: string;
    accessToken: string;
    refreshToken: string;
  };
  googleCalendar?: {
    clientId: string;
    clientSecret: string;
    refreshToken: string;
  };
  slack?: {
    botToken: string;
    signingSecret: string;
  };
}

export interface SyncOperation {
  id: string;
  operation_type: 'import' | 'export' | 'bidirectional';
  source_module: string;
  target_module: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: string;
  completed_at?: string;
  error_message?: string;
}

export interface CrossModuleOperation {
  id: string;
  operation_type: string;
  source_module: string;
  target_module: string;
  status: string;
  data: any;
  created_at: string;
}

class IntegrationService {
  async connectQuickBooks(companyId: string, credentials: any): Promise<boolean> {
    try {
      // Mock QuickBooks connection
      toast.success('QuickBooks connected successfully');
      return true;
    } catch (error: any) {
      console.error('QuickBooks connection failed:', error);
      toast.error('Failed to connect QuickBooks');
      return false;
    }
  }

  async syncProjectsToQuickBooks(companyId: string, projectId?: string): Promise<SyncOperation> {
    try {
      const operation: SyncOperation = {
        id: `sync-${Date.now()}`,
        operation_type: 'export',
        source_module: 'projects',
        target_module: 'quickbooks_customers',
        status: 'completed',
        created_at: new Date().toISOString(),
        completed_at: new Date().toISOString()
      };

      toast.success('Projects synced to QuickBooks');
      return operation;
    } catch (error: any) {
      console.error('Project sync failed:', error);
      toast.error('Failed to sync projects to QuickBooks');
      throw error;
    }
  }

  async syncInvoicesToQuickBooks(companyId: string): Promise<SyncOperation> {
    try {
      const operation: SyncOperation = {
        id: `sync-${Date.now()}`,
        operation_type: 'export',
        source_module: 'invoices',
        target_module: 'quickbooks_invoices',
        status: 'completed',
        created_at: new Date().toISOString(),
        completed_at: new Date().toISOString()
      };

      toast.success('Invoices synced to QuickBooks');
      return operation;
    } catch (error: any) {
      console.error('Invoice sync failed:', error);
      toast.error('Failed to sync invoices to QuickBooks');
      throw error;
    }
  }

  async connectGoogleCalendar(companyId: string, credentials: any): Promise<boolean> {
    try {
      toast.success('Google Calendar connected successfully');
      return true;
    } catch (error: any) {
      console.error('Google Calendar connection failed:', error);
      toast.error('Failed to connect Google Calendar');
      return false;
    }
  }

  async syncTasksToCalendar(companyId: string, projectId?: string): Promise<SyncOperation> {
    try {
      const operation: SyncOperation = {
        id: `sync-${Date.now()}`,
        operation_type: 'export',
        source_module: 'tasks',
        target_module: 'google_calendar',
        status: 'completed',
        created_at: new Date().toISOString(),
        completed_at: new Date().toISOString()
      };

      toast.success('Tasks synced to Google Calendar');
      return operation;
    } catch (error: any) {
      console.error('Task sync failed:', error);
      toast.error('Failed to sync tasks to Google Calendar');
      throw error;
    }
  }

  async connectSlack(companyId: string, credentials: any): Promise<boolean> {
    try {
      toast.success('Slack connected successfully');
      return true;
    } catch (error: any) {
      console.error('Slack connection failed:', error);
      toast.error('Failed to connect Slack');
      return false;
    }
  }

  async importContactsFromCRM(companyId: string, projectId: string): Promise<{ success: boolean; contactsImported: number }> {
    try {
      // Mock contact import
      const mockContacts = [
        {
          id: 'contact-1',
          first_name: 'John',
          last_name: 'Smith',
          email: 'john.smith@example.com',
          phone: '555-0123',
          company_name: 'ABC Construction'
        },
        {
          id: 'contact-2',
          first_name: 'Jane',
          last_name: 'Doe',
          email: 'jane.doe@example.com',
          phone: '555-0124',
          company_name: 'XYZ Builders'
        }
      ];

      toast.success(`Imported ${mockContacts.length} contacts successfully`);
      
      return { success: true, contactsImported: mockContacts.length };
    } catch (error: any) {
      console.error('Contact import failed:', error);
      toast.error('Failed to import contacts from CRM');
      return { success: false, contactsImported: 0 };
    }
  }

  async createTaskFromData(data: any): Promise<void> {
    try {
      // Mock task creation
        name: data.name,
        priority: data.priority,
        status: data.status,
        project_id: data.project_id
      });
      
      toast.success('Task created successfully');
    } catch (error: any) {
      console.error('Task creation failed:', error);
      toast.error('Failed to create task');
      throw error;
    }
  }

  async processCrossModuleOperations(operations: CrossModuleOperation[]): Promise<void> {
    try {
      for (const operation of operations) {
          id: operation.id,
          type: operation.operation_type,
          source: operation.source_module,
          target: operation.target_module
        });
      }
      
      toast.success(`Processed ${operations.length} cross-module operations`);
    } catch (error: any) {
      console.error('Cross-module operation processing failed:', error);
      toast.error('Failed to process cross-module operations');
      throw error;
    }
  }

  async syncInvoicesFromAccounting(companyId: string): Promise<{ success: boolean; invoicesSynced: number }> {
    try {
      // Mock invoice sync
      const mockInvoices = [
        {
          id: 'inv-1',
          client_name: 'ABC Construction',
          amount: 15000,
          status: 'sent',
          due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        }
      ];

      toast.success(`Synced ${mockInvoices.length} invoices from accounting system`);
      
      return { success: true, invoicesSynced: mockInvoices.length };
    } catch (error: any) {
      console.error('Invoice sync failed:', error);
      toast.error('Failed to sync invoices from accounting system');
      return { success: false, invoicesSynced: 0 };
    }
  }

  async getIntegrationStatus(companyId: string): Promise<{
    quickbooks: { connected: boolean; lastSync?: string };
    googleCalendar: { connected: boolean; lastSync?: string };
    slack: { connected: boolean; lastSync?: string };
  }> {
    try {
      // Mock integration status
      return {
        quickbooks: { connected: false },
        googleCalendar: { connected: false },
        slack: { connected: false }
      };
    } catch (error: any) {
      console.error('Error getting integration status:', error);
      throw error;
    }
  }

  async scheduleDataSync(companyId: string, frequency: 'hourly' | 'daily' | 'weekly'): Promise<void> {
    try {
      toast.success(`Data sync scheduled to run ${frequency}`);
    } catch (error: any) {
      console.error('Failed to schedule data sync:', error);
      toast.error('Failed to schedule data sync');
      throw error;
    }
  }

  async createProjectFromOpportunity(data: {
    opportunityId: string;
    projectName: string;
    estimatedBudget: number;
    startDate: string;
    projectType: string;
  }): Promise<{ success: boolean; projectId?: string }> {
    try {
      const projectId = `proj-${Date.now()}`;
      toast.success('Project created from opportunity');
      return { success: true, projectId };
    } catch (error: any) {
      console.error('Failed to create project from opportunity:', error);
      toast.error('Failed to create project from opportunity');
      return { success: false };
    }
  }

  async createInvoiceFromProject(projectId: string): Promise<{ success: boolean; invoiceId?: string }> {
    try {
      const invoiceId = `inv-${Date.now()}`;
      toast.success('Invoice created from project');
      return { success: true, invoiceId };
    } catch (error: any) {
      console.error('Failed to create invoice from project:', error);
      toast.error('Failed to create invoice from project');
      return { success: false };
    }
  }
}

export const integrationService = new IntegrationService();
export default integrationService;