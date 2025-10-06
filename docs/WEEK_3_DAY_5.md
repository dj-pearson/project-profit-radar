# Week 3 Day 5: Security Best Practices

## Input Validation & Sanitization

### Schema Validation with Zod
```typescript
import { z } from 'zod';

// User input schemas
export const contactFormSchema = z.object({
  name: z.string()
    .trim()
    .min(1, 'Name is required')
    .max(100, 'Name must be less than 100 characters'),
  email: z.string()
    .trim()
    .email('Invalid email address')
    .max(255, 'Email must be less than 255 characters'),
  phone: z.string()
    .trim()
    .regex(/^[\d\s\-\+\(\)]+$/, 'Invalid phone number')
    .optional(),
  message: z.string()
    .trim()
    .min(1, 'Message is required')
    .max(5000, 'Message must be less than 5000 characters'),
});

// Project creation schema
export const projectSchema = z.object({
  name: z.string()
    .trim()
    .min(1, 'Project name is required')
    .max(200, 'Project name must be less than 200 characters'),
  description: z.string()
    .trim()
    .max(2000, 'Description must be less than 2000 characters')
    .optional(),
  budget: z.number()
    .positive('Budget must be positive')
    .max(99999999, 'Budget exceeds maximum')
    .optional(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
}).refine((data) => {
  if (data.startDate && data.endDate) {
    return data.endDate >= data.startDate;
  }
  return true;
}, {
  message: 'End date must be after start date',
  path: ['endDate'],
});
```

### XSS Prevention
```typescript
import DOMPurify from 'dompurify';

// Sanitize HTML content
export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br'],
    ALLOWED_ATTR: ['href'],
  });
}

// Safe rendering component
function SafeHtml({ content }: { content: string }) {
  const sanitized = useMemo(() => sanitizeHtml(content), [content]);
  return <div dangerouslySetInnerHTML={{ __html: sanitized }} />;
}

// URL encoding for external APIs
function sendToWhatsApp(phone: string, message: string) {
  const encodedPhone = encodeURIComponent(phone);
  const encodedMessage = encodeURIComponent(message);
  const url = `https://wa.me/${encodedPhone}?text=${encodedMessage}`;
  window.open(url, '_blank');
}
```

## Row-Level Security (RLS) Patterns

### Company-Based Access Control
```sql
-- Enable RLS on table
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Users can only view their company's projects
CREATE POLICY "Users can view company projects"
ON projects FOR SELECT
USING (company_id = get_user_company(auth.uid()));

-- Admins can manage company projects
CREATE POLICY "Admins can manage company projects"
ON projects FOR ALL
USING (
  company_id = get_user_company(auth.uid()) AND
  get_user_role(auth.uid()) = ANY(ARRAY['admin', 'root_admin'])
)
WITH CHECK (
  company_id = get_user_company(auth.uid()) AND
  get_user_role(auth.uid()) = ANY(ARRAY['admin', 'root_admin'])
);
```

### User-Specific Data Access
```sql
-- Enable RLS
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- Users can only access their own data
CREATE POLICY "Users can manage own preferences"
ON user_preferences FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());
```

### Public + Private Data Pattern
```sql
-- Enable RLS
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Public documents viewable by all
CREATE POLICY "Anyone can view public documents"
ON documents FOR SELECT
USING (is_public = true);

-- Private documents viewable by company members
CREATE POLICY "Company members can view private documents"
ON documents FOR SELECT
USING (
  is_public = false AND
  company_id = get_user_company(auth.uid())
);

-- Only admins can manage documents
CREATE POLICY "Admins can manage documents"
ON documents FOR ALL
USING (
  company_id = get_user_company(auth.uid()) AND
  get_user_role(auth.uid()) = ANY(ARRAY['admin', 'root_admin'])
);
```

## Authentication Security

### Protected Routes
```typescript
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

// Require authentication
export function ProtectedRoute() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <PageLoading />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

// Require specific role
export function RoleProtectedRoute({ allowedRoles }: { allowedRoles: string[] }) {
  const { user, role, isLoading } = useAuth();

  if (isLoading) {
    return <PageLoading />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
}
```

### Session Management
```typescript
import { supabase } from '@/integrations/supabase/client';

// Session refresh handling
export function useSessionRefresh() {
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'TOKEN_REFRESHED') {
          console.log('Token refreshed successfully');
        }
        
        if (event === 'SIGNED_OUT') {
          // Clear local state
          queryClient.clear();
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);
}

