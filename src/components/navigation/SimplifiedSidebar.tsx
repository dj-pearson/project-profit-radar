import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
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
import { getNavigationForRole } from './NavigationConfig';

export const SimplifiedSidebar = () => {
  const { state } = useSidebar();
  const location = useLocation();
  const { userProfile } = useAuth();
  const currentPath = location.pathname;

  const getNavClass = ({ isActive }: { isActive: boolean }) =>
    isActive ? "bg-accent text-accent-foreground font-medium" : "hover:bg-accent/50";

  const navigationItems = getNavigationForRole(userProfile?.role || '');

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
                
                return (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild className="h-12">
                      <NavLink to={item.url} className={getNavClass}>
                        <item.icon className="h-5 w-5" />
                        {!collapsed && (
                          <div className="flex flex-col items-start flex-1">
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
                    </SidebarMenuButton>
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