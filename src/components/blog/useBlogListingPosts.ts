import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { listablePosts, type BlogListingPost } from './blogListing';

/**
 * Every published post's card fields, newest first. One query feeds the
 * index and every category page, so paging and switching categories are
 * served from cache. At a few hundred posts this is still one small request;
 * past ~1,000 the index should move to range() + count.
 */
export function useBlogListingPosts() {
  return useQuery({
    queryKey: ['blog-listing-posts'],
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<BlogListingPost[]> => {
      const { data, error } = await supabase
        .from('blog_posts')
        .select('id, title, slug, excerpt, featured_image_url, published_at, created_at, seo_description, status')
        .eq('status', 'published')
        .order('published_at', { ascending: false, nullsFirst: false })
        .limit(1000);
      if (error) throw error;
      return listablePosts(data ?? []);
    },
  });
}
