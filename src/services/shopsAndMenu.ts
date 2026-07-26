// Persistence and Real-time Sync layer for Shops & Food Menu Items
// Connects to Supabase PostgreSQL cloud database for multi-device cross-session persistence

import { supabase } from './orders';

export interface ShopAccount {
  id: string;
  name: string;
  email: string;
  upiId: string;
  qrImageUrl: string;
  rating: number;
}

export interface FoodItem {
  id: string;
  name: string;
  category: string;
  price: number;
  rating: number;
  prepTime: string;
  image: string;
  isVeg: boolean;
  shopId: string;
  shopName: string;
  description: string;
  isAvailable: boolean;
  availableFrom?: string; // e.g. "08:00"
  availableUntil?: string; // e.g. "11:00"
  isSpecial?: boolean; // Today's Special flag
  
  // Stock Availability Controls
  isSoldOut: boolean;
  stockLimit?: number | null;
  stockRemaining?: number | null;
}

export const CATEGORY_DEFAULT_IMAGES: Record<string, string> = {
  'South Indian': 'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=500&auto=format&fit=crop&q=80',
  'Fast Food': 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&auto=format&fit=crop&q=80',
  'Beverages': 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=500&auto=format&fit=crop&q=80',
  'Main Course': 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=500&auto=format&fit=crop&q=80',
  'Snacks': 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=500&auto=format&fit=crop&q=80',
  'Desserts': 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=500&auto=format&fit=crop&q=80',
  'Breakfast': 'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=500&auto=format&fit=crop&q=80'
};

export function getCategoryDefaultImage(category: string, customImage?: string): string {
  if (customImage && customImage.trim().length > 10) {
    return customImage.trim();
  }
  return CATEGORY_DEFAULT_IMAGES[category] || 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&auto=format&fit=crop&q=80';
}

export const INITIAL_SHOPS: ShopAccount[] = [
  { 
    id: 'shop-1', 
    name: 'Hunger Central Canteen', 
    email: 'canteen@hunger.com', 
    upiId: 'hungercanteen@okaxis', 
    qrImageUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=upi://pay?pa=hungercanteen@okaxis&pn=Hunger%20Central%20Canteen',
    rating: 4.8 
  },
  { 
    id: 'shop-2', 
    name: 'Madras Tiffins', 
    email: 'madrastiffins@hunger.com', 
    upiId: 'madrastiffins@upi', 
    qrImageUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=upi://pay?pa=madrastiffins@upi&pn=Madras%20Tiffins',
    rating: 4.9 
  },
  { 
    id: 'shop-3', 
    name: 'Sip & Snack Express', 
    email: 'sipsnack@hunger.com', 
    upiId: 'sipsnack@okicici', 
    qrImageUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=upi://pay?pa=sipsnack@okicici&pn=Sip%20Snack',
    rating: 4.7 
  },
  { 
    id: 'shop-4', 
    name: 'Campus Grill House', 
    email: 'grill@hunger.com', 
    upiId: 'campusgrill@ybl', 
    qrImageUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=upi://pay?pa=campusgrill@ybl&pn=Campus%20Grill',
    rating: 4.6 
  },
];

