import type { LucideIcon } from "lucide-react";

export interface NavigationItem {
  title: string;
  url: string;
  icon: LucideIcon;
  roles: string[];
  badge?: string;
  description?: string;
  hasAccess?: boolean;
}

export interface NavigationSection {
  id: string;
  label: string;
  items: NavigationItem[];
}

export interface NavigationArea {
  id: string;
  title: string;
  icon: LucideIcon;
  sections: NavigationSection[];
}
