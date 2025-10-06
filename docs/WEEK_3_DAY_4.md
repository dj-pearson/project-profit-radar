# Week 3 Day 4: Performance Monitoring & Optimization

## Performance Monitoring Strategy

### Core Web Vitals Tracking
```typescript
// Track LCP, FID, CLS, TTFB, INP
import { onCLS, onFID, onLCP, onTTFB, onINP } from 'web-vitals';

function sendToAnalytics(metric: Metric) {
  const body = JSON.stringify({
    name: metric.name,
    value: metric.value,
    rating: metric.rating,
    delta: metric.delta,
    id: metric.id,
  });
  
  // Use beacon API for reliability
  if (navigator.sendBeacon) {
    navigator.sendBeacon('/api/analytics', body);
  }
}

onCLS(sendToAnalytics);
onFID(sendToAnalytics);
onLCP(sendToAnalytics);
onTTFB(sendToAnalytics);
onINP(sendToAnalytics);
```

### Performance Budgets
```typescript
const PERFORMANCE_BUDGETS = {
  // Core Web Vitals
  LCP: 2500, // Largest Contentful Paint
  FID: 100,  // First Input Delay
  CLS: 0.1,  // Cumulative Layout Shift
  TTFB: 800, // Time to First Byte
  INP: 200,  // Interaction to Next Paint
  
  // Custom metrics
  TIME_TO_INTERACTIVE: 3500,
  BUNDLE_SIZE: 250000, // 250KB
  IMAGE_SIZE: 200000,  // 200KB above fold
};

function checkBudget(metric: string, value: number): boolean {
  const budget = PERFORMANCE_BUDGETS[metric];
  return value <= budget;
}
```

## Query Performance Optimization

### Prefetching Strategies
```typescript
// Prefetch on hover
function usePrefetchOnHover<T>(
  queryKey: string[],
  queryFn: () => Promise<T>
) {
  const queryClient = useQueryClient();
  
  const prefetch = useCallback(() => {
    queryClient.prefetchQuery({
      queryKey,
      queryFn,
      staleTime: 5000,
    });
  }, [queryKey, queryFn, queryClient]);
  
  return { onMouseEnter: prefetch };
}

// Usage
function ProjectCard({ projectId }: { projectId: string }) {
  const prefetchProps = usePrefetchOnHover(
    ['project', projectId],
    () => fetchProject(projectId)
  );
  
  return <Link {...prefetchProps} to={`/project/${projectId}`} />;
}
```

### Optimistic Updates
```typescript
// Optimistic update pattern
const updateProjectMutation = useMutation({
  mutationFn: updateProject,
  onMutate: async (newProject) => {
    // Cancel outgoing refetches
    await queryClient.cancelQueries({ queryKey: ['projects'] });
    
    // Snapshot previous value
    const previousProjects = queryClient.getQueryData(['projects']);
    
    // Optimistically update
    queryClient.setQueryData(['projects'], (old: Project[]) => 
      old.map(p => p.id === newProject.id ? { ...p, ...newProject } : p)
    );
    
    return { previousProjects };
  },
  onError: (err, newProject, context) => {
    // Rollback on error
    queryClient.setQueryData(['projects'], context.previousProjects);
  },
  onSettled: () => {
    // Refetch after mutation
    queryClient.invalidateQueries({ queryKey: ['projects'] });
  },
});
```

### Pagination Performance
```typescript
// Infinite scroll with intersection observer
function useInfiniteProjects() {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['projects', 'infinite'],
    queryFn: ({ pageParam = 0 }) => fetchProjects(pageParam),
    getNextPageParam: (lastPage, pages) => 
      lastPage.hasMore ? pages.length : undefined,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
  
  const observerRef = useRef<IntersectionObserver>();
  const loadMoreRef = useCallback((node: HTMLElement | null) => {
    if (isFetchingNextPage) return;
    
    if (observerRef.current) observerRef.current.disconnect();
    
    observerRef.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasNextPage) {
        fetchNextPage();
      }
    });
    
    if (node) observerRef.current.observe(node);
  }, [isFetchingNextPage, hasNextPage, fetchNextPage]);
  
  return { data, loadMoreRef, isFetchingNextPage };
}
```

## Resource Optimization

