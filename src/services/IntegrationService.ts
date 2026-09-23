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

/**
 * US-309: most of this service announced success over work it never did -
 * "Imported 2 contacts successfully" about two hardcoded people, "Task created
 * successfully" with no insert, invented project and invoice ids. Every method
 * below that has nothing behind it now says so and reports failure to its
 * caller. The three QuickBooks methods are left for the QuickBooks work.
 */
function notBuilt(title: string, description: string): void {
  toast.error(title, { description });
}

function notBuiltOperation(source: string, target: string): SyncOperation {
  const now = new Date().toISOString();
  return {
    id: `not-built-${Date.now()}`,
    operation_type: 'export',
    source_module: source,
    target_module: target,
    status: 'failed',
    created_at: now,
    error_message: 'Not built; nothing was synced.'
  };
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
    notBuilt('Google Calendar was not connected', 'Connecting Google Calendar from here is not built yet.');
    return false;
  }

  async syncTasksToCalendar(companyId: string, projectId?: string): Promise<SyncOperation> {
    notBuilt('No tasks were synced', 'Syncing tasks to Google Calendar is not built yet.');
    return notBuiltOperation('tasks', 'google_calendar');
  }

  async connectSlack(companyId: string, credentials: any): Promise<boolean> {
    notBuilt('Slack was not connected', 'Connecting Slack from here is not built yet.');
    return false;
  }

  async importContactsFromCRM(companyId: string, projectId: string): Promise<{ success: boolean; contactsImported: number }> {
    notBuilt('No contacts were imported', 'Importing contacts from a CRM is not built yet.');
    return { success: false, contactsImported: 0 };
  }

  async createTaskFromData(data: any): Promise<void> {
    notBuilt('No task was created', 'Creating a task from here is not built yet.');
    throw new Error('createTaskFromData is not built; no task was created.');
  }

  async processCrossModuleOperations(operations: CrossModuleOperation[]): Promise<void> {
    notBuilt('Nothing was processed', `${operations.length} cross-module operation(s) were not run; this is not built yet.`);
    throw new Error('processCrossModuleOperations is not built; nothing was processed.');
  }

  async syncInvoicesFromAccounting(companyId: string): Promise<{ success: boolean; invoicesSynced: number }> {
    notBuilt('No invoices were synced', 'Syncing invoices from an accounting system through this service is not built.');
    return { success: false, invoicesSynced: 0 };
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
    notBuilt('No sync was scheduled', `A ${frequency} data sync is not built yet.`);
    throw new Error('scheduleDataSync is not built; nothing was scheduled.');
  }

  /**
   * Reachable from ContextualActions on CRMDashboard. This toasted "Project
   * created from opportunity" and navigated to /projects/proj-<timestamp>, an
   * id that was never inserted (US-309). The caller only navigates on
   * success, so returning false leaves the user where they were.
   */
  async createProjectFromOpportunity(data: {
    opportunityId: string;
    projectName: string;
    estimatedBudget: number;
    startDate: string;
    projectType: string;
  }): Promise<{ success: boolean; projectId?: string }> {
    notBuilt('No project was created', 'Creating a project from this action is not built yet.');
    return { success: false };
  }

  /** Same shape as above, reachable from ProjectDetail: "Invoice created" over an invented id (US-309). */
  async createInvoiceFromProject(projectId: string): Promise<{ success: boolean; invoiceId?: string }> {
    notBuilt('No invoice was created', 'Creating an invoice from this action is not built yet. Use Invoices to create one.');
    return { success: false };
  }
}

export const integrationService = new IntegrationService();
export default integrationService;