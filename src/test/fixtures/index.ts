/**
 * Test Fixtures for BuildDesk
 *
 * Mock data factories for common entity types.
 * Each factory creates consistent, valid mock data for tests.
 */

// ============================================================================
// ID Generators
// ============================================================================

let idCounter = 0;
export const generateId = (prefix = 'mock') => `${prefix}-${++idCounter}`;
export const resetIdCounter = () => {
  idCounter = 0;
};

// ============================================================================
// Company Fixtures
// ============================================================================

export interface MockCompany {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  is_active: boolean;
  subscription_status?: 'active' | 'trial' | 'canceled' | 'past_due';
  subscription_plan?: string;
  created_at: string;
  updated_at: string;
}

export const createMockCompany = (overrides: Partial<MockCompany> = {}): MockCompany => ({
  id: generateId('company'),
  name: 'Test Construction Co',
  email: 'contact@testconstruction.com',
  phone: '555-123-4567',
  address: '123 Builder Lane',
  city: 'Construction City',
  state: 'CA',
  zip_code: '90210',
  is_active: true,
  subscription_status: 'active',
  subscription_plan: 'professional',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

// ============================================================================
// User Profile Fixtures
// ============================================================================

export type UserRole =
  | 'root_admin'
  | 'admin'
  | 'project_manager'
  | 'field_supervisor'
  | 'office_staff'
  | 'accounting'
  | 'client_portal';

export interface MockUserProfile {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  company_id?: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

export const createMockUserProfile = (
  overrides: Partial<MockUserProfile> = {}
): MockUserProfile => ({
  id: generateId('user'),
  email: `user-${idCounter}@builddesk.com`,
  first_name: 'Test',
  last_name: 'User',
  phone: '555-000-0000',
  company_id: 'test-company-123',
  role: 'admin',
  is_active: true,
  created_at: new Date().toISOString(),
  ...overrides,
});

// Create user with specific role
export const createMockAdmin = (overrides: Partial<MockUserProfile> = {}) =>
  createMockUserProfile({ ...overrides, role: 'admin' });

export const createMockProjectManager = (overrides: Partial<MockUserProfile> = {}) =>
  createMockUserProfile({ ...overrides, role: 'project_manager' });

export const createMockFieldSupervisor = (overrides: Partial<MockUserProfile> = {}) =>
  createMockUserProfile({ ...overrides, role: 'field_supervisor' });

export const createMockAccountingUser = (overrides: Partial<MockUserProfile> = {}) =>
  createMockUserProfile({ ...overrides, role: 'accounting' });

// ============================================================================
// Project Fixtures
// ============================================================================

export type ProjectStatus = 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled';

export interface MockProject {
  id: string;
  name: string;
  description?: string;
  company_id: string;
  client_name?: string;
  client_email?: string;
  client_phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  status: ProjectStatus;
  budget?: number;
  actual_cost?: number;
  start_date?: string;
  end_date?: string;
  estimated_end_date?: string;
  project_manager_id?: string;
  created_at: string;
  updated_at: string;
}

export const createMockProject = (overrides: Partial<MockProject> = {}): MockProject => ({
  id: generateId('project'),
  name: 'Test Project',
  description: 'A test construction project',
  company_id: 'test-company-123',
  client_name: 'John Doe',
  client_email: 'john@example.com',
  client_phone: '555-123-4567',
  address: '456 Project Ave',
  city: 'Building City',
  state: 'CA',
  zip_code: '90210',
  status: 'active',
  budget: 100000,
  actual_cost: 50000,
  start_date: new Date().toISOString().split('T')[0],
  estimated_end_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0],
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

// ============================================================================
// Time Entry Fixtures
// ============================================================================

export interface MockTimeEntry {
  id: string;
  user_id: string;
  project_id: string;
  company_id: string;
  date: string;
  start_time?: string;
  end_time?: string;
  hours: number;
  description?: string;
  cost_code?: string;
  hourly_rate?: number;
  is_billable: boolean;
  status: 'pending' | 'approved' | 'rejected';
  approved_by?: string;
  approved_at?: string;
  geofence_id?: string;
  geofence_breached?: boolean;
  created_at: string;
  updated_at: string;
}

export const createMockTimeEntry = (
  overrides: Partial<MockTimeEntry> = {}
): MockTimeEntry => ({
  id: generateId('time-entry'),
  user_id: 'test-user-123',
  project_id: 'test-project-123',
  company_id: 'test-company-123',
  date: new Date().toISOString().split('T')[0],
  start_time: '08:00:00',
  end_time: '17:00:00',
  hours: 8,
  description: 'Regular work day',
  cost_code: 'LABOR-001',
  hourly_rate: 50,
  is_billable: true,
  status: 'pending',
  geofence_breached: false,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

// ============================================================================
// GPS/Geofence Fixtures
// ============================================================================

export interface MockGeofence {
  id: string;
  company_id: string;
  project_id?: string;
  name: string;
  latitude: number;
  longitude: number;
  radius: number;
  geometry_type: 'circle' | 'polygon';
  polygon_coordinates?: Array<{ lat: number; lng: number }>;
  is_active: boolean;
  auto_clock_in: boolean;
  auto_clock_out: boolean;
  entry_alert: boolean;
  exit_alert: boolean;
  allowed_roles?: string[];
  created_at: string;
  updated_at: string;
}

export const createMockGeofence = (overrides: Partial<MockGeofence> = {}): MockGeofence => ({
  id: generateId('geofence'),
  company_id: 'test-company-123',
  project_id: 'test-project-123',
  name: 'Test Job Site',
  latitude: 34.0522,
  longitude: -118.2437,
  radius: 100,
  geometry_type: 'circle',
  is_active: true,
  auto_clock_in: true,
  auto_clock_out: true,
  entry_alert: true,
  exit_alert: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

export interface MockGPSLocation {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
  altitude?: number;
  altitudeAccuracy?: number;
  heading?: number;
  speed?: number;
}

export const createMockGPSLocation = (
  overrides: Partial<MockGPSLocation> = {}
): MockGPSLocation => ({
  latitude: 34.0522,
  longitude: -118.2437,
  accuracy: 10,
  timestamp: Date.now(),
  altitude: 100,
  altitudeAccuracy: 5,
  heading: 0,
  speed: 0,
  ...overrides,
});

// Location inside a geofence
export const createMockLocationInsideGeofence = (geofence: MockGeofence): MockGPSLocation =>
  createMockGPSLocation({
    latitude: geofence.latitude,
    longitude: geofence.longitude,
    accuracy: 5,
  });

// Location outside a geofence
export const createMockLocationOutsideGeofence = (geofence: MockGeofence): MockGPSLocation =>
  createMockGPSLocation({
    latitude: geofence.latitude + 0.01, // ~1km away
    longitude: geofence.longitude + 0.01,
    accuracy: 5,
  });

// ============================================================================
// Invoice Fixtures
// ============================================================================

export type InvoiceStatus = 'draft' | 'sent' | 'viewed' | 'paid' | 'overdue' | 'cancelled';

export interface MockInvoice {
  id: string;
  company_id: string;
  project_id?: string;
  invoice_number: string;
  client_name: string;
  client_email?: string;
  status: InvoiceStatus;
  subtotal: number;
  tax_rate?: number;
  tax_amount?: number;
  total: number;
  amount_paid: number;
  balance_due: number;
  issue_date: string;
  due_date: string;
  paid_date?: string;
  notes?: string;
  qb_invoice_id?: string;
  qb_sync_token?: string;
  last_synced_to_qb?: string;
  created_at: string;
  updated_at: string;
}

export const createMockInvoice = (overrides: Partial<MockInvoice> = {}): MockInvoice => ({
  id: generateId('invoice'),
  company_id: 'test-company-123',
  project_id: 'test-project-123',
  invoice_number: `INV-${String(idCounter).padStart(5, '0')}`,
  client_name: 'Test Client',
  client_email: 'client@example.com',
  status: 'draft',
  subtotal: 1000,
  tax_rate: 8.25,
  tax_amount: 82.5,
  total: 1082.5,
  amount_paid: 0,
  balance_due: 1082.5,
  issue_date: new Date().toISOString().split('T')[0],
  due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

// ============================================================================
// QuickBooks Integration Fixtures
// ============================================================================

export interface MockQuickBooksIntegration {
  id: string;
  company_id: string;
  realm_id?: string;
  access_token?: string;
  refresh_token?: string;
  token_expires_at?: string;
  is_connected: boolean;
  last_sync_at?: string;
  sync_status?: 'idle' | 'syncing' | 'error';
  sync_error?: string;
  created_at: string;
  updated_at: string;
}

export const createMockQuickBooksIntegration = (
  overrides: Partial<MockQuickBooksIntegration> = {}
): MockQuickBooksIntegration => ({
  id: generateId('qb-integration'),
  company_id: 'test-company-123',
  realm_id: 'test-realm-123',
  is_connected: true,
  sync_status: 'idle',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

export const createMockDisconnectedQuickBooksIntegration = () =>
  createMockQuickBooksIntegration({
    is_connected: false,
    realm_id: undefined,
    access_token: undefined,
    refresh_token: undefined,
  });

// ============================================================================
// Expense Fixtures
// ============================================================================

export interface MockExpense {
  id: string;
  company_id: string;
  project_id?: string;
  vendor_name: string;
  amount: number;
  date: string;
  category?: string;
  description?: string;
  receipt_url?: string;
  status: 'pending' | 'approved' | 'rejected' | 'reimbursed';
  submitted_by: string;
  approved_by?: string;
  created_at: string;
  updated_at: string;
}

export const createMockExpense = (overrides: Partial<MockExpense> = {}): MockExpense => ({
  id: generateId('expense'),
  company_id: 'test-company-123',
  project_id: 'test-project-123',
  vendor_name: 'Home Depot',
  amount: 250.0,
  date: new Date().toISOString().split('T')[0],
  category: 'Materials',
  description: 'Lumber for framing',
  status: 'pending',
  submitted_by: 'test-user-123',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

// ============================================================================
// Crew Assignment Fixtures
// ============================================================================

export interface MockCrewAssignment {
  id: string;
  company_id: string;
  project_id: string;
  user_id: string;
  assignment_date: string;
  status: 'scheduled' | 'dispatched' | 'onsite' | 'completed' | 'cancelled';
  check_in_time?: string;
  check_out_time?: string;
  gps_check_in_lat?: number;
  gps_check_in_lng?: number;
  gps_check_out_lat?: number;
  gps_check_out_lng?: number;
  check_in_verified?: boolean;
  is_currently_onsite?: boolean;
  distance_from_site?: number;
  created_at: string;
  updated_at: string;
}

export const createMockCrewAssignment = (
  overrides: Partial<MockCrewAssignment> = {}
): MockCrewAssignment => ({
  id: generateId('crew-assignment'),
  company_id: 'test-company-123',
  project_id: 'test-project-123',
  user_id: 'test-user-123',
  assignment_date: new Date().toISOString().split('T')[0],
  status: 'scheduled',
  is_currently_onsite: false,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

// ============================================================================
// Batch Fixtures
// ============================================================================

export const createMockProjects = (count: number, companyId?: string): MockProject[] =>
  Array.from({ length: count }, (_, i) =>
    createMockProject({
      name: `Project ${i + 1}`,
      company_id: companyId || 'test-company-123',
    })
  );

export const createMockTimeEntries = (
  count: number,
  options?: { userId?: string; projectId?: string }
): MockTimeEntry[] =>
  Array.from({ length: count }, () =>
    createMockTimeEntry({
      user_id: options?.userId || 'test-user-123',
      project_id: options?.projectId || 'test-project-123',
    })
  );

export const createMockInvoices = (count: number, status?: InvoiceStatus): MockInvoice[] =>
  Array.from({ length: count }, () =>
    createMockInvoice({
      status: status || 'draft',
    })
  );
