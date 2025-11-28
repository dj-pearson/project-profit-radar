/**
 * CSV Import Templates
 * Defines the structure and fields for each importable data type
 */

export interface CSVField {
  name: string;
  dbField: string;
  type: 'string' | 'number' | 'date' | 'boolean' | 'email' | 'phone';
  required: boolean;
  description: string;
  example: string;
  duplicateKey?: boolean; // Used for duplicate detection
}

export interface CSVTemplate {
  dataType: string;
  displayName: string;
  tableName: string;
  description: string;
  fields: CSVField[];
  duplicateMatchFields: string[]; // Fields used to detect duplicates
}

export const CSV_TEMPLATES: Record<string, CSVTemplate> = {
  projects: {
    dataType: 'projects',
    displayName: 'Projects',
    tableName: 'projects',
    description: 'Import your construction projects with client information, budgets, and timelines',
    duplicateMatchFields: ['name', 'client_name'],
    fields: [
      { name: 'Project Name', dbField: 'name', type: 'string', required: true, description: 'Name of the project', example: 'Smith Residence Renovation', duplicateKey: true },
      { name: 'Description', dbField: 'description', type: 'string', required: false, description: 'Project description', example: 'Complete home renovation including kitchen and bathrooms' },
      { name: 'Client Name', dbField: 'client_name', type: 'string', required: false, description: 'Primary client name', example: 'John Smith', duplicateKey: true },
      { name: 'Client Email', dbField: 'client_email', type: 'email', required: false, description: 'Client email address', example: 'john.smith@email.com' },
      { name: 'Client Phone', dbField: 'client_phone', type: 'phone', required: false, description: 'Client phone number', example: '(555) 123-4567' },
      { name: 'Site Address', dbField: 'site_address', type: 'string', required: false, description: 'Project site address', example: '123 Main St, Anytown, ST 12345' },
      { name: 'Start Date', dbField: 'start_date', type: 'date', required: false, description: 'Project start date (YYYY-MM-DD)', example: '2025-01-15' },
      { name: 'End Date', dbField: 'end_date', type: 'date', required: false, description: 'Expected end date (YYYY-MM-DD)', example: '2025-06-30' },
      { name: 'Budget', dbField: 'budget', type: 'number', required: false, description: 'Total project budget', example: '150000' },
      { name: 'Status', dbField: 'status', type: 'string', required: false, description: 'Project status (planning, active, on_hold, completed, cancelled)', example: 'active' },
      { name: 'Project Type', dbField: 'project_type', type: 'string', required: false, description: 'Type of project', example: 'residential' },
      { name: 'Profit Margin', dbField: 'profit_margin', type: 'number', required: false, description: 'Target profit margin percentage', example: '15' },
      { name: 'Estimated Hours', dbField: 'estimated_hours', type: 'number', required: false, description: 'Estimated project hours', example: '500' },
    ],
  },

  contacts: {
    dataType: 'contacts',
    displayName: 'Contacts/Leads',
    tableName: 'leads',
    description: 'Import contacts, leads, and potential customers',
    duplicateMatchFields: ['email', 'first_name', 'last_name'],
    fields: [
      { name: 'First Name', dbField: 'first_name', type: 'string', required: false, description: 'Contact first name', example: 'Jane', duplicateKey: true },
      { name: 'Last Name', dbField: 'last_name', type: 'string', required: false, description: 'Contact last name', example: 'Doe', duplicateKey: true },
      { name: 'Email', dbField: 'email', type: 'email', required: true, description: 'Email address', example: 'jane.doe@company.com', duplicateKey: true },
      { name: 'Phone', dbField: 'phone', type: 'phone', required: false, description: 'Phone number', example: '(555) 987-6543' },
      { name: 'Company Name', dbField: 'company_name', type: 'string', required: false, description: 'Company or organization', example: 'Doe Construction LLC' },
      { name: 'Job Title', dbField: 'job_title', type: 'string', required: false, description: 'Job title or position', example: 'Project Manager' },
      { name: 'Industry', dbField: 'industry', type: 'string', required: false, description: 'Industry type', example: 'Commercial Construction' },
      { name: 'Lead Source', dbField: 'lead_source', type: 'string', required: false, description: 'How the lead was acquired', example: 'Referral' },
      { name: 'Lead Status', dbField: 'lead_status', type: 'string', required: false, description: 'Current status (new, contacted, qualified, proposal, won, lost)', example: 'new' },
      { name: 'Priority', dbField: 'priority', type: 'string', required: false, description: 'Priority level (low, medium, high)', example: 'medium' },
      { name: 'Project Name', dbField: 'project_name', type: 'string', required: false, description: 'Associated project name', example: 'Office Renovation' },
      { name: 'Estimated Budget', dbField: 'estimated_budget', type: 'number', required: false, description: 'Estimated project budget', example: '75000' },
      { name: 'Notes', dbField: 'notes', type: 'string', required: false, description: 'Additional notes', example: 'Interested in starting Q2 2025' },
    ],
  },

  estimates: {
    dataType: 'estimates',
    displayName: 'Estimates',
    tableName: 'estimates',
    description: 'Import project estimates and quotes',
    duplicateMatchFields: ['estimate_number', 'client_name'],
    fields: [
      { name: 'Estimate Number', dbField: 'estimate_number', type: 'string', required: true, description: 'Unique estimate identifier', example: 'EST-2025-001', duplicateKey: true },
      { name: 'Title', dbField: 'title', type: 'string', required: true, description: 'Estimate title', example: 'Kitchen Renovation Quote' },
      { name: 'Client Name', dbField: 'client_name', type: 'string', required: false, description: 'Client name', example: 'John Smith', duplicateKey: true },
      { name: 'Client Email', dbField: 'client_email', type: 'email', required: false, description: 'Client email', example: 'john@email.com' },
      { name: 'Client Phone', dbField: 'client_phone', type: 'phone', required: false, description: 'Client phone', example: '(555) 123-4567' },
      { name: 'Description', dbField: 'description', type: 'string', required: false, description: 'Estimate description', example: 'Complete kitchen renovation including cabinets, countertops, and appliances' },
      { name: 'Site Address', dbField: 'site_address', type: 'string', required: false, description: 'Project site address', example: '456 Oak Ave, Anytown, ST 12345' },
      { name: 'Estimate Date', dbField: 'estimate_date', type: 'date', required: false, description: 'Date of estimate (YYYY-MM-DD)', example: '2025-01-10' },
      { name: 'Valid Until', dbField: 'valid_until', type: 'date', required: false, description: 'Quote validity date (YYYY-MM-DD)', example: '2025-02-10' },
      { name: 'Total Amount', dbField: 'total_amount', type: 'number', required: false, description: 'Total estimate amount', example: '45000' },
      { name: 'Tax Percentage', dbField: 'tax_percentage', type: 'number', required: false, description: 'Tax percentage', example: '8.25' },
      { name: 'Markup Percentage', dbField: 'markup_percentage', type: 'number', required: false, description: 'Markup percentage', example: '20' },
      { name: 'Status', dbField: 'status', type: 'string', required: false, description: 'Status (draft, sent, accepted, rejected, expired)', example: 'draft' },
      { name: 'Notes', dbField: 'notes', type: 'string', required: false, description: 'Internal notes', example: 'Client prefers quartz countertops' },
    ],
  },

  time_entries: {
    dataType: 'time_entries',
    displayName: 'Time Entries',
    tableName: 'time_entries',
    description: 'Import time tracking records for payroll and job costing',
    duplicateMatchFields: ['start_time', 'description'],
    fields: [
      { name: 'Start Time', dbField: 'start_time', type: 'date', required: true, description: 'Clock in time (YYYY-MM-DD HH:MM)', example: '2025-01-15 08:00', duplicateKey: true },
      { name: 'End Time', dbField: 'end_time', type: 'date', required: false, description: 'Clock out time (YYYY-MM-DD HH:MM)', example: '2025-01-15 17:00' },
      { name: 'Total Hours', dbField: 'total_hours', type: 'number', required: false, description: 'Total hours worked', example: '8' },
      { name: 'Break Duration', dbField: 'break_duration', type: 'number', required: false, description: 'Break duration in minutes', example: '60' },
      { name: 'Description', dbField: 'description', type: 'string', required: false, description: 'Work description', example: 'Framing work on second floor', duplicateKey: true },
      { name: 'Location', dbField: 'location', type: 'string', required: false, description: 'Work location', example: 'Smith Residence - 123 Main St' },
      { name: 'Project Name', dbField: '_project_name', type: 'string', required: false, description: 'Project name (for matching)', example: 'Smith Residence Renovation' },
      { name: 'Worker Email', dbField: '_worker_email', type: 'email', required: false, description: 'Worker email (for matching)', example: 'worker@company.com' },
      { name: 'Approval Status', dbField: 'approval_status', type: 'string', required: false, description: 'Status (pending, approved, rejected)', example: 'pending' },
    ],
  },

  expenses: {
    dataType: 'expenses',
    displayName: 'Expenses',
    tableName: 'expenses',
    description: 'Import expense records for financial tracking',
    duplicateMatchFields: ['description', 'amount', 'expense_date'],
    fields: [
      { name: 'Description', dbField: 'description', type: 'string', required: true, description: 'Expense description', example: 'Lumber for framing', duplicateKey: true },
      { name: 'Amount', dbField: 'amount', type: 'number', required: true, description: 'Expense amount', example: '1250.50', duplicateKey: true },
      { name: 'Expense Date', dbField: 'expense_date', type: 'date', required: false, description: 'Date of expense (YYYY-MM-DD)', example: '2025-01-15', duplicateKey: true },
      { name: 'Vendor Name', dbField: 'vendor_name', type: 'string', required: false, description: 'Vendor or supplier name', example: 'Home Depot' },
      { name: 'Vendor Contact', dbField: 'vendor_contact', type: 'string', required: false, description: 'Vendor contact info', example: '(555) 111-2222' },
      { name: 'Category', dbField: '_category_name', type: 'string', required: false, description: 'Expense category', example: 'Materials' },
      { name: 'Project Name', dbField: '_project_name', type: 'string', required: false, description: 'Associated project', example: 'Smith Residence Renovation' },
      { name: 'Payment Method', dbField: 'payment_method', type: 'string', required: false, description: 'Payment method (cash, check, credit_card, debit_card)', example: 'credit_card' },
      { name: 'Payment Status', dbField: 'payment_status', type: 'string', required: false, description: 'Payment status (pending, paid, partial)', example: 'paid' },
      { name: 'Tax Amount', dbField: 'tax_amount', type: 'number', required: false, description: 'Tax amount', example: '103.16' },
      { name: 'Is Billable', dbField: 'is_billable', type: 'boolean', required: false, description: 'Whether expense is billable to client (true/false)', example: 'true' },
    ],
  },

  equipment: {
    dataType: 'equipment',
    displayName: 'Equipment',
    tableName: 'equipment',
    description: 'Import equipment inventory and asset tracking',
    duplicateMatchFields: ['name', 'serial_number'],
    fields: [
      { name: 'Name', dbField: 'name', type: 'string', required: true, description: 'Equipment name', example: 'DeWalt Table Saw', duplicateKey: true },
      { name: 'Equipment Type', dbField: 'equipment_type', type: 'string', required: true, description: 'Type of equipment', example: 'Power Tool' },
      { name: 'Model', dbField: 'model', type: 'string', required: false, description: 'Model number', example: 'DWE7491RS' },
      { name: 'Serial Number', dbField: 'serial_number', type: 'string', required: false, description: 'Serial number', example: 'SN-2024-12345', duplicateKey: true },
      { name: 'Description', dbField: 'description', type: 'string', required: false, description: 'Equipment description', example: '10-inch jobsite table saw with rolling stand' },
      { name: 'Purchase Date', dbField: 'purchase_date', type: 'date', required: false, description: 'Date purchased (YYYY-MM-DD)', example: '2024-06-15' },
      { name: 'Purchase Cost', dbField: 'purchase_cost', type: 'number', required: false, description: 'Original purchase price', example: '599.00' },
      { name: 'Current Value', dbField: 'current_value', type: 'number', required: false, description: 'Current estimated value', example: '450.00' },
      { name: 'Location', dbField: 'location', type: 'string', required: false, description: 'Current location', example: 'Main Warehouse' },
      { name: 'Status', dbField: 'status', type: 'string', required: false, description: 'Status (available, in_use, maintenance, retired)', example: 'available' },
      { name: 'Last Maintenance Date', dbField: 'last_maintenance_date', type: 'date', required: false, description: 'Last maintenance (YYYY-MM-DD)', example: '2025-01-01' },
      { name: 'Next Maintenance Date', dbField: 'next_maintenance_date', type: 'date', required: false, description: 'Next scheduled maintenance (YYYY-MM-DD)', example: '2025-04-01' },
    ],
  },

  invoices: {
    dataType: 'invoices',
    displayName: 'Invoices',
    tableName: 'invoices',
    description: 'Import invoice records for billing and accounts receivable',
    duplicateMatchFields: ['invoice_number'],
    fields: [
      { name: 'Invoice Number', dbField: 'invoice_number', type: 'string', required: true, description: 'Unique invoice number', example: 'INV-2025-001', duplicateKey: true },
      { name: 'Client Name', dbField: 'client_name', type: 'string', required: false, description: 'Client name', example: 'John Smith' },
      { name: 'Client Email', dbField: 'client_email', type: 'email', required: false, description: 'Client email', example: 'john@email.com' },
      { name: 'Client Address', dbField: 'client_address', type: 'string', required: false, description: 'Client billing address', example: '123 Main St, Anytown, ST 12345' },
      { name: 'Project Name', dbField: '_project_name', type: 'string', required: false, description: 'Associated project', example: 'Smith Residence Renovation' },
      { name: 'Issue Date', dbField: 'issue_date', type: 'date', required: true, description: 'Invoice date (YYYY-MM-DD)', example: '2025-01-15' },
      { name: 'Due Date', dbField: 'due_date', type: 'date', required: true, description: 'Payment due date (YYYY-MM-DD)', example: '2025-02-15' },
      { name: 'Subtotal', dbField: 'subtotal', type: 'number', required: true, description: 'Subtotal before tax', example: '10000.00' },
      { name: 'Tax Rate', dbField: 'tax_rate', type: 'number', required: false, description: 'Tax rate percentage', example: '8.25' },
      { name: 'Tax Amount', dbField: 'tax_amount', type: 'number', required: false, description: 'Tax amount', example: '825.00' },
      { name: 'Total Amount', dbField: 'total_amount', type: 'number', required: true, description: 'Total invoice amount', example: '10825.00' },
      { name: 'Status', dbField: 'status', type: 'string', required: false, description: 'Status (draft, sent, viewed, paid, overdue, cancelled)', example: 'sent' },
      { name: 'PO Number', dbField: 'po_number', type: 'string', required: false, description: 'Purchase order number', example: 'PO-12345' },
      { name: 'Notes', dbField: 'notes', type: 'string', required: false, description: 'Invoice notes', example: 'Net 30 terms' },
    ],
  },

  materials: {
    dataType: 'materials',
    displayName: 'Materials',
    tableName: 'materials',
    description: 'Import materials and inventory items',
    duplicateMatchFields: ['name', 'material_code'],
    fields: [
      { name: 'Name', dbField: 'name', type: 'string', required: true, description: 'Material name', example: '2x4 Lumber 8ft', duplicateKey: true },
      { name: 'Material Code', dbField: 'material_code', type: 'string', required: false, description: 'Material SKU/code', example: 'LUM-2X4-8', duplicateKey: true },
      { name: 'Description', dbField: 'description', type: 'string', required: false, description: 'Material description', example: 'Pressure-treated pine lumber, 2x4 inches, 8 feet length' },
      { name: 'Unit', dbField: 'unit', type: 'string', required: true, description: 'Unit of measure (ea, ft, yd, sqft, etc.)', example: 'ea' },
      { name: 'Category', dbField: 'category', type: 'string', required: false, description: 'Material category', example: 'Lumber' },
      { name: 'Unit Cost', dbField: 'unit_cost', type: 'number', required: false, description: 'Cost per unit', example: '5.99' },
      { name: 'Quantity Available', dbField: 'quantity_available', type: 'number', required: false, description: 'Current stock quantity', example: '250' },
      { name: 'Minimum Stock Level', dbField: 'minimum_stock_level', type: 'number', required: false, description: 'Reorder point', example: '50' },
      { name: 'Supplier Name', dbField: 'supplier_name', type: 'string', required: false, description: 'Primary supplier', example: 'ABC Lumber Supply' },
      { name: 'Supplier Contact', dbField: 'supplier_contact', type: 'string', required: false, description: 'Supplier contact info', example: '(555) 333-4444' },
      { name: 'Location', dbField: 'location', type: 'string', required: false, description: 'Storage location', example: 'Warehouse A - Aisle 3' },
    ],
  },

  subcontractors: {
    dataType: 'subcontractors',
    displayName: 'Subcontractors',
    tableName: 'subcontractors',
    description: 'Import subcontractor and vendor information',
    duplicateMatchFields: ['business_name', 'email'],
    fields: [
      { name: 'Business Name', dbField: 'business_name', type: 'string', required: true, description: 'Company name', example: 'ABC Plumbing LLC', duplicateKey: true },
      { name: 'Contact Person', dbField: 'contact_name', type: 'string', required: false, description: 'Primary contact name', example: 'Mike Johnson' },
      { name: 'Email', dbField: 'email', type: 'email', required: false, description: 'Email address', example: 'mike@abcplumbing.com', duplicateKey: true },
      { name: 'Phone', dbField: 'phone', type: 'phone', required: false, description: 'Phone number', example: '(555) 555-5555' },
      { name: 'Address', dbField: 'address', type: 'string', required: false, description: 'Business address', example: '789 Industrial Blvd, Anytown, ST 12345' },
      { name: 'Trade/Specialty', dbField: 'specialty', type: 'string', required: false, description: 'Trade or specialty', example: 'Plumbing' },
      { name: 'License Number', dbField: 'license_number', type: 'string', required: false, description: 'Contractor license number', example: 'PLM-12345' },
      { name: 'Tax ID', dbField: 'tax_id', type: 'string', required: false, description: 'Tax ID / EIN', example: '12-3456789' },
      { name: 'Insurance Expiry', dbField: 'insurance_expiry', type: 'date', required: false, description: 'Insurance expiration date (YYYY-MM-DD)', example: '2025-12-31' },
      { name: 'Hourly Rate', dbField: 'hourly_rate', type: 'number', required: false, description: 'Standard hourly rate', example: '75.00' },
      { name: 'Rating', dbField: 'rating', type: 'number', required: false, description: 'Performance rating (1-5)', example: '4.5' },
      { name: 'Notes', dbField: 'notes', type: 'string', required: false, description: 'Additional notes', example: 'Preferred vendor for residential projects' },
    ],
  },

  change_orders: {
    dataType: 'change_orders',
    displayName: 'Change Orders',
    tableName: 'change_orders',
    description: 'Import project change orders',
    duplicateMatchFields: ['change_order_number', '_project_name'],
    fields: [
      { name: 'Change Order Number', dbField: 'change_order_number', type: 'string', required: true, description: 'Unique change order number', example: 'CO-2025-001', duplicateKey: true },
      { name: 'Project Name', dbField: '_project_name', type: 'string', required: true, description: 'Associated project name', example: 'Smith Residence Renovation', duplicateKey: true },
      { name: 'Title', dbField: 'title', type: 'string', required: true, description: 'Change order title', example: 'Additional Electrical Outlets' },
      { name: 'Description', dbField: 'description', type: 'string', required: false, description: 'Detailed description', example: 'Add 6 additional outlets in kitchen area per client request' },
      { name: 'Amount', dbField: 'amount', type: 'number', required: false, description: 'Change order amount', example: '1500.00' },
      { name: 'Status', dbField: 'status', type: 'string', required: false, description: 'Status (draft, pending, approved, rejected)', example: 'pending' },
      { name: 'Request Date', dbField: 'request_date', type: 'date', required: false, description: 'Date requested (YYYY-MM-DD)', example: '2025-01-20' },
      { name: 'Approval Date', dbField: 'approval_date', type: 'date', required: false, description: 'Date approved (YYYY-MM-DD)', example: '2025-01-22' },
      { name: 'Days Impact', dbField: 'days_impact', type: 'number', required: false, description: 'Schedule impact in days', example: '2' },
      { name: 'Reason', dbField: 'reason', type: 'string', required: false, description: 'Reason for change', example: 'Client request' },
    ],
  },
};

