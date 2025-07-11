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
import { Zap, ChevronRight } from 'lucide-react';
import { getNavigationForRole } from './NavigationConfig';
import { hierarchicalNavigation, NavigationSection, findSectionByUrl } from './HierarchicalNavigationConfig';

export const SimplifiedSidebar = () => {
  const { state } = useSidebar();
  const location = useLocation();
  const { userProfile } = useAuth();
  const currentPath = location.pathname;
  const [expandedSections, setExpandedSections] = useState<string[]>([]);

  const getNavClass = ({ isActive }: { isActive: boolean }) =>
    isActive ? "bg-accent text-accent-foreground font-medium" : "hover:bg-accent/50";

  const navigationItems = getNavigationForRole(userProfile?.role || '');
  
  // Get main areas with their sections - always show hierarchical navigation
  const getAreaSections = (areaId: string): NavigationSection[] => {
    const area = hierarchicalNavigation.find(a => a.id === areaId);
    if (!area) return [];
    
    return area.sections.map(section => ({
      ...section,
      items: section.items.filter(item => 
        userProfile?.role === 'root_admin' || item.roles.includes(userProfile?.role || '')
      )
    })).filter(section => section.items.length > 0);
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
  }, [currentPath, expandedSections]);

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
                
                // Find if this is a main area that has sub-sections
                let areaId = '';
                if (item.url === '/dashboard') areaId = 'overview';
                else if (item.url.includes('/projects')) areaId = 'projects';
                else if (item.url.includes('/financial')) areaId = 'financial';
                else if (item.url.includes('/people')) areaId = 'people';
                else if (item.url.includes('/operations')) areaId = 'operations';
                else if (item.url.includes('/admin')) areaId = 'admin';
                
                const sections = getAreaSections(areaId);
                const hasSubSections = sections.length > 0;
                const isExpanded = expandedSections.includes(areaId);
                
                return (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild className="h-12">
                      <div className={`flex items-center w-full ${getNavClass({ isActive })}`}>
                        <NavLink to={item.url} className="flex items-center flex-1">
                          <item.icon className="h-5 w-5" />
                          {!collapsed && (
                            <div className="flex flex-col items-start flex-1 ml-2">
                              <span className="font-medium">{item.title}</span>
                              {item.description && (
                                <span className="text-xs text-muted-foreground truncate">
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
                        {hasSubSections && !collapsed && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="p-1 h-auto"
                            onClick={() => toggleSection(areaId)}
                          >
                            <ChevronRight 
                              className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} 
                            />
                          </Button>
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
                            {section.items.map((subItem) => {
                              const subIsActive = currentPath === subItem.url;
                              return (
                                <SidebarMenuSubItem key={subItem.url}>
                                  <SidebarMenuSubButton asChild>
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
