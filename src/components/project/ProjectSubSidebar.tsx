import React from 'react';
import { cn } from '@/lib/utils';
import { 
  BarChart3, 
  Package, 
  TrendingUp, 
  FileText, 
  DollarSign, 
  HelpCircle, 
  Send, 
  FileX, 
  CheckSquare, 
  Hammer, 
  Shield, 
  Clock, 
  Users, 
  Receipt,
  ListTodo,
  FolderOpen,
  Home
} from 'lucide-react';

interface ProjectSubSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const navigationItems = [
  { id: 'overview', label: 'Overview', icon: Home },
  { id: 'materials', label: 'Materials', icon: Package },
  { id: 'progress', label: 'Progress', icon: TrendingUp },
  { id: 'dailyreports', label: 'Daily Reports', icon: FileText },
  { id: 'jobcosting', label: 'Job Costing', icon: DollarSign },
  { id: 'rfis', label: "RFI's", icon: HelpCircle },
  { id: 'submittals', label: 'Submittals', icon: Send },
  { id: 'changeorders', label: 'Change Orders', icon: FileX },
  { id: 'punchlist', label: 'Punch List', icon: CheckSquare },
  { id: 'equipment', label: 'Equipment', icon: Hammer },
  { id: 'permits', label: 'Permits', icon: Shield },
  { id: 'warranties', label: 'Warranties', icon: Clock },
  { id: 'contacts', label: 'Contacts', icon: Users },
  { id: 'invoicing', label: 'Invoicing', icon: Receipt },
  { id: 'tasks', label: 'Tasks', icon: ListTodo },
  { id: 'documents', label: 'Documents', icon: FolderOpen },
];

export const ProjectSubSidebar: React.FC<ProjectSubSidebarProps> = ({
  activeTab,
  onTabChange,
}) => {
  return (
    <div className="w-64 bg-card/50 border-r border-border h-full overflow-y-auto">
      <div className="p-4">
        <h3 className="text-sm font-semibold text-muted-foreground mb-4 uppercase tracking-wide">
          Project Sections
        </h3>
        <nav className="space-y-1">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200",
                  "hover:bg-accent/50 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                  isActive 
                    ? "bg-primary text-primary-foreground shadow-sm" 
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon 
                  className={cn(
                    "h-4 w-4 flex-shrink-0",
                    isActive ? "text-primary-foreground" : "text-muted-foreground"
                  )} 
                />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
};