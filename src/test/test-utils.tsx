/**
 * Test Utilities for BuildDesk
 *
 * Provides custom render function with all required providers,
 * mock factories, and testing helpers.
 */
import React, { ReactElement, ReactNode } from 'react';
import { render, RenderOptions, RenderResult } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import userEvent from '@testing-library/user-event';

// Mock Auth Context
interface MockUser {
  id: string;
  email: string;
  app_metadata?: Record<string, unknown>;
  user_metadata?: Record<string, unknown>;
  aud?: string;
  created_at?: string;
}

interface MockUserProfile {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  company_id?: string;
  role: 'root_admin' | 'admin' | 'project_manager' | 'field_supervisor' | 'office_staff' | 'accounting' | 'client_portal';
  is_active: boolean;
}

interface MockAuthContextValue {
  user: MockUser | null;
  session: { access_token: string; refresh_token: string } | null;
  userProfile: MockUserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signInWithGoogle: () => Promise<{ error?: string }>;
  signInWithApple: () => Promise<{ error?: string }>;
  signUp: (email: string, password: string, userData?: unknown) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error?: string }>;
  updateProfile: (updates: Partial<MockUserProfile>) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

// Create mock auth context
const MockAuthContext = React.createContext<MockAuthContextValue | undefined>(undefined);

export const useMockAuth = () => {
  const context = React.useContext(MockAuthContext);
  if (!context) {
    throw new Error('useMockAuth must be used within MockAuthProvider');
  }
  return context;
};

// Mock Theme Context
interface MockThemeContextValue {
  theme: 'light' | 'dark' | 'system';
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  actualTheme: 'light' | 'dark';
  accessibility: {
    highContrast: boolean;
    reduceMotion: boolean;
    screenReader: boolean;
    keyboardNavigation: boolean;
    fontSize: 'small' | 'medium' | 'large';
  };
  updateAccessibility: (prefs: Partial<MockThemeContextValue['accessibility']>) => void;
}

const MockThemeContext = React.createContext<MockThemeContextValue | undefined>(undefined);

export const useMockTheme = () => {
  const context = React.useContext(MockThemeContext);
  if (!context) {
    throw new Error('useMockTheme must be used within MockThemeProvider');
  }
  return context;
};

// Default mock values
export const defaultMockUser: MockUser = {
  id: 'test-user-123',
  email: 'test@builddesk.com',
  app_metadata: {},
  user_metadata: {},
  aud: 'authenticated',
  created_at: new Date().toISOString(),
};

export const defaultMockUserProfile: MockUserProfile = {
  id: 'test-user-123',
  email: 'test@builddesk.com',
  first_name: 'Test',
  last_name: 'User',
  company_id: 'test-company-123',
  role: 'admin',
  is_active: true,
};

export const defaultMockSession = {
  access_token: 'mock-access-token',
  refresh_token: 'mock-refresh-token',
};

export const defaultMockTheme: MockThemeContextValue = {
  theme: 'light',
  setTheme: vi.fn(),
  actualTheme: 'light',
  accessibility: {
    highContrast: false,
    reduceMotion: false,
    screenReader: false,
    keyboardNavigation: false,
    fontSize: 'medium',
  },
  updateAccessibility: vi.fn(),
};

// Create default mock auth value
export const createMockAuthValue = (
  overrides: Partial<MockAuthContextValue> = {}
): MockAuthContextValue => ({
  user: defaultMockUser,
  session: defaultMockSession,
  userProfile: defaultMockUserProfile,
  loading: false,
  signIn: vi.fn().mockResolvedValue({}),
  signInWithGoogle: vi.fn().mockResolvedValue({}),
  signInWithApple: vi.fn().mockResolvedValue({}),
  signUp: vi.fn().mockResolvedValue({}),
  signOut: vi.fn().mockResolvedValue(undefined),
  resetPassword: vi.fn().mockResolvedValue({}),
  updateProfile: vi.fn().mockResolvedValue(undefined),
  refreshProfile: vi.fn().mockResolvedValue(undefined),
  ...overrides,
});

// Create unauthenticated mock auth value
export const createUnauthenticatedMockAuth = (): MockAuthContextValue => ({
  user: null,
  session: null,
  userProfile: null,
  loading: false,
  signIn: vi.fn().mockResolvedValue({}),
  signInWithGoogle: vi.fn().mockResolvedValue({}),
  signInWithApple: vi.fn().mockResolvedValue({}),
  signUp: vi.fn().mockResolvedValue({}),
  signOut: vi.fn().mockResolvedValue(undefined),
  resetPassword: vi.fn().mockResolvedValue({}),
  updateProfile: vi.fn().mockResolvedValue(undefined),
  refreshProfile: vi.fn().mockResolvedValue(undefined),
});

// Provider wrapper options
interface AllTheProvidersOptions {
  authValue?: MockAuthContextValue;
  themeValue?: MockThemeContextValue;
  queryClient?: QueryClient;
  initialRoute?: string;
  useMemoryRouter?: boolean;
}

// Create a new QueryClient for each test to ensure isolation
const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });

// All providers wrapper
const AllTheProviders = ({
  children,
  options = {},
}: {
  children: ReactNode;
  options?: AllTheProvidersOptions;
}) => {
  const {
    authValue = createMockAuthValue(),
    themeValue = defaultMockTheme,
    queryClient = createTestQueryClient(),
    initialRoute = '/',
    useMemoryRouter = true,
  } = options;

  const RouterWrapper = useMemoryRouter
    ? ({ children }: { children: ReactNode }) => (
        <MemoryRouter initialEntries={[initialRoute]}>{children}</MemoryRouter>
      )
    : BrowserRouter;

  return (
    <QueryClientProvider client={queryClient}>
      <MockAuthContext.Provider value={authValue}>
        <MockThemeContext.Provider value={themeValue}>
          <RouterWrapper>{children}</RouterWrapper>
        </MockThemeContext.Provider>
      </MockAuthContext.Provider>
    </QueryClientProvider>
  );
};

// Custom render options
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  providerOptions?: AllTheProvidersOptions;
}

// Custom render function
const customRender = (
  ui: ReactElement,
  options: CustomRenderOptions = {}
): RenderResult & { user: ReturnType<typeof userEvent.setup> } => {
  const { providerOptions, ...renderOptions } = options;

  const user = userEvent.setup();

  const result = render(ui, {
    wrapper: ({ children }) => (
      <AllTheProviders options={providerOptions}>{children}</AllTheProviders>
    ),
    ...renderOptions,
  });

  return { ...result, user };
};

// Re-export everything from testing-library
export * from '@testing-library/react';

// Override render with custom render
export { customRender as render };

// Export userEvent for convenience
export { userEvent };

// Export providers for manual wrapping
export { AllTheProviders, MockAuthContext, MockThemeContext };

// Export QueryClient creator
export { createTestQueryClient };
