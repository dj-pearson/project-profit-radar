import {
  ArrowRightLeft,
  BarChart3,
  Calculator,
  CalendarDays,
  Clipboard,
  ClipboardList,
  DollarSign,
  FileText,
  FolderOpen,
  PieChart,
  TrendingUp,
  Users,
} from "lucide-react";
import type { NavigationArea } from "./types";

export const financialArea: NavigationArea = {
  id: "financial",
  title: "Financial",
  icon: DollarSign,
  sections: [
    {
      id: "financial_overview",
      label: "Financial Overview",
      items: [
        {
          title: "Financial Dashboard",
          url: "/financial",
          icon: DollarSign,
          roles: ["admin", "project_manager", "accounting", "root_admin"],
        },
        {
          title: "Finance Hub",
          url: "/finance/hub",
          icon: PieChart,
          roles: ["admin", "accounting", "root_admin"],
          badge: "NEW",
          description: "Enterprise Finance Module",
        },
        {
          title: "Estimates",
          url: "/estimates",
          icon: Calculator,
          roles: [
            "admin",
            "project_manager",
            "office_staff",
            "accounting",
            "root_admin",
          ],
        },
        {
          title: "Reports & Analytics",
          url: "/reports",
          icon: BarChart3,
          roles: ["admin", "project_manager", "accounting", "root_admin"],
        },
      ],
    },
    {
      id: "enterprise_accounting",
      label: "Enterprise Accounting",
      items: [
        {
          title: "Chart of Accounts",
          url: "/finance/chart-of-accounts",
          icon: FolderOpen,
          roles: ["admin", "accounting", "root_admin"],
        },
        {
          title: "General Ledger",
          url: "/finance/general-ledger",
          icon: FileText,
          roles: ["admin", "accounting", "root_admin"],
        },
        {
          title: "Journal Entries",
          url: "/finance/journal-entries",
          icon: Clipboard,
          roles: ["admin", "accounting", "root_admin"],
        },
        {
          title: "Fiscal Periods",
          url: "/finance/fiscal-periods",
          icon: CalendarDays,
          roles: ["admin", "accounting", "root_admin"],
        },
      ],
    },
    {
      id: "payables_receivables",
      label: "AP/AR",
      items: [
        {
          title: "Accounts Payable",
          url: "/finance/accounts-payable",
          icon: FileText,
          roles: ["admin", "accounting", "root_admin"],
        },
        {
          title: "Bill Payments",
          url: "/finance/bill-payments",
          icon: DollarSign,
          roles: ["admin", "accounting", "root_admin"],
        },
        {
          title: "Payment Center",
          url: "/payment-center",
          icon: DollarSign,
          roles: ["admin", "accounting", "root_admin"],
          description: "Payments received and saved payment methods",
        },
        {
          title: "Accounts Receivable",
          url: "/invoices",
          icon: DollarSign,
          roles: ["admin", "accounting", "office_staff", "root_admin"],
        },
      ],
    },
    {
      id: "financial_reports",
      label: "Financial Reports",
      items: [
        {
          title: "Balance Sheet",
          url: "/finance/balance-sheet",
          icon: BarChart3,
          roles: ["admin", "accounting", "root_admin"],
        },
        {
          title: "Profit & Loss",
          url: "/finance/profit-loss",
          icon: TrendingUp,
          roles: ["admin", "accounting", "root_admin"],
        },
        {
          title: "Cash Flow Statement",
          url: "/finance/cash-flow",
          icon: ArrowRightLeft,
          roles: ["admin", "accounting", "root_admin"],
        },
        {
          title: "Trial Balance",
          url: "/finance/trial-balance",
          icon: ClipboardList,
          roles: ["admin", "accounting", "root_admin"],
        },
        {
          title: "WIP / Earned Value",
          url: "/finance/wip-report",
          icon: TrendingUp,
          roles: ["admin", "project_manager", "accounting", "root_admin"],
        },
      ],
    },
    {
      id: "purchasing",
      label: "Purchasing",
      items: [
        {
          title: "Purchase Orders",
          url: "/purchase-orders",
          icon: FileText,
          roles: [
            "admin",
            "project_manager",
            "office_staff",
            "accounting",
            "root_admin",
          ],
        },
        {
          title: "Vendors",
          url: "/vendors",
          icon: Users,
          roles: [
            "admin",
            "project_manager",
            "office_staff",
            "accounting",
            "root_admin",
          ],
        },
        {
          title: "Subcontractors",
          url: "/subcontractors",
          icon: Users,
          roles: ["admin", "project_manager", "office_staff", "accounting", "root_admin"],
          description: "Subcontractor records and insurance certificates",
        },
      ],
    },
    {
      id: "integrations",
      label: "Integrations",
      items: [
        {
          title: "QuickBooks Routing",
          url: "/quickbooks-routing",
          icon: TrendingUp,
          roles: ["admin", "project_manager", "accounting", "root_admin"],
        },
      ],
    },
  ],
};
