import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Promotion {
  id: string;
  name: string;
  description?: string;
  discount_percentage: number;
  start_date: string;
  end_date: string;
  applies_to: string[];
  display_on: string[];
}

export const usePromotions = (displayLocation?: 'homepage' | 'upgrade') => {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadActivePromotions();
  }, [displayLocation]);

  const loadActivePromotions = async () => {
    try {
      const { data, error } = await supabase.rpc('get_active_promotions', {
        p_display_location: displayLocation || null
      });

      if (error) throw error;
      setPromotions(data || []);
    } catch (error) {
      console.error('Error loading active promotions:', error);
      setPromotions([]);
    } finally {
      setLoading(false);
    }
  };

  const getPromotionForPlan = (planTier: string): Promotion | null => {
    return promotions.find(promo => 
      promo.applies_to.includes(planTier) &&
      (displayLocation ? promo.display_on.includes(displayLocation) : true)
    ) || null;
  };

  const calculateDiscountedPrice = (originalPrice: number, planTier: string): number => {
    const promotion = getPromotionForPlan(planTier);
    if (!promotion) return originalPrice;
    
    const discountAmount = (originalPrice * promotion.discount_percentage) / 100;
    return Math.round((originalPrice - discountAmount) * 100) / 100;
  };

  const getDiscountAmount = (originalPrice: number, planTier: string): number => {
    const promotion = getPromotionForPlan(planTier);
    if (!promotion) return 0;
    
    return Math.round((originalPrice * promotion.discount_percentage) / 100 * 100) / 100;
  };

  return {
    promotions,
    loading,
    getPromotionForPlan,
    calculateDiscountedPrice,
    getDiscountAmount,
    refetch: loadActivePromotions
  };
};