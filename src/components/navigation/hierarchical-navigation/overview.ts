import {
  Home,
  ListTodo,
} from "lucide-react";
import type { NavigationArea } from "./types";

export const overviewArea: NavigationArea = {
  id: "overview",
  title: "Overview",
  icon: Home,
  sections: [
    {
      id: "dashboard",
      label: "Dashboard",
      items: [
        {
          title: "Dashboard",
          url: "/dashboard",
          icon: Home,
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
          title: "My Tasks",
          url: "/my-tasks",
          icon: ListTodo,
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
