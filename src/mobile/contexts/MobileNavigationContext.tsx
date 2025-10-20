import React, { createContext, useContext, useState, useCallback } from 'react';
import { router } from 'expo-router';

interface NavigationState {
  currentRoute: string;
  previousRoute: string | null;
  canGoBack: boolean;
}

interface MobileNavigationContextType {
  navigationState: NavigationState;
  navigate: (route: string) => void;
  goBack: () => void;
  replace: (route: string) => void;
  push: (route: string) => void;
  setCurrentRoute: (route: string) => void;
}

const MobileNavigationContext = createContext<MobileNavigationContextType | undefined>(undefined);

export const useMobileNavigation = () => {
  const context = useContext(MobileNavigationContext);
  if (!context) {
    throw new Error('useMobileNavigation must be used within a MobileNavigationProvider');
  }
  return context;
};

interface MobileNavigationProviderProps {
  children: React.ReactNode;
}

export const MobileNavigationProvider: React.FC<MobileNavigationProviderProps> = ({ children }) => {
  const [navigationState, setNavigationState] = useState<NavigationState>({
    currentRoute: '/',
    previousRoute: null,
    canGoBack: false,
  });

  const setCurrentRoute = useCallback((route: string) => {
    setNavigationState(prev => ({
      currentRoute: route,
      previousRoute: prev.currentRoute,
      canGoBack: prev.currentRoute !== '/',
    }));
  }, []);

  const navigate = useCallback((route: string) => {
    router.navigate(route);
    setCurrentRoute(route);
  }, [setCurrentRoute]);

  const goBack = useCallback(() => {
    if (navigationState.canGoBack) {
      router.back();
      setNavigationState(prev => ({
        currentRoute: prev.previousRoute || '/',
        previousRoute: null,
        canGoBack: false,
      }));
    }
  }, [navigationState.canGoBack]);

  const replace = useCallback((route: string) => {
    router.replace(route);
    setCurrentRoute(route);
  }, [setCurrentRoute]);

  const push = useCallback((route: string) => {
    router.push(route);
    setCurrentRoute(route);
  }, [setCurrentRoute]);

  const value: MobileNavigationContextType = {
    navigationState,
    navigate,
    goBack,
    replace,
    push,
    setCurrentRoute,
  };

  return (
    <MobileNavigationContext.Provider value={value}>
      {children}
    </MobileNavigationContext.Provider>
  );
};
