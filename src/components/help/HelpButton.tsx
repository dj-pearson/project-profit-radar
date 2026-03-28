import React, { useState, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { HelpCircle, Search, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

interface HelpArticle {
  question: string;
  answer: string;
}

interface HelpSection {
  title: string;
  items: HelpArticle[];
}

const HELP_CONTENT: Record<string, HelpSection> = {
  '/projects': {
    title: 'Projects Help',
    items: [
      { question: 'How do I create a new project?', answer: 'Click the "New Project" button on the Projects page. Fill in the project name, client, budget, and dates, then click Create. You can also use a project template to pre-fill common settings.' },
      { question: 'How do I track project costs?', answer: 'Navigate to the Financials tab within a project to see real-time cost tracking. Costs are automatically aggregated from time entries, expenses, and material purchases linked to the project.' },
      { question: 'What do the project health badges mean?', answer: 'Green means on track, yellow indicates minor issues (budget or schedule variance under 10%), and red signals significant overruns that need attention.' },
      { question: 'How do I manage change orders?', answer: 'Open a project and go to the Change Orders tab. Click "New Change Order" to create one. Change orders go through an approval workflow and automatically update the project budget when approved.' },
    ],
  },
  '/invoices': {
    title: 'Invoice Help',
    items: [
      { question: 'How do I create an invoice?', answer: 'Go to Invoices and click "New Invoice". Select a project and client, add line items, and set payment terms. You can generate invoices from approved time entries and expenses.' },
      { question: 'How do I track payment status?', answer: 'Each invoice shows its status: Draft, Sent, Viewed, Paid, or Overdue. The dashboard shows total outstanding and overdue amounts across all invoices.' },
      { question: 'Can I set up recurring invoices?', answer: 'Yes. When creating an invoice, enable the "Recurring" option and set the frequency (weekly, bi-weekly, monthly). Recurring invoices are automatically generated on schedule.' },
    ],
  },
  '/financial': {
    title: 'Financial Help',
    items: [
      { question: 'How does job costing work?', answer: 'BuildDesk tracks every cost against specific projects and cost codes. Time entries, material purchases, subcontractor invoices, and expenses are all linked to projects for real-time profitability analysis.' },
      { question: 'How do I sync with QuickBooks?', answer: 'Go to Settings > Integrations > QuickBooks. Connect your account and configure sync options. BuildDesk supports 2-way sync for invoices, payments, and expenses.' },
      { question: 'What is the cash flow forecast?', answer: 'The cash flow forecast projects future income and expenses based on scheduled invoices, recurring costs, and project timelines. It helps you plan for upcoming cash needs.' },
      { question: 'How do I export financial reports?', answer: 'Click the Export button on any financial report to download as PDF or Excel. You can customize date ranges and filter by project, client, or cost code.' },
    ],
  },
  '/time-tracking': {
    title: 'Time Tracking Help',
    items: [
      { question: 'How do I clock in and out?', answer: 'Use the Clock In button on the Time Tracking page or the mobile app. Select your project and cost code, then tap Clock In. GPS location is recorded if enabled for your job site.' },
      { question: 'What is geofencing?', answer: 'Geofencing creates a virtual boundary around a job site. When enabled, crew members are automatically clocked in when they arrive and clocked out when they leave the defined area.' },
      { question: 'How do timesheet approvals work?', answer: 'Submitted timesheets go to the project manager or supervisor for approval. Approved hours flow into job costing and payroll. Rejected entries are sent back with notes for correction.' },
    ],
  },
  '/daily-reports': {
    title: 'Daily Reports Help',
    items: [
      { question: 'How do I submit a daily report?', answer: 'Navigate to Daily Reports and click "New Report". Select the project, fill in work performed, crew on site, weather conditions, and any issues. Attach photos for documentation.' },
      { question: 'Can I use templates for daily reports?', answer: 'Yes. Go to Daily Reports > Templates to create reusable templates. Templates can pre-fill common fields and sections specific to your project types.' },
      { question: 'Who receives daily report notifications?', answer: 'Project managers and stakeholders configured in project settings receive email notifications when daily reports are submitted. Clients with portal access can also view reports.' },
    ],
  },
  '/safety': {
    title: 'Safety Help',
    items: [
      { question: 'How do I report a safety incident?', answer: 'Go to Safety > Incidents and click "Report Incident". Fill in the details including date, location, personnel involved, and corrective actions. Upload photos and witness statements.' },
      { question: 'How do I manage toolbox talks?', answer: 'Schedule toolbox talks from Safety > Toolbox Talks. Select a topic, assign a presenter, and track attendance. Digital sign-off ensures compliance documentation.' },
      { question: 'How do safety inspections work?', answer: 'Create inspection checklists under Safety > Inspections. Assign inspections to qualified personnel who complete them on-site via the mobile app with photo documentation.' },
    ],
  },
  '/crm': {
    title: 'CRM Help',
    items: [
      { question: 'How do I add a new lead?', answer: 'Go to CRM > Leads and click "Add Lead". Enter contact details, project type, estimated value, and source. Leads move through your pipeline stages as they progress.' },
      { question: 'How do I track lead sources?', answer: 'Each lead has a source field (referral, website, advertising, etc.). The CRM dashboard shows conversion rates by source to help you optimize marketing spend.' },
      { question: 'Can I send proposals from the CRM?', answer: 'Yes. From a lead or contact, click "Create Proposal" to generate a professional proposal. Proposals can include estimates, project timelines, and terms. Clients receive a link to view and accept.' },
    ],
  },
  '/estimates': {
    title: 'Estimates Help',
    items: [
      { question: 'How do I create an estimate?', answer: 'Go to Estimates and click "New Estimate". Add line items with quantities, unit costs, and markups. Use the line item library for commonly used items or import from templates.' },
      { question: 'What are estimate templates?', answer: 'Templates save your commonly used estimate structures. Create templates for different project types (kitchen remodel, roof replacement, etc.) to speed up the estimating process.' },
      { question: 'How do I convert an estimate to a project?', answer: 'When a client accepts an estimate, click "Convert to Project". This creates a new project with the estimate budget, line items become cost codes, and the client is linked automatically.' },
      { question: 'Can I use AI for estimating?', answer: 'Yes. The AI estimating feature can suggest line items and costs based on project type and location. Review and adjust the AI suggestions before finalizing your estimate.' },
    ],
  },
  '/team': {
    title: 'Team Help',
    items: [
      { question: 'How do I add team members?', answer: 'Go to Team > Members and click "Invite Member". Enter their email and assign a role (Project Manager, Field Supervisor, Office Staff, etc.). They will receive an invitation email.' },
      { question: 'What are the different user roles?', answer: 'Admin has full access. Project Manager manages projects and teams. Field Supervisor handles on-site operations. Office Staff manages documents and scheduling. Accounting accesses financial data.' },
      { question: 'How do I manage crew assignments?', answer: 'From a project, go to the Team tab to assign crew members. You can set roles, schedules, and notification preferences for each assignment.' },
    ],
  },
  '/documents': {
    title: 'Documents Help',
    items: [
      { question: 'How do I upload documents?', answer: 'Go to Documents and click "Upload" or drag and drop files. Assign documents to projects and categories. Supported formats include PDF, images, Office documents, and CAD files.' },
      { question: 'How does version control work?', answer: 'When you upload a new version of an existing document, BuildDesk keeps the previous versions accessible. You can view version history and revert to earlier versions if needed.' },
      { question: 'Can clients access documents?', answer: 'Yes. Documents marked as "Client Visible" appear in the client portal. You control which documents each client can see through project-level sharing settings.' },
    ],
  },
};

const DEFAULT_HELP: HelpSection = {
  title: 'General Help',
  items: [
    { question: 'How do I navigate BuildDesk?', answer: 'Use the sidebar on the left to navigate between major sections. The top bar provides search, notifications, and account access. On mobile, use the bottom navigation bar.' },
    { question: 'How do I get support?', answer: 'Click the help button (?) for contextual help on any page. For additional support, visit the Help Center or contact support through Settings > Support.' },
    { question: 'How do I customize my dashboard?', answer: 'Your dashboard automatically shows relevant widgets based on your role. You can rearrange widgets and set preferences in Settings > Dashboard Preferences.' },
  ],
};

function getHelpForRoute(pathname: string): HelpSection {
  // Try exact match first
  if (HELP_CONTENT[pathname]) {
    return HELP_CONTENT[pathname];
  }

  // Try prefix match (e.g., /projects/123 matches /projects)
  for (const route of Object.keys(HELP_CONTENT)) {
    if (pathname.startsWith(route + '/') || pathname.startsWith(route + '?')) {
      return HELP_CONTENT[route];
    }
  }

  return DEFAULT_HELP;
}

export function HelpButton() {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());
  const location = useLocation();

  const helpSection = getHelpForRoute(location.pathname);

  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return helpSection.items;
    const query = searchQuery.toLowerCase();
    return helpSection.items.filter(
      (item) =>
        item.question.toLowerCase().includes(query) ||
        item.answer.toLowerCase().includes(query)
    );
  }, [helpSection.items, searchQuery]);

  const toggleItem = (index: number) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const handleOpen = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      setSearchQuery('');
      setExpandedItems(new Set());
    }
  };

  return (
    <>
      {/* Floating help button */}
      <Button
        variant="default"
        size="icon"
        className={cn(
          'fixed bottom-6 right-6 z-40 h-12 w-12 rounded-full shadow-lg',
          'hover:scale-105 transition-transform',
          'print:hidden'
        )}
        onClick={() => handleOpen(true)}
        aria-label="Open help panel"
      >
        <HelpCircle className="h-6 w-6" aria-hidden="true" />
      </Button>

      {/* Help panel */}
      <Sheet open={open} onOpenChange={handleOpen}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-md flex flex-col"
          aria-label="Help panel"
        >
          <SheetHeader>
            <SheetTitle>{helpSection.title}</SheetTitle>
            <SheetDescription>
              Find answers to common questions about this section.
            </SheetDescription>
          </SheetHeader>

          {/* Search */}
          <div className="relative mt-4">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              placeholder="Search help articles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              aria-label="Search help articles"
            />
          </div>

          {/* Help articles */}
          <div className="flex-1 overflow-y-auto mt-4 space-y-2" role="list" aria-label="Help articles">
            {filteredItems.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No help articles match your search.
              </p>
            ) : (
              filteredItems.map((item, index) => {
                const isExpanded = expandedItems.has(index);
                return (
                  <Collapsible
                    key={`${item.question}-${index}`}
                    open={isExpanded}
                    onOpenChange={() => toggleItem(index)}
                  >
                    <CollapsibleTrigger asChild>
                      <button
                        className={cn(
                          'flex items-start w-full text-left gap-2 p-3 rounded-md text-sm',
                          'hover:bg-accent transition-colors',
                          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
                        )}
                        aria-expanded={isExpanded}
                        role="listitem"
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 mt-0.5 flex-shrink-0" aria-hidden="true" />
                        ) : (
                          <ChevronRight className="h-4 w-4 mt-0.5 flex-shrink-0" aria-hidden="true" />
                        )}
                        <span className="font-medium">{item.question}</span>
                      </button>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <p className="text-sm text-muted-foreground px-9 pb-3 leading-relaxed">
                        {item.answer}
                      </p>
                    </CollapsibleContent>
                  </Collapsible>
                );
              })
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
