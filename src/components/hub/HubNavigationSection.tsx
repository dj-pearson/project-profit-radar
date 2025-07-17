import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Lock } from 'lucide-react';
import { NavigationItem } from '@/components/navigation/HierarchicalNavigationConfig';

interface HubNavigationSectionProps {
  label: string;
  items: NavigationItem[];
}

export const HubNavigationSection: React.FC<HubNavigationSectionProps> = ({ label, items }) => {
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const { canAccessRoute } = usePermissions();

  const currentUserRole = userProfile?.role || '';

  const getItemAccess = (item: NavigationItem) => {
    return currentUserRole === 'root_admin' || 
           item.roles.includes(currentUserRole) ||
           canAccessRoute(item.url);
  };

  const getItemDescription = (item: NavigationItem): string => {
    const descriptions: Record<string, string> = {
      "All Projects": "View and manage all construction projects",
      "Create Project": "Start a new construction project",
      "Job Costing": "Track project costs and budgets",
      "Daily Reports": "Daily progress and activity reports",
      "RFIs": "Request for Information management",
      "Submittals": "Submit and track approval workflows",
      "Change Orders": "Manage project change requests",
      "Punch List": "Track quality issues and completion items",
      "Document Management": "Store and organize project documents",
      "Materials": "Track material usage and inventory",
      "Material Tracking": "Monitor material deliveries and usage",
      "Equipment": "Manage equipment tracking and usage",
      "Financial Dashboard": "Overview of financial performance",
      "Estimates": "Create and manage project estimates",
      "Reports & Analytics": "Financial reports and business intelligence",
      "Purchase Orders": "Create and track purchase orders",
      "Vendors": "Manage vendor relationships and contacts",
      "QuickBooks Routing": "Sync data with QuickBooks",
      "Team Management": "Manage team members and roles",
      "Crew Scheduling": "Schedule crew assignments",
      "Time Tracking": "Track employee hours and project time",
      "CRM Dashboard": "Customer relationship management overview",
      "Leads": "Manage potential customers and prospects",
      "Contacts": "Organize customer and vendor contacts",
      "Opportunities": "Track sales opportunities and deals",
      "Email Marketing": "Create and send marketing campaigns",
      "Support": "Customer support and help desk",
      "Safety Management": "Safety protocols and incident tracking",
      "Compliance Audit": "Regulatory compliance monitoring",
      "GDPR Compliance": "Data protection and privacy compliance",
      "Permit Management": "Track permits and regulatory approvals",
      "Environmental Permits": "Environmental compliance and permits",
      "Bond & Insurance": "Insurance and bonding management",
      "Warranty Management": "Track warranties and service agreements",
      "Public Procurement": "Government contract management",
      "Service Dispatch": "Service call scheduling and dispatch",
      "Calendar Integration": "Sync with external calendar systems",
      "Equipment Management": "Equipment maintenance and tracking",
      "Automated Workflows": "Process automation and workflows",
      "Knowledge Base": "Documentation and help articles",
      "Companies": "Manage company accounts",
      "Users": "User account management",
      "System Settings": "Platform configuration",
      "Billing": "Subscription and billing management",
      "Complimentary Subscriptions": "Manage free subscriptions",
      "Promotions": "Marketing promotions and campaigns",
      "Blog Manager": "Content management system",
      "Knowledge Base Admin": "Admin tools for help content",
      "SEO Analytics": "Search engine optimization metrics",
      "SEO Manager": "SEO content management",
      "Analytics": "Platform usage analytics",
      "Support Tickets": "Customer support ticket system",
      "Customer Service": "Customer service management",
      "Security Monitoring": "Security and threat monitoring",
      "Rate Limiting": "API rate limiting configuration",
      "My Tasks": "Personal task management dashboard"
    };
    
    return item.description || descriptions[item.title] || 'Access this feature';
  };

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">{label}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {items.map((item) => {
          const hasAccess = getItemAccess(item);
          return (
            <Card 
              key={item.url} 
              className={`transition-all duration-200 ${
                hasAccess 
                  ? "hover:shadow-md cursor-pointer group hover:border-primary/50" 
                  : "opacity-60 cursor-not-allowed border-dashed"
              }`}
              onClick={() => hasAccess && navigate(item.url)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <item.icon className={`h-5 w-5 ${hasAccess ? 'text-primary' : 'text-muted-foreground'}`} />
                    <CardTitle className="text-base">{item.title}</CardTitle>
                  </div>
                  <div className="flex items-center space-x-1">
                    {item.badge && (
                      <Badge variant="destructive" className="text-xs px-1 py-0">
                        {item.badge}
                      </Badge>
                    )}
                    {hasAccess ? (
                      <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                    ) : (
                      <Lock className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <CardDescription className="text-sm">
                  {getItemDescription(item)}
                </CardDescription>
                {!hasAccess && (
                  <div className="mt-2">
                    <Badge variant="outline" className="text-xs">
                      Access Restricted
                    </Badge>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};