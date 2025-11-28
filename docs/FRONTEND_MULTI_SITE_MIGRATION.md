# Frontend Multi-Site Migration Guide

## Overview

This guide explains how to update the Build-Desk frontend to support the new multi-site architecture. The frontend must:

1. Determine which site the user is accessing (by domain)
2. Set `site_id` in the user's JWT during authentication
3. Include `site_id` in all database queries
4. Handle site-specific branding and configuration

---

## Phase 1: Site Resolution

### 1.1 Create Site Resolver Utility

Create `/src/lib/site-resolver.ts`:

```typescript
import { supabase } from '@/integrations/supabase/client';

export interface SiteConfig {
  id: string;
  key: string;
  name: string;
  domain: string;
  branding?: {
    logo_url?: string;
    primary_color?: string;
    secondary_color?: string;
    favicon_url?: string;
  };
  features?: Record<string, boolean>;
}

/**
 * Get site configuration based on current domain
 */
export async function getSiteConfig(): Promise<SiteConfig | null> {
  try {
    const hostname = window.location.hostname;
    
    // Map domains to site keys
    const siteKeyMap: Record<string, string> = {
      'build-desk.com': 'builddesk',
      'www.build-desk.com': 'builddesk',
      'builddesk.pearsonperformance.workers.dev': 'builddesk',
      'localhost': 'builddesk',  // Development
      '127.0.0.1': 'builddesk',  // Development
      
      // Add future sites here:
      // 'realestatebio.com': 'realestate',
      // 'salonpros.bio': 'salonpros',
    };
    
    const siteKey = siteKeyMap[hostname];
    if (!siteKey) {
      console.error(`Unknown domain: ${hostname}`);
      return null;
    }
    
    // Fetch site config from database
    const { data, error } = await supabase
      .from('sites')
      .select('*')
      .eq('key', siteKey)
      .eq('is_active', true)
      .single();
    
    if (error || !data) {
      console.error('Failed to fetch site config:', error);
      return null;
    }
    
    return data as SiteConfig;
  } catch (error) {
    console.error('Error resolving site:', error);
    return null;
  }
}

/**
 * Get the current site ID from localStorage or resolve it
 */
export async function getCurrentSiteId(): Promise<string | null> {
  // Try localStorage first (cached)
  const cachedSiteId = localStorage.getItem('site_id');
  if (cachedSiteId) {
    return cachedSiteId;
  }
  
  // Resolve from domain
  const siteConfig = await getSiteConfig();
  if (siteConfig) {
    localStorage.setItem('site_id', siteConfig.id);
    localStorage.setItem('site_key', siteConfig.key);
    localStorage.setItem('site_config', JSON.stringify(siteConfig));
    return siteConfig.id;
  }
  
  return null;
}

/**
 * Clear cached site data (call on logout)
 */
export function clearSiteCache() {
  localStorage.removeItem('site_id');
  localStorage.removeItem('site_key');
  localStorage.removeItem('site_config');
}
```

---

## Phase 2: Update AuthContext

### 2.1 Update `/src/contexts/AuthContext.tsx`

