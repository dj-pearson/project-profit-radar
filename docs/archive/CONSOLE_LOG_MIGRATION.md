# Console.log Migration Guide

This guide explains how to migrate from `console.log/error/warn` statements to the new production-safe logger service.

## Why Migrate?

- **Production Safety**: Console logs won't appear in production builds
- **Better Error Tracking**: Errors can be sent to tracking services (Sentry, LogRocket)
- **Structured Logging**: Add context and metadata to logs
- **Performance**: Reduced overhead in production
- **Debugging**: Better development experience with formatted logs

---

## Quick Reference

### Before (Old Way):
```typescript
console.log('User logged in');
console.warn('API deprecated');
console.error('Failed to save', error);
```

### After (New Way):
```typescript
import { logger } from '@/lib/logger';

logger.debug('User logged in');
logger.warn('API deprecated');
logger.error('Failed to save', error);
```

---

## Migration Patterns

### 1. Simple Debug Logs

```typescript
// ❌ OLD
console.log('Starting process');
console.log('Data:', data);

// ✅ NEW
logger.debug('Starting process');
logger.debug('Data received', { data });
```

### 2. Info Messages

```typescript
// ❌ OLD
console.log('[API] Request successful');
console.info('User authenticated');

// ✅ NEW
logger.info('API request successful');
logger.info('User authenticated');
```

### 3. Warnings

```typescript
// ❌ OLD
console.warn('Deprecated API used');
console.warn('Cache miss for key:', key);

// ✅ NEW
logger.warn('Deprecated API used');
logger.warn('Cache miss', { key });
```

### 4. Errors

```typescript
// ❌ OLD
console.error('Save failed:', error);
console.error('Network error:', error.message);

// ✅ NEW
logger.error('Save failed', error);
logger.error('Network error', error, { userId: '123' });
```

### 5. With Context/Metadata

```typescript
// ❌ OLD
console.log('Processing order', orderId, userId);

// ✅ NEW
logger.debug('Processing order', { orderId, userId });
```

### 6. Grouped Logs

```typescript
// ❌ OLD
console.group('User Data');
console.log('Name:', user.name);
console.log('Email:', user.email);
console.groupEnd();

// ✅ NEW
logger.group('User Data', () => {
  logger.debug('Name:', user.name);
  logger.debug('Email:', user.email);
});
```

### 7. Performance Timing

```typescript
// ❌ OLD
console.time('API Call');
// ... code ...
console.timeEnd('API Call');

// ✅ NEW
const startTime = performance.now();
// ... code ...
logger.performance('API Call', startTime);
```

### 8. Table Display

```typescript
// ❌ OLD
console.table(users);

// ✅ NEW
logger.table(users);
```

---

## Log Levels

### debug
- Development only
- Detailed information for debugging
- Use for: Tracing code flow, variable values, function calls

```typescript
logger.debug('Function called with params', { param1, param2 });
```

### info
- General information
- Use for: Successful operations, state changes, key milestones

```typescript
logger.info('User logged in successfully', { userId });
```

### warn
- Warning conditions
- Use for: Deprecated features, fallback behavior, potential issues

```typescript
logger.warn('Using fallback configuration', { reason });
```

### error
- Error conditions
- **Always logged** (even in production)
- Sent to error tracking in production
- Use for: Exceptions, failures, critical issues

```typescript
logger.error('Failed to process payment', error, { orderId });
```

---

## Common Patterns by File Type

### React Components
```typescript
import { logger } from '@/lib/logger';

function MyComponent() {
  useEffect(() => {
    logger.debug('Component mounted');

    return () => {
      logger.debug('Component unmounted');
    };
  }, []);

  const handleClick = () => {
    try {
      // ... operation ...
      logger.info('Operation successful');
    } catch (error) {
      logger.error('Operation failed', error);
    }
  };
}
```

### API/Service Files
```typescript
import { logger } from '@/lib/logger';

export async function fetchData(id: string) {
  try {
    logger.debug('Fetching data', { id });
    const response = await api.get(`/data/${id}`);
    logger.info('Data fetched successfully', { id, size: response.data.length });
    return response.data;
  } catch (error) {
    logger.error('Failed to fetch data', error, { id });
    throw error;
  }
}
```

