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
  openingTime?: string;
  closingTime?: string;
  isManuallyClosed?: boolean;
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
    name: 'Turo Central Canteen', 
    email: 'canteen@turo.com', 
    upiId: 'turocanteen@okaxis', 
    qrImageUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=upi://pay?pa=turocanteen@okaxis&pn=Turo%20Central%20Canteen',
    rating: 4.8,
    openingTime: '08:00',
    closingTime: '22:00',
    isManuallyClosed: false
  },
  { 
    id: 'shop-2', 
    name: 'Madras Tiffins', 
    email: 'madrastiffins@turo.com', 
    upiId: 'madrastiffins@upi', 
    qrImageUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=upi://pay?pa=madrastiffins@upi&pn=Madras%20Tiffins',
    rating: 4.9,
    openingTime: '08:00',
    closingTime: '22:00',
    isManuallyClosed: false
  },
  { 
    id: 'shop-3', 
    name: 'Sip & Snack Express', 
    email: 'sipsnack@turo.com', 
    upiId: 'sipsnack@okicici', 
    qrImageUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=upi://pay?pa=sipsnack@okicici&pn=Sip%20Snack',
    rating: 4.7,
    openingTime: '08:00',
    closingTime: '22:00',
    isManuallyClosed: false
  },
  { 
    id: 'shop-4', 
    name: 'Campus Grill House', 
    email: 'grill@turo.com', 
    upiId: 'campusgrill@ybl', 
    qrImageUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=upi://pay?pa=campusgrill@ybl&pn=Campus%20Grill',
    rating: 4.6,
    openingTime: '08:00',
    closingTime: '22:00',
    isManuallyClosed: false
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
    shopName: 'Turo Central Canteen',
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
    shopName: 'Turo Central Canteen',
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

const STORAGE_SHOPS_KEY = 'turo_shops_data_v4';
const STORAGE_MENU_KEY = 'turo_menu_data_v4';

export function loadShops(): ShopAccount[] {
  try {
    const raw = localStorage.getItem(STORAGE_SHOPS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map(s => ({
          ...s,
          openingTime: s.openingTime || '08:00',
          closingTime: s.closingTime || '22:00',
          isManuallyClosed: s.isManuallyClosed === true || s.isManuallyClosed === 'true' || false
        }));
      }
    }
  } catch (e) {
    console.warn('[shopsAndMenu] Error loading shops from storage:', e);
  }
  return INITIAL_SHOPS;
}

export function saveShops(shops: ShopAccount[]): void {
  try {
    localStorage.setItem(STORAGE_SHOPS_KEY, JSON.stringify(shops));
    window.dispatchEvent(new Event('turo_shops_updated'));
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
    window.dispatchEvent(new Event('turo_menu_updated'));
  } catch (e) {
    console.error('[shopsAndMenu] Error saving menu:', e);
  }
}

/** SUPABASE CLOUD DATABASE PERSISTENCE LAYER FOR SHOPS */