```typescript
import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { getSiteConfig, getCurrentSiteId, clearSiteCache } from '@/lib/site-resolver';
import type { SiteConfig } from '@/lib/site-resolver';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  siteId: string | null;
  siteConfig: SiteConfig | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [siteId, setSiteId] = useState<string | null>(null);
  const [siteConfig, setSiteConfig] = useState<SiteConfig | null>(null);
  const [loading, setLoading] = useState(true);

  // Initialize site config on mount
  useEffect(() => {
    const initializeSite = async () => {
      const config = await getSiteConfig();
      if (config) {
        setSiteConfig(config);
        setSiteId(config.id);
      }
    };
    
    initializeSite();
  }, []);

  // Handle auth state changes
  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      // Extract site_id from session if available
      if (session?.user) {
        const sessionSiteId = session.user.app_metadata?.site_id || 
                              session.user.user_metadata?.site_id;
        if (sessionSiteId) {
          setSiteId(sessionSiteId);
        }
      }
      
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          const sessionSiteId = session.user.app_metadata?.site_id || 
                                session.user.user_metadata?.site_id;
          if (sessionSiteId) {
            setSiteId(sessionSiteId);
          }
        } else {
          setSiteId(null);
        }
        
        setLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    // Get current site ID
    const currentSiteId = await getCurrentSiteId();
    if (!currentSiteId) {
      throw new Error('Unable to determine site');
    }

    // Sign in with site_id in user_metadata
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
      options: {
        data: {
          site_id: currentSiteId,
        },
      },
    });

    if (error) throw error;
    
    // Update user metadata to include site_id if not already set
    if (data.user && !data.user.app_metadata?.site_id) {
      await supabase.auth.updateUser({
        data: {
          site_id: currentSiteId,
        },
      });
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    clearSiteCache();
    setSiteId(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        siteId,
        siteConfig,
        loading,
        signIn,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
```

---

## Phase 3: Update All Hooks

### 3.1 Create Site-Aware Query Hook

Create `/src/hooks/useSiteQuery.ts`:

```typescript
import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

/**
 * Site-aware query hook that automatically filters by site_id
 * 
 * Usage:
 * const { data } = useSiteQuery('projects', async (siteId) => {
 *   return supabase
 *     .from('projects')
 *     .select('*')
 *     .eq('site_id', siteId);
 * });
 */
export function useSiteQuery<TData = any>(
  queryKey: string | readonly unknown[],
  queryFn: (siteId: string) => Promise<{ data: TData | null; error: any }>,
  options?: Omit<UseQueryOptions<TData, Error>, 'queryKey' | 'queryFn'>
) {
  const { siteId } = useAuth();

  return useQuery({
    queryKey: Array.isArray(queryKey) ? [...queryKey, siteId] : [queryKey, siteId],
    queryFn: async () => {
      if (!siteId) {
        throw new Error('No site_id available');
      }

      const { data, error } = await queryFn(siteId);
      if (error) throw error;
      return data;
    },
    enabled: !!siteId,
    ...options,
  });
}
```

### 3.2 Update Existing Hooks

**Before:**

```typescript
// src/hooks/useProjects.ts
export function useProjects() {
  return useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });
}
```

**After:**

```typescript
// src/hooks/useProjects.ts
import { useSiteQuery } from './useSiteQuery';

export function useProjects() {
  return useSiteQuery('projects', async (siteId) => {
    return supabase
      .from('projects')
      .select('*')
      .eq('site_id', siteId)  // ← Add site_id filter
      .order('created_at', { ascending: false });
  });
}
```

---

## Phase 4: Update Components

### 4.1 Add Site Check to Protected Routes

Update `/src/App.tsx` or your routing logic:

```typescript
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, siteId } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  if (!siteId) {
    return (
      <div>
        <h1>Site Configuration Error</h1>
        <p>Unable to determine which site you're accessing. Please contact support.</p>
      </div>
    );
  }

  return <>{children}</>;
}
```

### 4.2 Update Components with Direct Queries

**Before:**

```typescript
const { data: projects } = useQuery({
  queryKey: ['projects'],
  queryFn: async () => {
    const { data } = await supabase.from('projects').select('*');
    return data;
  },
});
```

**After:**

```typescript
const { siteId } = useAuth();

const { data: projects } = useQuery({
  queryKey: ['projects', siteId],
  queryFn: async () => {
    if (!siteId) throw new Error('No site_id');
    const { data } = await supabase
      .from('projects')
      .select('*')
      .eq('site_id', siteId);  // ← Add filter
    return data;
  },
  enabled: !!siteId,
});
```

---

## Phase 5: Site-Specific Branding

### 5.1 Apply Site Branding

Update `/src/App.tsx` or your theme provider:

