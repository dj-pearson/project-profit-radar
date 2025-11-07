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
import { SubscriptionStatusBadge } from '@/components/subscription/SubscriptionStatusBadge';

// Fix mobile navigation issues in SimplifiedSidebar
// Improved responsive behavior and touch handling
export const SimplifiedSidebar = () => {
  const { state, isMobile } = useSidebar();
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
    if (!area) return [];
    
    const currentUserRole = userProfile?.role || 'admin';
    
    const filteredSections = area.sections.map(section => ({
      ...section,
      items: section.items.filter(item => {
        // Root admin items should only be visible to root_admin
        if (item.roles.length === 1 && item.roles[0] === 'root_admin') {
          return currentUserRole === 'root_admin';
        }
        return true;
      }).map(item => ({
        ...item,
        hasAccess: currentUserRole === 'root_admin' || 
                   item.roles.includes(currentUserRole) ||
                   canAccessRoute(item.url)
      }))
    })).filter(section => section.items.length > 0);
    
    return filteredSections;
  };

  const toggleSection = (sectionId: string) => {
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
  
  // Check if admin section is expanded to use wider sidebar
  const isAdminExpanded = expandedSections.includes('admin');
  // Mobile-responsive width handling
  const getSidebarWidth = () => {
    if (collapsed) return "w-14";
    if (isMobile) return "w-64"; // Consistent width on mobile
    return isAdminExpanded ? "w-72" : "w-60";
  };

  return (
    <Sidebar className={getSidebarWidth()} collapsible="icon">
      <SidebarHeader className="p-2">
        <div className="flex items-center justify-between">
          <SidebarTrigger className="h-8 w-8 p-1 touch-target-44" />
          {!collapsed && (
            <div className="flex items-center space-x-2">
              <ThemeToggle />
            </div>
          )}
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
                const hasSubSections = areaId !== 'overview' && sections.length > 0;
                const isExpanded = expandedSections.includes(areaId);
                
                return (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild className="h-12 touch-target-44">
                      <div 
                        className={`flex items-center w-full cursor-pointer ${getNavClass({ isActive })} touch-target-44`}
                        onClick={(e) => {
                          // Prevent navigation when clicking to expand
                          if (item.title !== 'Dashboard' && hasSubSections && !isMobile) {
                            e.preventDefault();
                            toggleSection(areaId);
                          }
                        }}
                      >
                        <NavLink 
                          to={item.url} 
                          className="flex items-center flex-1 min-w-0 p-2"
                          onClick={(e) => {
                            // On mobile, allow navigation but also expand if needed
                            if (isMobile && hasSubSections && !isExpanded) {
                              toggleSection(areaId);
                            }
                          }}
                        >
                          <item.icon className="h-5 w-5 flex-shrink-0" />
                          {!collapsed && (
                            <div className="flex flex-col items-start flex-1 ml-3 min-w-0">
                              <span className="font-medium text-sm w-full leading-tight">
                                {item.title}
                              </span>
                              {item.description && (
                                <span className="text-xs text-muted-foreground w-full leading-tight">
                                  {item.description}
                                </span>
                              )}
                            </div>
                          )}
                          {item.badge && !collapsed && (
                            <Badge variant="destructive" className="text-xs px-2 py-1 flex-shrink-0 ml-2">
                              {item.badge}
                            </Badge>
                          )}
                        </NavLink>
                        {hasSubSections && !collapsed && (
                          <button
                            className="p-2 touch-target-44"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              toggleSection(areaId);
                            }}
                          >
                            <ChevronRight 
                              className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} 
                            />
                          </button>
                        )}
                      </div>
                    </SidebarMenuButton>
                    
                    {hasSubSections && isExpanded && !collapsed && (
                      <SidebarMenuSub className="space-y-1 pb-2">
                        {sections.map((section) => (
                          <div key={section.id} className="space-y-1">
                            <div className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                              {section.label}
                            </div>
                            {section.items.map((subItem: any) => {
                              const subIsActive = currentPath === subItem.url;
                              const hasAccess = subItem.hasAccess !== false;
                              
                              return (
                                <SidebarMenuSubItem key={subItem.url}>
                                  <SidebarMenuSubButton asChild={hasAccess} className="min-h-[44px] touch-target-44">
                                    {hasAccess ? (
                                      <NavLink 
                                        to={subItem.url} 
                                        className={`${getNavClass({ isActive: subIsActive })} flex items-center w-full px-4 py-3 rounded-md touch-target-44`}
                                      >
                                        <subItem.icon className="h-4 w-4 flex-shrink-0" />
                                        <span className="ml-3 text-sm leading-tight flex-1 min-w-0">
                                          {subItem.title}
                                        </span>
                                        {subItem.badge && (
                                          <Badge variant="destructive" className="text-xs px-2 py-1 ml-2 flex-shrink-0">
                                            {subItem.badge}
                                          </Badge>
                                        )}
                                      </NavLink>
                                    ) : (
                                      <div className="flex items-center opacity-50 cursor-not-allowed px-4 py-3 w-full touch-target-44">
                                        <subItem.icon className="h-4 w-4 flex-shrink-0" />
                                        <span className="ml-3 text-sm leading-tight flex-1 min-w-0">
                                          {subItem.title}
                                        </span>
                                        <Lock className="h-3 w-3 ml-2 flex-shrink-0" />
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
        <div className="flex items-center justify-center">
          <SubscriptionStatusBadge variant={collapsed ? 'compact' : 'full'} showIcon={true} />
        </div>
      </SidebarFooter>
    </Sidebar>
  );
};

