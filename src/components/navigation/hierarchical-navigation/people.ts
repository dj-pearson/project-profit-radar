import {
  BarChart3,
  BarChart4,
  CalendarDays,
  CheckSquare,
  Clock,
  Layers,
  MapPin,
  MessageSquare,
  Settings,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import type { NavigationArea } from "./types";

export const peopleArea: NavigationArea = {
  id: "people",
  title: "People",
  icon: Users,
  sections: [
    {
      id: "team_management",
      label: "Team Management",
      items: [
        {
          title: "Team Management",
          url: "/team",
          icon: Users,
          roles: ["admin", "project_manager", "root_admin"],
        },
        {
          title: "Crew Scheduling",
          url: "/crew-scheduling",
          icon: CalendarDays,
          roles: [
            "admin",
            "project_manager",
            "field_supervisor",
            "root_admin",
          ],
        },
        {
          title: "Time Tracking",
          url: "/time-tracking",
          icon: Clock,
          roles: [
            "admin",
            "project_manager",
            "field_supervisor",
            "office_staff",
            "root_admin",
          ],
        },
        {
          title: "Timesheet Approvals",
          url: "/timesheets",
          icon: CheckSquare,
          roles: ["admin", "project_manager", "field_supervisor", "root_admin"],
          description: "Approve or reject submitted time",
        },
        {
          title: "Crew Check-in",
          url: "/crew-checkin",
          icon: MapPin,
          roles: ["admin", "project_manager", "field_supervisor", "root_admin"],
          description: "GPS check-in on site",
        },
        {
          title: "Crew Presence",
          url: "/crew-presence",
          icon: Users,
          roles: ["admin", "project_manager", "field_supervisor", "root_admin"],
          description: "Who has checked in on site",
        },
        {
          title: "Geofence Map",
          url: "/geofence-map",
          icon: MapPin,
          roles: ["admin", "project_manager", "field_supervisor", "root_admin"],
          description: "Job-site geofences and clock-in locations",
        },
      ],
    },
    {
      id: "customer_management",
      label: "Customer Management",
      items: [
        {
          title: "CRM Dashboard",
          url: "/crm",
          icon: Users,
          roles: ["admin", "project_manager", "office_staff", "root_admin"],
        },
        {
          title: "Leads",
          url: "/crm/leads",
          icon: Users,
          roles: ["admin", "project_manager", "office_staff", "root_admin"],
        },
        {
          title: "Contacts",
          url: "/crm/contacts",
          icon: Users,
          roles: ["admin", "project_manager", "office_staff", "root_admin"],
        },
        {
          title: "Opportunities",
          url: "/crm/opportunities",
          icon: TrendingUp,
          roles: ["admin", "project_manager", "office_staff", "root_admin"],
        },
        {
          title: "Pipeline Management",
          url: "/crm/pipeline",
          icon: BarChart3,
          roles: ["admin", "project_manager", "office_staff", "root_admin"],
        },
        {
          title: "Lead Intelligence",
          url: "/crm/lead-intelligence",
          icon: Zap,
          roles: ["admin", "project_manager", "office_staff", "root_admin"],
        },
        {
          title: "Lead Workflows",
          url: "/crm/workflows",
          icon: Settings,
          roles: ["admin", "project_manager", "office_staff", "root_admin"],
        },
        {
          title: "Workflow Builder",
          url: "/crm/workflows/builder",
          icon: Layers,
          roles: ["admin", "project_manager", "office_staff", "root_admin"],
        },
        {
          title: "Nurturing Campaigns",
          url: "/crm/campaigns",
          icon: MessageSquare,
          roles: ["admin", "project_manager", "office_staff", "root_admin"],
        },
        {
          title: "CRM Analytics",
          url: "/crm/analytics",
          icon: BarChart4,
          roles: ["admin", "project_manager", "office_staff", "root_admin"],
        },
      ],
    },
    {
      id: "communication",
      label: "Communication",
      items: [
        {
          title: "Email Marketing",
          url: "/email-marketing",
          icon: MessageSquare,
          roles: ["admin", "office_staff", "root_admin"],
        },
        {
          title: "Support",
          url: "/support",
          icon: MessageSquare,
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
          title: "Team Collaboration",
          url: "/collaboration",
          icon: MessageSquare,
          roles: ["admin", "project_manager", "field_supervisor", "office_staff", "root_admin"],
          description: "Team chat, activity feed and presence",
        },
      ],
    },
  ],
};