/**
 * Generate CSV template content with headers and example row
 */
export function generateCSVTemplate(dataType: string): string {
  const template = CSV_TEMPLATES[dataType];
  if (!template) {
    throw new Error(`Unknown data type: ${dataType}`);
  }

  const headers = template.fields.map(f => f.name);
  const examples = template.fields.map(f => f.example);

  return [
    headers.join(','),
    examples.join(','),
  ].join('\n');
}

/**
 * Generate downloadable CSV template blob
 */
export function downloadCSVTemplate(dataType: string): void {
  const template = CSV_TEMPLATES[dataType];
  if (!template) {
    throw new Error(`Unknown data type: ${dataType}`);
  }

  const content = generateCSVTemplate(dataType);
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${template.displayName.toLowerCase().replace(/\s+/g, '-')}-import-template.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

/**
 * Get all available template types for display
 */
export function getAvailableTemplates(): Array<{ key: string; displayName: string; description: string }> {
  return Object.entries(CSV_TEMPLATES).map(([key, template]) => ({
    key,
    displayName: template.displayName,
    description: template.description,
  }));
}

/**
 * Get fields for a specific data type, optionally filtered to required only
 */
export function getTemplateFields(dataType: string, requiredOnly: boolean = false): CSVField[] {
  const template = CSV_TEMPLATES[dataType];
  if (!template) return [];

  return requiredOnly
    ? template.fields.filter(f => f.required)
    : template.fields;
}

/**
 * Get duplicate match fields for a data type
 */
export function getDuplicateMatchFields(dataType: string): string[] {
  const template = CSV_TEMPLATES[dataType];
  return template?.duplicateMatchFields || [];
}
