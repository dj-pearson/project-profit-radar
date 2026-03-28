/**
 * Empty States
 * Beautiful empty state components for various scenarios
 * Guides users on what to do when there's no data
 */

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  FolderPlus,
  FileText,
  Users,
  DollarSign,
  Calendar,
  Search,
  Inbox,
  Plus,
  Upload,
  Filter,
  AlertCircle,
  Building,
  ClipboardList,
  Clock,
  Clipboard,
  ArrowRightLeft,
  Shield,
  Wrench,
  Calculator,
  UserPlus
} from 'lucide-react';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
}

// Generic Empty State
export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  secondaryAction
}) => {
  return (
    <Card>
      <CardContent className="pt-12 pb-12 text-center">
        <div className="max-w-md mx-auto">
          {icon && (
            <div className="mx-auto w-16 h-16 mb-6 bg-gray-100 rounded-full flex items-center justify-center">
              {icon}
            </div>
          )}
          <h3 className="text-lg font-semibold mb-2">{title}</h3>
          <p className="text-muted-foreground mb-6">{description}</p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {action && (
              <Button onClick={action.onClick}>
                {action.icon}
                {action.label}
              </Button>
            )}
            {secondaryAction && (
              <Button variant="outline" onClick={secondaryAction.onClick}>
                {secondaryAction.label}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// No Projects
export const NoProjects: React.FC<{ onCreate?: () => void }> = ({ onCreate }) => {
  return (
    <EmptyState
      icon={<FolderPlus className="h-8 w-8 text-gray-400" />}
      title="No projects yet"
      description="Get started by creating your first construction project"
      action={
        onCreate
          ? {
              label: 'Create Project',
              onClick: onCreate,
              icon: <Plus className="h-4 w-4 mr-2" />
            }
          : undefined
      }
      secondaryAction={{
        label: 'Learn More',
        onClick: () => (window.location.href = '/help/projects')
      }}
    />
  );
};

// No Invoices
export const NoInvoices: React.FC<{ onCreate?: () => void }> = ({ onCreate }) => {
  return (
    <EmptyState
      icon={<FileText className="h-8 w-8 text-gray-400" />}
      title="No invoices found"
      description="Create your first invoice to start billing your clients"
      action={
        onCreate
          ? {
              label: 'Create Invoice',
              onClick: onCreate,
              icon: <Plus className="h-4 w-4 mr-2" />
            }
          : undefined
      }
    />
  );
};

// No Team Members
export const NoTeamMembers: React.FC<{ onInvite?: () => void }> = ({ onInvite }) => {
  return (
    <EmptyState
      icon={<Users className="h-8 w-8 text-gray-400" />}
      title="No team members yet"
      description="Invite your team to collaborate on projects"
      action={
        onInvite
          ? {
              label: 'Invite Team',
              onClick: onInvite,
              icon: <Plus className="h-4 w-4 mr-2" />
            }
          : undefined
      }
    />
  );
};

// No Expenses
export const NoExpenses: React.FC<{ onAdd?: () => void }> = ({ onAdd }) => {
  return (
    <EmptyState
      icon={<DollarSign className="h-8 w-8 text-gray-400" />}
      title="No expenses recorded"
      description="Track your project expenses for accurate job costing"
      action={
        onAdd
          ? {
              label: 'Add Expense',
              onClick: onAdd,
              icon: <Plus className="h-4 w-4 mr-2" />
            }
          : undefined
      }
    />
  );
};

// No Events/Calendar
export const NoEvents: React.FC<{ onCreate?: () => void }> = ({ onCreate }) => {
  return (
    <EmptyState
      icon={<Calendar className="h-8 w-8 text-gray-400" />}
      title="No events scheduled"
      description="Add events to your calendar to stay organized"
      action={
        onCreate
          ? {
              label: 'Add Event',
              onClick: onCreate,
              icon: <Plus className="h-4 w-4 mr-2" />
            }
          : undefined
      }
    />
  );
};

// No Search Results
export const NoSearchResults: React.FC<{ query?: string; onClear?: () => void }> = ({
  query,
  onClear
}) => {
  return (
    <EmptyState
      icon={<Search className="h-8 w-8 text-gray-400" />}
      title="No results found"
      description={
        query
          ? `We couldn't find anything matching "${query}". Try a different search term.`
          : 'No results match your search criteria. Try different keywords.'
      }
      action={
        onClear
          ? {
              label: 'Clear Search',
              onClick: onClear
            }
          : undefined
      }
    />
  );
};

// No Documents
export const NoDocuments: React.FC<{ onUpload?: () => void }> = ({ onUpload }) => {
  return (
    <EmptyState
      icon={<Inbox className="h-8 w-8 text-gray-400" />}
      title="No documents yet"
      description="Upload project documents, plans, and photos"
      action={
        onUpload
          ? {
              label: 'Upload Files',
              onClick: onUpload,
              icon: <Upload className="h-4 w-4 mr-2" />
            }
          : undefined
      }
    />
  );
};

// No Filter Results
export const NoFilterResults: React.FC<{ onReset?: () => void }> = ({ onReset }) => {
  return (
    <EmptyState
      icon={<Filter className="h-8 w-8 text-gray-400" />}
      title="No items match your filters"
      description="Try adjusting your filters to see more results"
      action={
        onReset
          ? {
              label: 'Reset Filters',
              onClick: onReset
            }
          : undefined
      }
    />
  );
};

// Error State
export const ErrorState: React.FC<{ onRetry?: () => void }> = ({ onRetry }) => {
  return (
    <EmptyState
      icon={<AlertCircle className="h-8 w-8 text-red-500" />}
      title="Something went wrong"
      description="We encountered an error loading this content. Please try again."
      action={
        onRetry
          ? {
              label: 'Try Again',
              onClick: onRetry
            }
          : undefined
      }
      secondaryAction={{
        label: 'Contact Support',
        onClick: () => (window.location.href = '/help')
      }}
    />
  );
};

// No Leads
export const NoLeads: React.FC<{ onCreate?: () => void }> = ({ onCreate }) => {
  return (
    <EmptyState
      icon={<Building className="h-8 w-8 text-gray-400" />}
      title="No leads in your pipeline"
      description="Start adding leads to track your sales opportunities"
      action={
        onCreate
          ? {
              label: 'Add Lead',
              onClick: onCreate,
              icon: <Plus className="h-4 w-4 mr-2" />
            }
          : undefined
      }
    />
  );
};

// No Tasks
export const NoTasks: React.FC<{ onCreate?: () => void }> = ({ onCreate }) => {
  return (
    <EmptyState
      icon={<ClipboardList className="h-8 w-8 text-gray-400" />}
      title="No tasks yet"
      description="Create tasks to organize your project work"
      action={
        onCreate
          ? {
              label: 'Create Task',
              onClick: onCreate,
              icon: <Plus className="h-4 w-4 mr-2" />
            }
          : undefined
      }
    />
  );
};

// No Estimates
export const NoEstimates: React.FC<{ onCreate?: () => void }> = ({ onCreate }) => {
  return (
    <EmptyState
      icon={<Calculator className="h-8 w-8 text-gray-400" />}
      title="No estimates yet"
      description="Create your first estimate to start bidding on projects"
      action={
        onCreate
          ? {
              label: 'Create Estimate',
              onClick: onCreate,
              icon: <Plus className="h-4 w-4 mr-2" />
            }
          : undefined
      }
    />
  );
};

// No Time Entries
export const NoTimeEntries: React.FC<{ onCreate?: () => void }> = ({ onCreate }) => {
  return (
    <EmptyState
      icon={<Clock className="h-8 w-8 text-gray-400" />}
      title="No time entries"
      description="Start tracking time to monitor labor costs and productivity"
      action={
        onCreate
          ? {
              label: 'Log Time',
              onClick: onCreate,
              icon: <Plus className="h-4 w-4 mr-2" />
            }
          : undefined
      }
    />
  );
};

// No Daily Reports
export const NoDailyReports: React.FC<{ onCreate?: () => void }> = ({ onCreate }) => {
  return (
    <EmptyState
      icon={<Clipboard className="h-8 w-8 text-gray-400" />}
      title="No daily reports"
      description="Create daily reports to track progress, weather, and crew activities"
      action={
        onCreate
          ? {
              label: 'Create Report',
              onClick: onCreate,
              icon: <Plus className="h-4 w-4 mr-2" />
            }
          : undefined
      }
    />
  );
};

// No Change Orders
export const NoChangeOrders: React.FC<{ onCreate?: () => void }> = ({ onCreate }) => {
  return (
    <EmptyState
      icon={<ArrowRightLeft className="h-8 w-8 text-gray-400" />}
      title="No change orders"
      description="Change orders will appear here when scope changes are submitted"
      action={
        onCreate
          ? {
              label: 'Create Change Order',
              onClick: onCreate,
              icon: <Plus className="h-4 w-4 mr-2" />
            }
          : undefined
      }
    />
  );
};

// No Equipment
export const NoEquipment: React.FC<{ onCreate?: () => void }> = ({ onCreate }) => {
  return (
    <EmptyState
      icon={<Wrench className="h-8 w-8 text-gray-400" />}
      title="No equipment tracked"
      description="Add equipment to track assignments, maintenance, and utilization"
      action={
        onCreate
          ? {
              label: 'Add Equipment',
              onClick: onCreate,
              icon: <Plus className="h-4 w-4 mr-2" />
            }
          : undefined
      }
    />
  );
};

// No Safety Incidents
export const NoSafetyIncidents: React.FC<{ onCreate?: () => void }> = ({ onCreate }) => {
  return (
    <EmptyState
      icon={<Shield className="h-8 w-8 text-green-500" />}
      title="No safety incidents"
      description="Great news! No safety incidents have been reported. Keep up the safe work practices."
      action={
        onCreate
          ? {
              label: 'Report Incident',
              onClick: onCreate,
              icon: <Plus className="h-4 w-4 mr-2" />
            }
          : undefined
      }
    />
  );
};

// No Contacts
export const NoContacts: React.FC<{ onCreate?: () => void }> = ({ onCreate }) => {
  return (
    <EmptyState
      icon={<UserPlus className="h-8 w-8 text-gray-400" />}
      title="No contacts yet"
      description="Add contacts to build your client and vendor network"
      action={
        onCreate
          ? {
              label: 'Add Contact',
              onClick: onCreate,
              icon: <Plus className="h-4 w-4 mr-2" />
            }
          : undefined
      }
    />
  );
};

export default EmptyState;
