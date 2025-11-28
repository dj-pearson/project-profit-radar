# Edge Function Multi-Site Migration Guide

## Overview

This guide explains how to update Build-Desk Edge Functions (154+ functions) to support the new multi-site architecture. Each function must be updated to:

1. Extract `site_id` from the user's JWT
2. Apply `site_id` filtering on all database queries
3. Reject requests without a valid `site_id`

---

## Quick Reference: Site-Aware Edge Function Pattern

### Before (Single-Site)

```typescript
import { createClient } from '@supabase/supabase-js';

Deno.serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    {
      global: {
        headers: { Authorization: req.headers.get('Authorization')! },
      },
    }
  );

  // Query without site_id filter
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('company_id', companyId);

  return new Response(JSON.stringify({ data }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
```

### After (Multi-Site)

```typescript
import { createClient } from '@supabase/supabase-js';

Deno.serve(async (req) => {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    {
      global: {
        headers: { Authorization: authHeader },
      },
    }
  );

  // 1. Get the authenticated user
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // 2. Extract site_id from JWT
  const siteId = user.app_metadata?.site_id || user.user_metadata?.site_id;
  if (!siteId) {
    return new Response(
      JSON.stringify({ error: 'Missing site_id in authentication' }),
      { status: 403, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // 3. Query with site_id filter (RLS will also enforce this)
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('site_id', siteId)  // ← ADD THIS
    .eq('company_id', companyId);

  return new Response(JSON.stringify({ data, error }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
```

---

## Reusable Helper Functions

Create a shared utilities file for all Edge Functions:

### `_shared/auth-helpers.ts`

```typescript
import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface AuthContext {
  user: any;
  siteId: string;
  supabase: SupabaseClient;
}

/**
 * Initialize authenticated Supabase client and extract site_id
 * Returns null if authentication fails
 */
export async function initializeAuthContext(
  req: Request
): Promise<AuthContext | null> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return null;
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    {
      global: {
        headers: { Authorization: authHeader },
      },
    }
  );

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return null;
  }

  // Extract site_id from JWT
  const siteId = user.app_metadata?.site_id || user.user_metadata?.site_id;
  if (!siteId) {
    return null;
  }

  return { user, siteId, supabase };
}

/**
 * Return a standardized error response
 */
export function errorResponse(
  message: string,
  status: number = 400
): Response {
  return new Response(
    JSON.stringify({ error: message, success: false }),
    {
      status,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}

/**
 * Return a standardized success response
 */
export function successResponse(data: any): Response {
  return new Response(
    JSON.stringify({ data, success: true }),
    {
      headers: { 'Content-Type': 'application/json' },
    }
  );
}

/**
 * Verify user has access to a specific company within their site
 */
export async function verifyCompanyAccess(
  supabase: SupabaseClient,
  userId: string,
  companyId: string,
  siteId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('company_id')
    .eq('id', userId)
    .eq('company_id', companyId)
    .eq('site_id', siteId)
    .single();

  if (error || !data) {
    // Try profiles table if user_profiles doesn't exist
    const { data: profileData } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('user_id', userId)
      .eq('company_id', companyId)
      .eq('site_id', siteId)
      .single();

    return !!profileData;
  }

  return true;
}
```

### Example: Updated Edge Function Using Helper

```typescript
import { initializeAuthContext, errorResponse, successResponse } from '../_shared/auth-helpers.ts';

Deno.serve(async (req) => {
  // Initialize auth context
  const authContext = await initializeAuthContext(req);
  if (!authContext) {
    return errorResponse('Unauthorized', 401);
  }

  const { user, siteId, supabase } = authContext;

  try {
    // Parse request body
    const { projectId } = await req.json();

    // Query with site_id filtering
    const { data: project, error } = await supabase
      .from('projects')
      .select('*, company:companies(*)')
      .eq('id', projectId)
      .eq('site_id', siteId)  // ← Site isolation
      .single();

    if (error) throw error;
    if (!project) {
      return errorResponse('Project not found', 404);
    }

    // Perform business logic...
    // All queries MUST include .eq('site_id', siteId)

    return successResponse({ project });
  } catch (error) {
    console.error('Error:', error);
    return errorResponse(error.message, 500);
  }
});
```

---

## Migration Checklist by Edge Function Category