export async function fetchShopsFromSupabase(): Promise<ShopAccount[]> {
  try {
    const { data, error } = await supabase.from('shops').select('*');
    if (!error && data) {
      const dbShops = (data as any[]).map(s => ({
        id: s.id,
        name: s.name,
        email: s.email,
        upiId: s.upiId || s.upi_id || '',
        qrImageUrl: s.qrImageUrl || s.qr_image_url || '',
        rating: Number(s.rating || s.rating) || 4.8,
        openingTime: s.openingTime || s.opening_time || '08:00',
        closingTime: s.closingTime || s.closing_time || '22:00',
        isManuallyClosed: s.isManuallyClosed === true || s.isManuallyClosed === 'true' || s.is_manually_closed === true || s.is_manually_closed === 'true' || false
      })) as ShopAccount[];
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
  // If upiId or qrImageUrl is empty string, we try saving them as null
  const payload = {
    ...shop,
    upiId: shop.upiId === '' ? null : shop.upiId,
    qrImageUrl: shop.qrImageUrl === '' ? null : shop.qrImageUrl
  };

  const currentShops = loadShops();
  const exists = currentShops.some(s => s.id === shop.id);

  let result;
  if (exists) {
    result = await supabase.from('shops').update(payload).eq('id', shop.id).select('*');
  } else {
    result = await supabase.from('shops').insert([payload]).select('*');
  }

  const { data, error } = result;
  
  if (error) {
    // If it fails because of NOT NULL constraint, retry with empty strings
    if (error.code === '23502' || error.message.includes('not-null')) {
      console.warn('[Supabase NOT NULL constraint hit] Retrying shop write with empty strings...');
      const fallbackPayload = {
        ...shop,
        upiId: shop.upiId || '',
        qrImageUrl: shop.qrImageUrl || ''
      };
      
      let retryResult;
      if (exists) {
        retryResult = await supabase.from('shops').update(fallbackPayload).eq('id', shop.id).select('*');
      } else {
        retryResult = await supabase.from('shops').insert([fallbackPayload]).select('*');
      }
      
      const { data: retryData, error: retryError } = retryResult;
      if (retryError) {
        console.error('[Supabase Write Shop Retry Error]:', retryError.message);
        throw new Error(`Database error: ${retryError.message}`);
      }
      if (!retryData || retryData.length === 0) {
        throw new Error('Fallback update returned no rows. This indicates the write was silently blocked by Supabase Row-Level Security (RLS) policies. Please check your privileges.');
      }
    } else {
      console.error('[Supabase Write Shop Error]:', error.message);
      throw new Error(`Database error: ${error.message}`);
    }
  } else if (!data || data.length === 0) {
    throw new Error('Update returned no rows. This indicates the write was silently blocked by Supabase Row-Level Security (RLS) policies. Please check your privileges.');
  }

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
  // If the image is a base64 string, upload it to Supabase Storage instead of storing in DB
  if (item.image && item.image.startsWith('data:image/') && typeof window !== 'undefined') {
    try {
      const parts = item.image.split(',');
      const mimeMatch = parts[0].match(/data:(.*?);/);
      const mime = mimeMatch ? mimeMatch[1] : 'image/png';
      const base64Data = parts[1];
      
      const byteString = atob(base64Data);
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
      }
      const blob = new Blob([ab], { type: mime });
      
      const fileExt = mime.split('/')[1] || 'png';
      const fileName = `food-${item.id}-${Date.now()}.${fileExt}`;
      const filePath = `food_images/${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('qrcodes')
        .upload(filePath, blob, { contentType: mime, upsert: true });
        
      if (uploadError) {
        throw uploadError;
      }
      
      const { data: publicUrlData } = supabase.storage
        .from('qrcodes')
        .getPublicUrl(filePath);
        
      if (publicUrlData?.publicUrl) {
        item.image = publicUrlData.publicUrl;
        console.log('[Supabase Storage] Uploaded base64 food image to:', item.image);
      }
    } catch (err: any) {
      console.error('[Base64 Food Image Upload Failed]:', err);
      throw new Error(`Failed to upload base64 food image to Supabase Storage: ${err.message}`);
    }
  }

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

/** Check if shop is currently open based on operating hours and manual toggle override */
export function isShopOpen(shop: ShopAccount): boolean {
  if (shop.isManuallyClosed === true) {
    console.log('[isShopOpen Debug]:', {
      shopId: shop.id,
      shopName: shop.name,
      opening: shop.openingTime || '08:00',
      closing: shop.closingTime || '22:00',
      currentTime: null,
      isManuallyClosed: true,
      isOpen: false
    });
    return false;
  }
  
  const opening = shop.openingTime || '08:00';
  const closing = shop.closingTime || '22:00';
  
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const currentTimeStr = `${hours}:${minutes}`;
  
  let result = false;
  if (opening === closing) {
    result = true;
  } else if (opening < closing) {
    result = currentTimeStr >= opening && currentTimeStr <= closing;
  } else {
    result = currentTimeStr >= opening || currentTimeStr <= closing;
  }

  console.log('RAW opening_time:', (shop as any).opening_time);
  console.log('RAW closing_time:', (shop as any).closing_time);
  console.log('typeof opening_time:', typeof (shop as any).opening_time);
  console.log('RAW openingTime (camelCase):', shop.openingTime);
  console.log('RAW closingTime (camelCase):', shop.closingTime);
  console.log('typeof openingTime (camelCase):', typeof shop.openingTime);
  console.log('current time (local):', new Date().toString());
  console.log('current time (ISO/UTC):', new Date().toISOString());
  console.log('is_manually_closed value:', (shop as any).is_manually_closed);
  console.log('isManuallyClosed value (camelCase):', shop.isManuallyClosed);
  console.log('FINAL calculated open/closed result:', result);
  
  return result;
}

/** Format 24h clock string (HH:MM) to 12h clock string (H:MM AM/PM) */
export function formatTime12h(timeStr: string): string {
  if (!timeStr) return '';
  const [hoursStr, minutesStr] = timeStr.split(':');
  const hours = parseInt(hoursStr, 10);
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutesStr} ${ampm}`;
}

/** Convert 12h time components to 24h (HH:MM) string format */
export function convertTo24h(hour: number, minute: string, period: string): string {
  let h = hour;
  if (period === 'PM' && h < 12) h += 12;
  if (period === 'AM' && h === 12) h = 0;
  const hStr = String(h).padStart(2, '0');
  return `${hStr}:${minute}`;
}

/** Parse 24h (HH:MM) string format into 12h components */
export function parse24h(timeStr: string): { hour: number; minute: string; period: string } {
  if (!timeStr || !timeStr.includes(':')) {
    return { hour: 8, minute: '00', period: 'AM' };
  }
  const [hStr, mStr] = timeStr.split(':');
  let h = parseInt(hStr, 10);
  if (isNaN(h)) h = 8;
  const period = h >= 12 ? 'PM' : 'AM';
  const displayHour = h % 12 || 12;
  const minute = mStr ? mStr.substring(0, 2) : '00';
  return { hour: displayHour, minute, period };
}
