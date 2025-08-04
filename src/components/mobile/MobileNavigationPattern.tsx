import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { 
  Menu, 
  Home, 
  FolderOpen, 
  Users, 
  Calendar, 
  Settings,
  Bell,
  Search,
  Plus,
  ArrowLeft,
  MoreVertical
} from 'lucide-react';
import { useTouchGestures } from '@/hooks/useTouchGestures';
import { useRef } from 'react';

interface MobileNavItem {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
  badge?: number;
  href?: string;
}

const navItems: MobileNavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: Home },
  { id: 'projects', label: 'Projects', icon: FolderOpen, badge: 3 },
  { id: 'team', label: 'Team', icon: Users },
  { id: 'schedule', label: 'Schedule', icon: Calendar, badge: 1 },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export const MobileNavigationPattern = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [navigationHistory, setNavigationHistory] = useState(['dashboard']);
  const navRef = useRef<HTMLDivElement>(null);

  // Enable swipe gestures for navigation
  useTouchGestures(navRef, {
    onSwipe: (gesture) => {
      if (gesture.direction === 'right' && !isDrawerOpen) {
        setIsDrawerOpen(true);
      } else if (gesture.direction === 'left' && isDrawerOpen) {
        setIsDrawerOpen(false);
      }
    }
  });

  const navigateTo = (tabId: string) => {
    if (tabId !== activeTab) {
      setActiveTab(tabId);
      setNavigationHistory(prev => [...prev, tabId]);
    }
  };

  const goBack = () => {
    if (navigationHistory.length > 1) {
      const newHistory = navigationHistory.slice(0, -1);
      const previousTab = newHistory[newHistory.length - 1];
      setNavigationHistory(newHistory);
      setActiveTab(previousTab);
    }
  };

  const canGoBack = navigationHistory.length > 1;

  return (
    <div className="space-y-6">
      {/* Mobile Top Bar */}
      <div className="bg-card border rounded-lg overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-3">
            {canGoBack && (
              <Button 
                onClick={goBack}
                variant="ghost" 
                size="sm"
                className="p-2"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
            )}
            
            <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm" className="p-2">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-0">
                <div className="p-6">
                  <h2 className="text-lg font-semibold mb-4">BuildDesk</h2>
                  <nav className="space-y-2">
                    {navItems.map((item) => (
                      <Button
                        key={item.id}
                        variant={activeTab === item.id ? "default" : "ghost"}
                        className="w-full justify-start"
                        onClick={() => {
                          navigateTo(item.id);
                          setIsDrawerOpen(false);
                        }}
                      >
                        <item.icon className="w-4 h-4 mr-3" />
                        {item.label}
                        {item.badge && (
                          <Badge variant="secondary" className="ml-auto">
                            {item.badge}
                          </Badge>
                        )}
                      </Button>
                    ))}
                  </nav>
                </div>
              </SheetContent>
            </Sheet>
            
            <h1 className="font-semibold capitalize">{activeTab}</h1>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="p-2">
              <Search className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" className="p-2 relative">
              <Bell className="w-4 h-4" />
              <Badge 
                variant="destructive" 
                className="absolute -top-1 -right-1 w-5 h-5 p-0 flex items-center justify-center text-xs"
              >
                2
              </Badge>
            </Button>
            <Button variant="ghost" size="sm" className="p-2">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Content Area */}
        <div ref={navRef} className="p-4 h-64 bg-muted/20">
          <div className="text-center pt-16">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              {(() => {
                const activeItem = navItems.find(item => item.id === activeTab);
                const IconComponent = activeItem?.icon;
                return IconComponent ? <IconComponent className="w-8 h-8 text-primary" /> : null;
              })()}
            </div>
            <h3 className="text-lg font-semibold capitalize mb-2">{activeTab} Page</h3>
            <p className="text-sm text-muted-foreground">
              Swipe from left edge to open menu
            </p>
          </div>
        </div>
      </div>

      {/* Bottom Tab Navigation */}
      <div className="bg-card border rounded-lg overflow-hidden">
        <div className="flex items-center border-b px-4 py-2">
          <h3 className="font-semibold">Bottom Tab Navigation</h3>
        </div>
        
        <div className="p-4 h-48 bg-muted/20 flex items-center justify-center">
          <div className="text-center">
            <h3 className="text-lg font-semibold capitalize mb-2">{activeTab}</h3>
            <p className="text-sm text-muted-foreground">Content for {activeTab}</p>
          </div>
        </div>

        {/* Bottom Tabs */}
        <div className="flex border-t bg-background">
          {navItems.slice(0, 5).map((item) => (
            <Button
              key={item.id}
              variant="ghost"
              className={`
                flex-1 flex-col h-16 gap-1 rounded-none relative
                ${activeTab === item.id ? 'text-primary bg-primary/5' : 'text-muted-foreground'}
              `}
              onClick={() => navigateTo(item.id)}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-xs">{item.label}</span>
              {item.badge && (
                <Badge 
                  variant="destructive" 
                  className="absolute top-2 right-2 w-4 h-4 p-0 flex items-center justify-center text-xs"
                >
                  {item.badge}
                </Badge>
              )}
            </Button>
          ))}
        </div>
      </div>

      {/* Floating Action Button */}
      <div className="bg-card border rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Floating Action Button</h3>
        </div>
        
        <div className="relative h-32 bg-muted/20 rounded-lg overflow-hidden">
          <Button
            size="lg"
            className="absolute bottom-4 right-4 w-14 h-14 rounded-full shadow-lg"
          >
            <Plus className="w-6 h-6" />
          </Button>
          
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-sm text-muted-foreground">Main content area</p>
          </div>
        </div>
      </div>

      {/* Navigation Stats */}
      <div className="bg-card border rounded-lg p-4">
        <h3 className="font-semibold mb-3">Navigation History</h3>
        <div className="flex gap-2 flex-wrap">
          {navigationHistory.map((tab, index) => (
            <Badge 
              key={`${tab}-${index}`} 
              variant={index === navigationHistory.length - 1 ? "default" : "outline"}
              className="capitalize"
            >
              {tab}
            </Badge>
          ))}
        </div>
        {canGoBack && (
          <Button onClick={goBack} variant="outline" size="sm" className="mt-3">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
        )}
      </div>
    </div>
  );
};