### Utility Functions
```typescript
import { logger } from '@/lib/logger';

export function processData(data: any[]) {
  logger.debug('Processing data', { count: data.length });

  const result = data.map((item) => {
    // ... processing ...
    return processed;
  });

  logger.debug('Data processing complete', {
    input: data.length,
    output: result.length
  });

  return result;
}
```

---

## Find and Replace

Use these regex patterns to help migrate:

### Find console.log
```regex
console\.log\((.*)\)
```

### Find console.error
```regex
console\.error\((.*)\)
```

### Find console.warn
```regex
console\.warn\((.*)\)
```

---

## Files Already Migrated ✅

- `src/lib/analytics.ts`
- `src/utils/serviceWorkerManager.ts`
- `src/main.tsx`
- `src/lib/queryClient.ts`

---

## High Priority Files to Migrate

### Authentication & Security (Critical):
- `src/contexts/AuthContext.tsx`
- `src/hooks/useAuth.ts`
- `src/hooks/useSecurity.ts`
- `src/utils/security.ts`

### Core Services (High):
- `src/services/*.ts` (all service files)
- `src/hooks/useNotifications.ts`
- `src/lib/offline-sync.ts`

### UI Components (Medium):
- `src/components/ui/*.tsx`
- `src/components/ErrorBoundary.tsx`
- `src/components/CriticalErrorBoundary.tsx`

---

## Automated Migration Script

Create a script to help with migration:

```bash
#!/bin/bash
# migrate-console-logs.sh

# Find all console.log statements
echo "Files with console.log:"
grep -r "console\.log" src/ --include="*.ts" --include="*.tsx" | wc -l

# Find all console.error statements
echo "Files with console.error:"
grep -r "console\.error" src/ --include="*.ts" --include="*.tsx" | wc -l

# Find all console.warn statements
echo "Files with console.warn:"
grep -r "console\.warn" src/ --include="*.ts" --include="*.tsx" | wc -l
```

---

## Testing After Migration

1. **Development Mode**:
   - All log levels should appear
   - Check browser console for proper formatting

2. **Production Build**:
```bash
npm run build
npm run preview
```
   - Only error logs should appear
   - Debug/info/warn should be silent

3. **Verify Functionality**:
   - Authentication still works
   - Data fetching works
   - Error handling works
   - No console errors

---

## Best Practices

### ✅ DO:
- Add context objects to logs
- Use appropriate log levels
- Log errors with full error objects
- Include relevant IDs (userId, projectId, etc.)
- Log important state transitions

### ❌ DON'T:
- Log sensitive data (passwords, tokens, personal info)
- Over-log in hot paths (loops, frequent function calls)
- Use console.log directly anymore
- Log entire large objects (paginated data, etc.)
- Log in production unless it's an error

---

## Example: Complete File Migration

### Before:
```typescript
export async function saveProject(project: Project) {
  console.log('Saving project:', project.id);

  try {
    const response = await api.post('/projects', project);
    console.log('Project saved successfully');
    return response.data;
  } catch (error) {
    console.error('Failed to save project:', error);
    throw error;
  }
}
```

### After:
```typescript
import { logger } from '@/lib/logger';

export async function saveProject(project: Project) {
  logger.debug('Saving project', { projectId: project.id });

  try {
    const response = await api.post('/projects', project);
    logger.info('Project saved successfully', { projectId: project.id });
    return response.data;
  } catch (error) {
    logger.error('Failed to save project', error, { projectId: project.id });
    throw error;
  }
}
```

---

## Migration Progress Tracking

Create a tracking issue or use this checklist:

```markdown
## Console.log Migration Progress

### Phase 1: Critical Files (Week 1)
- [ ] Authentication files
- [ ] Security files
- [ ] Core services

### Phase 2: Services (Week 2)
- [ ] API services
- [ ] Data services
- [ ] Integration services

### Phase 3: Components (Week 3)
- [ ] UI components
- [ ] Page components
- [ ] Feature components

### Phase 4: Utilities (Week 4)
- [ ] Utility functions
- [ ] Helper files
- [ ] Remaining files

Current: 1,428+ statements remaining
Target: Complete migration by [date]
```

---

## Getting Help

- Check `src/lib/logger.ts` for API reference
- See `CHANGES.md` for implementation details
- Look at already-migrated files for examples

---

**Last Updated**: 2025-11-06
**Status**: ~5 files migrated, ~1,428 statements remaining
**Priority**: Migrate critical auth/security files first