### Image Optimization
```typescript
// Lazy load images with intersection observer
function LazyImage({ src, alt, ...props }: ImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  
  useEffect(() => {
    if (!imgRef.current) return;
    
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: '50px' }
    );
    
    observer.observe(imgRef.current);
    return () => observer.disconnect();
  }, []);
  
  return (
    <img
      ref={imgRef}
      src={isInView ? src : undefined}
      alt={alt}
      onLoad={() => setIsLoaded(true)}
      className={cn(
        'transition-opacity duration-300',
        isLoaded ? 'opacity-100' : 'opacity-0'
      )}
      {...props}
    />
  );
}
```

### Code Splitting
```typescript
// Route-based code splitting
const Dashboard = lazy(() => import('@/pages/Dashboard'));
const Projects = lazy(() => import('@/pages/Projects'));
const Project = lazy(() => import('@/pages/Project'));

function App() {
  return (
    <Suspense fallback={<PageLoading />}>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/projects" element={<Projects />} />
        <Route path="/project/:id" element={<Project />} />
      </Routes>
    </Suspense>
  );
}
```

## Memory Management

### Query Cache Cleanup
```typescript
// Auto-cleanup unused queries
queryClient.setDefaultOptions({
  queries: {
    cacheTime: 5 * 60 * 1000, // 5 minutes
    staleTime: 30 * 1000,     // 30 seconds
    refetchOnWindowFocus: false,
    retry: 1,
  },
});

// Manual cleanup for large data
function useAutoCleanup(queryKey: string[]) {
  useEffect(() => {
    return () => {
      // Cleanup when component unmounts
      queryClient.removeQueries({ queryKey, exact: true });
    };
  }, [queryKey]);
}
```

### Memory Leak Prevention
```typescript
// Proper cleanup in effects
function useRealtimeUpdates(channelName: string) {
  useEffect(() => {
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public' }, (payload) => {
        console.log('Change received!', payload);
      })
      .subscribe();
    
    // Critical: cleanup subscription
    return () => {
      supabase.removeChannel(channel);
    };
  }, [channelName]);
}
```

## Performance Monitoring Component

```typescript
// Real-time performance dashboard
function PerformanceDashboard() {
  const [metrics, setMetrics] = useState<WebVitalsMetrics>({});
  const [queryStats, setQueryStats] = useState<QueryStats>();
  
  useEffect(() => {
    // Track web vitals
    onLCP((metric) => setMetrics(m => ({ ...m, lcp: metric })));
    onFID((metric) => setMetrics(m => ({ ...m, fid: metric })));
    onCLS((metric) => setMetrics(m => ({ ...m, cls: metric })));
    
    // Track query cache
    const interval = setInterval(() => {
      const cache = queryClient.getQueryCache();
      setQueryStats({
        total: cache.getAll().length,
        stale: cache.getAll().filter(q => q.isStale()).length,
        fetching: cache.getAll().filter(q => q.state.isFetching).length,
      });
    }, 1000);
    
    return () => clearInterval(interval);
  }, []);
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Performance Metrics</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <MetricBadge
            name="LCP"
            value={metrics.lcp?.value}
            rating={metrics.lcp?.rating}
          />
          <MetricBadge
            name="Query Cache"
            value={`${queryStats?.total || 0} queries`}
            status={queryStats?.fetching ? 'loading' : 'idle'}
          />
        </div>
      </CardContent>
    </Card>
  );
}
```

## Performance Testing Checklist

### Load Testing
- [ ] Test with 100+ records in lists
- [ ] Test with slow 3G network throttling
- [ ] Test with CPU throttling (4x slowdown)
- [ ] Test memory usage over 5-minute session
- [ ] Test bundle size after build

### Real-World Scenarios
- [ ] Navigate between pages quickly (< 1s)
- [ ] Scroll through long lists smoothly (60fps)
- [ ] Search/filter responds instantly (< 100ms)
- [ ] Images load progressively
- [ ] No layout shift on page load (CLS < 0.1)

### Monitoring
- [ ] Set up Lighthouse CI
- [ ] Track Core Web Vitals in production
- [ ] Monitor query cache size
- [ ] Track failed queries and retries
- [ ] Monitor bundle size over time

## Definition of Done

- ✅ Core Web Vitals tracked and logged
- ✅ Performance budgets defined and enforced
- ✅ Query caching optimized with proper staleTime
- ✅ Prefetching implemented for common navigation
- ✅ Images lazy loaded and optimized
- ✅ Code split by route
- ✅ Memory leaks prevented with proper cleanup
- ✅ Performance dashboard accessible to developers
- ✅ Lighthouse score > 90 on all pages
- ✅ Real-world testing completed successfully

## Next Steps: Week 3 Day 5
- Security best practices
- RLS policy implementation
- Input validation and sanitization
- Authentication flow optimization
