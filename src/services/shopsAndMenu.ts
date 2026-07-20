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
    availableUntil: '22:00'
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
    availableUntil: '21:30'
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
    availableUntil: '21:00'
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
    availableUntil: '15:30'
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
    availableUntil: '22:30'
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
    availableUntil: '21:00'
  }
];

const STORAGE_SHOPS_KEY = 'hunger_shops_data_v3';
const STORAGE_MENU_KEY = 'hunger_menu_data_v3';

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
    if (!error && data && data.length > 0) {
      const dbShops = data as ShopAccount[];
      saveShops(dbShops);
      return dbShops;
    }
  } catch (err) {
    console.warn('[Supabase] Falling back to local storage for shops:', err);
  }
  return loadShops();
}

export async function addOrUpdateShopAccount(shop: ShopAccount): Promise<ShopAccount[]> {
  // 1. Local & Event sync
  const currentShops = loadShops();
  const existingIndex = currentShops.findIndex(s => s.id === shop.id);
  
  let updated: ShopAccount[];
  if (existingIndex >= 0) {
    updated = currentShops.map(s => s.id === shop.id ? { ...s, ...shop } : s);
  } else {
    updated = [shop, ...currentShops];
  }

  saveShops(updated);

  // 2. Persistent Supabase Cloud DB Insert / Upsert
  try {
    const { error } = await supabase.from('shops').upsert([shop], { onConflict: 'id' });
    if (error) console.warn('[Supabase Insert Shop Error]:', error);
  } catch (err) {
    console.warn('[Supabase Insert Shop Exception]:', err);
  }

  return updated;
}

export async function deleteShopAccount(shopId: string): Promise<{ shops: ShopAccount[]; menuItems: FoodItem[] }> {
  // 1. Local & Event sync
  const currentShops = loadShops();
  const updatedShops = currentShops.filter(s => s.id !== shopId);
  saveShops(updatedShops);

  const currentMenu = loadMenuItems();
  const updatedMenu = currentMenu.filter(m => m.shopId !== shopId);
  saveMenuItems(updatedMenu);

  // 2. Persistent Supabase Cloud DB Delete
  try {
    await supabase.from('shops').delete().eq('id', shopId);
    await supabase.from('food_items').delete().eq('shopId', shopId);
  } catch (err) {
    console.warn('[Supabase Delete Shop Exception]:', err);
  }

  return { shops: updatedShops, menuItems: updatedMenu };
}

/** SUPABASE CLOUD DATABASE PERSISTENCE LAYER FOR FOOD ITEMS */

export async function fetchMenuItemsFromSupabase(): Promise<FoodItem[]> {
  try {
    const { data, error } = await supabase.from('food_items').select('*');
    if (!error && data && data.length > 0) {
      const dbMenu = data as FoodItem[];
      saveMenuItems(dbMenu);
      return dbMenu;
    }
  } catch (err) {
    console.warn('[Supabase] Falling back to local storage for menu:', err);
  }
  return loadMenuItems();
}

export async function addOrUpdateFoodItem(item: FoodItem): Promise<FoodItem[]> {
  // 1. Local & Event sync
  const currentMenu = loadMenuItems();
  const existingIndex = currentMenu.findIndex(m => m.id === item.id);

  let updated: FoodItem[];
  if (existingIndex >= 0) {
    updated = currentMenu.map(m => m.id === item.id ? { ...m, ...item } : m);
  } else {
    updated = [item, ...currentMenu];
  }

  saveMenuItems(updated);

  // 2. Persistent Supabase Cloud DB Insert / Upsert
  try {
    const { error } = await supabase.from('food_items').upsert([item], { onConflict: 'id' });
    if (error) console.warn('[Supabase Insert Item Error]:', error);
  } catch (err) {
    console.warn('[Supabase Insert Item Exception]:', err);
  }

  return updated;
}

export async function deleteFoodItemById(itemId: string): Promise<FoodItem[]> {
  // 1. Local & Event sync
  const currentMenu = loadMenuItems();
  const updated = currentMenu.filter(m => m.id !== itemId);
  saveMenuItems(updated);

  // 2. Persistent Supabase Cloud DB Delete
  try {
    await supabase.from('food_items').delete().eq('id', itemId);
  } catch (err) {
    console.warn('[Supabase Delete Item Exception]:', err);
  }

  return updated;
}
