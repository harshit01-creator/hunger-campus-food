// Manual database seed script for Hunger Campus Food app.
// Run this script from the terminal to reset and seed the database:
// node scripts/seed_database.js

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://jxpntyrzhaegwsnrxdhv.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_bxuGLEnlLDgKHTbb1fCC3Q_RTkT2Gaz';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const INITIAL_USERS = [
  {
    id: 'usr-admin-1',
    email: 'harshit071111@gmail.com',
    name: 'Super Admin',
    role: 'super_admin',
    isActive: true,
    createdAt: Date.now()
  },
  {
    id: 'usr-shop-1',
    email: 'canteen@kpr.edu',
    name: 'KPR Central Canteen Owner',
    role: 'shopkeeper',
    shopId: 'shop-1',
    isActive: true,
    createdAt: Date.now()
  },
  {
    id: 'usr-shop-2',
    email: 'madrastiffins@kpr.edu',
    name: 'Madras Tiffins Owner',
    role: 'shopkeeper',
    shopId: 'shop-2',
    isActive: true,
    createdAt: Date.now()
  },
  {
    id: 'usr-cust-1',
    email: 'student@kpr.edu',
    name: 'Rahul Sharma',
    role: 'customer',
    isActive: true,
    createdAt: Date.now()
  }
];

const INITIAL_SHOPS = [
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
  }
];

const INITIAL_MENU = [
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
    is_sold_out: false,
    stock_limit: null,
    stock_remaining: null
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
    is_sold_out: false,
    stock_limit: null,
    stock_remaining: null
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
    is_sold_out: false,
    stock_limit: null,
    stock_remaining: null
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
    is_sold_out: false,
    stock_limit: null,
    stock_remaining: null
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
    is_sold_out: false,
    stock_limit: null,
    stock_remaining: null
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
    is_sold_out: false,
    stock_limit: null,
    stock_remaining: null
  }
];

const INITIAL_DISCOUNTS = [
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
    title: 'Madras Tiffins Flat ₹15 Off',
    type: 'flat',
    value: 15,
    appliesTo: 'shop',
    validFrom: '2026-01-01T00:00',
    validUntil: '2026-12-31T23:59',
    isActive: true,
    createdAt: Date.now()
  }
];

async function runSeed() {
  console.log('🚀 Starting Manual Seeding...');

  // Seeding shops
  console.log('Seeding shops...');
  const { error: shopsErr } = await supabase.from('shops').upsert(INITIAL_SHOPS, { onConflict: 'id' });
  if (shopsErr) console.error('Error seeding shops:', shopsErr.message);
  else console.log('✅ Shops seeded successfully!');

  // Seeding food items
  console.log('Seeding food items...');
  const { error: menuErr } = await supabase.from('food_items').upsert(INITIAL_MENU, { onConflict: 'id' });
  if (menuErr) console.error('Error seeding food items:', menuErr.message);
  else console.log('✅ Food items seeded successfully!');

  // Seeding user accounts
  console.log('Seeding user accounts...');
  const { error: usersErr } = await supabase.from('user_accounts').upsert(INITIAL_USERS, { onConflict: 'id' });
  if (usersErr) console.error('Error seeding users:', usersErr.message);
  else console.log('✅ Users seeded successfully!');

  // Seeding discounts
  console.log('Seeding discounts...');
  const { error: discErr } = await supabase.from('discounts').upsert(INITIAL_DISCOUNTS, { onConflict: 'id' });
  if (discErr) console.error('Error seeding discounts:', discErr.message);
  else console.log('✅ Discounts seeded successfully!');

  console.log('🏁 Seeding finished!');
}

runSeed();
