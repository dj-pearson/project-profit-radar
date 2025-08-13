import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  href?: string;
  isActive?: boolean;
}

export const Breadcrumb: React.FC = () => {
  const location = useLocation();
  
  const getBreadcrumbItems = (pathname: string): BreadcrumbItem[] => {
    const items: BreadcrumbItem[] = [
      { label: 'Home', href: '/dashboard' }
    ];
    
    // Map common paths to readable labels
    if (pathname.startsWith('/crm')) {
      items.push({ label: 'CRM', href: '/crm' });
      
      if (pathname === '/crm/leads') {
        items.push({ label: 'Leads', isActive: true });
      } else if (pathname === '/crm/opportunities') {
        items.push({ label: 'Opportunities', isActive: true });
      } else if (pathname === '/crm/contacts') {
        items.push({ label: 'Contacts', isActive: true });
      } else if (pathname === '/crm/pipeline') {
        items.push({ label: 'Pipeline', isActive: true });
      }
    } else if (pathname.startsWith('/projects')) {
      items.push({ label: 'Projects', href: '/projects' });
      
      if (pathname === '/create-project') {
        items.push({ label: 'Create Project', isActive: true });
      } else if (pathname.match(/\/projects\/[^/]+$/)) {
        items.push({ label: 'Project Details', isActive: true });
      }
    } else if (pathname === '/estimates') {
      items.push({ label: 'Estimates', isActive: true });
    } else if (pathname.startsWith('/financial')) {
      items.push({ label: 'Financial', href: '/financial' });
    } else if (pathname.startsWith('/team')) {
      items.push({ label: 'Team Management', isActive: true });
    }
    
    return items;
  };
  
  const breadcrumbItems = getBreadcrumbItems(location.pathname);
  
  // Don't show breadcrumb for dashboard root
  if (breadcrumbItems.length <= 1) {
    return null;
  }
  
  return (
    <nav className="flex items-center space-x-1 text-sm text-muted-foreground mb-4">
      {breadcrumbItems.map((item, index) => (
        <React.Fragment key={index}>
          {index > 0 && (
            <ChevronRight className="h-4 w-4 mx-1" />
          )}
          {item.href && !item.isActive ? (
            <Link 
              to={item.href} 
              className="hover:text-foreground transition-colors flex items-center"
            >
              {index === 0 && <Home className="h-4 w-4 mr-1" />}
              {item.label}
            </Link>
          ) : (
            <span className={`flex items-center ${item.isActive ? 'text-foreground font-medium' : ''}`}>
              {index === 0 && <Home className="h-4 w-4 mr-1" />}
              {item.label}
            </span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
};