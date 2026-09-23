import {
  Calendar,
  ClipboardList,
  FileText,
  Globe,
  Lock,
  Settings,
  Shield,
  Truck,
  Wrench,
} from "lucide-react";
import type { NavigationArea } from "./types";

export const operationsArea: NavigationArea = {
  id: "operations",
  title: "Operations",
  icon: Settings,
  sections: [
    {
      id: "safety_compliance",
      label: "Safety & Compliance",
      items: [
        {
          title: "Safety Management",
          url: "/safety",
          icon: Shield,
          roles: [
            "admin",
            "project_manager",
            "field_supervisor",
            "root_admin",
          ],
        },
        {
          title: "Compliance Audit",
          url: "/compliance-audit",
          icon: FileText,
          roles: ["root_admin"],
        },
        {
          title: "GDPR Compliance",
          url: "/gdpr-compliance",
          icon: Lock,
          roles: ["admin", "root_admin"],
        },
        {
          title: "Quality Control",
          url: "/ai-quality-control",
          icon: ClipboardList,
          roles: ["admin", "project_manager", "field_supervisor", "root_admin"],
          description: "Inspection pass rates and reinspections",
        },
      ],
    },
    {
      id: "permits_legal",
      label: "Permits & Legal",
      items: [
        {
          title: "Permit Management",
          url: "/permit-management",
          icon: FileText,
          roles: ["admin", "project_manager", "office_staff", "root_admin"],
        },
        {
          title: "Environmental Permits",
          url: "/environmental-permitting",
          icon: FileText,
          roles: ["admin", "project_manager", "office_staff", "root_admin"],
        },
        {
          title: "Bond & Insurance",
          url: "/bond-insurance",
          icon: Shield,
          roles: ["admin", "project_manager", "accounting", "root_admin"],
        },
        {
          title: "Warranty Management",
          url: "/warranty-management",
          icon: Wrench,
          roles: ["admin", "project_manager", "office_staff", "root_admin"],
        },
      ],
    },
    {
      id: "specialized_services",
      label: "Specialized Services",
      items: [
        {
          title: "Public Procurement",
          url: "/public-procurement",
          icon: Globe,
          roles: ["admin", "project_manager", "office_staff", "root_admin"],
        },
        {
          title: "Service Dispatch",
          url: "/service-dispatch",
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
          title: "Calendar Integration",
          url: "/calendar",
          icon: Calendar,
          roles: ["admin", "project_manager", "office_staff", "root_admin"],
        },
      ],
    },
    {
      id: "equipment_workflows",
      label: "Workflows",
      items: [
        {
          title: "Automated Workflows",
          url: "/workflows",
          icon: Settings,
          roles: ["admin", "project_manager", "root_admin"],
        },
        {
          title: "Knowledge Base",
          url: "/knowledge-base",
          icon: FileText,
          roles: [
            "admin",
            "project_manager",
            "field_supervisor",
            "office_staff",
            "accounting",
            "root_admin",
          ],
        },
      ],
    },
  ],
};
