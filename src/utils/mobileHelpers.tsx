/**
 * Mobile Responsiveness Utilities
 * 
 * Common patterns and utilities for ensuring consistent mobile-first responsive design
 * across all dashboard pages based on the fixes applied to PermitManagement.tsx
 */

import { cn } from "@/lib/utils";

/**
 * Standard responsive grid classes for different use cases
 */
export const mobileGridClasses = {
  // Stats cards: 2 on mobile, 4 on large screens
  stats: "grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6",
  
  // Main content: 1 on mobile, 2 on medium, 3 on large
  content: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6",
  
  // Two column layout: 1 on mobile, 2 on medium+
  twoColumn: "grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6",
  
  // Cards with more space on larger screens
  cards: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6"
};

/**
 * Standard responsive filter container classes
 */
export const mobileFilterClasses = {
  // Stack filters vertically on mobile, horizontal on larger screens
  container: "flex flex-col sm:flex-row gap-4 mb-6",
  
  // Input fields that should be full width on mobile
  input: "w-full sm:w-auto",
  
  // Button groups that should stack on mobile
  buttonGroup: "flex flex-col sm:flex-row gap-2"
};

/**
 * Standard responsive button classes
 */
export const mobileButtonClasses = {
  // Primary action button - full width on mobile
  primary: "w-full sm:w-auto",
  
  // Secondary buttons in groups
  secondary: "w-full sm:w-auto text-xs sm:text-sm",
  
  // Icon buttons that should be smaller on mobile
  icon: "h-8 w-8 sm:h-10 sm:w-10"
};

/**
 * Standard responsive card classes
 */
export const mobileCardClasses = {
  // Main card container
  container: "bg-card text-card-foreground rounded-lg border shadow-sm p-4 sm:p-6",
  
  // Card header with proper spacing
  header: "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4",
  
  // Card content that should flow properly
  content: "space-y-4",
  
  // Badge container that wraps properly
  badges: "flex flex-wrap gap-2",
  
  // Individual badge that's smaller on mobile
  badge: "text-xs sm:text-sm"
};

/**
 * Standard responsive text classes
 */
export const mobileTextClasses = {
  // Page title
  title: "text-xl sm:text-2xl lg:text-3xl font-bold",
  
  // Section headers
  header: "text-base sm:text-lg font-semibold",
  
  // Card titles
  cardTitle: "text-sm sm:text-base font-medium",
  
  // Body text
  body: "text-xs sm:text-sm",
  
  // Muted text
  muted: "text-xs sm:text-sm text-muted-foreground"
};

/**
 * Common responsive layout wrapper
 */
export const MobilePageWrapper = ({ 
  children, 
  title, 
  className 
}: { 
  children: React.ReactNode; 
  title: string; 
  className?: string; 
}) => (
  <div className={cn("space-y-6", className)}>
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <h1 className={mobileTextClasses.title}>{title}</h1>
    </div>
    {children}
  </div>
);

/**
 * Common responsive stats grid wrapper
 */
export const MobileStatsGrid = ({ 
  children, 
  className 
}: { 
  children: React.ReactNode; 
  className?: string; 
}) => (
  <div className={cn(mobileGridClasses.stats, className)}>
    {children}
  </div>
);

/**
 * Common responsive filter wrapper
 */
export const MobileFilters = ({ 
  children, 
  className 
}: { 
  children: React.ReactNode; 
  className?: string; 
}) => (
  <div className={cn(mobileFilterClasses.container, className)}>
    {children}
  </div>
);