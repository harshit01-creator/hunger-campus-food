// Discount & Sales Offer Management Service (Persisted to Supabase PostgreSQL cloud database)

import { supabase } from './orders';
import { FoodItem } from './shopsAndMenu';

export interface DiscountOffer {
  id: string;
  shopId: string;
  code: string;
  title: string;
  type: 'percentage' | 'flat';
  value: number; // e.g. 20 for 20% or 50 for ₹50 off
  appliesTo: 'shop' | 'category' | 'items';
  categoryName?: string;
  itemIds?: string[];
  validFrom: string; // e.g. ISO or time format
  validUntil: string;
  isActive: boolean;
  createdAt: number;
}

export const INITIAL_DISCOUNTS: DiscountOffer[] = [
  {
    id: 'disc-1',
    shopId: 'shop-1',
    code: 'HUNGER20',
    title: 'Hunger Canteen 20% Off Fast Food',
    type: 'percentage',
    value: 20,
    appliesTo: 'category',
    categoryName: 'Fast Food',
    validFrom: '2026-01-01T00:00',
    validUntil: '2026-12-31T23:59',
    isActive: true,
    createdAt: Date.now()
  },
  {
    id: 'disc-2',
    shopId: 'shop-2',
    code: 'MADRAS15',
    title: 'Madras Tiffins 15% Flat Discount',
    type: 'percentage',
    value: 15,
    appliesTo: 'shop',
    validFrom: '2026-01-01T00:00',
    validUntil: '2026-12-31T23:59',
    isActive: true,
    createdAt: Date.now()
  }
];

const STORAGE_DISCOUNTS_KEY = 'hunger_discounts_data_v1';

export function loadDiscounts(): DiscountOffer[] {
  try {
    const raw = localStorage.getItem(STORAGE_DISCOUNTS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.warn('[discounts] Storage load error:', e);
  }
  return INITIAL_DISCOUNTS;
}

export function saveDiscounts(discounts: DiscountOffer[]): void {
  try {
    localStorage.setItem(STORAGE_DISCOUNTS_KEY, JSON.stringify(discounts));
    window.dispatchEvent(new Event('hunger_discounts_updated'));
  } catch (e) {
    console.error('[discounts] Storage save error:', e);
  }
}

export async function fetchDiscountsFromSupabase(): Promise<DiscountOffer[]> {
  try {
    const { data, error } = await supabase.from('discounts').select('*');
    if (!error && data) {
      if (data.length === 0) {
        console.log('[Supabase] Database empty. Seeding INITIAL_DISCOUNTS...');
        await supabase.from('discounts').insert(INITIAL_DISCOUNTS);
        saveDiscounts(INITIAL_DISCOUNTS);
        return INITIAL_DISCOUNTS;
      }
      const dbDiscounts = data as DiscountOffer[];
      saveDiscounts(dbDiscounts);
      return dbDiscounts;
    }
    if (error) {
      console.warn('[Supabase Query Discounts Error]:', error.message);
    }
  } catch (err: any) {
    console.warn('[Supabase] Falling back to local storage for discounts:', err.message);
  }
  return loadDiscounts();
}

export async function addOrUpdateDiscount(discount: DiscountOffer): Promise<DiscountOffer[]> {
  const { error } = await supabase.from('discounts').upsert([discount], { onConflict: 'id' });
  if (error) {
    console.error('[Supabase Discount Upsert Error]:', error.message);
    throw new Error(`Database error: ${error.message}`);
  }

  const current = loadDiscounts();
  const existingIdx = current.findIndex(d => d.id === discount.id);
  let updated: DiscountOffer[];
  if (existingIdx >= 0) {
    updated = current.map(d => d.id === discount.id ? { ...d, ...discount } : d);
  } else {
    updated = [discount, ...current];
  }
  saveDiscounts(updated);
  return updated;
}

export async function deleteDiscountById(discountId: string): Promise<DiscountOffer[]> {
  const { error } = await supabase.from('discounts').delete().eq('id', discountId);
  if (error) {
    console.error('[Supabase Discount Delete Error]:', error.message);
    throw new Error(`Database error: ${error.message}`);
  }

  const current = loadDiscounts();
  const updated = current.filter(d => d.id !== discountId);
  saveDiscounts(updated);
  return updated;
}

/** Calculation Helper: Calculate discounted price for a food item */
export function getDiscountedPrice(item: FoodItem, discounts: DiscountOffer[]): { finalPrice: number; discountAmount: number; appliedOffer?: DiscountOffer } {
  const activeDiscounts = discounts.filter(d => {
    if (!d.isActive) return false;
    if (d.shopId !== item.shopId) return false;
    return true;
  });

  let bestDiscountAmount = 0;
  let bestOffer: DiscountOffer | undefined = undefined;

  for (const d of activeDiscounts) {
    let applies = false;
    if (d.appliesTo === 'shop') applies = true;
    else if (d.appliesTo === 'category' && d.categoryName === item.category) applies = true;
    else if (d.appliesTo === 'items' && d.itemIds && d.itemIds.includes(item.id)) applies = true;

    if (applies) {
      let amount = 0;
      if (d.type === 'percentage') {
        amount = Math.round((item.price * d.value) / 100);
      } else {
        amount = Math.min(item.price, d.value);
      }

      if (amount > bestDiscountAmount) {
        bestDiscountAmount = amount;
        bestOffer = d;
      }
    }
  }

  const finalPrice = Math.max(0, item.price - bestDiscountAmount);
  return { finalPrice, discountAmount: bestDiscountAmount, appliedOffer: bestOffer };
}
