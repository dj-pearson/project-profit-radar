import { createContext, useContext, useState, ReactNode } from 'react';

interface NavigationState {
  currentTab: string;
  previousTab: string | null;
  tabHistory: string[];
}

interface NavigationContextType {
  state: NavigationState;
  setCurrentTab: (tab: string) => void;
  goToPreviousTab: () => void;
  clearHistory: () => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export function NavigationProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<NavigationState>({
    currentTab: 'dashboard',
    previousTab: null,
    tabHistory: ['dashboard'],
  });

  const setCurrentTab = (tab: string) => {
    setState((prev) => ({
      currentTab: tab,
      previousTab: prev.currentTab,
      tabHistory: [...prev.tabHistory, tab],
    }));
  };

  const goToPreviousTab = () => {
    if (state.previousTab) {
      setState((prev) => {
        const newHistory = prev.tabHistory.slice(0, -1);
        return {
          currentTab: prev.previousTab || 'dashboard',
          previousTab: newHistory[newHistory.length - 2] || null,
          tabHistory: newHistory,
        };
      });
    }
  };

  const clearHistory = () => {
    setState({
      currentTab: 'dashboard',
      previousTab: null,
      tabHistory: ['dashboard'],
    });
  };

  return (
    <NavigationContext.Provider value={{ state, setCurrentTab, goToPreviousTab, clearHistory }}>
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigation() {
  const context = useContext(NavigationContext);
  if (context === undefined) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
}
