import type { NavigationArea, NavigationItem, NavigationSection } from "./hierarchical-navigation/types";
import { overviewArea } from "./hierarchical-navigation/overview";
import { projectsArea } from "./hierarchical-navigation/projects";
import { peopleArea } from "./hierarchical-navigation/people";
import { financialArea } from "./hierarchical-navigation/financial";
import { operationsArea } from "./hierarchical-navigation/operations";
import { adminArea } from "./hierarchical-navigation/admin";

export type { NavigationArea, NavigationItem, NavigationSection };

// Each area lives in its own module under ./hierarchical-navigation/ (US-267);
// the order here is the order the sidebar renders them in.
export const hierarchicalNavigation: NavigationArea[] = [
  overviewArea,
  projectsArea,
  peopleArea,
  financialArea,
  operationsArea,
  adminArea,
];

// Helper function to find which section a URL belongs to
export const findSectionByUrl = (
  url: string
): { area: NavigationArea; section: NavigationSection } | null => {
  for (const area of hierarchicalNavigation) {
    for (const section of area.sections) {
      const foundItem = section.items.find((item) => item.url === url);
      if (foundItem) {
        return { area, section };
      }
    }
  }
  return null;
};

// Helper function to get navigation items for a user role within a specific section
export const getNavigationForSection = (
  sectionId: string,
  userRole: string
): NavigationItem[] => {
  for (const area of hierarchicalNavigation) {
    const section = area.sections.find((s) => s.id === sectionId);
    if (section) {
      return section.items.filter(
        (item) => userRole === "root_admin" || item.roles.includes(userRole)
      );
    }
  }
  return [];
};
