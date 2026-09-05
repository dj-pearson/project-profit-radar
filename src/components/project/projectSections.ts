/**
 * The project hub's sections, in one place (US-331).
 *
 * There were three lists and they disagreed.
 *
 *   ProjectContent.tsx  implemented 23 sections in its contentMap.
 *   ProjectSubSidebar   listed 22 - it had no entry for procurement, so the
 *                       Materials/Procurement screen existed and was reachable
 *                       from nothing.
 *   ProjectDetail       showed 10 tabs, three of them mislabelled against the
 *                       section they open: 'estimates' captioned "Financials",
 *                       'progress' captioned "Schedule", 'tasks' captioned
 *                       "Team". Clicking Team opened the task list; clicking
 *                       Financials opened estimates.
 *
 * A tab bar showing a subset is the right design - ten items fit on a laptop,
 * twenty-three do not - but the subset has to be drawn from the same list, and
 * a label has to name what it opens.
 *
 * ADDING A SECTION: add it here and implement it in ProjectContent's
 * contentMap. projectSections.test.ts fails if the two ever disagree, which is
 * what stopped procurement being reachable for as long as it was.
 */
import {
  Package, TrendingUp, FileText, DollarSign, HelpCircle, Send, FileX,
  CheckSquare, Hammer, Shield, Users, Receipt, ListTodo, FolderOpen, Home,
  Calculator, MessageSquare, Hash, Activity, ClipboardList, Camera,
  ShoppingCart, type LucideIcon,
} from 'lucide-react';

export type ProjectSectionGroup =
  | 'Overview'
  | 'Project Management'
  | 'Resources'
  | 'Financial'
  | 'Communication'
  | 'Compliance'
  | 'Closeout'
  | 'Documents';

export interface ProjectSection {
  id: string;
  /** Names the section it opens. Never a different word for the same thing. */
  label: string;
  icon: LucideIcon;
  group: ProjectSectionGroup;
  /**
   * In the compact tab bar on the project header. Ten or so; the rest live in
   * the sub-sidebar, which scrolls.
   */
  inTabBar?: boolean;
}

export const PROJECT_SECTIONS: ProjectSection[] = [
  { id: 'overview', label: 'Overview', icon: Home, group: 'Overview', inTabBar: true },

  { id: 'progress', label: 'Progress', icon: TrendingUp, group: 'Project Management', inTabBar: true },
  { id: 'tasks', label: 'Tasks', icon: ListTodo, group: 'Project Management', inTabBar: true },
  { id: 'dailyreports', label: 'Daily Reports', icon: FileText, group: 'Project Management', inTabBar: true },
  // US-330 made photos a real record (photo_attachments) rather than strings on
  // a daily report, so the hub can finally have somewhere to show them.
  { id: 'photos', label: 'Photos', icon: Camera, group: 'Project Management', inTabBar: true },

  { id: 'materials', label: 'Materials', icon: Package, group: 'Resources' },
  { id: 'procurement', label: 'Procurement', icon: ShoppingCart, group: 'Resources' },
  { id: 'equipment', label: 'Equipment', icon: Hammer, group: 'Resources' },

  { id: 'estimates', label: 'Estimates', icon: Calculator, group: 'Financial', inTabBar: true },
  { id: 'jobcosting', label: 'Job Costing', icon: DollarSign, group: 'Financial', inTabBar: true },
  { id: 'costcodes', label: 'Cost Codes', icon: Hash, group: 'Financial' },
  { id: 'invoicing', label: 'Invoicing', icon: Receipt, group: 'Financial' },
  { id: 'changeorders', label: 'Change Orders', icon: FileX, group: 'Financial', inTabBar: true },

  { id: 'communication', label: 'Messages', icon: MessageSquare, group: 'Communication' },
  { id: 'rfis', label: 'RFIs', icon: HelpCircle, group: 'Communication' },
  { id: 'submittals', label: 'Submittals', icon: Send, group: 'Communication' },
  { id: 'contacts', label: 'Contacts', icon: Users, group: 'Communication' },

  { id: 'permits', label: 'Permits', icon: Shield, group: 'Compliance' },
  { id: 'warranties', label: 'Warranties', icon: CheckSquare, group: 'Compliance' },

  { id: 'punchlist', label: 'Punch List', icon: ListTodo, group: 'Closeout' },
  { id: 'closeout', label: 'Closeout', icon: ClipboardList, group: 'Closeout', inTabBar: true },

  { id: 'documents', label: 'Documents', icon: FolderOpen, group: 'Documents', inTabBar: true },
  { id: 'activity', label: 'Activity Feed', icon: Activity, group: 'Documents' },
];

/** The order groups appear in the sub-sidebar. */
export const PROJECT_SECTION_GROUPS: ProjectSectionGroup[] = [
  'Overview',
  'Project Management',
  'Resources',
  'Financial',
  'Communication',
  'Compliance',
  'Closeout',
  'Documents',
];

export const projectTabBarSections = (): ProjectSection[] =>
  PROJECT_SECTIONS.filter((s) => s.inTabBar);

export const projectSectionsByGroup = (): Array<{
  title: ProjectSectionGroup;
  items: ProjectSection[];
}> =>
  PROJECT_SECTION_GROUPS
    .map((title) => ({ title, items: PROJECT_SECTIONS.filter((s) => s.group === title) }))
    .filter((g) => g.items.length > 0);

export const isProjectSection = (id: string): boolean =>
  PROJECT_SECTIONS.some((s) => s.id === id);