// Logout with cleanup
export async function logout() {
  try {
    // Clear sensitive data
    queryClient.clear();
    localStorage.removeItem('sensitive_data');
    
    // Sign out from Supabase
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    
    // Redirect to login
    window.location.href = '/login';
  } catch (error) {
    console.error('Logout error:', error);
    throw error;
  }
}
```

## API Security

### Rate Limiting
```typescript
// Edge function rate limiting
const rateLimit = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(userId: string, maxRequests = 100, windowMs = 60000): boolean {
  const now = Date.now();
  const userLimit = rateLimit.get(userId);

  if (!userLimit || now > userLimit.resetAt) {
    rateLimit.set(userId, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (userLimit.count >= maxRequests) {
    return false;
  }

  userLimit.count++;
  return true;
}
```

### Input Validation in Edge Functions
```typescript
// supabase/functions/create-project/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const projectSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  budget: z.number().positive().optional(),
});

serve(async (req) => {
  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Parse and validate input
    const body = await req.json();
    const validatedData = projectSchema.parse(body);

    // Process request with validated data
    // ...

    return new Response(
      JSON.stringify({ success: true, data: validatedData }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new Response(
        JSON.stringify({ error: 'Invalid input', details: error.errors }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
```

## Secrets Management

### Environment Variables
```typescript
// Never commit secrets to code
// ❌ BAD
const apiKey = 'sk-abc123xyz';

// ✅ GOOD - Use Supabase secrets
// Add via: supabase secrets set API_KEY=sk-abc123xyz

// In edge functions
const apiKey = Deno.env.get('API_KEY');
if (!apiKey) {
  throw new Error('API_KEY not configured');
}
```

### Encrypting Sensitive Data
```sql
-- Store encrypted data in database
CREATE TABLE payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  card_last_four TEXT NOT NULL,
  encrypted_card_data TEXT NOT NULL, -- Encrypted in application
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Never log sensitive data
-- ❌ BAD
console.log('Card number:', cardNumber);

-- ✅ GOOD
console.log('Processing payment for card ending in', cardNumber.slice(-4));
```

## Security Headers

### Content Security Policy
```typescript
// Add to edge function responses
const securityHeaders = {
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';",
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
};

return new Response(JSON.stringify(data), {
  status: 200,
  headers: {
    'Content-Type': 'application/json',
    ...securityHeaders,
  },
});
```

## Security Checklist

### Before Deployment
- [ ] All user inputs validated with schemas
- [ ] XSS protection implemented (no unescaped HTML)
- [ ] RLS policies enabled on all tables
- [ ] No secrets in code (use environment variables)
- [ ] Authentication required for protected routes
- [ ] Rate limiting implemented on API endpoints
- [ ] SQL injection prevented (using Supabase client)
- [ ] CORS configured properly
- [ ] Security headers set on responses
- [ ] Sensitive data encrypted at rest

### Regular Maintenance
- [ ] Review RLS policies quarterly
- [ ] Rotate API keys every 90 days
- [ ] Monitor failed login attempts
- [ ] Review audit logs weekly
- [ ] Update dependencies monthly
- [ ] Conduct security audits quarterly
- [ ] Test authentication flows monthly
- [ ] Review user permissions quarterly

## Common Vulnerabilities to Avoid

### SQL Injection
```typescript
// ❌ BAD - Never construct SQL from user input
const query = `SELECT * FROM users WHERE email = '${userEmail}'`;

// ✅ GOOD - Use Supabase client (parameterized queries)
const { data, error } = await supabase
  .from('users')
  .select('*')
  .eq('email', userEmail);
```

### XSS (Cross-Site Scripting)
```typescript
// ❌ BAD - Rendering user input directly
<div dangerouslySetInnerHTML={{ __html: userContent }} />

// ✅ GOOD - Sanitize first
<div dangerouslySetInnerHTML={{ __html: sanitizeHtml(userContent) }} />

// ✅ BETTER - Use text nodes
<div>{userContent}</div>
```

### CSRF (Cross-Site Request Forgery)
```typescript
// ✅ GOOD - Supabase handles CSRF protection
// Always use Supabase auth tokens
const { data, error } = await supabase
  .from('projects')
  .insert({ name: projectName });
```

### Insecure Direct Object References
```typescript
// ❌ BAD - Trusting user-provided IDs
async function getProject(projectId: string) {
  const { data } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .single();
  return data;
}

// ✅ GOOD - Verify ownership via RLS
// RLS policy ensures user can only access their company's projects
async function getProject(projectId: string) {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .single();
  
  if (error) {
    throw new Error('Project not found or access denied');
  }
  
  return data;
}
```

## Definition of Done

- ✅ All forms validate input with Zod schemas
- ✅ XSS protection implemented with DOMPurify
- ✅ RLS policies created for all tables
- ✅ Protected routes require authentication
- ✅ Session management handles token refresh
- ✅ No secrets in codebase
- ✅ Security headers added to API responses
- ✅ Rate limiting implemented
- ✅ Audit logging for sensitive operations
- ✅ Security checklist completed

## Next Steps: Week 4
- Mobile-first responsive design
- Touch interactions and gestures
- Progressive Web App features
- Offline functionality
