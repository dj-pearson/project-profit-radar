
import React from 'react';
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
} from '@/components/ui/sidebar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { Zap } from 'lucide-react';
import { hierarchicalNavigation, findSectionByUrl, getNavigationForSection } from './HierarchicalNavigationConfig';

export const HierarchicalSidebar = () => {
  const { state } = useSidebar();
  const location = useLocation();
  const { userProfile } = useAuth();
  const currentPath = location.pathname;

  const getNavClass = ({ isActive }: { isActive: boolean }) =>
    isActive ? "bg-accent text-accent-foreground font-medium" : "hover:bg-accent/50";

  const collapsed = state === 'collapsed';

  // Find current section based on URL
  const currentSectionInfo = findSectionByUrl(currentPath);
  
  // Get navigation items for current section
  const sectionItems = currentSectionInfo 
    ? getNavigationForSection(currentSectionInfo.section.id, userProfile?.role || '')
    : [];

  // Get top-level navigation (areas)
  const topLevelNavigation = hierarchicalNavigation.filter(area => {
    // Check if user has access to any item in any section of this area
    return area.sections.some(section => 
      section.items.some(item => 
        userProfile?.role === 'root_admin' || item.roles.includes(userProfile?.role || '')
      )
    );
  });

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
        {/* Main Areas Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel>{!collapsed && "Main Areas"}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {topLevelNavigation.map((area) => {
                const isCurrentArea = currentSectionInfo?.area.id === area.id;
                
                return (
                  <SidebarMenuItem key={area.id}>
                    <SidebarMenuButton asChild>
                      <NavLink 
                        to={`/${area.id === 'overview' ? 'dashboard' : area.id}`} 
                        className={getNavClass({ isActive: isCurrentArea })}
                      >
                        <area.icon className="h-4 w-4" />
                        {!collapsed && <span>{area.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Current Section Items */}
        {currentSectionInfo && sectionItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>
              {!collapsed && currentSectionInfo.section.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {sectionItems.map((item) => {
                  const isActive = currentPath === item.url;
                  
                  return (
                    <SidebarMenuItem key={item.url}>
                      <SidebarMenuButton asChild>
                        <NavLink to={item.url} className={getNavClass({ isActive })}>
                          <item.icon className="h-4 w-4" />
                          {!collapsed && (
                            <div className="flex items-center justify-between w-full">
                              <span>{item.title}</span>
                              {item.badge && (
                                <Badge variant="destructive" className="text-xs px-1 py-0">
                                  {item.badge}
                                </Badge>
                              )}
                            </div>
                          )}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
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
