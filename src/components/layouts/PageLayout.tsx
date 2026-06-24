import React from 'react';

interface PageLayoutProps {
  children: React.ReactNode;
}

export const PageLayout: React.FC<PageLayoutProps> = ({ children }) => {
  return (
    <main className="container mx-auto px-4 py-6">
      {children}
    </main>
  );
};

export default PageLayout;