import React from 'react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  Home,
  Calculator,
  MessageSquare
} from 'lucide-react';

interface ProjectSubSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const navigationSections = [
  {
    title: 'Overview',
    items: [
      { id: 'overview', label: 'Overview', icon: Home },
    ]
  },
  {
    title: 'Project Management',
    items: [
      { id: 'progress', label: 'Progress', icon: TrendingUp },
      { id: 'tasks', label: 'Tasks', icon: ListTodo },
      { id: 'dailyreports', label: 'Daily Reports', icon: FileText },
    ]
  },
  {
    title: 'Resources',
    items: [
      { id: 'materials', label: 'Materials', icon: Package },
      { id: 'equipment', label: 'Equipment', icon: Hammer },
    ]
  },
  {
    title: 'Financial',
    items: [
      { id: 'estimates', label: 'Estimates', icon: Calculator },
      { id: 'jobcosting', label: 'Job Costing', icon: DollarSign },
      { id: 'invoicing', label: 'Invoicing', icon: Receipt },
      { id: 'changeorders', label: 'Change Orders', icon: FileX },
    ]
  },
  {
    title: 'Communications',
    items: [
      { id: 'communication', label: 'Messages', icon: MessageSquare },
      { id: 'rfis', label: "RFI's", icon: HelpCircle },
      { id: 'submittals', label: 'Submittals', icon: Send },
      { id: 'contacts', label: 'Contacts', icon: Users },
    ]
  },
  {
    title: 'Compliance & Legal',
    items: [
      { id: 'permits', label: 'Permits', icon: Shield },
      { id: 'warranties', label: 'Warranties', icon: Clock },
      { id: 'punchlist', label: 'Punch List', icon: CheckSquare },
    ]
  },
  {
    title: 'Documentation',
    items: [
      { id: 'documents', label: 'Documents', icon: FolderOpen },
    ]
  },
];

export const ProjectSubSidebar: React.FC<ProjectSubSidebarProps> = ({
  activeTab,
  onTabChange,
}) => {
  return (
    <div className="w-full md:w-64 bg-card/50 md:border-r border-border h-full flex flex-col">
      {/* Desktop header - hidden on mobile */}
      <div className="p-4 pb-2 flex-shrink-0 hidden md:block">
        <h3 className="text-sm font-semibold text-muted-foreground mb-4 uppercase tracking-wide">
          Project Sections
        </h3>
      </div>
      
      <ScrollArea className="flex-1 px-3 md:px-4">
        <nav className="space-y-4 pb-4 pt-2">
          {navigationSections.map((section, sectionIndex) => (
            <div key={section.title}>
              {sectionIndex > 0 && (
                <h4 className="text-xs font-semibold text-muted-foreground/70 mb-2 uppercase tracking-wide px-1">
                  {section.title}
                </h4>
              )}
              <div className="space-y-1">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  
                  return (
                    <button
                      key={item.id}
                      onClick={() => onTabChange(item.id)}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-3 md:py-2.5 text-sm font-medium rounded-lg transition-all duration-200",
                        "hover:bg-accent/50 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                        "active:scale-[0.98]", // Mobile tap feedback
                        isActive 
                          ? "bg-primary text-primary-foreground shadow-sm" 
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <Icon 
                        className={cn(
                          "h-5 w-5 md:h-4 md:w-4 flex-shrink-0",
                          isActive ? "text-primary-foreground" : "text-muted-foreground"
                        )} 
                      />
                      <span className="truncate text-base md:text-sm">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </ScrollArea>
    </div>
  );
};