### 1. **Authentication & SSO Functions** (Priority: CRITICAL)

Functions:
- `sso-login`
- `oauth-callback`
- `magic-link-auth`

**Special Handling:**
- These functions set the `site_id` in the JWT during login
- Extract site from domain: `build-desk.com` → `builddesk`
- Call `get_site_by_domain()` database function

**Example:**

```typescript
// In SSO login function
const domain = new URL(req.headers.get('referer') || req.url).hostname;

// Get site_id from database
const { data: site } = await supabase
  .rpc('get_site_by_domain', { p_domain: domain });

if (!site) {
  return errorResponse('Invalid site domain', 400);
}

// Set site_id in user metadata during auth
const { data: session } = await supabase.auth.signInWithPassword({
  email,
  password,
  options: {
    data: {
      site_id: site.id,
    },
  },
});
```

---

### 2. **Payment & Stripe Functions** (Priority: HIGH)

Functions:
- `stripe-webhooks`
- `create-checkout-session`
- `manage-subscription`

**Key Points:**
- Stripe webhooks must validate site_id
- Store site_id in Stripe metadata
- Filter subscriptions by site

**Example:**

```typescript
// In stripe-webhooks
const stripeEvent = await stripe.webhooks.constructEvent(
  body,
  signature,
  webhookSecret
);

if (stripeEvent.type === 'checkout.session.completed') {
  const session = stripeEvent.data.object;
  const siteId = session.metadata.site_id;  // ← Get from metadata
  
  if (!siteId) {
    console.error('Missing site_id in Stripe session');
    return errorResponse('Invalid session', 400);
  }

  // Update subscription with site_id
  await supabase
    .from('companies')
    .update({ subscription_status: 'active' })
    .eq('id', session.metadata.company_id)
    .eq('site_id', siteId);  // ← Filter by site
}
```

---

### 3. **AI Functions** (Priority: MEDIUM)

Functions:
- `ai-content-generator`
- `ai-estimating`
- `analyze-images`
- `analyze-support-ticket`

**Apply site_id filtering on all queries:**

```typescript
const authContext = await initializeAuthContext(req);
if (!authContext) return errorResponse('Unauthorized', 401);

const { siteId, supabase } = authContext;

// When querying training data or saving results
const { data } = await supabase
  .from('estimates')
  .select('*')
  .eq('site_id', siteId)  // ← Ensures AI only sees site-specific data
  .limit(100);
```

---

### 4. **CRM & Sales Functions** (Priority: HIGH)

Functions:
- `crm-*`
- `lead-tracking-*`
- `email-campaigns-*`

**Site isolation is CRITICAL for CRM data:**

```typescript
// All CRM queries must include site_id
const { data: leads } = await supabase
  .from('crm_leads')
  .select('*')
  .eq('site_id', siteId)
  .eq('company_id', companyId);
```

---

### 5. **Analytics Functions** (Priority: MEDIUM)

Functions:
- `analytics-*`
- `bing-webmaster-api`
- `google-analytics-*`

**Aggregate analytics per site:**

```typescript
const { data: analytics } = await supabase
  .from('analytics_events')
  .select('event_name, count')
  .eq('site_id', siteId)  // ← Site-specific analytics
  .gte('created_at', startDate)
  .lte('created_at', endDate);
```

---

### 6. **GPS & Location Functions** (Priority: HIGH)

Functions:
- `gps-tracking-*`
- `geofence-*`

**Location data must be site-isolated:**

```typescript
const { data: checkins } = await supabase
  .from('crew_gps_checkins')
  .select('*')
  .eq('site_id', siteId)
  .eq('project_id', projectId);
```

---

### 7. **Blog & SEO Functions** (Priority: LOW)

Functions:
- `blog-*`
- `seo-*`
- `analyze-semantic-keywords`

**SEO data is site-specific:**

```typescript
// Each site has its own blog and SEO data
const { data: posts } = await supabase
  .from('blog_posts')
  .select('*')
  .eq('site_id', siteId)
  .eq('status', 'published');
```

---

### 8. **Shared/Cross-Site Functions** (Priority: LOW)

Some functions may be intentionally cross-site (e.g., global analytics dashboard for root admins).

**Mark these explicitly and add admin checks:**

