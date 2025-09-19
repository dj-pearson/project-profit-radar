import React from 'react';
import { Button } from "@/components/ui/button";

export const SkipLinks: React.FC = () => {
  const skipToContent = () => {
    const mainContent = document.getElementById('main-content');
    if (mainContent) {
      mainContent.focus();
      mainContent.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const skipToNavigation = () => {
    const navigation = document.getElementById('main-navigation');
    if (navigation) {
      navigation.focus();
      navigation.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const skipToSearch = () => {
    const search = document.getElementById('search');
    if (search) {
      search.focus();
      search.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="sr-only focus-within:not-sr-only">
      <div className="fixed top-0 left-0 z-50 bg-primary text-primary-foreground p-2 space-x-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={skipToContent}
          className="focus:not-sr-only"
        >
          Skip to main content
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={skipToNavigation}
          className="focus:not-sr-only"
        >
          Skip to navigation
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={skipToSearch}
          className="focus:not-sr-only"
        >
          Skip to search
        </Button>
      </div>
    </div>
  );
};