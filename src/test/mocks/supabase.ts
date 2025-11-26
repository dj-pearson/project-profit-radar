/**
 * Supabase Mock Client for Testing
 *
 * Provides mock implementations of Supabase client methods
 * for isolated unit testing without network calls.
 */
import { vi } from 'vitest';

// ============================================================================
// Types
// ============================================================================

export interface MockQueryResult<T> {
  data: T | null;
  error: MockSupabaseError | null;
  count?: number | null;
  status?: number;
  statusText?: string;
}

export interface MockSupabaseError {
  message: string;
  code?: string;
  details?: string;
  hint?: string;
}

// ============================================================================
// Query Builder Mock
// ============================================================================

export class MockQueryBuilder<T = unknown> {
  private _data: T | T[] | null = null;
  private _error: MockSupabaseError | null = null;
  private _count: number | null = null;

  // Set mock response data
  mockData(data: T | T[] | null): this {
    this._data = data;
    return this;
  }

  // Set mock error
  mockError(error: MockSupabaseError): this {
    this._error = error;
    return this;
  }

  // Set mock count
  mockCount(count: number): this {
    this._count = count;
    return this;
  }

  // Query methods - return self for chaining
  select = vi.fn().mockReturnThis();
  insert = vi.fn().mockReturnThis();
  update = vi.fn().mockReturnThis();
  upsert = vi.fn().mockReturnThis();
  delete = vi.fn().mockReturnThis();

  // Filter methods
  eq = vi.fn().mockReturnThis();
  neq = vi.fn().mockReturnThis();
  gt = vi.fn().mockReturnThis();
  gte = vi.fn().mockReturnThis();
  lt = vi.fn().mockReturnThis();
  lte = vi.fn().mockReturnThis();
  like = vi.fn().mockReturnThis();
  ilike = vi.fn().mockReturnThis();
  is = vi.fn().mockReturnThis();
  in = vi.fn().mockReturnThis();
  contains = vi.fn().mockReturnThis();
  containedBy = vi.fn().mockReturnThis();
  match = vi.fn().mockReturnThis();
  not = vi.fn().mockReturnThis();
  or = vi.fn().mockReturnThis();
  filter = vi.fn().mockReturnThis();
  textSearch = vi.fn().mockReturnThis();

  // Order and pagination
  order = vi.fn().mockReturnThis();
  limit = vi.fn().mockReturnThis();
  range = vi.fn().mockReturnThis();

  // Single row methods
  single = vi.fn().mockImplementation(async () => ({
    data: Array.isArray(this._data) ? this._data[0] : this._data,
    error: this._error,
  }));

  maybeSingle = vi.fn().mockImplementation(async () => ({
    data: Array.isArray(this._data) ? this._data[0] : this._data,
    error: this._error,
  }));

  // Execute and return result
  then = (resolve: (result: MockQueryResult<T | T[]>) => void) => {
    resolve({
      data: this._data,
      error: this._error,
      count: this._count,
    });
    return Promise.resolve({
      data: this._data,
      error: this._error,
      count: this._count,
    });
  };
}

// ============================================================================
// Auth Mock
// ============================================================================

export interface MockUser {
  id: string;
  email: string;
  phone?: string;
  app_metadata: Record<string, unknown>;
  user_metadata: Record<string, unknown>;
  aud: string;
  created_at: string;
}

export interface MockSession {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  expires_at: number;
  token_type: string;
  user: MockUser;
}

export const createMockUser = (overrides: Partial<MockUser> = {}): MockUser => ({
  id: 'test-user-id',
  email: 'test@example.com',
  app_metadata: {},
  user_metadata: {},
  aud: 'authenticated',
  created_at: new Date().toISOString(),
  ...overrides,
});

export const createMockSession = (user?: MockUser): MockSession => ({
  access_token: 'mock-access-token',
  refresh_token: 'mock-refresh-token',
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  token_type: 'bearer',
  user: user || createMockUser(),
});

export const createMockAuthClient = () => {
  const mockUser = createMockUser();
  const mockSession = createMockSession(mockUser);

  return {
    getSession: vi.fn().mockResolvedValue({
      data: { session: mockSession },
      error: null,
    }),
    getUser: vi.fn().mockResolvedValue({
      data: { user: mockUser },
      error: null,
    }),
    signInWithPassword: vi.fn().mockResolvedValue({
      data: { user: mockUser, session: mockSession },
      error: null,
    }),
    signInWithOAuth: vi.fn().mockResolvedValue({
      data: { url: 'https://oauth.example.com', provider: 'google' },
      error: null,
    }),
    signUp: vi.fn().mockResolvedValue({
      data: { user: mockUser, session: mockSession },
      error: null,
    }),
    signOut: vi.fn().mockResolvedValue({ error: null }),
    resetPasswordForEmail: vi.fn().mockResolvedValue({ error: null }),
    updateUser: vi.fn().mockResolvedValue({
      data: { user: mockUser },
      error: null,
    }),
    refreshSession: vi.fn().mockResolvedValue({
      data: { session: mockSession },
      error: null,
    }),
    onAuthStateChange: vi.fn().mockReturnValue({
      data: {
        subscription: {
          unsubscribe: vi.fn(),
        },
      },
    }),
  };
};

// ============================================================================
// Storage Mock
// ============================================================================