export const INITIAL_MENU: FoodItem[] = [
  {
    id: 'm1',
    name: 'Ghee Roast Dosa',
    category: 'South Indian',
    price: 75,
    rating: 4.9,
    prepTime: '8-10 mins',
    image: 'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=500&auto=format&fit=crop&q=80',
    isVeg: true,
    shopId: 'shop-2',
    shopName: 'Madras Tiffins',
    description: 'Golden crispy crepe cooked in pure desi ghee served with 3 coconut chutneys and sambar.',
    isAvailable: true,
    availableFrom: '07:30',
    availableUntil: '22:00',
    isSpecial: true,
    isSoldOut: false,
    stockLimit: null,
    stockRemaining: null
  },
  {
    id: 'm2',
    name: 'Crispy Veg Paneer Burger',
    category: 'Fast Food',
    price: 110,
    rating: 4.8,
    prepTime: '12-15 mins',
    image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&auto=format&fit=crop&q=80',
    isVeg: true,
    shopId: 'shop-1',
    shopName: 'Hunger Central Canteen',
    description: 'Juicy spiced cottage cheese patty topped with melted cheddar, fresh lettuce & house burger sauce.',
    isAvailable: true,
    availableFrom: '11:00',
    availableUntil: '21:30',
    isSpecial: true,
    isSoldOut: false,
    stockLimit: null,
    stockRemaining: null
  },
  {
    id: 'm3',
    name: 'Iced Caramel Macchiato',
    category: 'Beverages',
    price: 90,
    rating: 4.7,
    prepTime: '3-5 mins',
    image: 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=500&auto=format&fit=crop&q=80',
    isVeg: true,
    shopId: 'shop-3',
    shopName: 'Sip & Snack Express',
    description: 'Freshly pulled espresso shot poured over chilled milk and rich caramel drizzle.',
    isAvailable: true,
    availableFrom: '08:00',
    availableUntil: '21:00',
    isSoldOut: false,
    stockLimit: null,
    stockRemaining: null
  },
  {
    id: 'm4',
    name: 'Paneer Butter Masala Combo',
    category: 'Main Course',
    price: 140,
    rating: 4.9,
    prepTime: '15 mins',
    image: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=500&auto=format&fit=crop&q=80',
    isVeg: true,
    shopId: 'shop-1',
    shopName: 'Hunger Central Canteen',
    description: 'Creamy cottage cheese gravy served with 2 Butter Naans and fragrant Jeera Rice.',
    isAvailable: true,
    availableFrom: '12:00',
    availableUntil: '15:30',
    isSoldOut: false,
    stockLimit: null,
    stockRemaining: null
  },
  {
    id: 'm5',
    name: 'Schezwan Fried Rice',
    category: 'Fast Food',
    price: 95,
    rating: 4.6,
    prepTime: '10-12 mins',
    image: 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=500&auto=format&fit=crop&q=80',
    isVeg: true,
    shopId: 'shop-4',
    shopName: 'Campus Grill House',
    description: 'Wok-tossed basmati rice with crunchy garden veggies in fiery homemade Schezwan sauce.',
    isAvailable: true,
    availableFrom: '11:30',
    availableUntil: '22:30',
    isSoldOut: false,
    stockLimit: null,
    stockRemaining: null
  },
  {
    id: 'm6',
    name: 'Cold Coffee with Ice Cream',
    category: 'Beverages',
    price: 85,
    rating: 4.8,
    prepTime: '4 mins',
    image: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=500&auto=format&fit=crop&q=80',
    isVeg: true,
    shopId: 'shop-3',
    shopName: 'Sip & Snack Express',
    description: 'Thick blended coffee topped with a generous scoop of creamy dark chocolate ice cream.',
    isAvailable: true,
    availableFrom: '09:00',
    availableUntil: '21:00',
    isSoldOut: false,
    stockLimit: null,
    stockRemaining: null
  }
];

const STORAGE_SHOPS_KEY = 'hunger_shops_data_v4';
const STORAGE_MENU_KEY = 'hunger_menu_data_v4';

export function loadShops(): ShopAccount[] {
  try {
    const raw = localStorage.getItem(STORAGE_SHOPS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.warn('[shopsAndMenu] Error loading shops from storage:', e);
  }
  return INITIAL_SHOPS;
}

export function saveShops(shops: ShopAccount[]): void {
  try {
    localStorage.setItem(STORAGE_SHOPS_KEY, JSON.stringify(shops));
    window.dispatchEvent(new Event('hunger_shops_updated'));
  } catch (e) {
    console.error('[shopsAndMenu] Error saving shops:', e);
  }
}

export function loadMenuItems(): FoodItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_MENU_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.warn('[shopsAndMenu] Error loading menu from storage:', e);
  }
  return INITIAL_MENU;
}

export function saveMenuItems(menu: FoodItem[]): void {
  try {
    localStorage.setItem(STORAGE_MENU_KEY, JSON.stringify(menu));
    window.dispatchEvent(new Event('hunger_menu_updated'));
  } catch (e) {
    console.error('[shopsAndMenu] Error saving menu:', e);
  }
}

/** SUPABASE CLOUD DATABASE PERSISTENCE LAYER FOR SHOPS */

export async function fetchShopsFromSupabase(): Promise<ShopAccount[]> {
  try {
    const { data, error } = await supabase.from('shops').select('*');
    if (!error && data) {
      if (data.length === 0) {
        console.log('[Supabase] Database empty. Seeding INITIAL_SHOPS...');
        await supabase.from('shops').insert(INITIAL_SHOPS);
        saveShops(INITIAL_SHOPS);
        return INITIAL_SHOPS;
      }
      const dbShops = data as ShopAccount[];
      saveShops(dbShops);
      return dbShops;
    }
    if (error) {
      console.warn('[Supabase Query Shop Error]:', error.message);
    }
  } catch (err: any) {
    console.warn('[Supabase] Falling back to local storage for shops:', err.message);
  }
  return loadShops();
}

export async function addOrUpdateShopAccount(shop: ShopAccount): Promise<ShopAccount[]> {
  const { error } = await supabase.from('shops').upsert([shop], { onConflict: 'id' });
  if (error) {
    console.error('[Supabase Insert Shop Error]:', error.message);
    throw new Error(`Database error: ${error.message}`);
  }

  const currentShops = loadShops();
  const existingIndex = currentShops.findIndex(s => s.id === shop.id);
  let updated: ShopAccount[];
  if (existingIndex >= 0) {
    updated = currentShops.map(s => s.id === shop.id ? { ...s, ...shop } : s);
  } else {
    updated = [shop, ...currentShops];
  }
  saveShops(updated);
  return updated;
}

