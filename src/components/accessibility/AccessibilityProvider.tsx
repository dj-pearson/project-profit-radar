import React, { createContext, useContext, ReactNode } from 'react';
import { useAccessibility } from '@/hooks/useAccessibility';
import { AccessibilityShortcuts } from './AccessibilityShortcuts';
import { SkipLinks } from './SkipLinks';

type AccessibilityContextType = ReturnType<typeof useAccessibility>;

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined);

export const useAccessibilityContext = () => {
  const context = useContext(AccessibilityContext);
  if (context === undefined) {
    throw new Error('useAccessibilityContext must be used within an AccessibilityProvider');
  }
  return context;
};

interface AccessibilityProviderProps {
  children: ReactNode;
}

export const AccessibilityProvider: React.FC<AccessibilityProviderProps> = ({ children }) => {
  const accessibility = useAccessibility();

  return (
    <AccessibilityContext.Provider value={accessibility}>
      <SkipLinks />
      <AccessibilityShortcuts />
      {children}
    </AccessibilityContext.Provider>
  );
};