export const createMockStorageClient = () => ({
  from: vi.fn().mockReturnValue({
    upload: vi.fn().mockResolvedValue({
      data: { path: 'test-path/file.jpg' },
      error: null,
    }),
    download: vi.fn().mockResolvedValue({
      data: new Blob(['test']),
      error: null,
    }),
    getPublicUrl: vi.fn().mockReturnValue({
      data: { publicUrl: 'https://storage.example.com/test-path/file.jpg' },
    }),
    remove: vi.fn().mockResolvedValue({
      data: [{ name: 'file.jpg' }],
      error: null,
    }),
    list: vi.fn().mockResolvedValue({
      data: [{ name: 'file1.jpg' }, { name: 'file2.jpg' }],
      error: null,
    }),
    createSignedUrl: vi.fn().mockResolvedValue({
      data: { signedUrl: 'https://storage.example.com/signed/file.jpg' },
      error: null,
    }),
  }),
});

// ============================================================================
// RPC Mock
// ============================================================================

export const createMockRpcClient = () => {
  const rpcMocks = new Map<string, unknown>();

  return {
    rpc: vi.fn().mockImplementation((functionName: string, params?: Record<string, unknown>) => {
      const mockResponse = rpcMocks.get(functionName);
      return Promise.resolve({
        data: mockResponse || null,
        error: null,
      });
    }),
    setRpcMock: (functionName: string, response: unknown) => {
      rpcMocks.set(functionName, response);
    },
    clearRpcMocks: () => {
      rpcMocks.clear();
    },
  };
};

// ============================================================================
// Realtime Mock
// ============================================================================

export const createMockRealtimeClient = () => {
  const channels = new Map<string, MockChannel>();

  class MockChannel {
    private handlers: Map<string, Array<(payload: unknown) => void>> = new Map();

    on = vi.fn().mockImplementation(
      (
        event: string,
        config: Record<string, unknown>,
        callback: (payload: unknown) => void
      ) => {
        const key = `${event}:${JSON.stringify(config)}`;
        if (!this.handlers.has(key)) {
          this.handlers.set(key, []);
        }
        this.handlers.get(key)!.push(callback);
        return this;
      }
    );

    subscribe = vi.fn().mockImplementation((callback?: (status: string) => void) => {
      if (callback) callback('SUBSCRIBED');
      return this;
    });

    unsubscribe = vi.fn().mockResolvedValue('ok');

    // Helper to trigger events in tests
    emit(event: string, config: Record<string, unknown>, payload: unknown) {
      const key = `${event}:${JSON.stringify(config)}`;
      const handlers = this.handlers.get(key) || [];
      handlers.forEach((handler) => handler(payload));
    }
  }

  return {
    channel: vi.fn().mockImplementation((name: string) => {
      if (!channels.has(name)) {
        channels.set(name, new MockChannel());
      }
      return channels.get(name)!;
    }),
    removeChannel: vi.fn().mockImplementation((channel: unknown) => {
      return Promise.resolve('ok');
    }),
    getChannel: (name: string) => channels.get(name),
  };
};

// ============================================================================
// Full Supabase Client Mock
// ============================================================================

export interface MockSupabaseClient {
  auth: ReturnType<typeof createMockAuthClient>;
  storage: ReturnType<typeof createMockStorageClient>;
  realtime: ReturnType<typeof createMockRealtimeClient>;
  rpc: ReturnType<typeof createMockRpcClient>['rpc'];
  from: (table: string) => MockQueryBuilder;
  channel: ReturnType<typeof createMockRealtimeClient>['channel'];
  removeChannel: ReturnType<typeof createMockRealtimeClient>['removeChannel'];
  _tables: Map<string, MockQueryBuilder>;
  _rpcClient: ReturnType<typeof createMockRpcClient>;
}

export const createMockSupabaseClient = (): MockSupabaseClient => {
  const tables = new Map<string, MockQueryBuilder>();
  const authClient = createMockAuthClient();
  const storageClient = createMockStorageClient();
  const realtimeClient = createMockRealtimeClient();
  const rpcClient = createMockRpcClient();

  return {
    auth: authClient,
    storage: storageClient,
    realtime: realtimeClient,
    rpc: rpcClient.rpc,
    from: vi.fn().mockImplementation((table: string) => {
      if (!tables.has(table)) {
        tables.set(table, new MockQueryBuilder());
      }
      return tables.get(table)!;
    }),
    channel: realtimeClient.channel,
    removeChannel: realtimeClient.removeChannel,
    _tables: tables,
    _rpcClient: rpcClient,
  };
};

// ============================================================================
// Mock Supabase Module
// ============================================================================

export const mockSupabaseModule = () => {
  const mockClient = createMockSupabaseClient();

  vi.mock('@/integrations/supabase/client', () => ({
    supabase: mockClient,
  }));

  return mockClient;
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Set up table mock data for a specific table
 */
export const setupTableMock = <T>(
  client: MockSupabaseClient,
  tableName: string,
  data: T | T[],
  error?: MockSupabaseError
): MockQueryBuilder<T> => {
  const builder = client.from(tableName) as MockQueryBuilder<T>;
  builder.mockData(data);
  if (error) {
    builder.mockError(error);
  }
  return builder;
};

/**
 * Set up RPC mock response
 */
export const setupRpcMock = (
  client: MockSupabaseClient,
  functionName: string,
  response: unknown
): void => {
  client._rpcClient.setRpcMock(functionName, response);
};

/**
 * Create a mock Supabase error
 */
export const createMockError = (
  message: string,
  code?: string
): MockSupabaseError => ({
  message,
  code,
});
