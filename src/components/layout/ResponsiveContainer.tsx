import React from "react";
import { cn } from "@/lib/utils";

interface ResponsiveContainerProps {
  children: React.ReactNode;
  className?: string;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "7xl" | "full";
  padding?: "none" | "sm" | "md" | "lg";
}

export const ResponsiveContainer: React.FC<ResponsiveContainerProps> = ({
  children,
  className,
  maxWidth = "7xl",
  padding = "md"
}) => {
  const maxWidthClasses = {
    sm: "max-w-sm",
    md: "max-w-md", 
    lg: "max-w-lg",
    xl: "max-w-xl",
    "2xl": "max-w-2xl",
    "7xl": "max-w-7xl",
    full: "max-w-full"
  };

  const paddingClasses = {
    none: "",
    sm: "px-2 sm:px-4",
    md: "px-4 sm:px-6 lg:px-8", 
    lg: "px-6 sm:px-8 lg:px-12"
  };

  return (
    <div className={cn(
      "mx-auto w-full",
      maxWidthClasses[maxWidth],
      paddingClasses[padding],
      className
    )}>
      {children}
    </div>
  );
};

// Mobile-first responsive grid
export const ResponsiveGrid: React.FC<{
  children: React.ReactNode;
  cols?: {
    default?: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
  };
  gap?: "sm" | "md" | "lg";
  className?: string;
}> = ({ 
  children, 
  cols = { default: 1, md: 2, lg: 3 }, 
  gap = "md",
  className 
}) => {
  const gapClasses = {
    sm: "gap-2 sm:gap-3",
    md: "gap-4 sm:gap-6", 
    lg: "gap-6 sm:gap-8"
  };

  const gridCols = Object.entries(cols)
    .map(([breakpoint, colCount]) => {
      if (breakpoint === 'default') return `grid-cols-${colCount}`;
      return `${breakpoint}:grid-cols-${colCount}`;
    })
    .join(' ');

  return (
    <div className={cn(
      "grid",
      gridCols,
      gapClasses[gap],
      className
    )}>
      {children}
    </div>
  );
};

// Responsive layout wrapper
export const ResponsiveLayout: React.FC<{
  children: React.ReactNode;
  sidebar?: React.ReactNode;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  sidebarPosition?: "left" | "right";
  className?: string;
}> = ({ 
  children, 
  sidebar, 
  header, 
  footer, 
  sidebarPosition = "left",
  className 
}) => {
  return (
    <div className={cn("min-h-screen flex flex-col", className)}>
      {header && (
        <header className="shrink-0">
          {header}
        </header>
      )}
      
      <div className="flex-1 flex flex-col lg:flex-row">
        {sidebar && sidebarPosition === "left" && (
          <aside className="lg:w-64 lg:shrink-0 order-2 lg:order-1">
            {sidebar}
          </aside>
        )}
        
        <main className="flex-1 order-1 lg:order-2">
          {children}
        </main>
        
        {sidebar && sidebarPosition === "right" && (
          <aside className="lg:w-64 lg:shrink-0 order-3">
            {sidebar}
          </aside>
        )}
      </div>
      
      {footer && (
        <footer className="shrink-0">
          {footer}
        </footer>
      )}
    </div>
  );
};