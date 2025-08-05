import React, { createContext, useContext } from 'react';

// Mock user profile for testing - using real company ID from database
const mockUserProfile = {
  id: 'test-user-123',
  email: 'test@builddesk.com',
  first_name: 'Test',
  last_name: 'User',
  company_id: 'fcfd2e31-637b-466b-b533-df70f7f1b3af', // Real company ID from database
  role: 'admin' as const,
  is_active: true
};

// Mock auth context for testing
const MockAuthContext = createContext({
  user: { id: 'test-user-123', email: 'test@builddesk.com' },
  userProfile: mockUserProfile,
  loading: false,
  signOut: () => Promise.resolve()
});

export const MockAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <MockAuthContext.Provider value={{
      user: { id: 'test-user-123', email: 'test@builddesk.com' },
      userProfile: mockUserProfile,
      loading: false,
      signOut: () => Promise.resolve()
    }}>
      {children}
    </MockAuthContext.Provider>
  );
};

export const useMockAuth = () => useContext(MockAuthContext);