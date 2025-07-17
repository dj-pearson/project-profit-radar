import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
  SidebarHeader,
  SidebarFooter,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
} from '@/components/ui/sidebar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { Zap, ChevronRight, Lock } from 'lucide-react';
import { usePermissions } from '@/hooks/usePermissions';
import { getNavigationForRole } from './NavigationConfig';
import { hierarchicalNavigation, NavigationSection, findSectionByUrl } from './HierarchicalNavigationConfig';

export const SimplifiedSidebar = () => {
  const { state } = useSidebar();
  const location = useLocation();
  const { userProfile } = useAuth();
  const { canAccessRoute } = usePermissions();
  const currentPath = location.pathname;
  const [expandedSections, setExpandedSections] = useState<string[]>([]);

  const getNavClass = ({ isActive }: { isActive: boolean }) =>
    isActive ? "bg-accent text-accent-foreground font-medium" : "hover:bg-accent/50";

  const navigationItems = getNavigationForRole(userProfile?.role || '');
  
  // Get main areas with their sections - filter out sensitive admin functions
  const getAreaSections = (areaId: string): NavigationSection[] => {
    const area = hierarchicalNavigation.find(a => a.id === areaId);
    if (!area) {
      console.log(`No area found for areaId: ${areaId}`);
      return [];
    }
    
    const currentUserRole = userProfile?.role || 'admin';
    
    const filteredSections = area.sections.map(section => ({
      ...section,
      items: section.items.filter(item => {
        // Root admin items should only be visible to root_admin
        if (item.roles.length === 1 && item.roles[0] === 'root_admin') {
          return currentUserRole === 'root_admin';
        }
        // For other items, show them (may be locked later)
        return true;
      }).map(item => ({
        ...item,
        hasAccess: currentUserRole === 'root_admin' || 
                   item.roles.includes(currentUserRole) ||
                   canAccessRoute(item.url)
      }))
    })).filter(section => section.items.length > 0); // Remove empty sections
    
    console.log(`Area ${areaId} has ${filteredSections.length} sections for role ${currentUserRole}:`, filteredSections);
    return filteredSections;
  };

  const toggleSection = (sectionId: string) => {
    console.log(`Toggling section: ${sectionId}`);
    setExpandedSections(prev => 
      prev.includes(sectionId) 
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  // Auto-expand the section that contains the current page
  React.useEffect(() => {
    const foundSection = findSectionByUrl(currentPath);
    if (foundSection) {
      const areaId = foundSection.area.id;
      if (!expandedSections.includes(areaId)) {
        setExpandedSections(prev => [...prev, areaId]);
      }
    }
  }, [currentPath]);

  const collapsed = state === 'collapsed';

  return (
    <Sidebar className={collapsed ? "w-14" : "w-60"} collapsible="icon">
      <SidebarHeader className="p-2">
        <div className="flex items-center justify-between">
          <SidebarTrigger />
          <div className="flex items-center space-x-2">
            <ThemeToggle />
          </div>
        </div>
      </SidebarHeader>
      
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => {
                const isActive = currentPath === item.url || 
                  (item.url !== '/dashboard' && currentPath.startsWith(item.url));
                
                // Improved area ID determination with more specific matching
                let areaId = '';
                if (item.url === '/dashboard') {
                  areaId = 'overview';
                } else if (item.url === '/projects-hub' || item.url.includes('/projects')) {
                  areaId = 'projects';
                } else if (item.url === '/financial-hub' || item.url.includes('/financial')) {
                  areaId = 'financial';
                } else if (item.url === '/people-hub' || item.url.includes('/people-hub') || item.url.includes('/people') || item.url.includes('/crm') || item.url.includes('/team')) {
                  areaId = 'people';
                } else if (item.url === '/operations-hub' || item.url.includes('/operations-hub') || item.url.includes('/operations') || item.url.includes('/safety') || item.url.includes('/permit') || item.url.includes('/bond') || item.url.includes('/warranty') || item.url.includes('/compliance')) {
                  areaId = 'operations';
                } else if (item.url === '/admin-hub' || item.url.includes('/admin')) {
                  areaId = 'admin';
                }
                
                const sections = getAreaSections(areaId);
                
                // Dashboard should not have dropdown (only has 1 section with 1 item)
                // Other areas should have dropdown if they have content
                const hasSubSections = areaId !== 'overview' && sections.length > 0;
                const isExpanded = expandedSections.includes(areaId);
                
                // Force dropdown for all non-dashboard items temporarily for debugging
                const forceDropdown = item.title !== 'Dashboard' && !collapsed;
                
                
                
                return (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild className="h-12">
                      <div 
                        className={`flex items-center w-full cursor-pointer ${getNavClass({ isActive })}`}
                        onClick={() => {
                          // Auto-expand sections when clicking hub pages (except Dashboard)
                          if (item.title !== 'Dashboard' && hasSubSections) {
                            toggleSection(areaId);
                          }
                        }}
                      >
                        <NavLink 
                          to={item.url} 
                          className="flex items-center flex-1"
                        >
                          <item.icon className="h-5 w-5" />
                          {!collapsed && (
                            <div className="flex flex-col items-start flex-1 ml-2 min-w-0">
                              <span className="font-medium text-sm truncate w-full">{item.title}</span>
                              {item.description && (
                                <span className="text-xs text-muted-foreground truncate w-full max-w-[140px]">
                                  {item.description}
                                </span>
                              )}
                            </div>
                          )}
                          {item.badge && !collapsed && (
                            <Badge variant="destructive" className="text-xs px-1 py-0">
                              {item.badge}
                            </Badge>
                          )}
                        </NavLink>
                        {forceDropdown && (
                          <ChevronRight 
                            className={`h-4 w-4 transition-transform ml-auto flex-shrink-0 ${isExpanded ? 'rotate-90' : ''}`} 
                          />
                        )}
                      </div>
                    </SidebarMenuButton>
                    
                    {hasSubSections && isExpanded && !collapsed && (
                      <SidebarMenuSub>
                        {sections.map((section) => (
                          <div key={section.id}>
                            <div className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                              {section.label}
                            </div>
                            {section.items.map((subItem: any) => {
                              const subIsActive = currentPath === subItem.url;
                              const hasAccess = subItem.hasAccess !== false;
                              
                              return (
                                <SidebarMenuSubItem key={subItem.url}>
                                  <SidebarMenuSubButton asChild={hasAccess}>
                                    {hasAccess ? (
                                      <NavLink 
                                        to={subItem.url} 
                                        className={getNavClass({ isActive: subIsActive })}
                                      >
                                        <subItem.icon className="h-4 w-4" />
                                        <span>{subItem.title}</span>
                                        {subItem.badge && (
                                          <Badge variant="destructive" className="text-xs px-1 py-0 ml-auto">
                                            {subItem.badge}
                                          </Badge>
                                        )}
                                      </NavLink>
                                    ) : (
                                      <div className="flex items-center opacity-50 cursor-not-allowed px-2 py-1">
                                        <subItem.icon className="h-4 w-4" />
                                        <span>{subItem.title}</span>
                                        <Lock className="h-3 w-3 ml-auto" />
                                      </div>
                                    )}
                                  </SidebarMenuSubButton>
                                </SidebarMenuSubItem>
                              );
                            })}
                          </div>
                        ))}
                      </SidebarMenuSub>
                    )}
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      
      <SidebarFooter className="p-4">
        {!collapsed && (
          <div className="space-y-2">
            <NavLink to="/upgrade">
              <Button variant="default" className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70">
                <Zap className="h-4 w-4 mr-2" />
                Upgrade Plan
              </Button>
            </NavLink>
          </div>
        )}
        {collapsed && (
          <NavLink to="/upgrade">
            <Button variant="default" size="icon" className="w-full">
              <Zap className="h-4 w-4" />
            </Button>
          </NavLink>
        )}
      </SidebarFooter>
    </Sidebar>
  );
};

