import { useState, useEffect, useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { PSEOStatsCards } from '@/components/pseo-admin/PSEOStatsCards';
import { DimensionManager } from '@/components/pseo-admin/DimensionManager';
import { GenerationQueueManager } from '@/components/pseo-admin/GenerationQueueManager';
import { PageManager } from '@/components/pseo-admin/PageManager';
import { CombinationMatrixGenerator } from '@/components/pseo-admin/CombinationMatrixGenerator';
import {
  CONTRACTOR_TYPES,
  PAIN_POINTS,
  BUSINESS_SIZES,
  GEOGRAPHIES,
  COMPETITORS,
} from '@/data/pseo-taxonomy';
import type {
  PSEOPage,
  PSEOGenerationQueueItem,
  PSEODashboardStats,
  DimensionType,
  PageType,
} from '@/types/pseo';

type DimensionItem = {
  id: string;
  display_name: string;
  url_slug: string;
  is_active: boolean;
  context_object?: Record<string, unknown>;
  competitor_profile?: Record<string, unknown>;
  geo_level?: string;
  created_at: string;
};

const DIMENSION_TABLES: Record<DimensionType, string> = {
  contractor_types: 'pseo_contractor_types',
  pain_points: 'pseo_pain_points',
  geographies: 'pseo_geographies',
  business_sizes: 'pseo_business_sizes',
  competitors: 'pseo_competitors',
};

export default function PSEOAdminDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [activeDimension, setActiveDimension] = useState<DimensionType>('contractor_types');
  const [isLoading, setIsLoading] = useState(true);

  // Data state
  const [pages, setPages] = useState<PSEOPage[]>([]);
  const [queueItems, setQueueItems] = useState<PSEOGenerationQueueItem[]>([]);
  const [dimensions, setDimensions] = useState<Record<DimensionType, DimensionItem[]>>({
    contractor_types: [],
    pain_points: [],
    geographies: [],
    business_sizes: [],
    competitors: [],
  });

  // Compute stats
  const stats: PSEODashboardStats = useMemo(() => {
    const pagesByType = {} as Record<PageType, number>;
    let totalViews = 0;
    let totalConversions = 0;

    for (const page of pages) {
      pagesByType[page.page_type] = (pagesByType[page.page_type] || 0) + 1;
      totalViews += page.view_count;
      totalConversions += page.conversion_count;
    }

    return {
      totalPages: pages.length,
      publishedPages: pages.filter((p) => p.is_published).length,
      pendingReview: pages.filter((p) => p.generation_status === 'review_needed').length,
      failedPages: pages.filter((p) => p.generation_status === 'failed').length,
      stalePages: pages.filter((p) => p.generation_status === 'stale').length,
      queuePending: queueItems.filter((q) => q.status === 'pending').length,
      queueInProgress: queueItems.filter((q) => q.status === 'in_progress').length,
      totalViews,
      totalConversions,
      pagesByType,
    };
  }, [pages, queueItems]);

  // Fetch all data
  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([fetchPages(), fetchQueue(), fetchAllDimensions()]);
    } catch (error) {
      console.error('Failed to fetch pSEO data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPages = async () => {
    const { data, error } = await supabase
      .from('pseo_pages' as any)
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) setPages(data as unknown as PSEOPage[]);
  };

  const fetchQueue = async () => {
    const { data, error } = await supabase
      .from('pseo_generation_queue' as any)
      .select('*')
      .order('tier', { ascending: true });
    if (!error && data) setQueueItems(data as unknown as PSEOGenerationQueueItem[]);
  };

  const fetchAllDimensions = async () => {
    const results: Record<DimensionType, DimensionItem[]> = {
      contractor_types: [],
      pain_points: [],
      geographies: [],
      business_sizes: [],
      competitors: [],
    };

    for (const [key, table] of Object.entries(DIMENSION_TABLES)) {
      const { data, error } = await supabase
        .from(table as any)
        .select('*')
        .order('display_name');
      if (!error && data) {
        results[key as DimensionType] = data as unknown as DimensionItem[];
      }
    }

    setDimensions(results);
  };

  // Dimension CRUD handlers
  const handleAddDimension = async (item: Partial<DimensionItem>) => {
    const table = DIMENSION_TABLES[activeDimension];
    const { error } = await supabase.from(table as any).insert(item as any);
    if (error) {
      toast.error(`Failed to add: ${error.message}`);
    } else {
      toast.success('Dimension added');
      fetchAllDimensions();
    }
  };

  const handleUpdateDimension = async (id: string, updates: Partial<DimensionItem>) => {
    const table = DIMENSION_TABLES[activeDimension];
    const { error } = await supabase.from(table as any).update(updates as any).eq('id', id);
    if (error) {
      toast.error(`Failed to update: ${error.message}`);
    } else {
      toast.success('Dimension updated');
      fetchAllDimensions();
    }
  };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    const table = DIMENSION_TABLES[activeDimension];
    const { error } = await supabase.from(table as any).update({ is_active: isActive } as any).eq('id', id);
    if (error) {
      toast.error(`Failed to toggle: ${error.message}`);
    } else {
      toast.success(isActive ? 'Activated' : 'Deactivated');
      fetchAllDimensions();
    }
  };

  // Seed dimensions from static data
  const handleSeedDimensions = async () => {
    try {
      // Seed contractor types
      const ctRows = Object.entries(CONTRACTOR_TYPES).map(([id, ct]) => ({
        id,
        display_name: ct.display_name,
        url_slug: ct.url_slug,
        context_object: ct.context,
        is_active: true,
      }));
      await supabase.from('pseo_contractor_types' as any).upsert(ctRows as any, { onConflict: 'id' });

      // Seed pain points
      const ppRows = Object.entries(PAIN_POINTS).map(([id, pp]) => ({
        id,
        display_name: pp.display_name,
        url_slug: pp.url_slug,
        context_object: pp.context,
        is_active: true,
      }));
      await supabase.from('pseo_pain_points' as any).upsert(ppRows as any, { onConflict: 'id' });

      // Seed geographies
      const geoRows = Object.entries(GEOGRAPHIES).map(([id, geo]) => ({
        id,
        display_name: geo.display_name,
        url_slug: geo.url_slug,
        geo_level: geo.geo_level,
        context_object: geo.context,
        is_active: true,
      }));
      await supabase.from('pseo_geographies' as any).upsert(geoRows as any, { onConflict: 'id' });

      // Seed business sizes
      const bsRows = Object.entries(BUSINESS_SIZES).map(([id, bs]) => ({
        id,
        display_name: bs.display_name,
        url_slug: bs.url_slug,
        context_object: bs.context,
        is_active: true,
      }));
      await supabase.from('pseo_business_sizes' as any).upsert(bsRows as any, { onConflict: 'id' });

      // Seed competitors
      const compRows = Object.entries(COMPETITORS).map(([id, comp]) => ({
        id,
        display_name: comp.display_name,
        url_slug: comp.url_slug,
        competitor_profile: comp.profile,
        is_active: true,
      }));
      await supabase.from('pseo_competitors' as any).upsert(compRows as any, { onConflict: 'id' });

      toast.success('All dimensions seeded from taxonomy data');
      fetchAllDimensions();
    } catch (error) {
      toast.error('Failed to seed dimensions');
      console.error(error);
    }
  };

  // Queue handlers
  const handleSeedQueue = async () => {
    toast.info('Use the Matrix tab to generate and add combinations to the queue.');
    setActiveTab('matrix');
  };

  const handleRetryQueue = async (id: string) => {
    const { error } = await supabase
      .from('pseo_generation_queue' as any)
      .update({ status: 'pending', failure_reason: null } as any)
      .eq('id', id);
    if (error) {
      toast.error(`Failed to retry: ${error.message}`);
    } else {
      toast.success('Queued for retry');
      fetchQueue();
    }
  };

  const handleRemoveQueue = async (id: string) => {
    const { error } = await supabase.from('pseo_generation_queue' as any).delete().eq('id', id);
    if (error) {
      toast.error(`Failed to remove: ${error.message}`);
    } else {
      toast.success('Removed from queue');
      fetchQueue();
    }
  };

  const handleBulkGenerate = async (tier: number) => {
    toast.info(`Generation for Tier ${tier} would be triggered via the n8n workflow or Edge Function pipeline.`);
  };

  // Page handlers
  const handlePublish = async (id: string) => {
    const { error } = await supabase
      .from('pseo_pages' as any)
      .update({ is_published: true, generation_status: 'published' } as any)
      .eq('id', id);
    if (error) {
      toast.error(`Failed to publish: ${error.message}`);
    } else {
      toast.success('Page published');
      fetchPages();
    }
  };

  const handleUnpublish = async (id: string) => {
    const { error } = await supabase
      .from('pseo_pages' as any)
      .update({ is_published: false, generation_status: 'generated' } as any)
      .eq('id', id);
    if (error) {
      toast.error(`Failed to unpublish: ${error.message}`);
    } else {
      toast.success('Page unpublished');
      fetchPages();
    }
  };

  const handleRegenerate = async (id: string) => {
    const { error } = await supabase
      .from('pseo_pages' as any)
      .update({ generation_status: 'pending' } as any)
      .eq('id', id);
    if (error) {
      toast.error(`Failed to queue for regeneration: ${error.message}`);
    } else {
      toast.success('Queued for regeneration');
      fetchPages();
    }
  };

  const handleBulkPublish = async (ids: string[]) => {
    const { error } = await supabase
      .from('pseo_pages' as any)
      .update({ is_published: true, generation_status: 'published' } as any)
      .in('id', ids);
    if (error) {
      toast.error(`Failed to bulk publish: ${error.message}`);
    } else {
      toast.success(`Published ${ids.length} pages`);
      fetchPages();
    }
  };

  // Matrix handler
  const handleAddToQueue = async (combinations: Array<{
    page_type: PageType;
    combination_key: string;
    dimension_1: string;
    dimension_2: string;
    dimension_3?: string;
    tier: number;
    estimated_volume: string;
  }>) => {
    const rows = combinations.map((c) => ({
      page_type: c.page_type,
      combination_key: c.combination_key,
      dimension_1: c.dimension_1,
      dimension_2: c.dimension_2,
      dimension_3: c.dimension_3 || null,
      tier: c.tier,
      estimated_volume: c.estimated_volume,
      status: 'pending',
    }));

    const { error } = await supabase
      .from('pseo_generation_queue' as any)
      .upsert(rows as any, { onConflict: 'combination_key', ignoreDuplicates: true });

    if (error) {
      toast.error(`Failed to add to queue: ${error.message}`);
    } else {
      toast.success(`Added ${rows.length} combinations to queue`);
      fetchQueue();
    }
  };

  const existingCombinationKeys = useMemo(
    () => new Set([...queueItems.map((q) => q.combination_key), ...pages.map((p) => p.combination_key)]),
    [queueItems, pages]
  );

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">pSEO Admin</h1>
          <p className="text-muted-foreground">
            Manage programmatic SEO pages — taxonomy, generation, and publishing
          </p>
        </div>
      </div>

      <PSEOStatsCards stats={stats} isLoading={isLoading} />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Pages</TabsTrigger>
          <TabsTrigger value="queue">Queue</TabsTrigger>
          <TabsTrigger value="dimensions">Dimensions</TabsTrigger>
          <TabsTrigger value="matrix">Matrix</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <PageManager
            pages={pages}
            isLoading={isLoading}
            onPublish={handlePublish}
            onUnpublish={handleUnpublish}
            onRegenerate={handleRegenerate}
            onBulkPublish={handleBulkPublish}
          />
        </TabsContent>

        <TabsContent value="queue" className="mt-4">
          <GenerationQueueManager
            items={queueItems}
            isLoading={isLoading}
            onRetry={handleRetryQueue}
            onRemove={handleRemoveQueue}
            onBulkGenerate={handleBulkGenerate}
            onSeedQueue={handleSeedQueue}
          />
        </TabsContent>

        <TabsContent value="dimensions" className="mt-4 space-y-4">
          <div className="flex gap-2 items-center">
            <Tabs value={activeDimension} onValueChange={(v) => setActiveDimension(v as DimensionType)}>
              <TabsList>
                <TabsTrigger value="contractor_types">Contractor Types</TabsTrigger>
                <TabsTrigger value="pain_points">Pain Points</TabsTrigger>
                <TabsTrigger value="geographies">Geographies</TabsTrigger>
                <TabsTrigger value="business_sizes">Business Sizes</TabsTrigger>
                <TabsTrigger value="competitors">Competitors</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          <DimensionManager
            dimensionType={activeDimension}
            items={dimensions[activeDimension]}
            isLoading={isLoading}
            onAdd={handleAddDimension}
            onUpdate={handleUpdateDimension}
            onToggleActive={handleToggleActive}
          />
        </TabsContent>

        <TabsContent value="matrix" className="mt-4">
          <CombinationMatrixGenerator
            contractorTypes={dimensions.contractor_types.filter((d) => d.is_active)}
            painPoints={dimensions.pain_points.filter((d) => d.is_active)}
            geographies={dimensions.geographies.filter((d) => d.is_active).map((d) => ({
              ...d,
              geo_level: d.geo_level || 'state',
            }))}
            businessSizes={dimensions.business_sizes.filter((d) => d.is_active)}
            competitors={dimensions.competitors.filter((d) => d.is_active)}
            existingCombinationKeys={existingCombinationKeys}
            onAddToQueue={handleAddToQueue}
          />
        </TabsContent>

        <TabsContent value="settings" className="mt-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="border rounded-lg p-6 space-y-4">
              <h3 className="font-semibold text-lg">Seed Taxonomy Data</h3>
              <p className="text-sm text-muted-foreground">
                Populate dimension tables with the built-in taxonomy data from the pSEO specification.
                This will upsert all 10 contractor types, 10 pain points, 15 geographies, 3 business
                sizes, and 6 competitors.
              </p>
              <button
                onClick={handleSeedDimensions}
                className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
              >
                Seed All Dimensions
              </button>
            </div>
            <div className="border rounded-lg p-6 space-y-4">
              <h3 className="font-semibold text-lg">Generation Pipeline</h3>
              <p className="text-sm text-muted-foreground">
                The generation pipeline is triggered via n8n workflow or can be called through
                the Supabase Edge Function. Configure your API keys and schedule in the n8n
                dashboard.
              </p>
              <div className="text-sm space-y-1">
                <div><span className="text-muted-foreground">Model:</span> claude-sonnet-4-20250514</div>
                <div><span className="text-muted-foreground">Rate Limit:</span> 1 request / 8 seconds</div>
                <div><span className="text-muted-foreground">Daily Cap:</span> 50 pages</div>
                <div><span className="text-muted-foreground">Batch Size:</span> 10 pages per run</div>
              </div>
            </div>
            <div className="border rounded-lg p-6 space-y-4">
              <h3 className="font-semibold text-lg">Quality Control</h3>
              <p className="text-sm text-muted-foreground">
                10 automated QC checks run before any page is published. Pages that fail QC are
                marked as "Needs Review" and can be inspected in the Pages tab.
              </p>
              <ul className="text-sm space-y-1 list-disc list-inside text-muted-foreground">
                <li>Schema completeness</li>
                <li>Minimum word count</li>
                <li>Forbidden words check</li>
                <li>Duplicate FAQ detection</li>
                <li>Internal link validity</li>
                <li>Pricing accuracy</li>
                <li>Array count validation</li>
                <li>Contractor specificity</li>
                <li>JSON validity</li>
                <li>Schema version match</li>
              </ul>
            </div>
            <div className="border rounded-lg p-6 space-y-4">
              <h3 className="font-semibold text-lg">Rollout Schedule</h3>
              <p className="text-sm text-muted-foreground">
                Follow the 6-week progressive rollout plan from the spec.
              </p>
              <ul className="text-sm space-y-1 list-disc list-inside text-muted-foreground">
                <li>Week 1: 60 Tier 1 pages (contractor+pain, contractor+geo)</li>
                <li>Week 2: Indexing analysis and adjustment</li>
                <li>Week 3: 36 pages (comparisons + pain x size)</li>
                <li>Week 4: 80 Tier 2 pages</li>
                <li>Week 5: 150 Tier 3 long-tail pages</li>
                <li>Week 6: Full coverage and optimization</li>
              </ul>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