```typescript
import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';

export function App() {
  const { siteConfig } = useAuth();

  useEffect(() => {
    if (siteConfig?.branding) {
      const { primary_color, secondary_color, favicon_url } = siteConfig.branding;

      // Update CSS variables
      if (primary_color) {
        document.documentElement.style.setProperty('--primary', primary_color);
      }
      if (secondary_color) {
        document.documentElement.style.setProperty('--secondary', secondary_color);
      }

      // Update favicon
      if (favicon_url) {
        const link = document.querySelector("link[rel*='icon']") as HTMLLinkElement;
        if (link) {
          link.href = favicon_url;
        }
      }

      // Update page title
      document.title = siteConfig.name || 'Build-Desk';
    }
  }, [siteConfig]);

  return (
    // Your app JSX
  );
}
```

---

## Phase 6: Mobile Apps (Capacitor & Expo)

### 6.1 Capacitor Configuration

Update `capacitor.config.ts`:

```typescript
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.builddesk.app',
  appName: 'Build-Desk',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    // Add site_id to initial URL
    url: 'https://build-desk.com?site=builddesk',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 0,
    },
  },
};

export default config;
```

### 6.2 Mobile Authentication

Update mobile login flow:

```typescript
// In mobile app login
import { Capacitor } from '@capacitor/core';

const handleMobileLogin = async (email: string, password: string) => {
  const isNative = Capacitor.isNativePlatform();
  
  // For native apps, hardcode the site_id
  const siteId = isNative ? 'builddesk' : await getCurrentSiteId();
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
    options: {
      data: {
        site_id: siteId,
      },
    },
  });

  if (error) throw error;
};
```

---

## Phase 7: Testing Checklist

### Frontend Testing

- [ ] User can log in from correct domain
- [ ] User cannot log in from unknown domain
- [ ] `site_id` is set in localStorage after login
- [ ] `site_id` is included in JWT after login
- [ ] All queries include `.eq('site_id', siteId)` filter
- [ ] Site-specific branding is applied correctly
- [ ] Mobile app authenticates with correct `site_id`

### Cross-Site Isolation Testing

- [ ] User from Site A cannot see Site B data in UI
- [ ] Network requests include correct `site_id`
- [ ] Switching domains clears cached `site_id`
- [ ] Error messages don't leak site information

---

## Phase 8: Deployment

### 8.1 Environment Variables

Ensure these are set in your deployment environment:

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 8.2 Domain Configuration

For each new site, configure:

1. **DNS**: Point domain to Cloudflare Pages
2. **SSL**: Enable HTTPS
3. **Site Resolver**: Add domain mapping in `site-resolver.ts`
4. **Database**: Create site row in `sites` table

### 8.3 Rollback Plan

If issues arise:

```typescript
// Emergency fallback: Disable site filtering
const DISABLE_SITE_FILTERING = false;  // Set to true in emergency

export function useProjects() {
  const { siteId } = useAuth();
  
  return useQuery({
    queryKey: ['projects', siteId],
    queryFn: async () => {
      const query = supabase.from('projects').select('*');
      
      // Apply site filter unless disabled
      if (!DISABLE_SITE_FILTERING && siteId) {
        query.eq('site_id', siteId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}
```

---

## Summary

✅ **Frontend changes required:**
1. Add site resolver utility (`site-resolver.ts`)
2. Update `AuthContext` to include `siteId` and `siteConfig`
3. Create `useSiteQuery` hook for automatic filtering
4. Update all hooks and components to filter by `site_id`
5. Apply site-specific branding
6. Update mobile apps to include `site_id`

✅ **Testing:**
- Test authentication flow sets `site_id` correctly
- Verify all queries filter by `site_id`
- Confirm cross-site isolation
- Test mobile apps

✅ **Deployment:**
- Configure domains for each site
- Update site resolver with new domains
- Create site rows in database
- Test end-to-end flow

---

**Next Steps:**
- Update `AuthContext.tsx` with site support
- Create `site-resolver.ts` utility
- Update top 10 most-used hooks
- Test with multiple domains
- Deploy gradually with monitoring