```typescript
// Only allow root admins to access cross-site data
const { data: profile } = await supabase
  .from('user_profiles')
  .select('role')
  .eq('id', user.id)
  .single();

if (profile.role !== 'root_admin') {
  return errorResponse('Forbidden', 403);
}

// Now can query across all sites
const { data: allSites } = await supabase
  .from('sites')
  .select('*');
```

---

## Testing Each Edge Function

### 1. **Unit Test Template**

```typescript
// Test site isolation
const testSiteIsolation = async () => {
  // User from Site A tries to access Site B data
  const siteAToken = 'Bearer <site-a-jwt>';
  const siteBProjectId = '<site-b-project-id>';

  const response = await fetch('https://your-project.supabase.co/functions/v1/your-function', {
    method: 'POST',
    headers: {
      'Authorization': siteAToken,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ projectId: siteBProjectId }),
  });

  const result = await response.json();
  
  // Should return 404 or empty, not Site B data
  console.assert(result.data === null || result.error, 'Site isolation failed!');
};
```

### 2. **Manual Testing Checklist**

For each updated function:

- [ ] User from Site A cannot access Site B data
- [ ] User from Site A can access Site A data
- [ ] Function rejects requests without site_id in JWT
- [ ] Function handles missing site_id gracefully
- [ ] All database queries include `.eq('site_id', siteId)`
- [ ] Error messages don't leak site information

---

## Deployment Strategy

### Phase 1: Update Helper Functions (Week 1)
- Deploy `_shared/auth-helpers.ts`
- No breaking changes

### Phase 2: Update Critical Functions (Week 2)
- Authentication functions
- Payment functions
- CRM functions

### Phase 3: Update Remaining Functions (Week 3-4)
- AI functions
- Analytics functions
- GPS functions
- Blog/SEO functions

### Phase 4: Cleanup & Monitoring (Week 5)
- Remove old code
- Monitor logs for site_id errors
- Add Sentry alerts for missing site_id

---

## Common Pitfalls

### ❌ Pitfall 1: Forgetting to filter by site_id

```typescript
// BAD - Missing site_id filter
const { data } = await supabase
  .from('projects')
  .select('*')
  .eq('company_id', companyId);  // ← Can leak data from other sites!
```

```typescript
// GOOD
const { data } = await supabase
  .from('projects')
  .select('*')
  .eq('site_id', siteId)         // ← Site isolation
  .eq('company_id', companyId);
```

### ❌ Pitfall 2: Not handling missing site_id

```typescript
// BAD
const siteId = user.app_metadata.site_id;  // ← Can be undefined
const { data } = await supabase.from('projects').eq('site_id', siteId);
```

```typescript
// GOOD
const siteId = user.app_metadata?.site_id;
if (!siteId) {
  return errorResponse('Missing site_id', 403);
}
```

### ❌ Pitfall 3: Using admin key without site_id

```typescript
// BAD - Service role bypasses RLS, must manually filter
const adminSupabase = createClient(url, serviceRoleKey);
const { data } = await adminSupabase.from('projects').select('*');  // ← Returns ALL sites!
```

```typescript
// GOOD
const adminSupabase = createClient(url, serviceRoleKey);
const { data } = await adminSupabase
  .from('projects')
  .select('*')
  .eq('site_id', siteId);  // ← Must explicitly filter
```

---

## Monitoring & Alerts

### Add logging to every function:

```typescript
console.log('[Function Name] Request from site:', siteId);
console.log('[Function Name] User:', user.email);
```

### Sentry Error Tracking:

```typescript
import * as Sentry from '@sentry/deno';

try {
  // Function logic
} catch (error) {
  Sentry.captureException(error, {
    tags: {
      site_id: siteId,
      function: 'your-function-name',
    },
  });
  throw error;
}
```

---

## Summary

✅ **Every Edge Function must:**
1. Extract `site_id` from JWT using helper function
2. Reject requests without valid `site_id`
3. Add `.eq('site_id', siteId)` to ALL database queries
4. Test site isolation before deployment

✅ **Use the helper functions** in `_shared/auth-helpers.ts` for consistency

✅ **Deploy in phases** starting with authentication and payment functions

✅ **Monitor logs** for missing site_id errors

---

**Next Steps:**
- Review each Edge Function category
- Update functions using the patterns above
- Test thoroughly with multiple sites
- Deploy gradually with monitoring

