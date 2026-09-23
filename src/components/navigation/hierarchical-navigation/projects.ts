import {
  Building2,
  CalendarDays,
  CheckSquare,
  Clipboard,
  DollarSign,
  FileText,
  FolderOpen,
  HelpCircle,
  MessageSquare,
  Package,
  Tag,
  Truck,
  Wrench,
} from "lucide-react";
import type { NavigationArea } from "./types";

export const projectsArea: NavigationArea = {
  id: "projects",
  title: "Projects",
  icon: Building2,
  sections: [
    {
      id: "project_management",
      label: "Project Management",
      items: [
        {
          title: "All Projects",
          url: "/projects",
          icon: Building2,
          roles: [
            "admin",
            "project_manager",
            "field_supervisor",
            "office_staff",
            "accounting",
            "root_admin",
          ],
        },
        {
          title: "Create Project",
          url: "/create-project",
          icon: Building2,
          roles: ["admin", "project_manager", "root_admin"],
        },
        {
          title: "Job Costing",
          url: "/job-costing",
          icon: DollarSign,
          roles: ["admin", "project_manager", "accounting", "root_admin"],
        },
        {
          title: "Daily Reports",
          url: "/daily-reports",
          icon: Clipboard,
          roles: [
            "admin",
            "project_manager",
            "field_supervisor",
            "root_admin",
          ],
        },
        {
          title: "Project Calendar",
          url: "/project-calendar",
          icon: CalendarDays,
          roles: ["admin", "project_manager", "field_supervisor", "office_staff", "accounting", "root_admin"],
          description: "Milestones and events across projects",
        },
      ],
    },
    {
      id: "project_communication",
      label: "Project Communication",
      items: [
        {
          title: "RFIs",
          url: "/rfis",
          icon: HelpCircle,
          roles: [
            "admin",
            "project_manager",
            "field_supervisor",
            "office_staff",
            "root_admin",
          ],
        },
        {
          title: "Submittals",
          url: "/submittals",
          icon: FileText,
          roles: [
            "admin",
            "project_manager",
            "field_supervisor",
            "office_staff",
            "root_admin",
          ],
        },
        {
          title: "Change Orders",
          url: "/change-orders",
          icon: Wrench,
          roles: ["admin", "project_manager", "root_admin"],
        },
        {
          title: "Punch List",
          url: "/punch-list",
          icon: CheckSquare,
          roles: [
            "admin",
            "project_manager",
            "field_supervisor",
            "office_staff",
            "root_admin",
          ],
        },
        {
          title: "Client Updates",
          url: "/smart-client-updates",
          icon: MessageSquare,
          roles: ["admin", "project_manager", "root_admin"],
          description: "Automated client messages on project events",
        },
      ],
    },
    {
      id: "project_resources",
      label: "Project Resources",
      items: [
        {
          title: "Document Management",
          url: "/documents",
          icon: FolderOpen,
          roles: ["admin", "project_manager", "office_staff", "root_admin"],
        },
        {
          title: "Materials",
          url: "/materials",
          icon: Package,
          roles: [
            "admin",
            "project_manager",
            "field_supervisor",
            "office_staff",
            "root_admin",
          ],
        },
        {
          title: "Material Tracking",
          url: "/material-tracking",
          icon: Package,
          roles: [
            "admin",
            "project_manager",
            "field_supervisor",
            "office_staff",
            "root_admin",
          ],
        },
        {
          title: "Equipment",
          url: "/equipment",
          icon: Truck,
          roles: [
            "admin",
            "project_manager",
            "field_supervisor",
            "office_staff",
            "root_admin",
          ],
        },
        {
          title: "Equipment QR Labels",
          url: "/equipment-qr-labels",
          icon: Tag,
          roles: ["admin", "project_manager", "field_supervisor", "office_staff", "root_admin"],
        },
      ],
    },
  ],
};
