# src/hooks/ - Custom React Hooks

## Purpose
Reusable hooks for data fetching, state management, and feature logic.

## Conventions
- **Naming**: `use` prefix, camelCase (e.g., `useProjects`, `useDashboardData`)
- **Data hooks** use TanStack Query or manual useState + useEffect with Supabase
- **Always check** `userProfile?.company_id` before querying (site isolation)

## Data Fetching Pattern
```tsx
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { logger } from '@/lib/logger';

export const useProjects = () => {
  const { userProfile } = useAuth();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userProfile?.company_id) return;
    loadData();
  }, [userProfile?.company_id]);

  const loadData = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('company_id', userProfile.company_id);
      if (error) throw error;
      setData(data || []);
    } catch (err) {
      logger.error('Failed to load projects', err instanceof Error ? err : undefined);
      setError('Failed to load');
    } finally {
      setLoading(false);
    }
  };

  return { data, loading, error, refetch: loadData };
};
```

## Key Hooks
- `useAuth` - Auth state (from `@/contexts/AuthContext` or `@/hooks/useAuth`)
- `useDashboardData` - Dashboard KPIs and project data
- `usePersistedState` - localStorage-backed state
- `useGPSLocation` - Capacitor geolocation
- `useOfflineSync` - Offline queue and sync

## Pitfalls
- Return `error` and `refetch` from data hooks - callers need them
- Don't forget `setLoading(false)` in `finally` blocks
- Use `logger.error` not `console.error` in catch blocks
