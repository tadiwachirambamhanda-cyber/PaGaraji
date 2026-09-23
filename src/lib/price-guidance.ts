import { supabase } from '@/lib/supabase';

export type PriceGuidance = {
  minPrice: number;
  maxPrice: number;
  avgPrice: number;
  dealCount: number;
};

/** A market price range for a category, from what similar requests actually closed
 * at — InDrive's upfront fare estimate, for a category instead of a route. Null
 * below the view's sample-size floor, or if the category has no closed deals yet. */
export async function fetchCategoryPriceGuidance(categoryId: string): Promise<PriceGuidance | null> {
  if (!supabase || categoryId === '' || categoryId === 'all') return null;
  const { data } = await supabase
    .from('category_price_stats')
    .select('deal_count, min_price, max_price, avg_price')
    .eq('category_id', categoryId)
    .maybeSingle();
  if (!data) return null;
  return {
    dealCount: data.deal_count as number,
    minPrice: Number(data.min_price),
    maxPrice: Number(data.max_price),
    avgPrice: Number(data.avg_price),
  };
}