export async function deleteShopAccount(shopId: string): Promise<{ shops: ShopAccount[]; menuItems: FoodItem[] }> {
  // Delete associated menu items first
  try {
    await supabase.from('food_items').delete().eq('shopId', shopId);
  } catch (e: any) {
    console.warn('[Supabase Delete Shop Menu Warning]:', e.message);
  }

  const { error } = await supabase.from('shops').delete().eq('id', shopId);
  if (error) {
    console.error('[Supabase Delete Shop Error]:', error.message);
    throw new Error(`Database error: ${error.message}`);
  }

  const currentShops = loadShops();
  const updatedShops = currentShops.filter(s => s.id !== shopId);
  saveShops(updatedShops);

  const currentMenu = loadMenuItems();
  const updatedMenu = currentMenu.filter(m => m.shopId !== shopId);
  saveMenuItems(updatedMenu);

  return { shops: updatedShops, menuItems: updatedMenu };
}

/** SUPABASE CLOUD DATABASE PERSISTENCE LAYER FOR FOOD ITEMS */

export async function fetchMenuItemsFromSupabase(): Promise<FoodItem[]> {
  try {
    const { data, error } = await supabase.from('food_items').select('*');
    if (!error && data) {
      if (data.length === 0) {
        console.log('[Supabase] Database empty. Seeding INITIAL_MENU...');
        const seededMenu = INITIAL_MENU.map(item => ({
          id: item.id,
          name: item.name,
          category: item.category,
          price: item.price,
          rating: item.rating,
          prepTime: item.prepTime,
          image: item.image,
          isVeg: item.isVeg,
          shopId: item.shopId,
          shopName: item.shopName,
          description: item.description,
          isAvailable: item.isAvailable,
          availableFrom: item.availableFrom,
          availableUntil: item.availableUntil,
          isSpecial: item.isSpecial,
          is_sold_out: item.isSoldOut,
          stock_limit: item.stockLimit,
          stock_remaining: item.stockRemaining
        }));
        await supabase.from('food_items').insert(seededMenu);
        saveMenuItems(INITIAL_MENU);
        return INITIAL_MENU;
      }
      const dbMenu = data.map((item: any) => ({
        id: item.id,
        name: item.name,
        category: item.category,
        price: item.price,
        rating: item.rating,
        prepTime: item.prepTime,
        image: item.image,
        isVeg: item.isVeg,
        shopId: item.shopId,
        shopName: item.shopName,
        description: item.description,
        isAvailable: item.isAvailable,
        availableFrom: item.availableFrom,
        availableUntil: item.availableUntil,
        isSpecial: item.isSpecial,
        isSoldOut: item.is_sold_out || false,
        stockLimit: item.stock_limit,
        stockRemaining: item.stock_remaining
      })) as FoodItem[];
      saveMenuItems(dbMenu);
      return dbMenu;
    }
    if (error) {
      console.warn('[Supabase Query Menu Error]:', error.message);
    }
  } catch (err: any) {
    console.warn('[Supabase] Falling back to local storage for menu:', err.message);
  }
  return loadMenuItems();
}

export async function addOrUpdateFoodItem(item: FoodItem): Promise<FoodItem[]> {
  const dbPayload = {
    id: item.id,
    name: item.name,
    category: item.category,
    price: item.price,
    rating: item.rating,
    prepTime: item.prepTime,
    image: item.image,
    isVeg: item.isVeg,
    shopId: item.shopId,
    shopName: item.shopName,
    description: item.description,
    isAvailable: item.isAvailable,
    availableFrom: item.availableFrom,
    availableUntil: item.availableUntil,
    isSpecial: item.isSpecial,
    is_sold_out: item.isSoldOut,
    stock_limit: item.stockLimit,
    stock_remaining: item.stockRemaining
  };
  
  const { error } = await supabase.from('food_items').upsert([dbPayload], { onConflict: 'id' });
  if (error) {
    console.error('[Supabase Insert Item Error]:', error.message);
    throw new Error(`Database error: ${error.message}`);
  }

  const currentMenu = loadMenuItems();
  const existingIndex = currentMenu.findIndex(m => m.id === item.id);
  let updated: FoodItem[];
  if (existingIndex >= 0) {
    updated = currentMenu.map(m => m.id === item.id ? { ...m, ...item } : m);
  } else {
    updated = [item, ...currentMenu];
  }
  saveMenuItems(updated);
  return updated;
}

export async function deleteFoodItemById(itemId: string): Promise<FoodItem[]> {
  const { error } = await supabase.from('food_items').delete().eq('id', itemId);
  if (error) {
    console.error('[Supabase Delete Item Error]:', error.message);
    throw new Error(`Database error: ${error.message}`);
  }

  const currentMenu = loadMenuItems();
  const updated = currentMenu.filter(m => m.id !== itemId);
  saveMenuItems(updated);
  return updated;
}

/** Toggle Today's Special flag */
export async function toggleSpecialStatus(itemId: string): Promise<FoodItem[]> {
  const currentMenu = loadMenuItems();
  const target = currentMenu.find(m => m.id === itemId);
  if (!target) return currentMenu;

  const updatedItem = { ...target, isSpecial: !target.isSpecial };
  return addOrUpdateFoodItem(updatedItem);
}
