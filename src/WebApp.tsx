import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  ShoppingBag, Search, Clock, MapPin, CheckCircle2, ChevronRight, 
  Sparkles, QrCode, ArrowLeft, Plus, Minus, CreditCard, Smartphone,
  Utensils, Store, User, Bell, Flame, Filter, RefreshCw, X, ShieldCheck,
  Camera, Lock, Edit3, Trash2, Calendar, AlertCircle, LogOut, Check, Upload,
  Users, Shield, BarChart3, AlertTriangle, Key, Mail, Eye, EyeOff, LogIn, DollarSign,
  Video, VideoOff, Sun, Moon, Globe, Star, Share2, Copy, TrendingUp, Tag, Percent, Ban, RotateCcw
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Html5Qrcode } from 'html5-qrcode';
import QRCode from 'qrcode';
import kprLogo from './assets/logo.png';
import { 
  UserAccount, UserRole, SUPER_ADMIN_EMAIL, SUPER_ADMIN_PASSWORD,
  authenticateUser, registerCustomer, createShopkeeperAccount, signInWithGoogle,
  fetchUserByEmailFromSupabase, saveUserToSupabase
} from './services/auth';
import {
  createOrder as createOrderApi,
  confirmOrderPayment as confirmOrderPaymentApi,
  markFoodReady as markFoodReadyApi,
  verifyAndProcessQrHandover as verifyAndProcessQrHandoverApi,
  acceptOrder as acceptOrderApi,
  cancelOrder as cancelOrderApi,
  OrderDoc, PaymentStatus, PaymentMethod, QrHandoverResult, OrderStatus,
  supabase
} from './services/orders';
import {
  ShopAccount, FoodItem, loadShops, saveShops, loadMenuItems, saveMenuItems,
  addOrUpdateShopAccount, deleteShopAccount, addOrUpdateFoodItem, deleteFoodItemById,
  fetchShopsFromSupabase, fetchMenuItemsFromSupabase, getCategoryDefaultImage, toggleSpecialStatus,
  isShopOpen, formatTime12h, parse24h, convertTo24h
} from './services/shopsAndMenu';
import { LanguageCode, getSavedLanguage, saveLanguage, t } from './services/i18n';
import {
  DiscountOffer, loadDiscounts, saveDiscounts, fetchDiscountsFromSupabase,
  addOrUpdateDiscount, deleteDiscountById, getDiscountedPrice
} from './services/discounts';

interface CartItem extends FoodItem {
  qty: number;
  originalPrice: number;
  discountedPrice: number;
}

interface Order {
  id: string;
  shopId: string;
  shopName: string;
  customerId: string;
  customerName: string;
  items: CartItem[];
  grandTotal: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  transactionId?: string;
  paidAt?: string;
  status: OrderStatus;
  createdAt: string;
  createdAtTimestamp: number;
  estimatedMinutes: number;
  qrToken: string;
  handedOverAt?: string;
  payeeUpiId: string;
  payeeQrUrl?: string;
  cancelledBy?: 'customer' | 'shopkeeper';
  cancelledAt?: string;
  cancellationReason?: string;
  appliedDiscount?: { code: string; title: string; amountSaved: number };
}

// DYNAMICAL CANVAS-BASED TRANSACTION RECEIPT GENERATOR ENGINE
function generateReceiptImage(order: Order): string {
  const canvas = document.createElement('canvas');
  canvas.width = 450;
  
  // Calculate dynamic height based on number of items
  const itemHeight = 35;
  const padding = 40;
  const headerHeight = 180;
  const footerHeight = 160;
  canvas.height = headerHeight + (order.items.length * itemHeight) + footerHeight;
  
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  
  // Fill white background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Outer decorative border
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 4;
  ctx.strokeRect(8, 8, canvas.width - 16, canvas.height - 16);
  
  // Receipt design styles
  ctx.fillStyle = '#0f172a'; // slate-900
  ctx.textAlign = 'center';
  
  // Draw Shop Name
  ctx.font = 'bold 24px "Outfit", sans-serif';
  ctx.fillText(order.shopName.toUpperCase(), canvas.width / 2, 50);
  
  // Subtitle
  ctx.font = '600 12px "Inter", sans-serif';
  ctx.fillStyle = '#64748b'; // slate-500
  ctx.fillText('OFFICIAL CAMPUS MEAL RECEIPT', canvas.width / 2, 75);
  
  // Draw Dashed divider
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([6, 4]);
  ctx.beginPath();
  ctx.moveTo(25, 95);
  ctx.lineTo(canvas.width - 25, 95);
  ctx.stroke();
  ctx.setLineDash([]); // Reset dashed line
  
  // Customer details and token
  ctx.textAlign = 'left';
  ctx.fillStyle = '#334155'; // slate-700
  ctx.font = 'bold 13px "Inter", sans-serif';
  ctx.fillText('Token ID:', 30, 118);
  ctx.fillText('Customer:', 30, 138);
  ctx.fillText('Ordered At:', 30, 158);
  
  ctx.font = 'bold 13px "Inter", sans-serif';
  ctx.fillStyle = '#2563eb'; // blue-600 for token
  const displayToken = order.id.split('-')[1] || order.id;
  ctx.fillText(displayToken, 120, 118);
  
  ctx.fillStyle = '#0f172a';
  ctx.font = '500 13px "Inter", sans-serif';
  ctx.fillText(order.customerName, 120, 138);
  
  // Formatted date string
  ctx.fillText(order.createdAt || new Date(order.createdAtTimestamp).toLocaleString(), 120, 158);
  
  // Another divider
  ctx.strokeStyle = '#cbd5e1';
  ctx.beginPath();
  ctx.moveTo(25, 175);
  ctx.lineTo(canvas.width - 25, 175);
  ctx.stroke();
  
  // Table headers
  ctx.fillStyle = '#475569'; // slate-600
  ctx.font = 'bold 12px "Inter", sans-serif';
  ctx.fillText('ITEM DESCRIPTION', 30, 195);
  ctx.textAlign = 'right';
  ctx.fillText('QTY', canvas.width - 110, 195);
  ctx.fillText('AMOUNT', canvas.width - 30, 195);
  
  // Table divider
  ctx.strokeStyle = '#e2e8f0';
  ctx.beginPath();
  ctx.moveTo(25, 205);
  ctx.lineTo(canvas.width - 25, 205);
  ctx.stroke();
  
  // Draw Items
  let currentY = 228;
  ctx.font = '500 13px "Inter", sans-serif';
  ctx.fillStyle = '#0f172a';
  
  order.items.forEach(item => {
    // Description (left-aligned)
    ctx.textAlign = 'left';
    ctx.fillText(item.name, 30, currentY);
    
    // Qty (right-aligned)
    ctx.textAlign = 'right';
    ctx.fillText(item.qty.toString(), canvas.width - 115, currentY);
    
    // Price calculation
    const pricePerUnit = item.discountedPrice !== undefined ? item.discountedPrice : item.price;
    
    // Amount (right-aligned)
    ctx.fillText(`₹${pricePerUnit * item.qty}`, canvas.width - 30, currentY);
    
    currentY += itemHeight;
  });
  
  // Divider
  ctx.strokeStyle = '#cbd5e1';
  ctx.beginPath();
  ctx.moveTo(25, currentY - 5);
  ctx.lineTo(canvas.width - 25, currentY - 5);
  ctx.stroke();
  
  // Grand Total
  currentY += 20;
  ctx.textAlign = 'left';
  ctx.font = 'bold 15px "Outfit", sans-serif';
  ctx.fillStyle = '#0f172a';
  ctx.fillText('GRAND TOTAL BILL', 30, currentY);
  
  ctx.textAlign = 'right';
  ctx.fillStyle = '#059669'; // emerald-600
  ctx.fillText(`₹${order.grandTotal}`, canvas.width - 30, currentY);
  
  // Payment Status Box
  currentY += 30;
  const isPaid = order.paymentStatus === 'Paid';
  ctx.fillStyle = isPaid ? '#10b981' : '#ef4444'; // Green or Red
  
  // Draw Rounded status pill
  const pillWidth = 150;
  const pillHeight = 32;
  const pillX = (canvas.width - pillWidth) / 2;
  const pillY = currentY;
  
  // Rounded rect
  ctx.beginPath();
  ctx.roundRect(pillX, pillY, pillWidth, pillHeight, 6);
  ctx.fill();
  
  // Text inside pill
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.font = 'bold 13px "Inter", sans-serif';
  ctx.fillText(isPaid ? '✓ PAID ONLINE' : '✗ NOT PAID', canvas.width / 2, currentY + 20);
  
  // Thank you note
  currentY += 65;
  ctx.fillStyle = '#94a3b8'; // slate-400
  ctx.font = 'italic 11px "Inter", sans-serif';
  ctx.fillText('Thank you for ordering with Turo!', canvas.width / 2, currentY);
  
  return canvas.toDataURL('image/png');
}export function mapDbOrderToFrontend(dbOrder: any, shopsList: ShopAccount[], menuItemsList: FoodItem[]): Order {
  const shop = shopsList.find(s => s.id === dbOrder.shopId);
  const createdAtTimestamp = Number(dbOrder.createdAt);
  
  // Reconstruct date strings
  const dateObj = new Date(createdAtTimestamp);
  const createdAtStr = isNaN(dateObj.getTime()) 
    ? new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const paidAtStr = dbOrder.paidAt && !isNaN(new Date(Number(dbOrder.paidAt)).getTime())
    ? new Date(Number(dbOrder.paidAt)).toLocaleTimeString() 
    : undefined;
  const handedOverAtStr = dbOrder.handedOverAt && !isNaN(new Date(Number(dbOrder.handedOverAt)).getTime())
    ? new Date(Number(dbOrder.handedOverAt)).toLocaleTimeString() 
    : undefined;
  const cancelledAtStr = dbOrder.cancelledAt && !isNaN(new Date(Number(dbOrder.cancelledAt)).getTime())
    ? new Date(Number(dbOrder.cancelledAt)).toLocaleTimeString() 
    : undefined;

  // Reconstruct items with category and prices from current menuItemsList or db record fallback
  const items = (dbOrder.items || []).map((item: any) => {
    const matchedMenu = menuItemsList.find(m => m.id === item.id);
    const price = matchedMenu ? matchedMenu.price : (item.price || item.discountedPrice || 0);
    return {
      id: item.id,
      name: item.name,
      qty: item.qty,
      originalPrice: price,
      discountedPrice: price,
      category: matchedMenu ? matchedMenu.category : 'Fast Food',
      image: matchedMenu ? matchedMenu.image : '',
      isVeg: matchedMenu ? matchedMenu.isVeg : true,
      shopId: dbOrder.shopId,
      shopName: shop ? shop.name : 'Canteen'
    };
  });

  return {
    id: dbOrder.orderId,
    shopId: dbOrder.shopId,
    shopName: shop ? shop.name : 'Campus Canteen',
    customerId: dbOrder.customerId || 'guest-1',
    customerName: dbOrder.customerName || 'Student Customer',
    items,
    grandTotal: Number(dbOrder.grandTotal),
    paymentMethod: dbOrder.paymentMethod || 'Online UPI',
    paymentStatus: dbOrder.paymentStatus || 'Paid',
    transactionId: dbOrder.transactionId,
    paidAt: paidAtStr,
    status: dbOrder.status || 'Pending',
    createdAt: createdAtStr,
    createdAtTimestamp,
    estimatedMinutes: 12,
    qrToken: dbOrder.qrToken,
    handedOverAt: handedOverAtStr,
    payeeUpiId: shop ? shop.upiId : '',
    payeeQrUrl: shop ? shop.qrImageUrl : '',
    cancelledBy: dbOrder.cancelledBy,
    cancelledAt: cancelledAtStr,
    cancellationReason: dbOrder.cancellationReason
  };
}

export default function WebApp() {
  // Theme State
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    try {
      const saved = localStorage.getItem('turo_theme_pref');
      if (saved === 'dark' || saved === 'light') return saved;
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    } catch {
      return 'dark';
    }
  });

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('turo_theme_pref', nextTheme);
  };

  // i18n Multi-Language State
  const [currentLang, setCurrentLang] = useState<LanguageCode>(() => getSavedLanguage());
  const handleLangChange = (lang: LanguageCode) => {
    setCurrentLang(lang);
    saveLanguage(lang);
  };

  // Vercel Link Sharing Modal State
  const [isVercelModalOpen, setIsVercelModalOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const vercelAppUrl = 'https://hunger-campus-food.vercel.app';

  // Navigation & Session State
  const SESSION_USER_KEY = 'turo_session_user_v1';
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);
  const [activeTab, setActiveTab] = useState<'home' | 'menu' | 'orders' | 'tracking' | 'owner' | 'admin'>('home');

  useEffect(() => {
    try {
      const stored = localStorage.getItem(SESSION_USER_KEY);
      if (stored) {
        const user = JSON.parse(stored) as UserAccount;
        if (user && user.id && user.role) {
          setCurrentUser(user);
          if (user.role === 'super_admin') {
            setActiveTab('admin');
          } else if (user.role === 'shopkeeper') {
            setActiveTab('owner');
          } else {
            setActiveTab('home');
          }
        }
      }
    } catch (e) {
      console.warn('[Session] Load session error:', e);
    }
  }, []);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedShopId, setSelectedShopId] = useState<string>('all');
  const [salesTimeFilter, setSalesTimeFilter] = useState<'today' | 'week' | 'all'>('today');

  // Master Data State (Persisted & Real-Time Synced)
  const [shops, setShops] = useState<ShopAccount[]>(() => loadShops());
  const [menuItems, setMenuItems] = useState<FoodItem[]>(() => loadMenuItems());
  const [discounts, setDiscounts] = useState<DiscountOffer[]>(() => loadDiscounts());
  const [cart, setCart] = useState<CartItem[]>([]);
  const [ordersHistory, setOrdersHistory] = useState<Order[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>('Online UPI');
  const [pendingOrderId, setPendingOrderId] = useState<string | null>(null);
  const [isPlacingPendingOrder, setIsPlacingPendingOrder] = useState(false);
  const [userUtrInput, setUserUtrInput] = useState<string>('');
  const [currentOrder, setCurrentOrder] = useState<Order | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<string>(new Date().toLocaleTimeString());

  // 8-Second Cancellation Window Live Ticker State
  const [currentTime, setCurrentTime] = useState<number>(Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Discount Offer Manager Modal State
  const [isDiscountModalOpen, setIsDiscountModalOpen] = useState(false);
  const [discountForm, setDiscountForm] = useState<{
    code: string;
    title: string;
    type: 'percentage' | 'flat';
    value: number;
    appliesTo: 'shop' | 'category' | 'items';
    categoryName: string;
    isActive: boolean;
  }>({
    code: 'SALE20',
    title: 'Special 20% Off Category Offer',
    type: 'percentage',
    value: 20,
    appliesTo: 'category',
    categoryName: 'Fast Food',
    isActive: true
  });

  const handleSync = useCallback(async () => {
    const dbShops = await fetchShopsFromSupabase();
    const dbMenu = await fetchMenuItemsFromSupabase();
    const dbDisc = await fetchDiscountsFromSupabase();
    setShops(dbShops);
    setMenuItems(dbMenu);
    setDiscounts(dbDisc);

    try {
      const { data: dbOrders } = await supabase
        .from('orders')
        .select('*')
        .order('createdAt', { ascending: false });
      if (dbOrders) {
        const mapped = dbOrders.map(o => mapDbOrderToFrontend(o, dbShops, dbMenu));
        setOrdersHistory(mapped);
      }
    } catch (err) {
      console.warn('[Sync Orders Error]:', err);
    }
    setLastSyncTime(new Date().toLocaleTimeString());
  }, []);

  // Synchronize database records on navigation tab changes
  useEffect(() => {
    handleSync();
  }, [activeTab, selectedShopId, handleSync]);

  // Real-Time Event Listener & Cloud Database Hydration
  useEffect(() => {
    const initLoad = async () => {
      try {
        const dbShops = await fetchShopsFromSupabase();
        const dbMenu = await fetchMenuItemsFromSupabase();
        const dbDisc = await fetchDiscountsFromSupabase();
        setShops(dbShops);
        setMenuItems(dbMenu);
        setDiscounts(dbDisc);

        const { data: dbOrders, error } = await supabase
          .from('orders')
          .select('*')
          .order('createdAt', { ascending: false });
        if (!error && dbOrders) {
          const mapped = dbOrders.map(o => mapDbOrderToFrontend(o, dbShops, dbMenu));
          setOrdersHistory(mapped);
        }
      } catch (err) {
        console.warn('[Initial Hydration Error]:', err);
      }
    };

    initLoad();



    window.addEventListener('storage', handleSync);
    window.addEventListener('turo_shops_updated', handleSync);
    window.addEventListener('turo_menu_updated', handleSync);
    window.addEventListener('turo_discounts_updated', handleSync);
    window.addEventListener('focus', handleSync);

    // 1. Subscribe to 'shops' table updates
    const shopsChannel = supabase
      .channel('public:shops:realtime-sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'shops' },
        async (payload: any) => {
          console.log('[Realtime] Shops updated:', payload);
          const dbShops = await fetchShopsFromSupabase();
          setShops(dbShops);
        }
      )
      .subscribe();

    // 2. Subscribe to 'food_items' table updates
    const menuChannel = supabase
      .channel('public:food_items:realtime-sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'food_items' },
        async (payload: any) => {
          console.log('[Realtime] Food items updated:', payload);
          const dbMenu = await fetchMenuItemsFromSupabase();
          setMenuItems(dbMenu);
        }
      )
      .subscribe();

    // 3. Subscribe to 'orders' table updates globally
    const ordersChannel = supabase
      .channel('public:orders:realtime-sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        async (payload: any) => {
          console.log('[Realtime] Orders updated:', payload);
          const { data: dbOrders } = await supabase
            .from('orders')
            .select('*')
            .order('createdAt', { ascending: false });
          if (dbOrders) {
            const currentShops = loadShops();
            const currentMenu = loadMenuItems();
            const mapped = dbOrders.map(o => mapDbOrderToFrontend(o, currentShops, currentMenu));
            setOrdersHistory(mapped);
          }
        }
      )
      .subscribe();

    return () => {
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('turo_shops_updated', handleSync);
      window.removeEventListener('turo_menu_updated', handleSync);
      window.removeEventListener('turo_discounts_updated', handleSync);
      window.removeEventListener('focus', handleSync);

      supabase.removeChannel(shopsChannel);
      supabase.removeChannel(menuChannel);
      supabase.removeChannel(ordersChannel);
    };
  }, []);

  // Supabase Auth Session recovery and OAuth listener
  useEffect(() => {
    const handleAuthChange = async (event: string, session: any) => {
      console.log('[Supabase Auth Event]:', event);
      if (session && session.user) {
        const email = session.user.email;
        if (email) {
          try {
            let userRec = await fetchUserByEmailFromSupabase(email);
            if (!userRec) {
              // Register new Google customer in public database table
              userRec = {
                id: session.user.id,
                email: email.toLowerCase(),
                name: session.user.user_metadata?.full_name || email.split('@')[0],
                role: 'customer',
                isActive: true,
                createdAt: Date.now()
              };
              await saveUserToSupabase(userRec);
            }

            // Enforce Super Admin role protection for Google oauth logins
            if (userRec.role === 'super_admin') {
              alert('Super Admin access is restricted to manual email/password logins only.');
              await supabase.auth.signOut();
              setCurrentUser(null);
              localStorage.removeItem(SESSION_USER_KEY);
              return;
            }

            setCurrentUser(userRec);
            localStorage.setItem(SESSION_USER_KEY, JSON.stringify(userRec));

            // Load appropriate dashboard
            if (userRec.role === 'customer') {
              setActiveTab('home');
            } else if (userRec.role === 'shopkeeper') {
              setActiveTab('owner');
            } else if (userRec.role === 'super_admin') {
              setActiveTab('admin');
            }
          } catch (err) {
            console.error('[OAuth Session Sync Error]:', err);
          }
        }
      }
    };

    // 1. Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(handleAuthChange);

    // 2. Perform initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) handleAuthChange('INITIAL_CHECK', session);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Auth Form State
  const [authTab, setAuthTab] = useState<'customer' | 'shopkeeper'>('customer');
  const [customerMode, setCustomerMode] = useState<'signin' | 'signup'>('signin');
  const [signUpName, setSignUpName] = useState('');
  const [signUpConfirmPassword, setSignUpConfirmPassword] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(false);

  // Menu Editor Modal State
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<FoodItem | null>(null);
  const [imageSuggestions, setImageSuggestions] = useState<string[]>([]);
  const [isSearchingImages, setIsSearchingImages] = useState(false);
  const [itemForm, setItemForm] = useState<{
    name: string;
    category: string;
    price: number;
    description: string;
    image: string;
    isVeg: boolean;
    isAvailable: boolean;
    availableFrom: string;
    availableUntil: string;
    isSpecial: boolean;
    isSoldOut: boolean;
    stockLimit: string;
    stockRemaining: string;
  }>({
    name: '',
    category: 'Fast Food',
    price: 90,
    description: '',
    image: '',
    isVeg: true,
    isAvailable: true,
    availableFrom: '08:00',
    availableUntil: '22:00',
    isSpecial: false,
    isSoldOut: false,
    stockLimit: '',
    stockRemaining: ''
  });

  // Shop Owner Settings State
  const isItemSoldOut = (item: FoodItem) => {
    return !!item.isSoldOut || (item.stockRemaining !== null && item.stockRemaining !== undefined && item.stockRemaining <= 0);
  };

  const [editingShopUpi, setEditingShopUpi] = useState('');
  const [editingShopQrUrl, setEditingShopQrUrl] = useState('');

  // Super Admin Add Shop & Shopkeeper State
  const [isAddShopkeeperOpen, setIsAddShopkeeperOpen] = useState(false);
  const [newShopkeeperName, setNewShopkeeperName] = useState('');
  const [newShopkeeperEmail, setNewShopkeeperEmail] = useState('');
  const [newShopkeeperPassword, setNewShopkeeperPassword] = useState('');
  const [newShopkeeperShopId, setNewShopkeeperShopId] = useState(() => `shop-${Date.now()}`);
  const [newShopName, setNewShopName] = useState('');

  // Camera QR Scanner State
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<QrHandoverResult | null>(null);
  const [simulatedQrInput, setSimulatedQrInput] = useState('');
  const qrScannerRef = useRef<Html5Qrcode | null>(null);

  // Shopkeeper Dashboard Sub-Tab
  const [shopkeeperSubTab, setShopkeeperSubTab] = useState<'orders' | 'analytics' | 'payment'>('orders');

  const [ownerUpiInput, setOwnerUpiInput] = useState('');
  const [ownerQrImageUrlInput, setOwnerQrImageUrlInput] = useState('');
  const [checkoutQrDataUrl, setCheckoutQrDataUrl] = useState<string>('');
  const [selectedQrFile, setSelectedQrFile] = useState<File | null>(null);
  const [isSavingPayment, setIsSavingPayment] = useState(false);

  // Shop Hours Settings States
  const [openingTimeInput, setOpeningTimeInput] = useState('08:00');
  const [closingTimeInput, setClosingTimeInput] = useState('22:00');
  const [isManuallyClosedInput, setIsManuallyClosedInput] = useState(false);

  const myShop = (currentUser && currentUser.role === 'shopkeeper' && currentUser.shopId)
    ? shops.find(s => s.id === currentUser.shopId)
    : undefined;

  useEffect(() => {
    if (currentUser && currentUser.role === 'shopkeeper' && currentUser.shopId) {
      const myShop = shops.find(s => s.id === currentUser.shopId);
      if (myShop) {
        setOwnerUpiInput(myShop.upiId || '');
        setOwnerQrImageUrlInput(myShop.qrImageUrl || '');
        setOpeningTimeInput(myShop.openingTime || '08:00');
        setClosingTimeInput(myShop.closingTime || '22:00');
        setIsManuallyClosedInput(myShop.isManuallyClosed === true);
      }
    }
  }, [currentUser, shopkeeperSubTab, shops]);


  // Checkout Payment Verification Simulator Modal State
  const [isPayingGateway, setIsPayingGateway] = useState(false);
  const [gatewayStatus, setGatewayStatus] = useState<'waiting' | 'success' | 'failed'>('waiting');
  const [gatewayError, setGatewayError] = useState<string | null>(null);

  // Prep progress simulation
  const [prepProgress, setPrepProgress] = useState(25);

  useEffect(() => {
    let interval: any;
    if (currentOrder && currentOrder.status === 'Accepted') {
      interval = setInterval(() => {
        setPrepProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            setCurrentOrder(o => o ? { ...o, status: 'Ready for Pickup' } : null);
            return 100;
          }
          return prev + 10;
        });
      }, 2500);
    }
    return () => clearInterval(interval);
  }, [currentOrder?.status]);

  // DEBOUNCED FOOD IMAGE AUTO-FETCH ENGINE
  useEffect(() => {
    if (!isItemModalOpen || !itemForm.name || itemForm.name.trim().length < 3) {
      setImageSuggestions([]);
      return;
    }

    const handler = setTimeout(async () => {
      setIsSearchingImages(true);
      const query = itemForm.name.trim();
      const cleanQuery = query.replace(/[^\w\s-]/gi, '').replace(/\s+/g, ' ').trim();
      const searchQuery = `${cleanQuery} food dish gourmet top view culinary plate photography`;
      const apiKey = (import.meta as any).env?.VITE_UNSPLASH_ACCESS_KEY || (import.meta as any).env?.VITE_IMAGE_SEARCH_API_KEY || '';

      try {
        if (apiKey && apiKey !== 'YOUR_UNSPLASH_KEY') {
          // Live API Fetch from Unsplash with cleaned query biased towards food dish photography
          const response = await fetch(
            `https://api.unsplash.com/search/photos?query=${encodeURIComponent(searchQuery)}&per_page=4&client_id=${apiKey}`
          );
          if (response.ok) {
            const data = await response.json();
            if (data.results && data.results.length > 0) {
              const urls = data.results.map((img: any) => img.urls.regular);
              setImageSuggestions(urls);
              setIsSearchingImages(false);
              return;
            }
          }
        }
      } catch (err) {
        console.warn('[Image Search] Unsplash API error, falling back:', err);
      }

      // Fallback matching logic for offline / no-key demoing
      const lowerQuery = query.toLowerCase();
      let matchedImages: string[] = [];

      if (lowerQuery.includes('dosa') || lowerQuery.includes('idli') || lowerQuery.includes('vada') || lowerQuery.includes('sambar') || lowerQuery.includes('south')) {
        matchedImages = [
          'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=500&auto=format&fit=crop&q=80', // Dosa
          'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=500&auto=format&fit=crop&q=80', // South indian combo
          'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=500&auto=format&fit=crop&q=80', // Vada Sambar
          'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=500&auto=format&fit=crop&q=80'  // Madras meal
        ];
      } else if (lowerQuery.includes('burger') || lowerQuery.includes('sandwich') || lowerQuery.includes('pizza') || lowerQuery.includes('fries') || lowerQuery.includes('fast')) {
        matchedImages = [
          'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&auto=format&fit=crop&q=80', // Burger
          'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=500&auto=format&fit=crop&q=80', // Pizza
          'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=500&auto=format&fit=crop&q=80', // Sandwich
          'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=500&auto=format&fit=crop&q=80'  // Fries
        ];
      } else if (lowerQuery.includes('tea') || lowerQuery.includes('coffee') || lowerQuery.includes('juice') || lowerQuery.includes('shake') || lowerQuery.includes('drink') || lowerQuery.includes('beverage')) {
        matchedImages = [
          'https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=500&auto=format&fit=crop&q=80', // Tea/Coffee
          'https://images.unsplash.com/photo-1541658016709-82535e94bc69?w=500&auto=format&fit=crop&q=80', // Fresh juice
          'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=500&auto=format&fit=crop&q=80', // Milkshake
          'https://images.unsplash.com/photo-1508253730747-e839c575fa3d?w=500&auto=format&fit=crop&q=80'  // Filter Coffee
        ];
      } else if (lowerQuery.includes('roti') || lowerQuery.includes('paneer') || lowerQuery.includes('curry') || lowerQuery.includes('rice') || lowerQuery.includes('biryani') || lowerQuery.includes('masala')) {
        matchedImages = [
          'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=500&auto=format&fit=crop&q=80', // Curry
          'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500&auto=format&fit=crop&q=80', // Rice
          'https://images.unsplash.com/photo-1633945274405-b6c8069047b0?w=500&auto=format&fit=crop&q=80', // Paneer Butter Masala
          'https://images.unsplash.com/photo-1645177625172-595e25c1620f?w=500&auto=format&fit=crop&q=80'  // Biryani
        ];
      } else if (lowerQuery.includes('cake') || lowerQuery.includes('ice') || lowerQuery.includes('sweet') || lowerQuery.includes('dessert') || lowerQuery.includes('chocolate') || lowerQuery.includes('waffle') || lowerQuery.includes('waffles')) {
        matchedImages = [
          'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=500&auto=format&fit=crop&q=80', // Dessert
          'https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?w=500&auto=format&fit=crop&q=80', // Ice Cream
          'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=500&auto=format&fit=crop&q=80', // Cake
          'https://images.unsplash.com/photo-1587314168485-3236d6710814?w=500&auto=format&fit=crop&q=80'  // Waffles
        ];
      } else {
        // Generic food fallback
        matchedImages = [
          'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=500&auto=format&fit=crop&q=80', // Generic food 1
          'https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=500&auto=format&fit=crop&q=80', // Generic food 2
          'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=500&auto=format&fit=crop&q=80', // Generic food 3
          'https://images.unsplash.com/photo-1476224203421-9ac39bcb3327?w=500&auto=format&fit=crop&q=80'  // Generic food 4
        ];
      }

      setImageSuggestions(matchedImages);
      setIsSearchingImages(false);
    }, 1000);

    return () => clearTimeout(handler);
  }, [itemForm.name, isItemModalOpen]);

  // NOTIFICATION PERMISSION REQUEST ENGINE
  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      console.log('[Notification] Desktop notifications are not supported on this browser');
      return;
    }
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        console.log('[Notification] Permission granted.');
        if (currentUser && currentUser.id) {
          // Register service worker push subscription token if possible
          if ('serviceWorker' in navigator) {
            const registration = await navigator.serviceWorker.ready;
            const sub = await registration.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: 'BEl62OhArIK1t7H8m9jiLIyF961o10g25sVN5qNJD1sy3Cj0FBsqNp_13Z4Zt9yS_J3G1rU'
            }).catch(() => null);
            
            if (sub) {
              const tokenStr = JSON.stringify(sub);
              await supabase
                .from('user_accounts')
                .update({ pushToken: tokenStr })
                .eq('id', currentUser.id);
            }
          }
        }
      }
    } catch (e) {
      console.warn('[Notification] Permission request failed:', e);
    }
  };

  // Auto-request notification permissions upon customer login
  useEffect(() => {
    if (currentUser && currentUser.role === 'customer') {
      requestNotificationPermission();
    }
  }, [currentUser?.id]);

  // Real-time listener for "Food is Ready" notification triggers
  useEffect(() => {
    if (!currentUser || currentUser.role !== 'customer') return;

    const channel = supabase
      .channel('public:orders:status-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
        },
        async (payload: any) => {
          const updatedOrder = payload.new;
          if (updatedOrder.customerId === currentUser.id && updatedOrder.status === 'Ready for Pickup') {
            const token = updatedOrder.orderId ? updatedOrder.orderId.split('-')[1] || updatedOrder.orderId : 'TURO-XXXX';
            const shopName = updatedOrder.shopName || 'Campus Canteen';
            
            if ('Notification' in window && Notification.permission === 'granted') {
              const notification = new Notification(`🍽️ Order Ready at ${shopName}!`, {
                body: `Your order is ready for pickup! Token #${token}.`,
                icon: '/assets/logo-gNUbfLJM.png',
                tag: updatedOrder.orderId,
                requireInteraction: true
              });
              
              notification.onclick = () => {
                window.focus();
                const matchedOrder = ordersHistory.find(o => o.id === updatedOrder.orderId);
                if (matchedOrder) {
                  setCurrentOrder(matchedOrder);
                } else {
                  setCurrentOrder({
                    id: updatedOrder.orderId,
                    shopId: updatedOrder.shopId,
                    shopName: updatedOrder.shopName || 'Campus Canteen',
                    customerId: updatedOrder.customerId || currentUser.id,
                    customerName: updatedOrder.customerName || currentUser.name,
                    items: updatedOrder.items || [],
                    grandTotal: updatedOrder.grandTotal || 0,
                    paymentMethod: updatedOrder.paymentMethod || 'Online UPI',
                    paymentStatus: updatedOrder.paymentStatus || 'Paid',
                    status: updatedOrder.status || 'Ready for Pickup',
                    createdAt: updatedOrder.createdAt || new Date().toLocaleString(),
                    createdAtTimestamp: updatedOrder.createdAtTimestamp || Date.now(),
                    estimatedMinutes: updatedOrder.estimatedMinutes || 10,
                    qrToken: updatedOrder.qrToken || '',
                    payeeUpiId: updatedOrder.payeeUpiId || ''
                  });
                }
                setActiveTab('tracking');
                notification.close();
              };
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser, ordersHistory]);

  // Listen for background SW clicked redirect instructions
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.action === 'openOrder') {
        const orderId = event.data.orderId;
        console.log('[SW Redirection click received] Opening order status screen:', orderId);
        window.focus();
        const matchedOrder = ordersHistory.find(o => o.id === orderId);
        if (matchedOrder) {
          setCurrentOrder(matchedOrder);
        }
        setActiveTab('tracking');
      }
    };
    
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleMessage);
    }
    return () => {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleMessage);
      }
    };
  }, [ordersHistory]);

  // Synchronize incoming active order for the shopkeeper dashboard
  useEffect(() => {
    if (!currentUser || currentUser.role !== 'shopkeeper' || !ordersHistory) return;
    
    // Find the active shop ID for this owner
    const shopId = currentUser.shopId || (shops.find(s => s.email === currentUser.email)?.id);
    if (!shopId) return;

    // Filter active orders that have been successfully PAID
    const activeOrders = ordersHistory.filter(o => 
      o.shopId === shopId && 
      ['Pending', 'Accepted', 'Ready for Pickup'].includes(o.status) &&
      o.paymentStatus === 'Paid'
    );

    // If currentOrder is null or is not in the active shop orders anymore, set it to the first active order
    if (activeOrders.length > 0) {
      const exists = currentOrder && activeOrders.some(o => o.id === currentOrder.id);
      if (!exists) {
        setCurrentOrder(activeOrders[0]);
      } else {
        // Keep it synchronized with status updates
        const updated = activeOrders.find(o => o.id === currentOrder!.id);
        if (updated && JSON.stringify(updated) !== JSON.stringify(currentOrder)) {
          setCurrentOrder(updated);
        }
      }
    } else {
      if (currentOrder) {
        setCurrentOrder(null);
      }
    }
  }, [currentUser, ordersHistory, shops, currentOrder]);

  // Auto-restore customer's active tracking order on load/sync
  useEffect(() => {
    if (!currentUser || currentUser.role !== 'customer' || !ordersHistory) return;
    
    // Find the latest active order (Paid, not completed/cancelled yet)
    const latestActive = ordersHistory.find(o => 
      o.customerId === currentUser.id && 
      ['Pending', 'Accepted', 'Ready for Pickup'].includes(o.status) &&
      o.paymentStatus === 'Paid'
    );

    if (latestActive) {
      if (!currentOrder || currentOrder.id !== latestActive.id) {
        setCurrentOrder(latestActive);
      } else if (JSON.stringify(latestActive) !== JSON.stringify(currentOrder)) {
        setCurrentOrder(latestActive);
      }
    } else {
      if (currentOrder && (currentOrder.status === 'Completed' || currentOrder.status === 'Cancelled')) {
        // Keep completion screen intact unless tab changes
      }
    }
  }, [currentUser, ordersHistory, currentOrder]);

  // Trigger Web Push Notification to specific customer (supports Web Push and FCM token format)
  const dispatchPushNotificationToCustomer = async (orderId: string, customerId: string, shopName: string) => {
    try {
      const { data: userData, error } = await supabase
        .from('user_accounts')
        .select('pushToken')
        .eq('id', customerId)
        .single();
        
      if (error || !userData || !userData.pushToken) {
        console.log('[Push Notification] Customer has no registered push token/subscription.');
        return;
      }
      
      const tokenStr = userData.pushToken.trim();
      const tokenVal = orderId.split('-')[1] || orderId;
      const messageText = `🍽️ Your order at ${shopName} is ready for pickup! Token #${tokenVal}.`;
      
      // 1. Try parsing as Web Push PushSubscription JSON
      let isWebPush = false;
      let webSub: any = null;
      try {
        if (tokenStr.startsWith('{')) {
          webSub = JSON.parse(tokenStr);
          if (webSub && webSub.endpoint) {
            isWebPush = true;
          }
        }
      } catch (parseErr) {
        // Treat as plain FCM token
      }

      if (isWebPush && webSub) {
        console.log('[Push Notification] Dispatching Web Push to subscription endpoint:', webSub.endpoint);
        
        // OneSignal integration
        if (webSub.oneSignalPlayerId) {
          await fetch('https://onesignal.com/api/v1/notifications', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json; charset=utf-8'
            },
            body: JSON.stringify({
              app_id: 'ONESIGNAL_APP_ID_GOES_HERE',
              include_subscription_ids: [webSub.oneSignalPlayerId],
              contents: { en: messageText },
              headings: { en: 'Order Ready! 🍽️' },
              data: { orderId }
            })
          }).catch(err => console.warn('OneSignal API push error:', err));
        } else {
          console.log('[Push Notification Info] Web Push subscription is available, but Firebase FCM/OneSignal is not configured.');
        }
      } else {
        // 2. Treat as FCM Registration Token (React Native Mobile Client)
        console.log('[Push Notification] Found FCM Registration Token for customer:', tokenStr);
        console.log(`[Push Notification Dispatch] Sending FCM alert: "${messageText}" to token: "${tokenStr}"`);
        
        const fcmServerKey = ((import.meta as any).env?.VITE_FCM_SERVER_KEY as string) || '';
        if (fcmServerKey) {
          await fetch('https://fcm.googleapis.com/fcm/send', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `key=${fcmServerKey}`
            },
            body: JSON.stringify({
              to: tokenStr,
              notification: {
                title: 'Order Ready! 🍽️',
                body: messageText,
                sound: 'default'
              },
              data: {
                orderId
              }
            })
          })
          .then(res => res.json())
          .then(resData => console.log('[Push Notification FCM Response]:', resData))
          .catch(err => console.warn('FCM legacy send error:', err));
        } else {
          console.log('[Push Notification Warning] FCM credentials not set in VITE_FCM_SERVER_KEY. Skipping push dispatch.');
        }
      }
    } catch (e) {
      console.warn('[Push Notification] Dispatch error:', e);
    }
  };

  // LIVE CAMERA ACCESS ENGINE (html5-qrcode programmatically)
  const startCameraScanner = async () => {
    setCameraError(null);
    setIsCameraActive(true);
    
    // Allow DOM to mount the #qr-reader element
    setTimeout(async () => {
      try {
        const qrContainer = document.getElementById('qr-reader');
        if (!qrContainer) {
          throw new Error('Scanner container element (#qr-reader) not found in DOM.');
        }

        const html5QrCode = new Html5Qrcode("qr-reader");
        qrScannerRef.current = html5QrCode;

        await html5QrCode.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: (width, height) => {
              const size = Math.min(width, height) * 0.85;
              return { width: size, height: size };
            }
          },
          (qrCodeMessage) => {
            console.log("QR Code Decoded:", qrCodeMessage);
            processQrScanHandover(qrCodeMessage);
          },
          (errorMessage) => {
            // Ignore normal frame decode errors
          }
        );
      } catch (err: any) {
        console.warn('[Camera] Scanner startup error:', err);
        setCameraError(err.message || 'Camera access denied — please allow camera permissions in browser settings.');
        setIsCameraActive(false);
      }
    }, 150);
  };

  const stopCameraScanner = () => {
    if (qrScannerRef.current) {
      const scanner = qrScannerRef.current;
      qrScannerRef.current = null;
      if (scanner.isScanning) {
        scanner.stop().catch(err => console.warn('[Camera] Stop error:', err));
      }
    }
    setIsCameraActive(false);
  };

  useEffect(() => {
    return () => {
      if (qrScannerRef.current) {
        const scanner = qrScannerRef.current;
        if (scanner.isScanning) {
          scanner.stop().catch(err => console.warn('[Camera] Unmount stop error:', err));
        }
      }
    };
  }, []);

  const isItemInTimeSlot = (item: FoodItem) => {
    const parentShop = shops.find(s => s.id === item.shopId);
    if (!parentShop || !isShopOpen(parentShop)) {
      return false;
    }
    if (!item.isAvailable) return false;
    if (!item.availableFrom || !item.availableUntil) return true;

    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const [fromH, fromM] = item.availableFrom.split(':').map(Number);
    const [untilH, untilM] = item.availableUntil.split(':').map(Number);

    const fromTotal = fromH * 60 + (fromM || 0);
    const untilTotal = untilH * 60 + (untilM || 0);

    return currentMinutes >= fromTotal && currentMinutes <= untilTotal;
  };

  const addToCart = (item: FoodItem) => {
    const parentShop = shops.find(s => s.id === item.shopId);
    if (parentShop && !isShopOpen(parentShop)) {
      alert(`🏪 ${parentShop.name} is currently Closed. Operating hours: ${formatTime12h(parentShop.openingTime || '08:00')} - ${formatTime12h(parentShop.closingTime || '22:00')}.`);
      return;
    }
    if (!isItemInTimeSlot(item)) return;
    const { finalPrice } = getDiscountedPrice(item, discounts);
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) {
        return prev.map(i => i.id === item.id ? { ...i, qty: i.qty + 1 } : i);
      }
      return [...prev, { ...item, qty: 1, originalPrice: item.price, discountedPrice: finalPrice }];
    });
  };

  const updateQty = (id: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = item.qty + delta;
        return newQty > 0 ? { ...item, qty: newQty } : null;
      }
      return item;
    }).filter(Boolean) as CartItem[]);
  };

  const cartSubtotal = cart.reduce((acc, item) => acc + item.discountedPrice * item.qty, 0);
  const totalItemsCount = cart.reduce((acc, item) => acc + item.qty, 0);

  const currentCheckoutShop = cart.length > 0 ? shops.find(s => s.id === cart[0].shopId) || shops[0] : shops[0];

  useEffect(() => {
    if (isPayingGateway && pendingOrderId && currentCheckoutShop) {
      // Check if the shop has a custom QR image uploaded
      const isCustomQr = currentCheckoutShop.qrImageUrl && 
                          !currentCheckoutShop.qrImageUrl.includes('qrserver.com') && 
                          currentCheckoutShop.qrImageUrl.trim() !== '';

      if (isCustomQr) {
        setCheckoutQrDataUrl(currentCheckoutShop.qrImageUrl);
      } else {
        const upiUrl = `upi://pay?pa=${currentCheckoutShop.upiId}&pn=${encodeURIComponent(currentCheckoutShop.name)}&am=${cartSubtotal + 15}&tn=${pendingOrderId}&tr=${pendingOrderId}`;
        QRCode.toDataURL(upiUrl, { width: 250, margin: 2 })
          .then(url => {
            setCheckoutQrDataUrl(url);
          })
          .catch(err => {
            console.error('Failed to generate local QR for checkout, fallback to api:', err);
            setCheckoutQrDataUrl(`https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=10&data=${encodeURIComponent(upiUrl)}`);
          });
      }
    }
  }, [isPayingGateway, pendingOrderId, currentCheckoutShop, cartSubtotal]);

  // AUTH SUBMISSION WITH STRICT CASE-SENSITIVE SUPER ADMIN REDIRECT
  const handleAuthSubmit = async (e?: React.FormEvent, directEmail?: string, directPassword?: string, directShopId?: string) => {
    if (e) e.preventDefault();
    if (isAuthLoading) return;
    setAuthError(null);

    // Pass raw credentials without trimming or lowercasing beforehand for Super Admin check
    const targetEmail = directEmail || authEmail;
    const targetPassword = directPassword || authPassword;

    console.log(`[Auth Submit Payload Log] email: "${targetEmail}" (len: ${targetEmail?.length}), password length: ${targetPassword?.length}, authTab: "${authTab}", customerMode: "${customerMode}"`);

    if (!targetEmail || !targetPassword) {
      setAuthError('Please enter both email address and password.');
      return;
    }

    // Frontend Gmail constraint validation
    const checkEmail = targetEmail.trim().toLowerCase();
    if (authTab === 'customer' && targetEmail !== SUPER_ADMIN_EMAIL && !checkEmail.endsWith('@gmail.com')) {
      setAuthError('Only Gmail addresses are allowed.');
      return;
    }

    setIsAuthLoading(true);
    try {
      if (authTab === 'customer' && customerMode === 'signup' && !directEmail) {
        // Customer Sign Up Flow
        if (!signUpName.trim()) {
          setAuthError('Please enter your full name.');
          setIsAuthLoading(false);
          return;
        }
        if (targetPassword !== signUpConfirmPassword) {
          setAuthError('Passwords do not match.');
          setIsAuthLoading(false);
          return;
        }
        if (targetPassword.length < 8 || !/\d/.test(targetPassword)) {
          setAuthError('Password must be at least 8 characters long and contain at least one number.');
          setIsAuthLoading(false);
          return;
        }

        const res = await registerCustomer(signUpName, targetEmail, targetPassword);
        if (res.success && res.user) {
          const finalUser: UserAccount = {
            ...res.user,
            shopId: 'shop-1'
          };
          setCurrentUser(finalUser);
          localStorage.setItem(SESSION_USER_KEY, JSON.stringify(finalUser));
          setActiveTab('home');
        } else {
          setAuthError(res.message || 'Registration failed.');
        }
      } else {
        // Sign In Flow (Customer or Shopkeeper or Super Admin)
        const res = await authenticateUser(targetEmail, targetPassword, authTab);
        if (res.success && res.user) {
          const finalUser: UserAccount = {
            ...res.user,
            shopId: directShopId || res.user.shopId || 'shop-1'
          };
          setCurrentUser(finalUser);
          localStorage.setItem(SESSION_USER_KEY, JSON.stringify(finalUser));

          if (finalUser.role === 'super_admin') {
            setActiveTab('admin');
          } else if (finalUser.role === 'shopkeeper' || authTab === 'shopkeeper') {
            setActiveTab('owner');
          } else {
            setActiveTab('home');
          }
        } else {
          setAuthError(res.message || 'Invalid email or password.');
        }
      }
    } catch (err: any) {
      console.error('[Auth Submit Exception]:', err);
      setAuthError(err.message || 'An unexpected database connection error occurred. Please try again.');
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    stopCameraScanner();
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn('[Supabase SignOut Exception]:', err);
    }
    setCurrentUser(null);
    localStorage.removeItem(SESSION_USER_KEY);
    setActiveTab('home');
  };

  // CHECKOUT VALIDATION
  const handleStartCheckout = () => {
    let soldOutItemName = '';
    for (const cartItem of cart) {
      const matched = menuItems.find(m => m.id === cartItem.id);
      if (matched) {
        const isOut = matched.isSoldOut || (matched.stockRemaining !== null && matched.stockRemaining !== undefined && matched.stockRemaining <= 0);
        if (isOut) {
          soldOutItemName = matched.name;
          break;
        }
        if (matched.stockRemaining !== null && matched.stockRemaining !== undefined && matched.stockRemaining < cartItem.qty) {
          alert(`Sorry, there is only ${matched.stockRemaining} remaining stock of "${matched.name}". Please adjust the quantity in your cart.`);
          return;
        }
      }
    }
    if (soldOutItemName) {
      alert(`Sorry, "${soldOutItemName}" has just sold out! Please remove it from your cart before checking out.`);
      return;
    }
    setPendingOrderId(null);
    setIsCheckoutOpen(true);
  };



  const handleStartPaymentVerification = async () => {
    if (cart.length === 0) return;

    // Reuse existing pending order if created for this checkout window
    if (pendingOrderId) {
      setIsPayingGateway(true);
      setGatewayStatus('waiting');
      setGatewayError(null);
      setIsCheckoutOpen(false);
      return;
    }

    setIsPlacingPendingOrder(true);
    try {
      const targetShop = currentCheckoutShop;
      if (!isShopOpen(targetShop)) {
        alert(`🏪 ${targetShop.name} is currently Closed. Operating hours: ${formatTime12h(targetShop.openingTime || '08:00')} - ${formatTime12h(targetShop.closingTime || '22:00')}.`);
        return;
      }

      const grandTotal = cartSubtotal + 15;

      const apiRes = await createOrderApi({
        shopId: targetShop.id,
        items: cart.map(i => ({ id: i.id, name: i.name, price: i.discountedPrice, qty: i.qty })),
        grandTotal,
        paymentMethod: selectedPaymentMethod,
        customerId: currentUser?.id || 'guest-1',
        customerName: currentUser?.name || 'Student Customer'
      });

      if (!apiRes.success) {
        alert(apiRes.message || 'Order placement failed. Items may have sold out.');
        return;
      }

      setPendingOrderId(apiRes.orderId!);
      setIsPayingGateway(true);
      setGatewayStatus('waiting');
      setGatewayError(null);
      setIsCheckoutOpen(false);
    } catch (err: any) {
      alert(`Error placing pending order: ${err.message}`);
    } finally {
      setIsPlacingPendingOrder(false);
    }
  };

  const handleSubmitUtrPayment = async (utrString: string) => {
    const utrClean = utrString.trim();
    if (!/^\d{12}$/.test(utrClean)) {
      setGatewayStatus('failed');
      setGatewayError('Invalid Transaction Reference: UPI UTR must be exactly 12 numeric digits.');
      return;
    }

    setGatewayStatus('success');
    setGatewayError(null);

    if (!pendingOrderId) {
      setGatewayStatus('failed');
      setGatewayError('No pending order ID found.');
      return;
    }

    try {
      // Call backend confirmOrderPayment API with the clean UTR string
      const res = await confirmOrderPaymentApi(pendingOrderId, utrClean, true);

      if (res.success && res.qrToken) {
        const targetShop = currentCheckoutShop;
        const grandTotal = cartSubtotal + 15;

        const newOrder: Order = {
          id: pendingOrderId,
          shopId: targetShop.id,
          shopName: targetShop.name,
          customerId: currentUser?.id || 'guest-1',
          customerName: currentUser?.name || 'Student Customer',
          items: [...cart],
          grandTotal,
          paymentMethod: selectedPaymentMethod,
          paymentStatus: 'Paid',
          transactionId: utrClean,
          paidAt: new Date().toLocaleTimeString(),
          status: 'Pending',
          createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          createdAtTimestamp: Date.now(),
          estimatedMinutes: 12,
          qrToken: res.qrToken,
          payeeUpiId: targetShop.upiId,
          payeeQrUrl: targetShop.qrImageUrl
        };

        setCurrentOrder(newOrder);
        setOrdersHistory(prev => [newOrder, ...prev]);
        setCart([]);
        setUserUtrInput('');
        setIsCheckoutOpen(false);
        setIsCartOpen(false);
        setIsPayingGateway(false);
        setPendingOrderId(null);
        setActiveTab('tracking');

        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.6 }
        });
      } else {
        setGatewayStatus('failed');
        setGatewayError(res.message || 'Payment reference verification failed.');
      }
    } catch (err: any) {
      setGatewayStatus('failed');
      setGatewayError(err.message || 'Payment verification failed.');
    }
  };

  const handleGatewayCancel = () => {
    setIsPayingGateway(false);
  };

  // ORDER CANCELLATION (STRICT 8-SECOND WINDOW VALIDATION)
  const handleCustomerCancelOrder = async (orderIdToCancel: string) => {
    if (!currentOrder || currentOrder.id !== orderIdToCancel) return;

    const elapsedMs = Date.now() - currentOrder.createdAtTimestamp;
    if (elapsedMs > 8000) {
      alert(`⚠️ Cancellation window expired: 8-second cancellation period has passed.`);
      return;
    }

    if (currentOrder.status !== 'Pending') {
      alert(`⚠️ Cannot cancel order #${orderIdToCancel}: The shopkeeper has already accepted your order!`);
      return;
    }

    const apiRes = await cancelOrderApi(orderIdToCancel, 'customer', 'Customer cancelled within 8s window');
    if (apiRes.success) {
      const updated: Order = {
        ...currentOrder,
        status: 'Cancelled',
        paymentStatus: apiRes.refundStatus || currentOrder.paymentStatus,
        cancelledBy: 'customer',
        cancelledAt: new Date().toLocaleTimeString(),
        cancellationReason: 'Customer cancelled within 8s window'
      };
      setCurrentOrder(updated);
      setOrdersHistory(prev => prev.map(o => o.id === orderIdToCancel ? updated : o));
      alert(`✅ Order #${orderIdToCancel} has been cancelled.${apiRes.refundStatus === 'Refund Pending' ? ' Refund marked for processing.' : ''}`);
    } else {
      alert(`❌ Cancellation failed: ${apiRes.message}`);
    }
  };

  // SHOPKEEPER ACCEPT ORDER ACTION
  const handleShopkeeperAcceptOrder = async (orderIdToAccept: string) => {
    await acceptOrderApi(orderIdToAccept);
    if (currentOrder && currentOrder.id === orderIdToAccept) {
      const updated: Order = { ...currentOrder, status: 'Accepted' };
      setCurrentOrder(updated);
      setOrdersHistory(prev => prev.map(o => o.id === orderIdToAccept ? updated : o));
    }
  };

  // SHOPKEEPER "FOOD IS READY" ACTION (Moves Accepted -> Ready for Pickup)
  const handleShopkeeperFoodReady = async (orderIdToReady: string) => {
    await markFoodReadyApi(orderIdToReady);

    // Find customer details from orders history to send real push notifications
    const matchedOrder = ordersHistory.find(o => o.id === orderIdToReady);
    if (matchedOrder) {
      const activeShopId = currentUser?.shopId || matchedOrder.shopId || 'shop-1';
      const activeShop = shops.find(s => s.id === activeShopId) || { name: 'Campus Canteen' };
      dispatchPushNotificationToCustomer(orderIdToReady, matchedOrder.customerId || '', activeShop.name);
    }

    if (currentOrder && currentOrder.id === orderIdToReady) {
      const updated: Order = { ...currentOrder, status: 'Ready for Pickup' };
      setCurrentOrder(updated);
      setOrdersHistory(prev => prev.map(o => o.id === orderIdToReady ? updated : o));
    }
  };

  // SHOPKEEPER REJECT/CANCEL PENDING ORDER
  const handleShopkeeperRejectOrder = async (orderIdToReject: string) => {
    if (confirm(`Reject/Cancel Order #${orderIdToReject}?`)) {
      const apiRes = await cancelOrderApi(orderIdToReject, 'shopkeeper', 'Item out of stock or canteen busy');
      if (apiRes.success && currentOrder && currentOrder.id === orderIdToReject) {
        const updated: Order = {
          ...currentOrder,
          status: 'Cancelled',
          paymentStatus: apiRes.refundStatus || currentOrder.paymentStatus,
          cancelledBy: 'shopkeeper',
          cancelledAt: new Date().toLocaleTimeString(),
          cancellationReason: 'Rejected by Shopkeeper'
        };
        setCurrentOrder(updated);
        setOrdersHistory(prev => prev.map(o => o.id === orderIdToReject ? updated : o));
      }
    }
  };

  // QR AUTO HANDOVER ENGINE WITH FRESH SERVER FETCH AND SINGLE-USE BLOCK
  // QR AUTO HANDOVER ENGINE WITH FRESH SERVER FETCH AND SINGLE-USE BLOCK
  const processQrScanHandover = async (scannedRaw: string) => {
    setScanResult(null);
    const loggedInShopId = currentUser?.shopId || 'shop-1';
    const shopOwnerName = currentUser?.name || 'Canteen Manager';

    // Call server-side verification in order service
    let apiRes = await verifyAndProcessQrHandoverApi(scannedRaw, loggedInShopId, shopOwnerName);
    
    // Fallback locally if Supabase connection fails or is unconfigured
    if (!apiRes.success && (!apiRes.message || apiRes.message.includes('Error') || apiRes.message.includes('failed') || apiRes.message.includes('not found') || apiRes.message.includes('FetchError') || apiRes.message.includes('placeholder'))) {
      console.log('[Scanner Fallback] Supabase failed/placeholder active. Verifying QR locally...');
      let parsed: any;
      try {
        parsed = JSON.parse(scannedRaw);
      } catch {
        parsed = { orderId: scannedRaw.trim() };
      }
      const targetOrderId = parsed.orderId || parsed.id || scannedRaw.trim();
      const localOrder = ordersHistory.find(o => o.id === targetOrderId);

      if (localOrder) {
        if (localOrder.shopId !== loggedInShopId) {
          apiRes = { success: false, message: `Access Denied: Order #${targetOrderId} belongs to another shop.` };
        } else if (localOrder.status === 'Completed') {
          apiRes = { 
            success: false, 
            message: `⚠️ DUPLICATE SCAN BLOCKED: Order #${targetOrderId} has already been handed over!`,
            orderId: targetOrderId,
            shopName: localOrder.shopName,
            paymentStatus: localOrder.paymentStatus,
            customerName: localOrder.customerName,
            items: localOrder.items.map(i => ({ id: i.id, name: i.name, price: i.discountedPrice, qty: i.qty })),
            grandTotal: localOrder.grandTotal
          };
        } else if (localOrder.status === 'Cancelled') {
          apiRes = { 
            success: false, 
            message: `Order #${targetOrderId} was CANCELLED. Handover blocked.`,
            orderId: targetOrderId,
            shopName: localOrder.shopName,
            paymentStatus: localOrder.paymentStatus,
            customerName: localOrder.customerName,
            items: localOrder.items.map(i => ({ id: i.id, name: i.name, price: i.discountedPrice, qty: i.qty })),
            grandTotal: localOrder.grandTotal
          };
        } else if (localOrder.status !== 'Ready for Pickup') {
          apiRes = { 
            success: false, 
            message: `Order #${targetOrderId} is currently '${localOrder.status}'. It must be marked 'Ready for Pickup' before handover.`,
            orderId: targetOrderId,
            shopName: localOrder.shopName,
            paymentStatus: localOrder.paymentStatus,
            customerName: localOrder.customerName,
            items: localOrder.items.map(i => ({ id: i.id, name: i.name, price: i.discountedPrice, qty: i.qty })),
            grandTotal: localOrder.grandTotal
          };
        } else if (localOrder.paymentStatus !== 'Paid') {
          apiRes = { 
            success: false, 
            message: `⚠️ PAYMENT NOT RECEIVED: Order #${targetOrderId} is unpaid.`,
            orderId: targetOrderId,
            shopName: localOrder.shopName,
            paymentStatus: localOrder.paymentStatus,
            customerName: localOrder.customerName,
            items: localOrder.items.map(i => ({ id: i.id, name: i.name, price: i.discountedPrice, qty: i.qty })),
            grandTotal: localOrder.grandTotal
          };
        } else {
          apiRes = {
            success: true,
            message: `🎉 Order #${targetOrderId} verified & marked as Handed Over!`,
            orderId: targetOrderId,
            shopName: localOrder.shopName,
            paymentStatus: 'Paid',
            customerName: localOrder.customerName,
            items: localOrder.items.map(i => ({ id: i.id, name: i.name, price: i.discountedPrice, qty: i.qty })),
            grandTotal: localOrder.grandTotal,
            transactionId: localOrder.transactionId || 'LOCAL-TXN-12345'
          };
        }
      }
    }
    
    if (apiRes.success) {
      const timeHanded = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const orderIdScanned = apiRes.orderId;
      
      // Update local state for tracking order
      if (currentOrder && currentOrder.id === orderIdScanned) {
        const updatedOrder = {
          ...currentOrder,
          status: 'Completed' as const,
          handedOverAt: timeHanded
        };
        setCurrentOrder(updatedOrder);
      }
      
      setOrdersHistory(prev => prev.map(o => o.id === orderIdScanned ? {
        ...o,
        status: 'Completed' as const,
        handedOverAt: timeHanded
      } : o));

      setScanResult(apiRes);
      stopCameraScanner();

      confetti({
        particleCount: 90,
        spread: 70,
        origin: { y: 0.7 }
      });
    } else {
      setScanResult(apiRes);
    }
  };

  // SUPER ADMIN 1: ADD NEW CANTEEN SHOP
  const handleAddShopkeeper = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!newShopkeeperEmail || !newShopName || !newShopkeeperPassword) {
        alert('⚠️ Please fill in all required fields (Shopkeeper Email, Password & Canteen Shop Name).');
        return;
      }
      // Generate unique targetShopId if empty or default 'shop-new' to prevent ID collisions
      const targetShopId = (newShopkeeperShopId.trim() && newShopkeeperShopId.trim() !== 'shop-new')
        ? newShopkeeperShopId.trim()
        : `shop-${Date.now()}`;

      const createdShopName = newShopName.trim();
      const newShopObj: ShopAccount = {
        id: targetShopId,
        name: createdShopName,
        email: newShopkeeperEmail.trim().toLowerCase(),
        upiId: `${targetShopId.replace(/[^a-zA-Z0-9]/g, '')}@okaxis`,
        qrImageUrl: `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=upi://pay?pa=${targetShopId}@okaxis&pn=${encodeURIComponent(createdShopName)}`,
        rating: 5.0
      };

      // 1. Create the shop record first in Supabase
      const updatedShops = await addOrUpdateShopAccount(newShopObj);

      // 2. Create the shopkeeper account second
      const res = await createShopkeeperAccount(newShopkeeperName, newShopkeeperEmail, targetShopId, newShopkeeperPassword);
      
      if (res.success) {
        setShops(updatedShops);

        alert(`🎉 Success: Canteen Shop "${createdShopName}" and Shopkeeper account (${newShopkeeperEmail}) saved to database!`);
        setIsAddShopkeeperOpen(false);
        setNewShopkeeperName('');
        setNewShopkeeperEmail('');
        setNewShopkeeperPassword('');
        setNewShopName('');
        setNewShopkeeperShopId(`shop-${Date.now()}`);
      } else {
        // Rollback the created shop record if shopkeeper account creation fails
        try {
          await deleteShopAccount(targetShopId);
        } catch (rollbackErr) {
          console.warn('Failed to rollback shop creation:', rollbackErr);
        }
        alert(`❌ Error: ${res.message || 'Failed to create shopkeeper account.'}`);
      }
    } catch (err: any) {
      alert(`❌ Error adding shop: ${err.message || 'Failed to complete request'}`);
    }
  };

  const handleQrImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size limit: 2MB
    if (file.size > 2 * 1024 * 1024) {
      alert('⚠️ File size exceeds 2MB limit. Please select a smaller image.');
      return;
    }
    // Check type limit: image
    if (!file.type.startsWith('image/')) {
      alert('⚠️ Invalid file format. Please select an image file (PNG/JPG).');
      return;
    }

    setSelectedQrFile(file);

    // Render local preview using FileReader
    const reader = new FileReader();
    reader.onloadend = () => {
      setOwnerQrImageUrlInput(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSavePaymentSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || currentUser.role !== 'shopkeeper' || !currentUser.shopId) return;

    const upiClean = ownerUpiInput.trim();
    if (upiClean !== '' && !upiClean.includes('@')) {
      alert('⚠️ Invalid UPI ID: Must contain "@" symbol (e.g. name@bank).');
      return;
    }

    setIsSavingPayment(true);
    try {
      const myShop = shops.find(s => s.id === currentUser.shopId);
      if (!myShop) {
        alert('⚠️ Shop account not found.');
        return;
      }

      let finalQrUrl = ownerQrImageUrlInput;

      // If a new file was chosen, upload it to storage
      if (selectedQrFile) {
        const fileExt = selectedQrFile.name.split('.').pop() || 'png';
        const fileName = `${currentUser.shopId}-qr-${Date.now()}.${fileExt}`;
        const filePath = `shop_qrs/${fileName}`;

        const { data, error: uploadError } = await supabase.storage
          .from('qrcodes')
          .upload(filePath, selectedQrFile, { upsert: true });

        if (uploadError) {
          throw new Error(`Supabase Storage upload failed: ${uploadError.message}. Please verify that the "qrcodes" public storage bucket is created on your Supabase dashboard.`);
        }

        const { data: publicUrlData } = supabase.storage
          .from('qrcodes')
          .getPublicUrl(filePath);

        if (publicUrlData?.publicUrl) {
          finalQrUrl = publicUrlData.publicUrl;
          console.log('[Supabase Storage Upload Success] URL:', finalQrUrl);
        }
      }

      const updatedShopObj: ShopAccount = {
        ...myShop,
        upiId: upiClean,
        qrImageUrl: finalQrUrl || '',
        openingTime: openingTimeInput,
        closingTime: closingTimeInput,
        isManuallyClosed: isManuallyClosedInput
      };

      const updatedShops = await addOrUpdateShopAccount(updatedShopObj);
      setShops(updatedShops);
      setSelectedQrFile(null);
      alert('🎉 Success: Shop payment details saved to database!');
    } catch (err: any) {
      alert(`⚠️ Failed to save settings: ${err.message}`);
    } finally {
      setIsSavingPayment(false);
    }
  };

  const handleClearUpiId = async () => {
    if (!currentUser || currentUser.role !== 'shopkeeper' || !currentUser.shopId) return;

    if (confirm('Are you sure you want to clear your saved UPI ID? This will hide your shop from customers until a new one is configured.')) {
      setOwnerUpiInput('');
      try {
        const myShop = shops.find(s => s.id === currentUser.shopId);
        if (myShop) {
          const updatedShopObj: ShopAccount = {
            ...myShop,
            upiId: ''
          };
          const updatedShops = await addOrUpdateShopAccount(updatedShopObj);
          setShops(updatedShops);
          alert('🎉 UPI ID cleared successfully!');
        }
      } catch (err: any) {
        alert(`⚠️ Failed to update database: ${err.message}`);
      }
    }
  };

  const handleRemoveQrCode = async () => {
    if (!currentUser || currentUser.role !== 'shopkeeper' || !currentUser.shopId) return;

    if (confirm('Are you sure you want to remove your custom QR code? This will revert to auto-generating QR codes from your UPI ID.')) {
      // Attempt to delete from Supabase storage if it's a cloud storage link
      if (ownerQrImageUrlInput && ownerQrImageUrlInput.includes('/storage/')) {
        try {
          const marker = '/storage/v1/object/public/qrcodes/';
          if (ownerQrImageUrlInput.includes(marker)) {
            const filePath = ownerQrImageUrlInput.split(marker)[1];
            if (filePath) {
              await supabase.storage.from('qrcodes').remove([filePath]);
            }
          }
        } catch (e: any) {
          console.warn('[Supabase Storage delete failed]:', e.message);
        }
      }

      setOwnerQrImageUrlInput('');
      setSelectedQrFile(null);

      try {
        const myShop = shops.find(s => s.id === currentUser.shopId);
        if (myShop) {
          const updatedShopObj: ShopAccount = {
            ...myShop,
            qrImageUrl: ''
          };
          const updatedShops = await addOrUpdateShopAccount(updatedShopObj);
          setShops(updatedShops);
          alert('🎉 Custom QR code removed successfully!');
        }
      } catch (err: any) {
        alert(`⚠️ Failed to update database: ${err.message}`);
      }
    }
  };

  // SUPER ADMIN 2: DELETE CANTEEN SHOP (WITH ACTIVE ORDER SAFEGUARD)
  const handleDeleteShop = async (shopId: string, shopName: string) => {
    const activePendingOrders = ordersHistory.filter(o => 
      o.shopId === shopId && ['Pending', 'Accepted', 'Ready for Pickup'].includes(o.status)
    );

    if (activePendingOrders.length > 0) {
      alert(`⚠️ CANNOT DELETE SHOP: "${shopName}" currently has ${activePendingOrders.length} active unfulfilled order(s)! Please fulfill or cancel these orders before deleting the canteen shop.`);
      return;
    }

    if (confirm(`Are you sure you want to delete "${shopName}"? This will permanently remove the shop and all its menu items while preserving historical order logs.`)) {
      try {
        const { shops: updatedShops, menuItems: updatedMenu } = await deleteShopAccount(shopId);
        setShops(updatedShops);
        setMenuItems(updatedMenu);
        alert(`✅ Shop "${shopName}" and all associated food items have been deleted!`);
      } catch (err: any) {
        alert(`❌ Failed to delete shop: ${err.message || 'Error occurred'}`);
      }
    }
  };

  // SHOPKEEPER / SUPER ADMIN: CREATE / SAVE DISCOUNT OFFER
  const handleSaveDiscount = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const activeShopId = currentUser?.shopId || 'shop-1';
      const newDisc: DiscountOffer = {
        id: `disc-${Date.now()}`,
        shopId: activeShopId,
        code: discountForm.code.toUpperCase(),
        title: discountForm.title,
        type: discountForm.type,
        value: discountForm.value,
        appliesTo: discountForm.appliesTo,
        categoryName: discountForm.categoryName,
        validFrom: new Date().toISOString(),
        validUntil: '2026-12-31T23:59',
        isActive: discountForm.isActive,
        createdAt: Date.now()
      };

      const updatedDiscounts = await addOrUpdateDiscount(newDisc);
      setDiscounts(updatedDiscounts);
      setIsDiscountModalOpen(false);
      alert(`✅ Discount offer "${newDisc.code}" saved & active on shop menu!`);
    } catch (err: any) {
      alert(`❌ Error saving discount offer: ${err.message || 'Failed'}`);
    }
  };

  // DELETE DISCOUNT OFFER
  const handleDeleteDiscount = async (discId: string) => {
    if (confirm(`Delete discount offer?`)) {
      const updated = await deleteDiscountById(discId);
      setDiscounts(updated);
    }
  };

  // SHOPKEEPER ADD OR EDIT FOOD ITEM
  const handleSaveFoodItem = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const activeShopId = currentUser?.shopId || 'shop-1';
      const activeShop = shops.find(s => s.id === activeShopId) || {
        id: activeShopId,
        name: currentUser?.name ? `${currentUser.name}'s Canteen` : 'Campus Canteen'
      };
      const finalImage = getCategoryDefaultImage(itemForm.category, itemForm.image);

      const limitVal = itemForm.stockLimit.trim() !== '' ? Number(itemForm.stockLimit) : null;
      let remainingVal = itemForm.stockRemaining.trim() !== '' ? Number(itemForm.stockRemaining) : null;
      
      // Auto set remaining to limit if creating new or if remaining was left empty but limit is set
      if (remainingVal === null && limitVal !== null) {
        remainingVal = limitVal;
      }
      
      // Auto mark sold out if remaining stock is 0
      const autoSoldOut = remainingVal !== null && remainingVal <= 0;
      const isSoldOut = itemForm.isSoldOut || autoSoldOut;

      const itemToSave: FoodItem = editingItem ? {
        ...editingItem,
        ...itemForm,
        stockLimit: limitVal,
        stockRemaining: remainingVal,
        isSoldOut: isSoldOut,
        image: finalImage,
        id: editingItem.id,
        shopId: activeShop.id,
        shopName: activeShop.name
      } : {
        id: `m-${Date.now()}`,
        ...itemForm,
        stockLimit: limitVal,
        stockRemaining: remainingVal,
        isSoldOut: isSoldOut,
        image: finalImage,
        rating: 4.8,
        prepTime: '10-12 mins',
        shopId: activeShop.id,
        shopName: activeShop.name
      };

      const updatedMenu = await addOrUpdateFoodItem(itemToSave);
      setMenuItems(updatedMenu);

      setIsItemModalOpen(false);
      setEditingItem(null);
      alert(`✅ Food item "${itemToSave.name}" saved to database! Visible under ${activeShop.name}.`);
    } catch (err: any) {
      alert(`❌ Error saving food item: ${err.message || 'Failed to save'}`);
    }
  };

  // SHOPKEEPER DELETE FOOD ITEM
  const handleDeleteItem = async (id: string) => {
    const itemToDelete = menuItems.find(i => i.id === id);
    const itemName = itemToDelete ? itemToDelete.name : 'this item';
    if (confirm(`Are you sure you want to delete "${itemName}"?`)) {
      try {
        const updatedMenu = await deleteFoodItemById(id);
        setMenuItems(updatedMenu);
        alert(`✅ Food item "${itemName}" deleted!`);
      } catch (err: any) {
        alert(`❌ Error deleting food item: ${err.message || 'Failed to delete'}`);
      }
    }
  };

  // TOGGLE TODAY'S SPECIAL DISH
  const handleToggleSpecial = async (itemId: string) => {
    const updatedMenu = await toggleSpecialStatus(itemId);
    setMenuItems(updatedMenu);
  };

  // QUICK SOLD-OUT TOGGLE FOR SHOPKEEPER
  const handleToggleSoldOut = async (itemId: string) => {
    try {
      const target = menuItems.find(i => i.id === itemId);
      if (!target) return;
      
      const nextSoldOut = !target.isSoldOut;
      
      // If toggling to Available and stockRemaining <= 0, replenish stock by setting remaining to stockLimit (or default 10 if none)
      let nextRemaining = target.stockRemaining;
      if (!nextSoldOut && (target.stockRemaining !== null && target.stockRemaining !== undefined && target.stockRemaining <= 0)) {
        nextRemaining = target.stockLimit || 20; // Default replenishment count if none set
      }
      
      const updatedItem = {
        ...target,
        isSoldOut: nextSoldOut,
        stockRemaining: nextRemaining
      };
      
      const updatedMenu = await addOrUpdateFoodItem(updatedItem);
      setMenuItems(updatedMenu);
    } catch (err: any) {
      alert(`Error toggling status: ${err.message || 'Failed'}`);
    }
  };

  const openAddItemModal = () => {
    setEditingItem(null);
    setItemForm({
      name: '',
      category: 'Fast Food',
      price: 90,
      description: '',
      image: '',
      isVeg: true,
      isAvailable: true,
      availableFrom: '08:00',
      availableUntil: '22:00',
      isSpecial: false,
      isSoldOut: false,
      stockLimit: '',
      stockRemaining: ''
    });
    setIsItemModalOpen(true);
  };

  const openEditItemModal = (item: FoodItem) => {
    setEditingItem(item);
    setItemForm({
      name: item.name,
      category: item.category,
      price: item.price,
      description: item.description,
      image: item.image,
      isVeg: item.isVeg,
      isAvailable: item.isAvailable,
      availableFrom: item.availableFrom || '08:00',
      availableUntil: item.availableUntil || '22:00',
      isSpecial: !!item.isSpecial,
      isSoldOut: !!item.isSoldOut,
      stockLimit: item.stockLimit !== null && item.stockLimit !== undefined ? String(item.stockLimit) : '',
      stockRemaining: item.stockRemaining !== null && item.stockRemaining !== undefined ? String(item.stockRemaining) : ''
    });
    setIsItemModalOpen(true);
  };

  const categories = ['All', 'South Indian', 'Fast Food', 'Beverages', 'Main Course', 'Snacks', 'Desserts'];

  const filteredMenu = menuItems.filter(item => {
    const parentShop = shops.find(s => s.id === item.shopId);
    if (!parentShop || !parentShop.upiId || !parentShop.upiId.includes('@')) {
      return false; // Skip items from shops that are not configured with a payment destination
    }
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
    const matchesShop = selectedShopId === 'all' || item.shopId === selectedShopId;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          item.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesShop && matchesSearch;
  });

  const activeShopForOwner = shops.find(s => s.id === (currentUser?.shopId || 'shop-1')) || {
    id: currentUser?.shopId || 'shop-1',
    name: currentUser?.name ? `${currentUser.name}'s Canteen` : 'Campus Canteen',
    email: currentUser?.email || 'canteen@turo.com',
    upiId: `${(currentUser?.shopId || 'shop1').replace(/[^a-zA-Z0-9]/g, '')}@okaxis`,
    qrImageUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=upi://pay?pa=canteen@okaxis&pn=Canteen',
    rating: 4.8
  };

  const triggerManualSync = async () => {
    const dbShops = await fetchShopsFromSupabase();
    const dbMenu = await fetchMenuItemsFromSupabase();
    const dbDisc = await fetchDiscountsFromSupabase();
    setShops(dbShops);
    setMenuItems(dbMenu);
    setDiscounts(dbDisc);
    setLastSyncTime(new Date().toLocaleTimeString());
  };

  // SMART AI SALES ANALYTICS CALCULATIONS
  const getAiAnalytics = () => {
    // Filter paid/completed orders for this shop, excluding cancelled ones
    const shopOrders = ordersHistory.filter(o => 
      o.shopId === activeShopForOwner.id && 
      o.paymentStatus === 'Paid' && 
      o.status === 'Completed'
    );

    const totalRev = shopOrders.reduce((sum, o) => sum + (Number(o.grandTotal) || 0), 0);
    const avgOrder = shopOrders.length > 0 ? Math.round(totalRev / shopOrders.length) : 0;

    const categorySales: Record<string, number> = {};
    const itemSales: Record<string, { name: string; qty: number; revenue: number; category: string }> = {};
    const hourlySales: Record<number, number> = {};
    const daySales: Record<number, number> = {};

    const allCategories = ['South Indian', 'Fast Food', 'Beverages', 'Main Course', 'Snacks', 'Desserts'];
    allCategories.forEach(cat => {
      categorySales[cat] = 0;
    });

    shopOrders.forEach(o => {
      // Analyze hour (local timezone)
      const date = new Date(o.createdAtTimestamp);
      const hr = isNaN(date.getTime()) ? 12 : date.getHours();
      hourlySales[hr] = (hourlySales[hr] || 0) + (Number(o.grandTotal) || 0);

      const day = isNaN(date.getTime()) ? 0 : date.getDay();
      daySales[day] = (daySales[day] || 0) + (Number(o.grandTotal) || 0);

      o.items.forEach(i => {
        const cat = i.category || 'Fast Food';
        if (categorySales[cat] === undefined) {
          categorySales[cat] = 0;
        }
        categorySales[cat] += ((Number(i.discountedPrice) || 0) * (Number(i.qty) || 0));

        if (!itemSales[i.name]) {
          itemSales[i.name] = { name: i.name, qty: 0, revenue: 0, category: cat };
        }
        itemSales[i.name].qty += (Number(i.qty) || 0);
        itemSales[i.name].revenue += ((Number(i.discountedPrice) || 0) * (Number(i.qty) || 0));
      });
    });

    const itemSalesList = Object.values(itemSales);
    const bestSelling = [...itemSalesList].sort((a, b) => b.qty - a.qty).slice(0, 5);
    
    // Find items in menuItems that are not sold or sold very little for worstSelling
    const shopItems = menuItems.filter(item => item.shopId === activeShopForOwner.id);
    const worstSelling = shopItems.map(item => {
      const sold = itemSales[item.name] || { qty: 0, revenue: 0 };
      return {
        name: item.name,
        qty: sold.qty,
        revenue: sold.revenue,
        category: item.category
      };
    }).sort((a, b) => a.qty - b.qty).slice(0, 5);

    const peakHourEntry = Object.entries(hourlySales).sort((a, b) => b[1] - a[1])[0];
    const peakHourText = peakHourEntry 
      ? `${Number(peakHourEntry[0]) % 12 || 12}:00 ${Number(peakHourEntry[0]) >= 12 ? 'PM' : 'AM'}` 
      : '12:00 PM';

    // AI generated insights calculated from actual aggregated order data
    const insights: string[] = [];
    if (shopOrders.length > 0) {
      if (bestSelling.length > 0) {
        insights.push(`🔥 High Demand: "${bestSelling[0].name}" represents your biggest revenue driver (${bestSelling[0].qty} sold). Ensure extra stock of raw ingredients.`);
      }
      if (worstSelling.length > 0 && worstSelling[0].qty === 0) {
        insights.push(`⚠️ Slow Mover: "${worstSelling[0].name}" has registered 0 orders this week. We recommend featuring it as a Today's Special or adding a discount offer.`);
      }
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const topDayIdx = Object.entries(daySales).sort((a, b) => b[1] - a[1])[0];
      if (topDayIdx) {
        insights.push(`📈 Day Spike: Sales are highest on ${days[Number(topDayIdx[0])]}s. Prepare extra prep sheets to capture this peak.`);
      }
      insights.push(`🕒 Peak Period: Busiest hours are around ${peakHourText}. Streamline counter setup during this time.`);
    } else {
      insights.push('💡 AI Insights will populate here once customers begin placing online orders.');
    }

    // Next 3 days simple demand forecasting projection
    const forecastedDailySales = Math.round((totalRev / Math.max(1, shopOrders.length)) * 1.15);

    return {
      totalRev,
      avgOrder,
      totalOrders: shopOrders.length,
      bestSelling,
      worstSelling,
      insights,
      categorySales,
      hourlySales,
      daySales,
      peakHourText,
      forecastedDailySales
    };
  };

  const analytics = getAiAnalytics();

  // UNAUTHENTICATED -> RENDER LOGIN SCREEN
  if (!currentUser) {
    return (
      <div className={`min-h-screen flex items-center justify-center p-4 transition-colors duration-300 ${
        theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-slate-100 text-slate-900'
      }`}>
        <div className={`w-full max-w-lg p-6 sm:p-8 rounded-3xl space-y-6 shadow-2xl relative border transition-all ${
          theme === 'dark' ? 'glass-panel border-slate-800' : 'bg-white border-slate-200 shadow-slate-300/50'
        }`}>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-blue-500" />
              <select 
                value={currentLang} 
                onChange={(e) => handleLangChange(e.target.value as LanguageCode)}
                className={`text-xs rounded-xl px-2.5 py-1 font-bold focus:outline-none border ${
                  theme === 'dark' ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-slate-100 border-slate-300 text-slate-800'
                }`}
              >
                <option value="en">🇬🇧 English</option>
                <option value="hi">🇮🇳 हिंदी (Hindi)</option>
                <option value="ta">🇮🇳 தமிழ் (Tamil)</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button 
                onClick={() => setIsVercelModalOpen(true)}
                className={`p-2 rounded-xl text-xs font-bold transition border flex items-center gap-1.5 ${
                  theme === 'dark' ? 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-800' : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                }`}
                title="Share Vercel App Link"
              >
                <Share2 className="w-3.5 h-3.5 text-blue-500" />
                <span className="hidden sm:inline">Share App</span>
              </button>

              <button 
                onClick={toggleTheme}
                className={`p-2 rounded-xl text-xs font-bold transition border flex items-center gap-1.5 ${
                  theme === 'dark' ? 'bg-slate-900 hover:bg-slate-800 text-yellow-400 border-slate-800' : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                }`}
                title="Toggle Light/Dark Theme"
              >
                {theme === 'dark' ? <Sun className="w-4 h-4 text-yellow-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
              </button>
            </div>
          </div>

          <div className="text-center space-y-2">
            <div className="w-16 h-16 logo-badge mx-auto mb-2">
              <img src={kprLogo} alt="Turo Logo" className="w-full h-full object-contain" />
            </div>
            <h1 className={`font-heading font-extrabold text-3xl sm:text-4xl ${
              theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
            }`}>{t('appTitle', currentLang)}</h1>
            <p className="text-xs text-slate-400">{t('appSubtitle', currentLang)}</p>
          </div>

          <div className={`flex p-1.5 rounded-2xl border ${theme === 'dark' ? 'bg-slate-900/90 border-slate-800' : 'bg-slate-100 border-slate-200'}`}>
            <button 
              onClick={() => {
                setAuthTab('customer');
                setAuthEmail('');
                setAuthPassword('');
                setSignUpName('');
                setSignUpConfirmPassword('');
                setAuthError(null);
              }}
              className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition ${authTab === 'customer' ? 'bg-blue-700 text-white shadow-lg shadow-blue-700/25' : 'text-slate-400 hover:text-slate-700'}`}
            >
              {t('customerLogin', currentLang)}
            </button>
            <button 
              onClick={() => {
                setAuthTab('shopkeeper');
                setAuthEmail('');
                setAuthPassword('');
                setSignUpName('');
                setSignUpConfirmPassword('');
                setAuthError(null);
              }}
              className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition ${authTab === 'shopkeeper' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/25' : 'text-slate-400 hover:text-slate-700'}`}
            >
              {t('shopkeeperLogin', currentLang)}
            </button>
          </div>

          {authError && (
            <div className="bg-red-950/80 border border-red-500/40 text-red-300 p-3 rounded-xl text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{authError}</span>
            </div>
          )}

          {authTab === 'customer' && (
            <div className="flex justify-center gap-4 text-xs font-semibold mb-2">
              <button
                type="button"
                onClick={() => {
                  setCustomerMode('signin');
                  setAuthEmail('');
                  setAuthPassword('');
                  setSignUpName('');
                  setSignUpConfirmPassword('');
                  setAuthError(null);
                }}
                className={`pb-1 border-b-2 transition ${
                  customerMode === 'signin' ? 'border-blue-600 text-blue-500 font-bold' : 'border-transparent text-slate-400'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setCustomerMode('signup');
                  setAuthEmail('');
                  setAuthPassword('');
                  setSignUpName('');
                  setSignUpConfirmPassword('');
                  setAuthError(null);
                }}
                className={`pb-1 border-b-2 transition ${
                  customerMode === 'signup' ? 'border-blue-600 text-blue-500 font-bold' : 'border-transparent text-slate-400'
                }`}
              >
                Sign Up
              </button>
            </div>
          )}

          {authTab === 'shopkeeper' && (
            <div className="text-center p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/20 text-emerald-400 text-xs font-semibold mb-2">
              🔑 Shopkeeper accounts are provided by the platform admin.
            </div>
          )}

          <form onSubmit={handleAuthSubmit} className="space-y-4">
            {authTab === 'customer' && customerMode === 'signup' && (
              <div className="space-y-1">
                <label className="text-xs font-semibold">Full Name</label>
                <input 
                  type="text" 
                  required
                  value={signUpName}
                  onChange={(e) => setSignUpName(e.target.value)}
                  placeholder="Enter your full name..."
                  className={`w-full border rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-blue-500 ${
                    theme === 'dark' ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-semibold">{t('emailLabel', currentLang)}</label>
              <input 
                type="email" 
                required
                autoCapitalize="none"
                autoCorrect="off"
                {...{ autocapitalize: 'off', autocorrect: 'off' }}
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                placeholder="Enter email address (@gmail.com)..."
                className={`w-full border rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-blue-500 ${
                  theme === 'dark' ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-300 text-slate-900'
                }`}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold">{t('passwordLabel', currentLang)}</label>
              <input 
                type="password" 
                required
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                placeholder="••••••••"
                className={`w-full border rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-blue-500 ${
                  theme === 'dark' ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-300 text-slate-900'
                }`}
              />
            </div>

            {authTab === 'customer' && customerMode === 'signup' && (
              <div className="space-y-1">
                <label className="text-xs font-semibold">Confirm Password</label>
                <input 
                  type="password" 
                  required
                  value={signUpConfirmPassword}
                  onChange={(e) => setSignUpConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className={`w-full border rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-blue-500 ${
                    theme === 'dark' ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>
            )}

            <button 
              type="submit"
              disabled={isAuthLoading}
              className={`w-full text-white font-extrabold py-3.5 rounded-2xl text-xs shadow-xl transition transform active:scale-95 flex items-center justify-center gap-2 ${
                isAuthLoading ? 'opacity-50 cursor-not-allowed' : ''
              } ${
                authTab === 'shopkeeper' ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/25' : 'bg-gradient-to-r from-blue-700 to-emerald-600 hover:opacity-95 shadow-blue-700/25'
              }`}
            >
              {isAuthLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  {authTab === 'customer' 
                    ? (customerMode === 'signin' ? 'Sign In' : 'Sign Up') 
                    : t('loginButton', currentLang)} &rarr;
                </>
              )}
            </button>
          </form>

          {authTab === 'customer' && (
            <div className="space-y-4 pt-2">
              <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-slate-300 dark:border-slate-800"></div>
                <span className="flex-shrink mx-4 text-slate-400 dark:text-slate-500 text-xs font-semibold">or</span>
                <div className="flex-grow border-t border-slate-300 dark:border-slate-800"></div>
              </div>

              <button
                type="button"
                disabled={isAuthLoading}
                onClick={async () => {
                  if (isAuthLoading) return;
                  setIsAuthLoading(true);
                  setAuthError(null);
                  try {
                    const res = await signInWithGoogle();
                    if (res && (res as any).isMock) {
                      const mockUser: UserAccount = {
                        id: `usr-google-${Date.now()}`,
                        email: (res as any).mockEmail,
                        name: (res as any).mockName,
                        role: 'customer',
                        isActive: true,
                        createdAt: Date.now()
                      };
                      await saveUserToSupabase(mockUser);
                      setCurrentUser(mockUser);
                      localStorage.setItem(SESSION_USER_KEY, JSON.stringify(mockUser));
                      setActiveTab('home');
                    }
                  } catch (err: any) {
                    setAuthError(err.message || 'Google login failed.');
                  } finally {
                    setIsAuthLoading(false);
                  }
                }}
                className={`w-full font-bold py-3.5 rounded-2xl text-xs flex items-center justify-center gap-2 border transition ${
                  theme === 'dark' 
                    ? 'bg-slate-900 border-slate-800 text-slate-200 hover:bg-slate-800 active:scale-95' 
                    : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50 active:scale-95'
                }`}
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#EA4335"
                    d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-5.136 4.114-3.555 0-6.437-2.882-6.437-6.437 0-3.555 2.882-6.437 6.437-6.437 1.488 0 2.858.508 3.96 1.358l3.078-3.078C19.124 2.128 15.938 1 12.24 1 5.48 1 0 6.48 0 13.24s5.48 12.24 12.24 12.24c6.912 0 12.24-5.328 12.24-12.24 0-.828-.072-1.632-.216-2.41H12.24z"
                  />
                </svg>
                <span>Continue with Google</span>
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setCustomerMode(customerMode === 'signin' ? 'signup' : 'signin');
                    setAuthEmail('');
                    setAuthPassword('');
                    setSignUpName('');
                    setSignUpConfirmPassword('');
                    setAuthError(null);
                  }}
                  className="text-xs text-blue-500 hover:underline font-semibold"
                >
                  {customerMode === 'signin' ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    );
  }

  // Dynamically generate scan verification receipt image
  let receiptImgSrc = '';
  if (scanResult && scanResult.success) {
    const matched = ordersHistory.find(o => o.id === scanResult.orderId);
    const receiptOrder: Order = {
      id: scanResult.orderId,
      shopId: matched?.shopId || 'shop-1',
      shopName: scanResult.shopName || matched?.shopName || 'Campus Canteen',
      customerId: matched?.customerId || '',
      customerName: scanResult.customerName || matched?.customerName || 'Student Customer',
      items: (scanResult.items || matched?.items || []).map((i: any) => ({
        ...i,
        name: i.name || 'Food Item',
        qty: i.qty || i.quantity || 1,
        originalPrice: i.price || i.originalPrice || 0,
        discountedPrice: i.price || i.discountedPrice || 0
      })),
      grandTotal: scanResult.grandTotal || matched?.grandTotal || 0,
      paymentMethod: matched?.paymentMethod || 'Online UPI',
      paymentStatus: (scanResult.paymentStatus as any) || matched?.paymentStatus || 'Paid',
      status: 'Completed',
      createdAt: matched?.createdAt || new Date().toLocaleString(),
      createdAtTimestamp: matched?.createdAtTimestamp || Date.now(),
      estimatedMinutes: matched?.estimatedMinutes || 10,
      qrToken: matched?.qrToken || '',
      payeeUpiId: matched?.payeeUpiId || ''
    };
    receiptImgSrc = generateReceiptImage(receiptOrder);
  }

  // LOGGED IN DASHBOARDS
  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-300 ${
      theme === 'dark' ? 'bg-slate-950 text-slate-100 selection:bg-blue-600' : 'bg-slate-50 text-slate-900 selection:bg-blue-500'
    }`}>
      
      {/* Top Header */}
      <header className={`sticky top-0 z-40 border-b px-4 lg:px-8 py-3 transition-all backdrop-blur-md ${
        theme === 'dark' ? 'glass-panel border-slate-800/80' : 'bg-white/90 border-slate-200 shadow-sm'
      }`}>
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('home')}>
            <div className="w-10 h-10 logo-badge">
              <img src={kprLogo} alt="Turo Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-heading font-extrabold text-2xl tracking-tight gradient-text">{t('appTitle', currentLang)}</span>
                <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                  {t('activeText', currentLang)}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">{t('appHeaderBanner', currentLang)}</p>
            </div>
          </div>

          <div className="flex-1 max-w-xs relative hidden sm:block">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input 
              type="text"
              placeholder={t('searchPlaceholder', currentLang)}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full border rounded-xl pl-9 pr-4 py-1.5 text-xs focus:outline-none focus:border-blue-500 transition ${
                theme === 'dark' ? 'bg-slate-900/90 border-slate-800 text-slate-200' : 'bg-slate-100 border-slate-300 text-slate-800'
              }`}
            />
          </div>

          <div className="flex items-center gap-2.5">
            
            <select 
              value={currentLang} 
              onChange={(e) => handleLangChange(e.target.value as LanguageCode)}
              className={`text-xs rounded-xl px-2.5 py-1.5 font-bold focus:outline-none border ${
                theme === 'dark' ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-slate-100 border-slate-300 text-slate-800'
              }`}
            >
              <option value="en">🇬🇧 EN</option>
              <option value="hi">🇮🇳 HI</option>
              <option value="ta">🇮🇳 TA</option>
            </select>

            <button 
              onClick={() => setIsVercelModalOpen(true)}
              className={`p-2 rounded-xl text-xs font-bold transition border flex items-center gap-1.5 ${
                theme === 'dark' ? 'bg-slate-900 hover:bg-slate-800 text-blue-400 border-slate-800' : 'bg-slate-100 hover:bg-slate-200 text-blue-600 border-slate-300'
              }`}
              title={t('shareAppTitle', currentLang)}
            >
              <Share2 className="w-4 h-4" />
              <span className="hidden md:inline">{t('copyVercelLink', currentLang)}</span>
            </button>

            <button 
              onClick={toggleTheme}
              className={`p-2 rounded-xl text-xs font-bold transition border ${
                theme === 'dark' ? 'bg-slate-900 hover:bg-slate-800 text-yellow-400 border-slate-800' : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
              }`}
              title={t('toggleThemeTitle', currentLang)}
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-yellow-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
            </button>

            <button 
              onClick={triggerManualSync}
              className={`border p-2 rounded-xl text-xs transition flex items-center gap-1 ${
                theme === 'dark' ? 'bg-slate-900 border-slate-800 text-slate-300' : 'bg-slate-100 border-slate-300 text-slate-700'
              }`}
              title={`${t('lastSyncedAt', currentLang)} ${lastSyncTime}`}
            >
              <RefreshCw className="w-3.5 h-3.5 text-emerald-400 animate-spin-slow" />
            </button>

            <button 
              onClick={handleLogout}
              className="bg-red-950/60 border border-red-500/30 text-red-400 px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">{t('logout', currentLang)}</span>
            </button>

            {currentUser.role === 'customer' && (
              <button 
                onClick={() => setIsCartOpen(true)}
                className="relative bg-gradient-to-r from-blue-700 to-emerald-600 hover:opacity-95 text-white p-2 sm:px-4 sm:py-2 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg shadow-blue-700/20 transition active:scale-95"
              >
                <ShoppingBag className="w-4 h-4" />
                <span className="hidden sm:inline">{t('cart', currentLang)}</span>
                {totalItemsCount > 0 && (
                  <span className="bg-white text-blue-800 font-extrabold text-[11px] px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                    {totalItemsCount}
                  </span>
                )}
              </button>
            )}

          </div>

        </div>
      </header>

      {/* Navigation Sub-Bar */}
      <div className={`border-b px-4 py-2 sticky top-[61px] z-30 backdrop-blur-md ${
        theme === 'dark' ? 'bg-slate-950/80 border-slate-800/60' : 'bg-slate-100/90 border-slate-200'
      }`}>
        <div className="max-w-7xl mx-auto flex items-center justify-between text-xs font-medium">
          
          {currentUser.role === 'customer' && (
            <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto whitespace-nowrap max-w-full scrollbar-none">
              <button 
                onClick={() => setActiveTab('home')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  activeTab === 'home' 
                    ? 'bg-blue-700 text-white font-semibold' 
                    : theme === 'dark' ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {t('overview', currentLang)}
              </button>
              <button 
                onClick={() => setActiveTab('menu')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  activeTab === 'menu' 
                    ? 'bg-blue-700 text-white font-semibold' 
                    : theme === 'dark' ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {t('fullMenu', currentLang)}
              </button>
              <button 
                onClick={() => setActiveTab('orders')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  activeTab === 'orders' 
                    ? 'bg-blue-700 text-white font-semibold' 
                    : theme === 'dark' ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {t('myOrders', currentLang)}
              </button>
              {currentOrder && (
                <button 
                  onClick={() => setActiveTab('tracking')}
                  className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                    activeTab === 'tracking' 
                      ? 'bg-blue-700 text-white font-semibold' 
                      : theme === 'dark' ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span>{t('liveOrder', currentLang)}</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                </button>
              )}
            </div>
          )}

          {currentUser.role === 'shopkeeper' && (
            <span className="bg-emerald-500/20 text-emerald-500 border border-emerald-500/40 text-xs px-3.5 py-1.5 rounded-xl font-bold flex items-center gap-2">
              <Store className="w-4 h-4 text-emerald-500" />
              <span>{t('shopkeeperDashboard', currentLang)} ({activeShopForOwner.name})</span>
            </span>
          )}

          {currentUser.role === 'super_admin' && (
            <span className="bg-purple-600/20 text-purple-400 border border-purple-500/40 text-xs px-3.5 py-1.5 rounded-xl font-bold flex items-center gap-2">
              <Shield className="w-4 h-4 text-purple-400" />
              <span>{t('superAdminDashboard', currentLang)} (Strict Canteen Shop Add/Delete Scope)</span>
            </span>
          )}

        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        
        {/* CUSTOMER DASHBOARD: OVERVIEW */}
        {currentUser.role === 'customer' && activeTab === 'home' && (
          <div className="space-y-8 animate-fadeIn">
            <div className={`relative rounded-3xl overflow-hidden p-6 sm:p-10 border transition-all ${
              theme === 'dark' ? 'glass-panel border-slate-800 bg-gradient-to-r from-slate-900 via-slate-900/90 to-blue-950/40' : 'bg-white border-slate-200 shadow-xl'
            }`}>
              <div className="relative z-10 max-w-2xl space-y-4">
                <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 px-3 py-1 rounded-full text-xs font-semibold">
                  <Flame className="w-3.5 h-3.5 text-emerald-500" />
                  <span>{t('welcomeMessage', currentLang)}, {currentUser.name}!</span>
                </div>
                
                <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight">
                  {t('heroTitlePart1', currentLang)} <span className="gradient-text">{t('heroTitlePart2', currentLang)}</span>
                </h1>
                
                <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
                  {t('heroSubtitle', currentLang)}
                </p>

                <div className="flex flex-wrap gap-3 pt-2">
                  <button 
                    onClick={() => setActiveTab('menu')}
                    className="bg-gradient-to-r from-blue-700 to-emerald-600 hover:from-blue-800 hover:to-emerald-700 text-white font-bold px-6 py-3 rounded-xl shadow-lg shadow-blue-700/25 flex items-center gap-2 text-sm transition transform hover:-translate-y-0.5"
                  >
                    <span>{t('heroButton', currentLang)}</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* DISCOUNT OFFERS BANNER */}
            {discounts.filter(d => d.isActive).length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-extrabold flex items-center gap-2 text-emerald-500">
                  <Tag className="w-4 h-4" />
                  <span>{t('activeDiscountsTitle', currentLang)}</span>
                </h3>
                <div className="flex gap-4 overflow-x-auto pb-2 custom-scrollbar">
                  {discounts.filter(d => d.isActive).map(disc => (
                    <div key={disc.id} className={`min-w-[280px] p-3.5 rounded-2xl border flex items-center justify-between text-xs ${
                      theme === 'dark' ? 'bg-slate-900 border-emerald-500/40 text-white' : 'bg-white border-emerald-500/50 text-slate-900 shadow-md'
                    }`}>
                      <div>
                        <span className="bg-emerald-500/20 text-emerald-600 font-extrabold px-2 py-0.5 rounded text-[10px]">
                          {disc.code}
                        </span>
                        <h4 className="font-bold mt-1">{disc.title}</h4>
                        <p className="text-[11px] text-slate-400">
                          {disc.type === 'percentage' ? `${disc.value}% OFF` : `₹${disc.value} OFF`} ({disc.appliesTo})
                        </p>
                      </div>
                      <Percent className="w-8 h-8 text-emerald-500/40 flex-shrink-0" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Campus Canteens */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold font-heading">{t('canteenShops', currentLang)} ({shops.filter(s => s.upiId && s.upiId.includes('@')).length})</h2>
                <span className="text-xs text-slate-400">{t('verifiedUpiBadge', currentLang)}</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {shops.filter(shop => shop.upiId && shop.upiId.includes('@')).length > 0 ? (
                  shops.filter(shop => shop.upiId && shop.upiId.includes('@')).map(shop => {
                    const open = isShopOpen(shop);
                    return (
                      <div 
                        key={shop.id}
                        onClick={() => {
                          setSelectedShopId(shop.id);
                          setActiveTab('menu');
                        }}
                        className={`p-4 rounded-2xl cursor-pointer group space-y-3 border transition-all duration-300 ${
                          open 
                            ? (theme === 'dark' ? 'glass-card border-slate-800 hover:border-blue-500' : 'bg-white border-slate-200 hover:border-blue-500 shadow-md')
                            : (theme === 'dark' ? 'bg-slate-900/60 border-slate-950 opacity-70 hover:opacity-100 hover:border-red-500/40' : 'bg-slate-100/60 border-slate-200 opacity-70 hover:opacity-100 hover:border-red-500/40 shadow-sm')
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold transition-all duration-300 ${
                            open 
                              ? 'bg-blue-500/10 border border-blue-500/20 text-blue-500 group-hover:bg-blue-700 group-hover:text-white'
                              : 'bg-slate-500/10 border border-slate-500/20 text-slate-500'
                          }`}>
                            <Store className="w-5 h-5" />
                          </div>
                          {open ? (
                            <span className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 text-[11px] font-bold px-2 py-0.5 rounded-md">
                              ★ {shop.rating}
                            </span>
                          ) : (
                            <span className="bg-red-500/10 border border-red-500/30 text-red-500 text-[10px] font-extrabold px-2.5 py-0.5 rounded-md uppercase tracking-wider">
                              Closed
                            </span>
                          )}
                        </div>

                        <div>
                          <h3 className={`font-bold text-sm transition-all duration-300 ${
                            open ? 'group-hover:text-blue-500' : 'text-slate-400'
                          }`}>{shop.name}</h3>
                          <p className="text-[11px] text-slate-400 font-mono mt-1">UPI: {shop.upiId}</p>
                        </div>

                        <div className={`pt-2 border-t flex items-center justify-between text-[11px] ${
                          theme === 'dark' ? 'border-slate-800/80 text-slate-400' : 'border-slate-200 text-slate-600'
                        }`}>
                          {open ? (
                            <>
                              <span>{t('timeSlotAvailabilityBadge', currentLang)}</span>
                              <span className="text-emerald-500 font-semibold group-hover:translate-x-1 transition flex items-center">
                                {t('menuArrow', currentLang)}
                              </span>
                            </>
                          ) : (
                            <>
                              <span className="text-red-500 font-bold">Opens at {formatTime12h(shop.openingTime || '08:00')}</span>
                              <span className="text-slate-500 transition flex items-center">
                                {t('menuArrow', currentLang)}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className={`col-span-full p-8 text-center rounded-2xl border text-xs text-slate-500 ${
                    theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'
                  }`}>
                    🏪 No active canteens are accepting orders right now. Please check back later!
                  </div>
                )}
              </div>
            </div>

            {/* FEATURED DISHES */}
            <div className="space-y-4 pt-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold font-heading">{t('featuredDishes', currentLang)} ({filteredMenu.length})</h2>
                <span className="text-xs text-slate-400">{t('dynamicallyUpdatedBadge', currentLang)}</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredMenu.slice(0, 6).map(item => {
                  const parentShop = shops.find(s => s.id === item.shopId);
                  const availableNow = isItemInTimeSlot(item);
                  const { finalPrice, discountAmount, appliedOffer } = getDiscountedPrice(item, discounts);
                  const hasDiscount = discountAmount > 0;
                  const isSoldOut = isItemSoldOut(item);

                  return (
                    <div key={item.id} className={`rounded-2xl overflow-hidden flex flex-col justify-between min-h-[400px] group border relative transition ${
                      item.isSpecial ? 'border-amber-400/80 shadow-lg shadow-amber-400/10' :
                      theme === 'dark' ? 'glass-card border-slate-800' : 'bg-white border-slate-200 shadow-md'
                    }`}>
                      
                      {item.isSpecial && (
                        <div className="absolute top-3 right-3 z-20 bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-extrabold text-[10px] px-2.5 py-1 rounded-full shadow-lg flex items-center gap-1 animate-pulse">
                          <Star className="w-3.5 h-3.5 fill-slate-950" />
                          <span>{t('todaysSpecial', currentLang)}</span>
                        </div>
                      )}

                      {hasDiscount && (
                        <div className="absolute top-3 left-3 z-20 bg-gradient-to-r from-emerald-600 to-teal-500 text-white font-extrabold text-[10px] px-2.5 py-1 rounded-full shadow-lg flex items-center gap-1">
                          <Tag className="w-3.5 h-3.5" />
                          <span>{appliedOffer?.type === 'percentage' ? `${appliedOffer.value}% OFF` : `₹${discountAmount} OFF`}</span>
                        </div>
                      )}

                      <div>
                        <div className="relative h-44 overflow-hidden">
                          <img 
                            src={getCategoryDefaultImage(item.category, item.image)} 
                            alt={item.name}
                            className={`w-full h-full object-cover group-hover:scale-105 transition duration-500 ${(!availableNow || isSoldOut) ? 'grayscale opacity-50' : ''}`} 
                          />
                          
                          <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md backdrop-blur-md border ${
                              isSoldOut ? 'bg-red-950/80 border-red-500/40 text-red-400 font-extrabold' :
                              availableNow ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-400' : 'bg-red-950/80 border-red-500/40 text-red-400'
                            }`}>
                              {isSoldOut ? `🔴 ${t('soldOutLabel', currentLang).toUpperCase()}` : availableNow ? `${t('activeText', currentLang)} (${formatTime12h(parentShop?.openingTime || '08:00')} - ${formatTime12h(parentShop?.closingTime || '22:00')})` : t('slotClosed', currentLang)}
                            </span>
                          </div>
                        </div>

                        <div className="p-4 space-y-2">
                          <div className="flex items-center justify-between">
                            <h3 className="font-bold text-base group-hover:text-blue-500 transition">{item.name}</h3>
                            <span className={`w-3 h-3 rounded-full border ${item.isVeg ? 'border-emerald-500 bg-emerald-500/20' : 'border-red-500 bg-red-500/20'}`} />
                          </div>
                          <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">{item.description}</p>
                          {(!isSoldOut && item.stockLimit !== null && item.stockLimit !== undefined) && (
                            <p className="text-[10px] text-blue-400 font-semibold">
                              Only {item.stockRemaining ?? 0} {t('onlyRemainingLabel', currentLang)}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className={`p-4 pt-0 flex items-center justify-between border-t mt-3 ${
                        theme === 'dark' ? 'border-slate-800/60' : 'border-slate-200'
                      }`}>
                        <div>
                          <span className="text-xs text-slate-400">{t('priceLabel', currentLang)}</span>
                          <div className="flex items-center gap-2">
                            {hasDiscount && (
                              <span className="text-xs text-slate-500 line-through">₹{item.price}</span>
                            )}
                            <span className="font-heading font-extrabold text-lg text-emerald-500">₹{finalPrice}</span>
                          </div>
                        </div>

                        <button 
                          disabled={!availableNow || isSoldOut}
                          onClick={() => addToCart(item)}
                          className={`font-semibold px-4 py-2 rounded-xl text-xs transition flex items-center gap-1.5 ${
                            (availableNow && !isSoldOut)
                              ? 'bg-blue-600/10 hover:bg-blue-600 text-blue-500 hover:text-white border border-blue-600/30 active:scale-95' 
                              : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                          }`}
                        >
                          <Plus className="w-4 h-4" />
                          <span>{isSoldOut ? 'Sold Out' : availableNow ? t('addToCart', currentLang) : t('slotClosed', currentLang)}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* CUSTOMER DASHBOARD: FULL MENU */}
        {currentUser.role === 'customer' && activeTab === 'menu' && (
          <div className="space-y-6 animate-fadeIn">
            <div className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl border ${
              theme === 'dark' ? 'glass-panel border-slate-800' : 'bg-white border-slate-200 shadow-md'
            }`}>
              <div>
                <h2 className="text-2xl font-extrabold font-heading">{t('fullMenu', currentLang)} ({filteredMenu.length} items)</h2>
                <p className="text-xs text-slate-400">{t('menuPageSubtitle', currentLang)}</p>
              </div>

              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-emerald-500" />
                <select 
                  value={selectedShopId} 
                  onChange={(e) => setSelectedShopId(e.target.value)}
                  className={`text-xs rounded-xl px-3 py-2 border focus:outline-none ${
                    theme === 'dark' ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-300 text-slate-800'
                  }`}
                >
                  <option value="all">{t('allCanteensFilter', currentLang)} ({shops.filter(s => s.upiId && s.upiId.includes('@')).length})</option>
                  {shops.filter(s => s.upiId && s.upiId.includes('@')).map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {selectedShopId !== 'all' && (() => {
              const currentShop = shops.find(s => s.id === selectedShopId);
              if (currentShop && !isShopOpen(currentShop)) {
                return (
                  <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-500 text-xs flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5 flex-shrink-0 animate-bounce" />
                    <div>
                      <p className="font-extrabold text-sm">Store Closed</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        🏪 <strong>{currentShop.name}</strong> is currently Closed. Operating hours: <strong>{formatTime12h(currentShop.openingTime || '08:00')} - {formatTime12h(currentShop.closingTime || '22:00')}</strong>. You can browse the menu but checkout is disabled.
                      </p>
                    </div>
                  </div>
                );
              }
              return null;
            })()}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredMenu.map(item => {
                const parentShop = shops.find(s => s.id === item.shopId);
                const inCart = cart.find(i => i.id === item.id);
                const availableNow = isItemInTimeSlot(item);
                const { finalPrice, discountAmount } = getDiscountedPrice(item, discounts);
                const hasDiscount = discountAmount > 0;
                const isSoldOut = isItemSoldOut(item);

                return (
                  <div key={item.id} className={`rounded-2xl p-4 flex flex-col justify-between space-y-3 border relative ${
                    item.isSpecial ? 'border-amber-400/80 shadow-lg shadow-amber-400/10' :
                    theme === 'dark' ? 'glass-card border-slate-800' : 'bg-white border-slate-200 shadow-md'
                  }`}>
                    
                    {item.isSpecial && (
                      <span className="absolute top-2 right-2 bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-extrabold text-[10px] px-2 py-0.5 rounded-full">
                        🌟 Special
                      </span>
                    )}

                    <div className="flex flex-col sm:flex-row gap-4">
                      <img 
                        src={getCategoryDefaultImage(item.category, item.image)} 
                        alt={item.name} 
                        className={`w-full h-40 sm:w-24 sm:h-24 rounded-xl object-cover flex-shrink-0 ${(!availableNow || isSoldOut) ? 'grayscale opacity-50' : ''}`} 
                      />
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase text-emerald-500 tracking-wider">{item.shopName}</span>
                          <span className="text-xs font-semibold text-emerald-500">★ {item.rating}</span>
                        </div>
                        <h3 className="font-bold text-sm">{item.name}</h3>
                        <p className="text-[11px] text-slate-400 line-clamp-2">{item.description}</p>
                        {(!isSoldOut && item.stockLimit !== null && item.stockLimit !== undefined) && (
                          <p className="text-[10px] text-blue-400 font-semibold">
                            Only {item.stockRemaining ?? 0} {t('onlyRemainingLabel', currentLang)}
                          </p>
                        )}
                        
                        <div className="flex items-center gap-2 pt-1">
                          {hasDiscount && (
                            <span className="text-xs text-slate-500 line-through">₹{item.price}</span>
                          )}
                          <span className="font-heading font-extrabold text-base text-emerald-500">₹{finalPrice}</span>
                        </div>
                      </div>
                    </div>

                    <div className={`pt-2 border-t flex items-center justify-between text-[11px] ${
                      theme === 'dark' ? 'border-slate-800/60 text-slate-400' : 'border-slate-200 text-slate-600'
                    }`}>
                      <span className={`px-2 py-0.5 rounded border text-[10px] font-semibold ${
                        isSoldOut ? 'bg-red-950/80 text-red-400 border-red-500/30 font-extrabold' :
                        availableNow 
                          ? (theme === 'dark' ? 'bg-emerald-950/80 text-emerald-400 border-emerald-500/30' : 'bg-emerald-50 text-emerald-700 border-emerald-200') 
                          : (theme === 'dark' ? 'bg-red-950/80 text-red-400 border-red-500/30' : 'bg-red-50 text-red-700 border-red-200')
                      }`}>
                        {isSoldOut ? t('soldOutLabel', currentLang) : availableNow ? `${t('slotPrefix', currentLang)} ${formatTime12h(parentShop?.openingTime || '08:00')} - ${formatTime12h(parentShop?.closingTime || '22:00')}` : t('slotClosed', currentLang)}
                      </span>

                      {isSoldOut ? (
                        <button 
                          disabled={true}
                          className="px-3 py-1.5 rounded-xl font-semibold bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed"
                        >
                          {t('soldOutLabel', currentLang)}
                        </button>
                      ) : inCart ? (
                        <div className="flex items-center gap-3 bg-blue-700 text-white px-3 py-1 rounded-xl font-bold shadow-md shadow-blue-700/20">
                          <button onClick={() => updateQty(item.id, -1)}><Minus className="w-3.5 h-3.5" /></button>
                          <span>{inCart.qty}</span>
                          <button onClick={() => updateQty(item.id, 1)}><Plus className="w-3.5 h-3.5" /></button>
                        </div>
                      ) : (
                        <button 
                          disabled={!availableNow}
                          onClick={() => addToCart(item)}
                          className={`px-3 py-1.5 rounded-xl font-semibold transition ${
                            availableNow 
                              ? 'bg-blue-600/10 hover:bg-blue-600 text-blue-500 hover:text-white border border-blue-600/30 active:scale-95' 
                              : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                          }`}
                        >
                          + {t('addToCart', currentLang)}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* CUSTOMER DASHBOARD: MY ORDERS (ACTIVE & HISTORY) */}
        {currentUser.role === 'customer' && activeTab === 'orders' && (() => {
          const myOrders = ordersHistory.filter(o => o.customerId === currentUser.id);
          
          const activeOrders = myOrders.filter(o => 
            ['Pending', 'Accepted', 'Ready for Pickup'].includes(o.status) &&
            o.paymentStatus === 'Paid'
          );
          
          const pastOrders = myOrders.filter(o => 
            o.status === 'Completed' || o.status === 'Cancelled'
          );

          return (
            <div className="space-y-8 animate-fadeIn max-w-4xl mx-auto">
              <div>
                <h2 className="text-2xl font-extrabold font-heading">
                  {currentLang === 'hi' ? 'मेरे आदेश' : currentLang === 'ta' ? 'எனது ஆர்டர்கள்' : 'My Orders'}
                </h2>
                <p className="text-xs text-slate-400">
                  {currentLang === 'hi' ? 'अपने सक्रिय और पिछले आदेशों को यहाँ ट्रैक करें' : currentLang === 'ta' ? 'உங்கள் செயலில் உள்ள மற்றும் கடந்த ஆர்டர்களை இங்கே கண்காணிக்கவும்' : 'Track your active and past canteen orders here'}
                </p>
              </div>

              {/* Active Orders Section */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">
                  {currentLang === 'hi' ? 'सक्रिय आदेश' : currentLang === 'ta' ? 'செயலில் உள்ள ஆர்டர்கள்' : 'Active Orders'} ({activeOrders.length})
                </h3>
                
                {activeOrders.length > 0 ? (
                  <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
                    {activeOrders.map(order => {
                      const token = order.qrToken && order.qrToken.startsWith('TURO-QR-')
                        ? order.id.split('-')[1] || order.id
                        : 'PENDING';
                      
                      return (
                        <div 
                          key={order.id}
                          className={`p-6 rounded-3xl border space-y-4 transition hover:shadow-lg ${
                            theme === 'dark' ? 'glass-panel border-slate-800' : 'bg-white border-slate-200 shadow-md'
                          }`}
                        >
                          <div className="flex items-center justify-between border-b pb-3 border-slate-200 dark:border-slate-800">
                            <div>
                              <h4 className="font-bold text-sm text-blue-500">{order.shopName}</h4>
                              <p className="text-[10px] text-slate-400">{order.id} • {order.createdAt}</p>
                            </div>
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                              order.status === 'Ready for Pickup' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/30' :
                              order.status === 'Accepted' ? 'bg-blue-500/10 text-blue-500 border border-blue-500/30' :
                              'bg-amber-500/10 text-amber-500 border border-amber-500/30 animate-pulse'
                            }`}>
                              {order.status}
                            </span>
                          </div>

                          {/* Items List */}
                          <div className="space-y-1.5 text-xs">
                            {order.items.map((item, idx) => (
                              <div key={idx} className="flex justify-between text-slate-400 dark:text-slate-300">
                                <span>{item.name} <span className="font-semibold text-slate-500">x{item.qty}</span></span>
                                <span>₹{item.discountedPrice * item.qty}</span>
                              </div>
                            ))}
                            <div className="flex justify-between font-bold text-sm pt-2 border-t border-slate-200 dark:border-slate-800/60">
                              <span>Total Paid</span>
                              <span className="text-emerald-500">₹{order.grandTotal}</span>
                            </div>
                          </div>

                          {/* Pickup Token & Action */}
                          {order.qrToken && !order.qrToken.startsWith('PENDING-') ? (
                            <div className="pt-2 flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Pickup Token</span>
                              <span className="text-xl font-black text-slate-800 dark:text-slate-100 font-heading font-extrabold">#{token}</span>
                              <button
                                onClick={() => {
                                  setCurrentOrder(order);
                                  setActiveTab('tracking');
                                }}
                                className="mt-3 text-xs text-blue-500 font-semibold hover:underline flex items-center gap-1"
                              >
                                View Live QR Code & Details →
                              </button>
                            </div>
                          ) : (
                            <div className="p-3 text-center text-xs text-amber-500 bg-amber-500/10 rounded-xl border border-amber-500/20">
                              ⌛ Confirming payment...
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className={`p-8 text-center rounded-2xl border text-slate-400 ${
                    theme === 'dark' ? 'glass-panel border-slate-800' : 'bg-white border-slate-200'
                  }`}>
                    No active orders. Add items to your cart and place an order to get started!
                  </div>
                )}
              </div>

              {/* Order History Section */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">
                  {currentLang === 'hi' ? 'पिछले आदेश' : currentLang === 'ta' ? 'கடந்த ஆர்டர்கள்' : 'Order History'} ({pastOrders.length})
                </h3>

                {pastOrders.length > 0 ? (
                  <div className="space-y-3">
                    {pastOrders.map(order => (
                      <div 
                        key={order.id}
                        className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition hover:bg-slate-50/50 dark:hover:bg-slate-900/30 ${
                          theme === 'dark' ? 'glass-panel border-slate-800/60' : 'bg-white border-slate-200 shadow-sm'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-sm text-slate-700 dark:text-slate-300">{order.shopName}</h4>
                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                              order.status === 'Completed' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'
                            }`}>
                              {order.status}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400">
                            {order.id} • {order.createdAt} • {order.items.map(i => `${i.name} (x${i.qty})`).join(', ')}
                          </p>
                        </div>

                        <div className="flex sm:flex-col items-baseline sm:items-end justify-between sm:justify-start gap-1">
                          <span className="text-[10px] text-slate-400">Paid Amount</span>
                          <span className="font-extrabold text-sm text-slate-800 dark:text-slate-200">₹{order.grandTotal}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className={`p-8 text-center rounded-2xl border text-slate-400 ${
                    theme === 'dark' ? 'glass-panel border-slate-800' : 'bg-white border-slate-200'
                  }`}>
                    No order history found.
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {/* CUSTOMER DASHBOARD: LIVE ORDER TRACKING & AUTOMATIC 8-SECOND CANCEL BUTTON DISAPPEARANCE */}
        {currentUser.role === 'customer' && activeTab === 'tracking' && currentOrder && (() => {
          const elapsedSec = Math.floor((currentTime - currentOrder.createdAtTimestamp) / 1000);
          const remainingSec = Math.max(0, 8 - elapsedSec);
          const isCancelVisible = remainingSec > 0 && currentOrder.status === 'Pending';

          return (
            <div className="max-w-2xl mx-auto space-y-6 animate-fadeIn">
              <div className={`p-6 rounded-3xl border text-center space-y-3 relative overflow-hidden ${
                theme === 'dark' ? 'glass-panel border-slate-800' : 'bg-white border-slate-200 shadow-xl'
              }`}>
                
                <div className="flex items-center justify-center gap-2 flex-wrap">
                  <span className={`inline-flex items-center gap-1.5 border px-3 py-1 rounded-full text-xs font-bold ${
                    currentOrder.paymentStatus === 'Paid' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500' :
                    currentOrder.paymentStatus === 'Refund Pending' ? 'bg-amber-500/10 border-amber-500/30 text-amber-500' :
                    currentOrder.paymentStatus === 'Pending' ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-500' :
                    'bg-red-500/10 border-red-500/30 text-red-500'
                  }`}>
                    {currentOrder.paymentStatus === 'Paid' ? '✅ Paid' :
                     currentOrder.paymentStatus === 'Refund Pending' ? '🔄 Refund Pending' :
                     currentOrder.paymentStatus === 'Pending' ? '⏳ Payment Pending' :
                     '❌ Unpaid (Cash on Handover)'}
                  </span>

                  {currentOrder.transactionId && (
                    <span className={`border font-mono text-[10px] px-2.5 py-1 rounded-full ${
                      theme === 'dark' ? 'bg-slate-900 border-slate-800 text-slate-300' : 'bg-slate-100 border-slate-300 text-slate-700'
                    }`}>
                      Ref: {currentOrder.transactionId}
                    </span>
                  )}
                </div>

                <h2 className="text-3xl font-extrabold font-heading">
                  {currentOrder.status === 'Completed' ? t('trackCompleted', currentLang) : 
                   currentOrder.status === 'Cancelled' ? t('trackCancelled', currentLang) :
                   currentOrder.status === 'Ready for Pickup' ? t('trackReady', currentLang) :
                   currentOrder.status === 'Accepted' ? t('trackAccepted', currentLang) :
                   t('trackPending', currentLang)}
                </h2>
                
                <p className="text-xs text-slate-400">
                  {currentOrder.status === 'Ready for Pickup'
                    ? 'Show your QR code to the shopkeeper at the counter to collect your food.'
                    : currentOrder.status === 'Cancelled'
                    ? `Cancelled by ${currentOrder.cancelledBy || 'user'} at ${currentOrder.cancelledAt || ''}`
                    : currentOrder.status === 'Accepted'
                    ? 'Your order is locked and being prepared by the canteen chef.'
                    : 'Order placed. Cancellation window closes after 8 seconds.'}
                </p>

                {/* AUTOMATIC 8-SECOND CANCEL BUTTON (DISAPPEARS LIVE AT 0s) */}
                {isCancelVisible && (
                  <div className="pt-2">
                    <button 
                      onClick={() => handleCustomerCancelOrder(currentOrder.id)}
                      className="bg-red-950/90 hover:bg-red-900 border border-red-500/60 text-red-300 font-extrabold px-5 py-2.5 rounded-2xl text-xs transition shadow-lg flex items-center gap-2 mx-auto active:scale-95 animate-pulse"
                    >
                      <Ban className="w-4 h-4 text-red-400" />
                      <span>Cancel Order ({remainingSec}s) 🚫</span>
                    </button>
                  </div>
                )}

                 <div className={`w-full rounded-full h-3 overflow-hidden p-0.5 border ${
                  theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-slate-100 border-slate-200 shadow-inner'
                }`}>
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${
                      currentOrder.status === 'Cancelled' ? 'bg-red-500' : 'bg-gradient-to-r from-blue-600 to-emerald-400'
                    }`} 
                    style={{ width: `${currentOrder.status === 'Pending' ? 15 : currentOrder.status === 'Accepted' ? 50 : currentOrder.status === 'Ready for Pickup' ? 90 : currentOrder.status === 'Cancelled' ? 100 : 100}%` }}
                  />
                </div>
              </div>

              <div className={`p-6 rounded-3xl border space-y-6 ${
                theme === 'dark' ? 'glass-panel border-slate-800' : 'bg-white border-slate-200 shadow-xl'
              }`}>
                <h3 className={`font-bold text-sm border-b pb-3 ${theme === 'dark' ? 'border-slate-800/80' : 'border-slate-200'}`}>Real-time Order Status Flow</h3>

                <div className={`space-y-6 relative before:absolute before:left-4 before:top-3 before:bottom-3 before:w-0.5 ${
                  theme === 'dark' ? 'before:bg-slate-800' : 'before:bg-slate-200'
                }`}>
                  <div className="flex items-start gap-4 relative z-10">
                    <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs font-bold">1</div>
                    <div>
                      <h4 className="font-bold text-sm">Order Placed</h4>
                      <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Status: <span className="text-yellow-500 font-bold">{currentOrder.status}</span> • Payment: <span className="text-emerald-500 font-bold">{currentOrder.paymentStatus}</span></p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 relative z-10">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                      ['Accepted', 'Ready for Pickup', 'Completed'].includes(currentOrder.status) 
                        ? 'bg-blue-600 text-white' 
                        : (theme === 'dark' ? 'bg-slate-800 text-slate-400' : 'bg-slate-200 text-slate-500')
                    }`}>2</div>
                    <div>
                      <h4 className="font-bold text-sm">Accepted & Preparing</h4>
                      <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Accepted by canteen • Cancellation locked</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 relative z-10">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                      ['Ready for Pickup', 'Completed'].includes(currentOrder.status) 
                        ? 'bg-emerald-500 text-white animate-bounce' 
                        : (theme === 'dark' ? 'bg-slate-800 text-slate-400' : 'bg-slate-200 text-slate-500')
                    }`}>3</div>
                    <div>
                      <h4 className="font-bold text-sm">🍽️ Food is Ready — Please collect your order</h4>
                      <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Show QR code below to shopkeeper</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* UNIQUE SINGLE-USE QR CODE */}
              {currentOrder.status !== 'Cancelled' && (
                <div className={`p-6 rounded-3xl border text-center space-y-4 ${
                  theme === 'dark' ? 'glass-card border-slate-800' : 'bg-white border-slate-200 shadow-xl'
                }`}>
                  <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs border ${
                    theme === 'dark' ? 'bg-slate-900 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700 shadow-sm'
                  }`}>
                    <QrCode className={`w-4 h-4 ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}`} />
                    <span className="font-semibold">Single-Use Order Collection QR Code</span>
                  </div>

                  <div className="w-52 h-52 bg-white p-3 rounded-2xl mx-auto flex items-center justify-center shadow-xl border-4 border-blue-600/20">
                    <img 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(currentOrder.qrToken)}`} 
                      alt="Order QR Code"
                      className="w-full h-full object-contain" 
                    />
                  </div>

                  <p className="text-xs text-slate-400 font-mono">
                    Order ID: <span className="font-bold">{currentOrder.id}</span>
                  </p>
                </div>
              )}
            </div>
          );
        })()}

        {/* SHOPKEEPER DASHBOARD */}
        {currentUser.role === 'shopkeeper' && (
          <div className="max-w-5xl mx-auto space-y-8 animate-fadeIn">
            
            {/* Warning Alert Banner */}
            {(!myShop || !myShop.upiId || !myShop.upiId.includes('@')) && (
              <div className="p-4 rounded-3xl bg-amber-500/10 border border-amber-500/30 text-amber-500 text-xs flex items-center justify-between gap-3 animate-pulse">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                  <div>
                    <p className="font-extrabold text-sm">Store Payment Details Incomplete!</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Your shop is hidden from customers. Go to the <strong>Payment Settings</strong> tab below to enter your UPI ID.
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setShopkeeperSubTab('payment')}
                  className="bg-amber-600 hover:bg-amber-500 text-white font-extrabold px-4 py-2 rounded-xl text-[10px] transition shrink-0"
                >
                  Configure Now →
                </button>
              </div>
            )}

            {/* Tab Swapper */}
            <div className={`flex p-1.5 rounded-2xl border transition ${
              theme === 'dark' ? 'bg-slate-900 border-slate-800/80 text-white' : 'bg-slate-100 border-slate-300 text-slate-800 shadow-sm'
            }`}>
              <button 
                onClick={() => setShopkeeperSubTab('orders')}
                className={`flex-grow py-3 text-xs font-extrabold rounded-xl transition-all flex items-center justify-center gap-2 ${
                  shopkeeperSubTab === 'orders' 
                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30 transform scale-[1.02]' 
                    : 'text-slate-400 hover:text-slate-700'
                }`}
              >
                <ShoppingBag className="w-4 h-4 flex-shrink-0" />
                <span className="hidden sm:inline">Orders & Canteen Menu</span>
                <span className="sm:hidden text-[11px]">Orders & Menu</span>
              </button>
              <button 
                onClick={() => setShopkeeperSubTab('analytics')}
                className={`flex-grow py-3 text-xs font-extrabold rounded-xl transition-all flex items-center justify-center gap-2 ${
                  shopkeeperSubTab === 'analytics' 
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 transform scale-[1.02]' 
                    : 'text-slate-400 hover:text-slate-700'
                }`}
              >
                <TrendingUp className="w-4 h-4 flex-shrink-0" />
                <span className="hidden sm:inline">Smart AI Sales Insights</span>
                <span className="sm:hidden text-[11px]">AI Insights</span>
              </button>
              <button 
                onClick={() => setShopkeeperSubTab('payment')}
                className={`flex-grow py-3 text-xs font-extrabold rounded-xl transition-all flex items-center justify-center gap-2 ${
                  shopkeeperSubTab === 'payment' 
                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30 transform scale-[1.02]' 
                    : 'text-slate-400 hover:text-slate-700'
                }`}
              >
                <QrCode className="w-4 h-4 flex-shrink-0" />
                <span className="hidden sm:inline">Payment Settings</span>
                <span className="sm:hidden text-[11px]">Payment</span>
              </button>
            </div>

            {/* TAB 1: ORDERS & MENU */}
            {shopkeeperSubTab === 'orders' && (
              <div className="space-y-8 animate-fadeIn">

                {/* QR VERIFICATION SCANNER & SIMULATOR PANEL */}
                <div className={`p-6 rounded-3xl border space-y-4 ${
                  theme === 'dark' ? 'glass-panel border-slate-800 bg-gradient-to-r from-slate-900 to-emerald-950/20' : 'bg-white border-slate-200 shadow-xl shadow-slate-200/50'
                }`}>
                  <div className="flex items-center justify-between border-b border-slate-800/60 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
                        <QrCode className="w-5 h-5 animate-pulse" />
                      </div>
                      <div>
                        <h3 className="font-extrabold font-heading text-sm">QR Code Collection Verification Scanner</h3>
                        <p className="text-[11px] text-slate-400">Scan customer token to atomically verify payment and hand over food</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Live Camera Interface */}
                    <div className={`p-4 rounded-2xl border text-center space-y-3 relative overflow-hidden flex flex-col justify-center min-h-[220px] ${
                      theme === 'dark' ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-200'
                    }`}>
                      {cameraError ? (
                        <div className="p-3 bg-red-950/80 border border-red-500/40 text-red-300 rounded-xl space-y-3 text-xs">
                          <div className="flex items-center justify-center gap-1.5 font-bold">
                            <AlertCircle className="w-4 h-4 text-red-400" />
                            <span>Scanner Camera Error</span>
                          </div>
                          <p className="text-[10px] leading-relaxed text-slate-400">{cameraError}</p>
                          
                          <div className="border-t border-slate-800/60 pt-2.5 space-y-2">
                            <span className="font-bold text-[10px] text-slate-300 block uppercase">Manual Token Fallback</span>
                            <div className="flex gap-1.5">
                              <input 
                                type="text"
                                placeholder="e.g. TURO-1234"
                                id="manual-fallback-token"
                                className={`flex-1 border rounded-lg px-2 py-1.5 text-[11px] focus:outline-none font-mono ${
                                  theme === 'dark' ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-white border-slate-300 text-slate-850'
                                }`}
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const token = (document.getElementById('manual-fallback-token') as HTMLInputElement)?.value;
                                  if (token && token.trim()) {
                                    processQrScanHandover(token.trim());
                                  } else {
                                    alert('Please enter a valid token number.');
                                  }
                                }}
                                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-1.5 rounded-lg text-[10px]"
                              >
                                Verify
                              </button>
                            </div>
                          </div>
                          
                          <button
                            onClick={() => setCameraError(null)}
                            className="text-[10px] text-slate-400 underline block mx-auto pt-1 hover:text-slate-250"
                          >
                            Reset Scanner Camera
                          </button>
                        </div>
                      ) : isCameraActive ? (
                        <div className="space-y-3">
                          <div className="relative mx-auto rounded-xl overflow-hidden max-w-[280px] border-4 border-emerald-500/30 aspect-square flex items-center justify-center bg-black">
                            {/* Target for html5-qrcode */}
                            <div id="qr-reader" className="w-full h-full object-cover" />
                            {/* Scanning Reticle */}
                            <div className="absolute inset-4 border-2 border-dashed border-emerald-400 animate-pulse rounded-lg pointer-events-none z-10" />
                          </div>
                          <button 
                            onClick={stopCameraScanner}
                            className="bg-red-950/60 border border-red-500/30 text-red-400 font-bold px-4 py-2 rounded-xl text-xs transition"
                          >
                            Stop Camera Scanner ⏹️
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <Camera className="w-10 h-10 mx-auto text-slate-500" />
                          <div className="space-y-1">
                            <h4 className="font-bold text-xs">Verify via Device Camera</h4>
                            <p className="text-[10px] text-slate-400 max-w-xs mx-auto">Access HTML5 WebRTC camera scanner to verify customer collection receipt QR code instantly</p>
                          </div>
                          <button 
                            onClick={startCameraScanner}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-5 py-2.5 rounded-xl text-xs shadow-lg shadow-emerald-600/30 transition transform hover:-translate-y-0.5"
                          >
                            Start Camera Scanner 📷
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Simulator Input Verify */}
                    <div className={`p-4 rounded-2xl border flex flex-col justify-between space-y-4 ${
                      theme === 'dark' ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-200'
                    }`}>
                      <div className="space-y-2">
                        <span className="bg-blue-500/20 text-blue-400 font-extrabold px-2 py-0.5 rounded text-[10px] uppercase font-mono tracking-wider">
                          QR Simulator Box
                        </span>
                        <h4 className="font-bold text-xs">Simulate Counter Scan (Testing)</h4>
                        <p className="text-[10px] text-slate-400 leading-relaxed">
                          Copy the customer's QR Token or Order ID (e.g. `TURO-3456`) and paste it below to simulate verification without using a physical camera.
                        </p>
                      </div>

                      <div className="space-y-2.5">
                        <input 
                          type="text" 
                          placeholder="Paste order QR token payload or ID..."
                          value={simulatedQrInput}
                          onChange={(e) => setSimulatedQrInput(e.target.value)}
                          className={`w-full border rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-blue-500 font-mono ${
                            theme === 'dark' ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-white border-slate-300 text-slate-800'
                          }`}
                        />
                        <button 
                          disabled={!simulatedQrInput.trim()}
                          onClick={() => processQrScanHandover(simulatedQrInput.trim())}
                          className={`w-full font-bold py-2.5 rounded-xl text-xs transition flex items-center justify-center gap-1.5 ${
                            simulatedQrInput.trim() 
                              ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg' 
                              : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                          }`}
                        >
                          <ShieldCheck className="w-4 h-4" />
                          <span>Verify & Process Handover 🚀</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* INCOMING ORDERS */}
                <div className={`p-6 rounded-3xl border space-y-4 ${
                  theme === 'dark' ? 'glass-panel border-slate-800' : 'bg-white border-slate-200 shadow-xl'
                }`}>
                  <h3 className="font-extrabold font-heading text-base border-b border-slate-800 pb-3 flex items-center justify-between">
                    <span>Incoming Canteen Orders ({currentOrder ? 1 : 0})</span>
                    <span className="text-xs text-slate-400">Accepting locks customer cancellation</span>
                  </h3>

                  {currentOrder ? (
                    <div className={`p-5 rounded-2xl space-y-4 border ${
                      theme === 'dark' ? 'glass-card border-slate-800' : 'bg-slate-50 border-slate-200'
                    }`}>
                      <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-sm">Order #{currentOrder.id} • {currentOrder.customerName}</h4>
                            
                            <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border bg-emerald-500/20 text-emerald-500 border-emerald-500/40 uppercase">
                              {currentOrder.paymentStatus}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400">Placed at {currentOrder.createdAt} • Total: ₹{currentOrder.grandTotal} ({currentOrder.paymentMethod})</p>
                        </div>

                        <span className={`text-xs font-bold px-3 py-1 rounded-full border ${
                          currentOrder.status === 'Pending' ? 'bg-yellow-500/20 text-yellow-500 border-yellow-500/40 animate-pulse' :
                          currentOrder.status === 'Accepted' ? 'bg-blue-600/20 text-blue-500 border-blue-600/40' :
                          currentOrder.status === 'Ready for Pickup' ? 'bg-emerald-500/20 text-emerald-500 border-emerald-500/40' :
                          currentOrder.status === 'Cancelled' ? 'bg-red-500/20 text-red-500 border-red-500/40' :
                          'bg-emerald-500/20 text-emerald-500 border-emerald-500/40'
                        }`}>
                          {currentOrder.status}
                        </span>
                      </div>

                      <div className="space-y-2">
                        {currentOrder.items.map(item => (
                          <div key={item.id} className={`flex justify-between text-xs p-2.5 rounded-xl border ${
                            theme === 'dark' ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'
                          }`}>
                            <span>{item.qty}x {item.name}</span>
                            <span className="font-bold">₹{item.discountedPrice * item.qty}</span>
                          </div>
                        ))}
                      </div>

                      <div className="pt-2 flex flex-wrap items-center gap-3">
                        {currentOrder.status === 'Pending' && (
                          <>
                            <button 
                              onClick={() => handleShopkeeperAcceptOrder(currentOrder.id)}
                              className="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold px-4 py-2 rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-emerald-600/30"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                              <span>Accept Order & Lock Cancellation ✅</span>
                            </button>
                            <button 
                              onClick={() => handleShopkeeperRejectOrder(currentOrder.id)}
                              className="bg-red-950/80 hover:bg-red-900 border border-red-500/40 text-red-300 font-bold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5"
                            >
                              <Ban className="w-4 h-4" />
                              <span>Reject Order ❌</span>
                            </button>
                          </>
                        )}

                        {currentOrder.status === 'Accepted' && (
                          <button 
                            onClick={() => handleShopkeeperFoodReady(currentOrder.id)}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-emerald-600/20 animate-pulse"
                          >
                            <Bell className="w-4 h-4" />
                            <span>Food is Ready 🔔 (Mark Ready for Pickup)</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-6 text-slate-500 text-xs">
                      No active incoming orders right now.
                    </div>
                  )}
                </div>

                {/* FOOD MENU MANAGEMENT */}
                <div className={`p-6 rounded-3xl border space-y-4 ${
                  theme === 'dark' ? 'glass-panel border-slate-800' : 'bg-white border-slate-200 shadow-xl'
                }`}>
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div>
                      <h3 className="font-extrabold font-heading text-base">{t('foodMenuManagement', currentLang)} ({activeShopForOwner.name})</h3>
                      <p className="text-xs text-slate-400">Items added here appear immediately on Customer Dashboard</p>
                    </div>

                    <button 
                      onClick={openAddItemModal}
                      className="bg-gradient-to-r from-blue-700 to-emerald-600 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-2 shadow-lg"
                    >
                      <Plus className="w-4 h-4" />
                      <span>{t('addNewItem', currentLang)}</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     {menuItems.filter(i => i.shopId === activeShopForOwner.id || i.shopId === currentUser?.shopId).map(item => (
                      <div key={item.id} className={`p-4 rounded-2xl flex flex-col sm:flex-row justify-between gap-4 border transition ${
                        item.isSpecial ? 'border-amber-400/80 shadow-md shadow-amber-400/10' :
                        theme === 'dark' ? 'glass-card border-slate-800' : 'bg-slate-50 border-slate-200'
                      }`}>
                        <div className="flex gap-3">
                          <img src={getCategoryDefaultImage(item.category, item.image)} alt={item.name} className="w-16 h-16 rounded-xl object-cover flex-shrink-0" />
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className="font-bold text-xs">{item.name}</h4>
                              {item.isSpecial && (
                                <span className="bg-amber-400/20 text-amber-500 border border-amber-400/40 text-[9px] font-extrabold px-1.5 py-0.5 rounded">
                                  🌟 Special
                                </span>
                              )}
                            </div>
                            <p className="text-xs font-extrabold text-blue-500">₹{item.price}</p>
                            <p className="text-[10px] text-slate-400">Slot: {formatTime12h(activeShopForOwner.openingTime || '08:00')} - {formatTime12h(activeShopForOwner.closingTime || '22:00')}</p>
                            {item.stockLimit !== null && item.stockLimit !== undefined ? (
                              <p className="text-[10px] text-slate-300 font-medium">
                                Stock: <span className="font-extrabold text-blue-400">{item.stockRemaining ?? 0}</span> / {item.stockLimit}
                              </p>
                            ) : (
                              <p className="text-[10px] text-slate-500 italic">No Stock Limit</p>
                            )}
                            {item.isSoldOut && (
                              <span className="inline-block bg-red-950/70 text-red-400 border border-red-800/40 text-[8px] font-extrabold px-1.5 py-0.5 rounded mt-0.5">
                                🚫 SOLD OUT OVERRIDE
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex sm:flex-col justify-between items-center sm:items-end gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800/40 w-full sm:w-auto">
                          <div className="flex sm:flex-col gap-1.5 w-full sm:w-auto">
                            <button 
                              onClick={() => handleToggleSpecial(item.id)}
                              className={`p-1.5 rounded-lg border text-[10px] font-bold transition flex items-center gap-1 w-full sm:w-auto justify-center ${
                                item.isSpecial 
                                  ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md' 
                                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                              }`}
                            >
                              <Star className={`w-3 h-3 ${item.isSpecial ? 'fill-slate-950' : ''}`} />
                              <span>{item.isSpecial ? 'Special' : 'Mark Special'}</span>
                            </button>

                            <button 
                              onClick={() => handleToggleSoldOut(item.id)}
                              className={`p-1.5 rounded-lg border text-[10px] font-bold transition flex items-center gap-1 w-full sm:w-auto justify-center ${
                                item.isSoldOut 
                                  ? 'bg-red-600 text-white border-red-500 shadow-md shadow-red-500/20' 
                                  : 'bg-emerald-950/60 hover:bg-emerald-900 text-emerald-400 border-emerald-800'
                              }`}
                            >
                              <Ban className="w-3 h-3" />
                              <span>{item.isSoldOut ? 'Sold Out' : 'Available'}</span>
                            </button>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button 
                              onClick={() => openEditItemModal(item)}
                              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button 
                              onClick={() => handleDeleteItem(item.id)}
                              className="p-1.5 bg-red-950/60 hover:bg-red-900 text-red-400 rounded-lg transition"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            )}

            {/* TAB 2: SMART AI SALES ANALYSIS */}
            {shopkeeperSubTab === 'analytics' && (
              <div className="space-y-8 animate-fadeIn">
                
                {/* 3-4 Key Metric Highlights */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className={`p-5 rounded-3xl border transition ${
                    theme === 'dark' ? 'glass-card border-emerald-500/20 bg-emerald-950/10' : 'bg-white border-emerald-200 shadow-md text-slate-900'
                  }`}>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Total Revenue</span>
                    <h3 className="font-heading font-extrabold text-2xl text-emerald-500 mt-1">₹{analytics.totalRev}</h3>
                    <p className="text-[10px] text-slate-500 mt-1">100% UPI settlements</p>
                  </div>

                  <div className={`p-5 rounded-3xl border transition ${
                    theme === 'dark' ? 'glass-card border-blue-500/20 bg-blue-950/10' : 'bg-white border-blue-200 shadow-md text-slate-900'
                  }`}>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Busiest Hour</span>
                    <h3 className="font-heading font-extrabold text-2xl text-blue-400 mt-1">{analytics.peakHourText}</h3>
                    <p className="text-[10px] text-slate-500 mt-1">Based on peak order counts</p>
                  </div>

                  <div className={`p-5 rounded-3xl border transition ${
                    theme === 'dark' ? 'glass-card border-purple-500/20 bg-purple-950/10' : 'bg-white border-purple-200 shadow-md text-slate-900'
                  }`}>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Paid Orders</span>
                    <h3 className="font-heading font-extrabold text-2xl text-purple-400 mt-1">{analytics.totalOrders}</h3>
                    <p className="text-[10px] text-slate-500 mt-1">Fulfillments finalized</p>
                  </div>

                  <div className={`p-5 rounded-3xl border transition ${
                    theme === 'dark' ? 'glass-card border-amber-500/20 bg-amber-950/10' : 'bg-white border-amber-200 shadow-md text-slate-900'
                  }`}>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Average Ticket</span>
                    <h3 className="font-heading font-extrabold text-2xl text-amber-500 mt-1">₹{analytics.avgOrder}</h3>
                    <p className="text-[10px] text-slate-500 mt-1">Per unique customer order</p>
                  </div>
                </div>

                {/* AI-Generated Actionable Suggestions */}
                <div className={`p-6 rounded-3xl border space-y-4 ${
                  theme === 'dark' ? 'glass-panel border-blue-500/40 bg-gradient-to-r from-slate-900 to-blue-950/20' : 'bg-white border-blue-200 shadow-xl shadow-blue-200/40 text-slate-950'
                }`}>
                  <h3 className="font-extrabold font-heading text-sm flex items-center gap-2 text-blue-500">
                    <Sparkles className="w-5 h-5 text-blue-500 animate-spin-slow" />
                    <span>Smart AI Recommendations & Insights</span>
                  </h3>
                  
                  <div className="space-y-3">
                    {analytics.insights.map((insight, idx) => (
                      <div key={idx} className={`p-3 rounded-2xl border text-xs leading-relaxed flex items-start gap-2.5 ${
                        theme === 'dark' ? 'bg-slate-950/80 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-300 text-slate-800'
                      }`}>
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
                        <span>{insight}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Sales Trend SVG Chart */}
                  <div className={`p-6 rounded-3xl border space-y-4 ${
                    theme === 'dark' ? 'glass-panel border-slate-800' : 'bg-white border-slate-200 shadow-xl'
                  }`}>
                    <h3 className="font-extrabold font-heading text-sm">Hourly Sales Trend Visualization</h3>
                    
                    <div className="h-56 flex items-center justify-center">
                      {analytics.totalOrders > 0 ? (
                        <svg viewBox="0 0 500 180" className="w-full h-full">
                          {/* Grid Lines */}
                          <line x1="40" y1="20" x2="460" y2="20" stroke={theme === 'dark' ? '#334155' : '#cbd5e1'} strokeDasharray="3,3" />
                          <line x1="40" y1="70" x2="460" y2="70" stroke={theme === 'dark' ? '#334155' : '#cbd5e1'} strokeDasharray="3,3" />
                          <line x1="40" y1="120" x2="460" y2="120" stroke={theme === 'dark' ? '#334155' : '#cbd5e1'} strokeDasharray="3,3" />
                          <line x1="40" y1="150" x2="460" y2="150" stroke={theme === 'dark' ? '#475569' : '#94a3b8'} strokeWidth="1.5" />
                          
                          {/* Draw curve path */}
                          {(() => {
                            const hours = Array.from({ length: 15 }, (_, i) => i + 8); // 8 AM to 10 PM
                            const points = hours.map((h, idx) => {
                              const rev = analytics.hourlySales[h] || 0;
                              const maxVal = Math.max(...Object.values(analytics.hourlySales), 100);
                              const x = 40 + (idx / 14) * 420;
                              const y = 150 - (rev / maxVal) * 120;
                              return { x, y, h, rev };
                            });

                            const d = points.reduce((path, p, idx) => {
                              return idx === 0 ? `M ${p.x} ${p.y}` : `${path} L ${p.x} ${p.y}`;
                            }, '');

                            return (
                              <>
                                <path d={d} fill="none" stroke="#3b82f6" strokeWidth="3.5" strokeLinecap="round" />
                                {/* Dots */}
                                {points.map((p, idx) => (
                                  <g key={idx} className="group">
                                    <circle 
                                      cx={p.x} 
                                      cy={p.y} 
                                      r="4.5" 
                                      fill={p.rev > 0 ? '#3b82f6' : (theme === 'dark' ? '#475569' : '#cbd5e1')} 
                                      stroke={theme === 'dark' ? '#1e293b' : '#ffffff'} 
                                      strokeWidth="2" 
                                      className="transition-all duration-300 hover:r-7 cursor-pointer"
                                    />
                                    <title>{`Hour ${p.h}:00 - Revenue: ₹${p.rev}`}</title>
                                  </g>
                                ))}
                              </>
                            );
                          })()}
                        </svg>
                      ) : (
                        <span className="text-xs text-slate-500">Need order data to plot trend line</span>
                      )}
                    </div>
                  </div>

                  {/* Revenue Breakdown by Category */}
                  <div className={`p-6 rounded-3xl border space-y-4 ${
                    theme === 'dark' ? 'glass-panel border-slate-800' : 'bg-white border-slate-200 shadow-xl'
                  }`}>
                    <h3 className="font-extrabold font-heading text-sm">Revenue Share by Category</h3>
                    
                    <div className="space-y-4">
                      {Object.entries(analytics.categorySales).map(([cat, rev]) => {
                        const total = analytics.totalRev || 1;
                        const percentage = Math.round((rev / total) * 100);
                        return (
                          <div key={cat} className="space-y-1">
                            <div className="flex justify-between text-xs font-semibold">
                              <span>{cat}</span>
                              <span className="text-slate-400">₹{rev} ({percentage}%)</span>
                            </div>
                            <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
                              <div 
                                className="h-full rounded-full bg-gradient-to-r from-blue-600 to-emerald-400 transition-all duration-500" 
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Ranked Best & Worst Selling Dishes */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  
                  {/* Best Selling */}
                  <div className={`p-6 rounded-3xl border space-y-4 ${
                    theme === 'dark' ? 'glass-panel border-slate-800' : 'bg-white border-slate-200 shadow-xl'
                  }`}>
                    <h3 className="font-extrabold font-heading text-sm flex items-center gap-2 text-emerald-500">
                      <Sparkles className="w-4 h-4" />
                      <span>Top Performing Dishes (Ranked)</span>
                    </h3>
                    
                    <div className="space-y-3">
                      {analytics.bestSelling.length > 0 ? (
                        analytics.bestSelling.map((item, idx) => (
                          <div key={idx} className={`p-3 rounded-2xl border flex items-center justify-between text-xs ${
                            theme === 'dark' ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-200'
                          }`}>
                            <div className="flex items-center gap-3">
                              <span className="font-extrabold text-slate-400 font-mono w-4">#{idx + 1}</span>
                              <div>
                                <h4 className="font-bold">{item.name}</h4>
                                <span className="text-[10px] text-slate-400">{item.category}</span>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="font-extrabold text-emerald-500 block">{item.qty} Sold</span>
                              <span className="text-[10px] text-slate-400">₹{item.revenue} Revenue</span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-6 text-slate-500 text-xs">No sales registered yet.</div>
                      )}
                    </div>
                  </div>

                  {/* Worst Selling */}
                  <div className={`p-6 rounded-3xl border space-y-4 ${
                    theme === 'dark' ? 'glass-panel border-slate-800' : 'bg-white border-slate-200 shadow-xl'
                  }`}>
                    <h3 className="font-extrabold font-heading text-sm flex items-center gap-2 text-red-500">
                      <AlertCircle className="w-4 h-4" />
                      <span>Slowest Performing Dishes (Action Required)</span>
                    </h3>
                    
                    <div className="space-y-3">
                      {analytics.worstSelling.length > 0 ? (
                        analytics.worstSelling.map((item, idx) => (
                          <div key={idx} className={`p-3 rounded-2xl border flex items-center justify-between text-xs ${
                            theme === 'dark' ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-200'
                          }`}>
                            <div className="flex items-center gap-3">
                              <span className="font-extrabold text-slate-400 font-mono w-4">#{idx + 1}</span>
                              <div>
                                <h4 className="font-bold">{item.name}</h4>
                                <span className="text-[10px] text-slate-400">{item.category}</span>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="font-bold text-red-400 block">{item.qty} Sold</span>
                              <span className="text-[10px] text-slate-400">₹{item.revenue} Revenue</span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-6 text-slate-500 text-xs">No items found in canteen menu.</div>
                      )}
                    </div>
                  </div>

                </div>

                {/* AI Demand Forecasting */}
                <div className={`p-6 rounded-3xl border space-y-4 ${
                  theme === 'dark' ? 'glass-panel border-purple-500/20 bg-purple-950/10' : 'bg-white border-purple-200 shadow-xl text-slate-900'
                }`}>
                  <h3 className="font-extrabold font-heading text-sm flex items-center gap-2 text-purple-400">
                    <TrendingUp className="w-5 h-5 text-purple-400" />
                    <span>Next 3-Days Demand Forecasting Projection</span>
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Based on historical order frequency and category trends, the AI predicts the following daily demand projection for the upcoming cycle:
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                    <div className={`p-4 rounded-2xl border text-center ${
                      theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-300'
                    }`}>
                      <span className="text-[10px] text-slate-400 font-bold block">TOMORROW</span>
                      <h4 className="font-extrabold text-lg text-emerald-500 mt-1">₹{analytics.forecastedDailySales}</h4>
                      <p className="text-[9px] text-slate-500">Predicted Sales Volume</p>
                    </div>

                    <div className={`p-4 rounded-2xl border text-center ${
                      theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-300'
                    }`}>
                      <span className="text-[10px] text-slate-400 font-bold block">DAY 2</span>
                      <h4 className="font-extrabold text-lg text-emerald-500 mt-1">₹{Math.round(analytics.forecastedDailySales * 1.05)}</h4>
                      <p className="text-[9px] text-slate-500">Predicted Sales Volume</p>
                    </div>

                    <div className={`p-4 rounded-2xl border text-center ${
                      theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-300'
                    }`}>
                      <span className="text-[10px] text-slate-400 font-bold block">DAY 3</span>
                      <h4 className="font-extrabold text-lg text-emerald-500 mt-1">₹{Math.round(analytics.forecastedDailySales * 1.08)}</h4>
                      <p className="text-[9px] text-slate-500">Predicted Sales Volume</p>
                    </div>
                  </div>
                </div>

              </div>
            )}

            {/* TAB 3: PAYMENT SETTINGS */}
            {/* TAB 3: PAYMENT SETTINGS */}
            {shopkeeperSubTab === 'payment' && (
              <div className="space-y-8 animate-fadeIn">
                <div className={`p-6 rounded-3xl border space-y-6 ${
                  theme === 'dark' ? 'glass-panel border-slate-800' : 'bg-white border-slate-200 shadow-xl'
                }`}>
                  <div>
                    <h3 className="font-extrabold font-heading text-lg flex items-center gap-2">
                      <QrCode className="w-5 h-5 text-emerald-500" />
                      <span>Payment Settings</span>
                    </h3>
                    <p className="text-xs text-slate-400">Configure your shop's bank UPI ID and custom payment QR code. Safe payments are directly routed to your configured account.</p>
                  </div>

                  {!myShop?.upiId && (
                    <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-500 text-xs flex items-center gap-3">
                      <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                      <div>
                        <p className="font-bold">Payment Details Missing</p>
                        <p className="text-[11px] text-slate-400">Your shop is currently hidden from customers. Please enter your UPI ID to activate your canteen store.</p>
                      </div>
                    </div>
                  )}

                  <form onSubmit={handleSavePaymentSettings} className="space-y-5">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-400">Your Shop UPI VPA (ID) *</label>
                        {myShop?.upiId && (
                          <button
                            type="button"
                            onClick={handleClearUpiId}
                            className="text-[10px] text-red-500 hover:text-red-400 font-extrabold flex items-center gap-1 transition"
                          >
                            ✕ Remove UPI ID
                          </button>
                        )}
                      </div>
                      <input 
                        type="text"
                        value={ownerUpiInput}
                        onChange={(e) => setOwnerUpiInput(e.target.value.trim())}
                        placeholder="e.g. canteenname@okaxis, canteen@upi"
                        className={`w-full px-4 py-3 rounded-2xl border text-sm font-semibold transition ${
                          theme === 'dark' 
                            ? 'bg-slate-900 border-slate-800 focus:border-blue-500 text-white' 
                            : 'bg-slate-50 border-slate-200 focus:border-blue-500 text-slate-900'
                        }`}
                      />
                      <p className="text-[10px] text-slate-500">Must be a valid UPI handle containing the "@" sign (e.g. merchantname@bankname). Leave empty and save or click remove to clear it.</p>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-400">Custom Payment QR Image (Optional)</label>
                      <div className="flex flex-col sm:flex-row items-center gap-4">
                        <input 
                          type="file"
                          accept="image/*"
                          onChange={handleQrImageUpload}
                          className={`w-full text-xs text-slate-400 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-extrabold transition ${
                            theme === 'dark' 
                              ? 'file:bg-slate-800 file:text-white hover:file:bg-slate-700' 
                              : 'file:bg-slate-100 file:text-slate-800 hover:file:bg-slate-200'
                          }`}
                        />
                        {ownerQrImageUrlInput && (
                          <button 
                            type="button"
                            onClick={handleRemoveQrCode}
                            className="text-xs text-red-500 hover:text-red-400 font-bold hover:underline flex-shrink-0"
                          >
                            Remove Custom QR
                          </button>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-500">Upload your official GPay/PhonePe/Paytm QR image if you want to override the default system QR generator</p>
                    </div>

                    {/* Shop Operating Hours Section */}
                    <div className="border-t border-slate-800/30 pt-5 space-y-4">
                      <div>
                        <h4 className="font-extrabold text-sm text-slate-300">Shop Operating Hours</h4>
                        <p className="text-[10px] text-slate-500">Configure daily opening and closing hours, or manually lock your shop.</p>
                      </div>

                      {(() => {
                        const openT = parse24h(openingTimeInput);
                        const closeT = parse24h(closingTimeInput);
                        const hoursOptions = Array.from({ length: 12 }, (_, i) => i + 1);
                        const minutesOptions = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'];

                        const selectStyle = `rounded-xl border text-xs font-semibold px-2.5 py-2 focus:outline-none transition ${
                          theme === 'dark' 
                            ? 'bg-slate-900 border-slate-800 text-white focus:border-blue-500' 
                            : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500'
                        }`;

                        return (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Opening Time split selector */}
                            <div className="space-y-1">
                              <label className="text-[11px] font-bold text-slate-400">Opening Time</label>
                              <div className="flex items-center gap-1.5">
                                <select
                                  value={openT.hour}
                                  onChange={(e) => {
                                    const h = parseInt(e.target.value, 10);
                                    setOpeningTimeInput(convertTo24h(h, openT.minute, openT.period));
                                  }}
                                  className={selectStyle}
                                >
                                  {hoursOptions.map(h => <option key={h} value={h}>{h}</option>)}
                                </select>
                                <span className="text-slate-500 font-bold">:</span>
                                <select
                                  value={openT.minute}
                                  onChange={(e) => {
                                    setOpeningTimeInput(convertTo24h(openT.hour, e.target.value, openT.period));
                                  }}
                                  className={selectStyle}
                                >
                                  {minutesOptions.map(m => <option key={m} value={m}>{m}</option>)}
                                </select>
                                <select
                                  value={openT.period}
                                  onChange={(e) => {
                                    setOpeningTimeInput(convertTo24h(openT.hour, openT.minute, e.target.value));
                                  }}
                                  className={selectStyle}
                                >
                                  <option value="AM">AM</option>
                                  <option value="PM">PM</option>
                                </select>
                              </div>
                            </div>

                            {/* Closing Time split selector */}
                            <div className="space-y-1">
                              <label className="text-[11px] font-bold text-slate-400">Closing Time</label>
                              <div className="flex items-center gap-1.5">
                                <select
                                  value={closeT.hour}
                                  onChange={(e) => {
                                    const h = parseInt(e.target.value, 10);
                                    setClosingTimeInput(convertTo24h(h, closeT.minute, closeT.period));
                                  }}
                                  className={selectStyle}
                                >
                                  {hoursOptions.map(h => <option key={h} value={h}>{h}</option>)}
                                </select>
                                <span className="text-slate-500 font-bold">:</span>
                                <select
                                  value={closeT.minute}
                                  onChange={(e) => {
                                    setClosingTimeInput(convertTo24h(closeT.hour, e.target.value, closeT.period));
                                  }}
                                  className={selectStyle}
                                >
                                  {minutesOptions.map(m => <option key={m} value={m}>{m}</option>)}
                                </select>
                                <select
                                  value={closeT.period}
                                  onChange={(e) => {
                                    setClosingTimeInput(convertTo24h(closeT.hour, closeT.minute, e.target.value));
                                  }}
                                  className={selectStyle}
                                >
                                  <option value="AM">AM</option>
                                  <option value="PM">PM</option>
                                </select>
                              </div>
                            </div>
                          </div>
                        );
                      })()}

                      <div className="flex items-center justify-between p-3.5 rounded-2xl bg-red-500/5 border border-red-500/10">
                        <div className="pr-4">
                          <p className="text-xs font-bold text-red-500">Manual Force Close Override</p>
                          <p className="text-[10px] text-slate-500">Enable this to mark the shop as closed immediately (e.g. out of stock or unplanned leave), regardless of operating hours.</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setIsManuallyClosedInput(!isManuallyClosedInput)}
                          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            isManuallyClosedInput ? 'bg-red-600' : 'bg-slate-800'
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                              isManuallyClosedInput ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </div>
                    </div>

                    <div className="pt-2">
                      <button 
                        type="submit"
                        disabled={isSavingPayment}
                        className="w-full sm:w-auto bg-gradient-to-r from-emerald-600 to-blue-600 hover:opacity-95 disabled:opacity-50 text-white font-bold px-8 py-3.5 rounded-2xl text-xs transition shadow-lg shadow-emerald-500/20"
                      >
                        {isSavingPayment ? 'Saving settings...' : 'Save Payment Settings'}
                      </button>
                    </div>
                  </form>
                </div>

                {/* QR Preview Panel */}
                <div className={`p-6 rounded-3xl border space-y-4 text-center ${
                  theme === 'dark' ? 'glass-panel border-slate-800' : 'bg-white border-slate-200 shadow-xl'
                }`}>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Payment QR Preview</h4>
                  <div className="w-48 h-48 bg-white p-2.5 rounded-2xl mx-auto shadow-md border border-slate-200 flex items-center justify-center">
                    {ownerQrImageUrlInput ? (
                      <img 
                        src={ownerQrImageUrlInput} 
                        alt="Custom UPI QR" 
                        className="w-full h-full object-contain"
                      />
                    ) : ownerUpiInput && ownerUpiInput.includes('@') ? (
                      (() => {
                        const previewUrl = `upi://pay?pa=${ownerUpiInput}&pn=${encodeURIComponent(myShop?.name || 'Canteen')}&am=0&tn=Preview&cu=INR`;
                        const qrPreviewCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=10&data=${encodeURIComponent(previewUrl)}`;
                        
                        return (
                          <img 
                            src={qrPreviewCodeUrl} 
                            alt="Generated UPI QR Preview" 
                            className="w-full h-full object-contain"
                          />
                        );
                      })()
                    ) : (
                      <span className="text-slate-400 text-xs">Awaiting valid UPI ID...</span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400">
                    {ownerQrImageUrlInput ? (
                      <span className="text-emerald-400 font-bold">Using Custom Uploaded QR Code Image</span>
                    ) : ownerUpiInput && ownerUpiInput.includes('@') ? (
                      <span>Auto-generating QR Code from UPI ID <span className="font-mono text-blue-400">{ownerUpiInput}</span></span>
                    ) : (
                      <span>Configure details to preview checkout QR code</span>
                    )}
                  </p>
                </div>
              </div>
            )}

          </div>
        )}

        {/* SUPER ADMIN DASHBOARD: STRICT CANTEEN SHOP CREATION & DELETION ONLY */}
        {currentUser.role === 'super_admin' && (
          <div className="max-w-5xl mx-auto space-y-8 animate-fadeIn">
            <div className={`p-6 rounded-3xl border space-y-4 ${
              theme === 'dark' ? 'glass-panel border-purple-500/40 bg-slate-900' : 'bg-white border-purple-200 shadow-xl'
            }`}>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400">
                    <Shield className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-extrabold font-heading">Super Admin Control Panel</h2>
                    <p className="text-xs text-slate-400">Strict Permission Scope: <span className="text-purple-400 font-bold">Canteen Shop Creation & Deletion Only</span></p>
                  </div>
                </div>

                <button 
                  onClick={() => setIsAddShopkeeperOpen(true)}
                  className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-purple-600/30 transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add New Canteen Shop</span>
                </button>
              </div>
            </div>

            {/* SUPER ADMIN CANTEEN SHOPS LIST WITH DELETE ACTION */}
            <div className={`p-6 rounded-3xl border space-y-4 ${
              theme === 'dark' ? 'glass-panel border-slate-800' : 'bg-white border-slate-200 shadow-xl'
            }`}>
              <h3 className="font-extrabold font-heading text-base border-b border-slate-800 pb-3 flex items-center gap-2">
                <Store className="w-5 h-5 text-purple-400" />
                <span>Registered Campus Canteens ({shops.length})</span>
              </h3>

              <div className="space-y-3">
                 {shops.map(s => (
                  <div key={s.id} className={`p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 border ${
                    theme === 'dark' ? 'glass-card border-slate-800' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <div className="space-y-1 w-full sm:w-auto">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="font-bold text-sm">{s.name}</h4>
                        <span className="bg-purple-500/20 text-purple-400 text-[10px] font-bold px-2 py-0.5 rounded-md border border-purple-500/30 font-mono">
                          {s.id}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 font-mono break-all">Owner Email: {s.email}</p>
                      <p className="text-xs text-slate-400 font-mono">UPI VPA: {s.upiId}</p>
                    </div>

                    <button 
                      onClick={() => handleDeleteShop(s.id, s.name)}
                      className="bg-red-950/60 hover:bg-red-900 border border-red-500/30 text-red-400 font-bold px-3.5 py-2 rounded-xl text-xs transition flex items-center justify-center gap-1.5 w-full sm:w-auto"
                      title="Delete Canteen Shop (Protected against active unfulfilled orders)"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete Shop</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </main>

      {/* SUPER ADMIN MODAL (ADD NEW CANTEEN SHOP) */}
      {isAddShopkeeperOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className={`w-full max-w-md p-6 rounded-3xl space-y-4 shadow-2xl relative border max-h-[90vh] overflow-y-auto ${
            theme === 'dark' ? 'glass-panel border-purple-500/40 text-white' : 'bg-white border-purple-200 text-slate-900'
          }`}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-extrabold font-heading text-lg">Add New Canteen Shop</h3>
              <button onClick={() => setIsAddShopkeeperOpen(false)} className="text-slate-400 hover:text-slate-700"><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={handleAddShopkeeper} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold">Shopkeeper Full Name</label>
                <input 
                  type="text" 
                  required
                  value={newShopkeeperName}
                  onChange={(e) => setNewShopkeeperName(e.target.value)}
                  placeholder="e.g. Anand Kumar"
                  className={`w-full border rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-purple-500 ${
                    theme === 'dark' ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold">Shopkeeper Email Address</label>
                <input 
                  type="email" 
                  required
                  autoCapitalize="none"
                  autoCorrect="off"
                  {...{ autocapitalize: 'off', autocorrect: 'off' }}
                  value={newShopkeeperEmail}
                  onChange={(e) => setNewShopkeeperEmail(e.target.value)}
                  placeholder="e.g. owner@turo.com"
                  className={`w-full border rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-purple-500 ${
                    theme === 'dark' ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold">Shopkeeper Password</label>
                <input 
                  type="password" 
                  required
                  value={newShopkeeperPassword}
                  onChange={(e) => setNewShopkeeperPassword(e.target.value)}
                  placeholder="Enter shopkeeper account password..."
                  className={`w-full border rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-purple-500 ${
                    theme === 'dark' ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold">New Canteen Shop Name</label>
                <input 
                  type="text" 
                  required
                  value={newShopName}
                  onChange={(e) => setNewShopName(e.target.value)}
                  placeholder="e.g. Campus Juice & Waffle Bar"
                  className={`w-full border rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-purple-500 ${
                    theme === 'dark' ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold">Canteen Shop ID</label>
                <input 
                  type="text" 
                  required
                  value={newShopkeeperShopId}
                  onChange={(e) => setNewShopkeeperShopId(e.target.value)}
                  placeholder="e.g. shop-waffle"
                  className={`w-full border rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-purple-500 font-mono ${
                    theme === 'dark' ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <button 
                type="submit"
                className="w-full bg-purple-600 hover:bg-purple-500 text-white font-extrabold py-3 rounded-2xl text-xs transition shadow-lg shadow-purple-600/30"
              >
                Create Canteen Shop & Save to Database
              </button>
            </form>
          </div>
        </div>
      )}

      {/* DISCOUNT & MENU MODALS */}
      {isDiscountModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className={`w-full max-w-md p-6 rounded-3xl space-y-4 shadow-2xl relative border max-h-[90vh] overflow-y-auto ${
            theme === 'dark' ? 'glass-panel border-emerald-500/40 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-extrabold font-heading text-lg">Create Shop Discount Offer</h3>
              <button onClick={() => setIsDiscountModalOpen(false)} className="text-slate-400 hover:text-slate-700"><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={handleSaveDiscount} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold">Discount Coupon Code</label>
                <input 
                  type="text" 
                  required
                  value={discountForm.code}
                  onChange={(e) => setDiscountForm({ ...discountForm, code: e.target.value })}
                  placeholder="e.g. SUMMER20"
                  className={`w-full border rounded-xl px-3.5 py-2 text-xs focus:outline-none font-mono uppercase ${
                    theme === 'dark' ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold">Offer Title</label>
                <input 
                  type="text" 
                  required
                  value={discountForm.title}
                  onChange={(e) => setDiscountForm({ ...discountForm, title: e.target.value })}
                  placeholder="e.g. 20% Off South Indian Dishes"
                  className={`w-full border rounded-xl px-3.5 py-2 text-xs focus:outline-none ${
                    theme === 'dark' ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold">Type</label>
                  <select 
                    value={discountForm.type}
                    onChange={(e) => setDiscountForm({ ...discountForm, type: e.target.value as any })}
                    className={`w-full border rounded-xl px-3.5 py-2 text-xs ${
                      theme === 'dark' ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  >
                    <option value="percentage">Percentage (%) Off</option>
                    <option value="flat">Flat Amount (₹) Off</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold">Value ({discountForm.type === 'percentage' ? '%' : '₹'})</label>
                  <input 
                    type="number" 
                    required
                    value={discountForm.value}
                    onChange={(e) => setDiscountForm({ ...discountForm, value: Number(e.target.value) })}
                    className={`w-full border rounded-xl px-3.5 py-2 text-xs ${
                      theme === 'dark' ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              <button 
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold py-3 rounded-xl text-xs transition shadow-lg"
              >
                Save & Activate Discount Offer
              </button>
            </form>
          </div>
        </div>
      )}

      {/* VERCEL APP LINK SHARING MODAL */}
      {isVercelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className={`w-full max-w-md p-6 rounded-3xl space-y-5 shadow-2xl relative border max-h-[90vh] overflow-y-auto ${
            theme === 'dark' ? 'glass-panel border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Share2 className="w-5 h-5 text-blue-500" />
                <h3 className="font-extrabold font-heading text-lg">Share Vercel App Link</h3>
              </div>
              <button onClick={() => setIsVercelModalOpen(false)} className="text-slate-400 hover:text-slate-700"><X className="w-5 h-5" /></button>
            </div>

            <div className={`border p-4 rounded-2xl text-center space-y-3 ${
              theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <span className="text-xs font-semibold">Scan QR Code on Mobile to Open Live App</span>
              <div className="w-48 h-48 bg-white p-3 rounded-2xl mx-auto flex items-center justify-center shadow-lg border-2 border-blue-600/20">
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(vercelAppUrl)}`} 
                  alt="Vercel App QR Code" 
                  className="w-full h-full object-contain"
                />
              </div>
              
              <div className={`pt-2 flex items-center gap-2 border p-2.5 rounded-xl ${
                theme === 'dark' ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-300'
              }`}>
                <span className="text-xs font-mono text-blue-500 truncate flex-1">{vercelAppUrl}</span>
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(vercelAppUrl);
                    setCopiedLink(true);
                    setTimeout(() => setCopiedLink(false), 2000);
                  }}
                  className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1 transition"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copiedLink ? 'Copied! ✅' : 'Copy'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FOOD ITEM ADD / EDIT MODAL */}
      {isItemModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className={`w-full max-w-lg p-6 rounded-3xl space-y-4 shadow-2xl relative border max-h-[90vh] overflow-y-auto ${
            theme === 'dark' ? 'glass-panel border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-extrabold font-heading text-lg">
                {editingItem ? 'Edit Food Item' : 'Add New Food Item'}
              </h3>
              <button onClick={() => setIsItemModalOpen(false)} className="text-slate-400 hover:text-slate-700"><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={handleSaveFoodItem} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold">Item Name</label>
                <input 
                  type="text" 
                  required
                  value={itemForm.name}
                  onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
                  placeholder="e.g. Masala Dosa"
                  className={`w-full border rounded-xl px-3.5 py-2 text-xs focus:outline-none ${
                    theme === 'dark' ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              {/* Image selection and Custom URL Input */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold">Food Item Image URL</label>
                  {isSearchingImages && (
                    <span className="text-[10px] text-blue-500 animate-pulse font-medium">Searching suggestions...</span>
                  )}
                </div>
                <input 
                  type="url" 
                  value={itemForm.image}
                  onChange={(e) => setItemForm({ ...itemForm, image: e.target.value })}
                  placeholder="Paste custom image URL or select a suggestion below..."
                  className={`w-full border rounded-xl px-3.5 py-2 text-xs focus:outline-none ${
                    theme === 'dark' ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />

                {imageSuggestions.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Suggested Images (Click to select)</span>
                    <div className="grid grid-cols-4 gap-2">
                      {imageSuggestions.map((url, idx) => {
                        const isSelected = itemForm.image === url;
                        return (
                          <div 
                            key={idx}
                            onClick={() => setItemForm({ ...itemForm, image: url })}
                            className={`relative rounded-xl overflow-hidden aspect-video cursor-pointer border-2 transition ${
                              isSelected ? 'border-blue-500 shadow-md scale-95 shadow-blue-500/25' : 'border-slate-800 hover:border-slate-600'
                            }`}
                          >
                            <img src={url} alt="suggestion" className="w-full h-full object-cover" />
                            {isSelected && (
                              <div className="absolute inset-0 bg-blue-600/25 flex items-center justify-center">
                                <span className="bg-blue-600 text-white rounded-full p-0.5 text-[8px] font-bold">✓</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    {(!(import.meta as any).env?.VITE_UNSPLASH_ACCESS_KEY && !(import.meta as any).env?.VITE_IMAGE_SEARCH_API_KEY) && (
                      <p className="text-[9px] text-slate-500 italic mt-1 leading-normal">
                        💡 Live search keys missing. To enable live web results, add <b>VITE_UNSPLASH_ACCESS_KEY</b> to your environment. Showing matches based on item tags.
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold">Price (₹)</label>
                  <input 
                    type="number" 
                    required
                    value={itemForm.price}
                    onChange={(e) => setItemForm({ ...itemForm, price: Number(e.target.value) })}
                    className={`w-full border rounded-xl px-3.5 py-2 text-xs focus:outline-none ${
                      theme === 'dark' ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold">Category (Auto Image Default)</label>
                  <select 
                    value={itemForm.category}
                    onChange={(e) => setItemForm({ ...itemForm, category: e.target.value })}
                    className={`w-full border rounded-xl px-3.5 py-2 text-xs focus:outline-none ${
                      theme === 'dark' ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  >
                    <option value="South Indian">South Indian</option>
                    <option value="Fast Food">Fast Food</option>
                    <option value="Beverages">Beverages</option>
                    <option value="Main Course">Main Course</option>
                    <option value="Snacks">Snacks</option>
                    <option value="Desserts">Desserts</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold">Description</label>
                <textarea 
                  rows={2}
                  value={itemForm.description}
                  onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
                  className={`w-full border rounded-xl px-3.5 py-2 text-xs focus:outline-none ${
                    theme === 'dark' ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              {/* Daily Stock Limit & Current Remaining Stock */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold">Daily Stock Limit</label>
                  <input 
                    type="number" 
                    placeholder="Unlimited"
                    value={itemForm.stockLimit}
                    onChange={(e) => setItemForm({ ...itemForm, stockLimit: e.target.value })}
                    className={`w-full border rounded-xl px-3.5 py-2 text-xs focus:outline-none ${
                      theme === 'dark' ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold">Remaining Stock</label>
                  <input 
                    type="number" 
                    placeholder="Unlimited"
                    value={itemForm.stockRemaining}
                    onChange={(e) => setItemForm({ ...itemForm, stockRemaining: e.target.value })}
                    className={`w-full border rounded-xl px-3.5 py-2 text-xs focus:outline-none ${
                      theme === 'dark' ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              <div className={`p-3 rounded-2xl border space-y-3 ${
                theme === 'dark' ? 'bg-slate-900/80 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <label className="flex items-center gap-2 text-xs cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={itemForm.isSpecial}
                    onChange={(e) => setItemForm({ ...itemForm, isSpecial: e.target.checked })}
                  />
                  <span className="font-bold text-amber-500 flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 fill-amber-500" />
                    <span>Mark as "Today's Special 🌟"</span>
                  </span>
                </label>

                <hr className={theme === 'dark' ? 'border-slate-850' : 'border-slate-200'} />

                <label className="flex items-center gap-2 text-xs cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={itemForm.isSoldOut}
                    onChange={(e) => setItemForm({ ...itemForm, isSoldOut: e.target.checked })}
                  />
                  <span className="font-bold text-red-500 flex items-center gap-1">
                    <Ban className="w-3.5 h-3.5 text-red-500" />
                    <span>Force "Sold Out" status override</span>
                  </span>
                </label>
              </div>

              <button 
                type="submit"
                className="w-full bg-gradient-to-r from-blue-700 to-emerald-600 text-white font-extrabold py-3 rounded-xl text-xs"
              >
                Save Food Item to Database
              </button>
            </form>
          </div>
        </div>
      )}

      {/* CART & CHECKOUT MODALS */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className={`w-full max-w-md border-l p-6 flex flex-col justify-between space-y-4 shadow-2xl ${
            theme === 'dark' ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <h2 className="font-bold font-heading text-lg flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-emerald-500" />
                  <span>Cart ({totalItemsCount})</span>
                </h2>
                <button onClick={() => setIsCartOpen(false)} className="text-slate-400 hover:text-slate-700"><X className="w-5 h-5" /></button>
              </div>

              {cart.map(item => (
                <div key={item.id} className={`p-3 rounded-xl flex items-center justify-between border ${
                  theme === 'dark' ? 'glass-card border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div>
                    <h4 className="font-bold text-xs">{item.name}</h4>
                    <div className="flex items-center gap-2">
                      {item.originalPrice > item.discountedPrice && (
                        <span className="text-[11px] text-slate-500 line-through">₹{item.originalPrice}</span>
                      )}
                      <span className="text-xs font-bold text-emerald-500">₹{item.discountedPrice} each</span>
                    </div>
                  </div>
                  <div className={`flex items-center gap-2 border px-2 py-1 rounded-lg text-xs font-bold ${
                    theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-300'
                  }`}>
                    <button onClick={() => updateQty(item.id, -1)}><Minus className="w-3 h-3 text-slate-400" /></button>
                    <span className="px-1">{item.qty}</span>
                    <button onClick={() => updateQty(item.id, 1)}><Plus className="w-3 h-3 text-slate-400" /></button>
                  </div>
                </div>
              ))}
            </div>

            {cart.length > 0 && (
              <div className="space-y-3 pt-4 border-t border-slate-800">
                <div className="flex justify-between font-bold text-sm">
                  <span>Grand Total</span>
                  <span className="text-emerald-500 font-extrabold">₹{cartSubtotal + 15}</span>
                </div>
                <button 
                  onClick={handleStartCheckout}
                  className="w-full bg-gradient-to-r from-blue-700 to-emerald-600 text-white font-bold py-3 rounded-xl text-sm"
                >
                  Pay via {currentCheckoutShop.name}'s UPI &rarr;
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CHECKOUT MODAL */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className={`w-full max-w-lg p-6 rounded-3xl space-y-5 shadow-2xl relative border max-h-[90vh] overflow-y-auto ${
            theme === 'dark' ? 'glass-panel border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="font-extrabold font-heading text-lg">Online UPI Checkout — {currentCheckoutShop.name}</h3>
                <p className="text-xs text-slate-400">Shop UPI VPA: <span className="text-emerald-500 font-mono">{currentCheckoutShop.upiId}</span></p>
              </div>
              <button onClick={() => setIsCheckoutOpen(false)} className="text-slate-400 hover:text-slate-700"><X className="w-5 h-5" /></button>
            </div>

            <div className={`border p-4 rounded-2xl text-center space-y-3 ${
              theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <span className="text-xs font-semibold text-emerald-400">Scan Shop's Official UPI QR Code with any UPI App</span>
              <div className="w-48 h-48 bg-white p-2.5 rounded-xl mx-auto flex items-center justify-center shadow-lg border-2 border-blue-600/20">
                <img 
                  src={currentCheckoutShop.qrImageUrl} 
                  alt="Shop Payment QR" 
                  className="w-full h-full object-contain"
                />
              </div>
              <p className="text-[11px] text-slate-400">Scan via GPay / PhonePe / Paytm / BHIM</p>
            </div>

            <button 
              onClick={handleStartPaymentVerification}
              disabled={isPlacingPendingOrder}
              className={`w-full font-extrabold py-3.5 rounded-2xl text-sm shadow-xl shadow-blue-700/30 transition-all flex items-center justify-center gap-2 ${
                isPlacingPendingOrder 
                  ? 'bg-slate-700 text-slate-400 cursor-not-allowed shadow-none' 
                  : 'bg-gradient-to-r from-blue-700 to-emerald-600 text-white hover:opacity-95'
              }`}
            >
              {isPlacingPendingOrder ? (
                <>
                  <span className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></span>
                  <span>Placing Pending Order...</span>
                </>
              ) : (
                `Verify Payment & Place Order (₹${cartSubtotal + 15}) →`
              )}
            </button>
          </div>
        </div>
      )}

      {/* ONLINE PAYMENT GATEWAY VERIFICATION MODAL */}
      {isPayingGateway && (() => {
        const upiUrl = `upi://pay?pa=${currentCheckoutShop.upiId}&pn=${encodeURIComponent(currentCheckoutShop.name)}&am=${cartSubtotal + 15}&tn=${pendingOrderId}&tr=${pendingOrderId}`;
        const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=10&data=${encodeURIComponent(upiUrl)}`;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-fadeIn">
            <div className={`w-full max-w-md p-6 rounded-3xl space-y-6 shadow-2xl border text-center max-h-[90vh] overflow-y-auto ${
              theme === 'dark' ? 'glass-panel border-blue-500/40 text-white' : 'bg-white border-blue-200 text-slate-900 shadow-blue-300/50'
            }`}>
              <div className="space-y-2">
                <Smartphone className="w-12 h-12 mx-auto text-blue-500 animate-pulse" />
                <h3 className="text-xl font-extrabold font-heading">UPI Mobile Checkout</h3>
                <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                  Amount: <span className="font-bold text-emerald-500">₹{cartSubtotal + 15}</span> • Order: <span className="font-mono">{pendingOrderId}</span>
                </p>
              </div>

              {gatewayStatus === 'waiting' && (
                <div className="space-y-5 py-2">
                  {/* Dynamic QR Code generation for the UPI intent */}
                  <div className="w-48 h-48 bg-white p-2 rounded-2xl mx-auto shadow-md border border-slate-200 flex items-center justify-center">
                    <img 
                      src={checkoutQrDataUrl || qrCodeUrl} 
                      alt="UPI Payment QR" 
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400">Scan this QR code with GPay, PhonePe, Paytm, or BHIM to pay</p>
                  
                  {/* Deep-link button for mobile devices */}
                  <a 
                    href={upiUrl}
                    className="inline-flex w-full items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-2xl text-xs shadow-md transition-transform active:scale-[0.98]"
                  >
                    <span>⚡ Pay via UPI App</span>
                  </a>

                  {/* UTR reference submission block */}
                  <div className="space-y-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                    <div className="text-left space-y-1">
                      <label className="text-xs font-bold text-slate-400">Enter 12-Digit Transaction UTR / Ref No.</label>
                      <input 
                        type="text"
                        maxLength={12}
                        value={userUtrInput}
                        onChange={(e) => setUserUtrInput(e.target.value.replace(/\D/g, ''))}
                        placeholder="e.g. 620312048596"
                        className={`w-full px-4 py-3 rounded-2xl border text-sm font-semibold transition ${
                          theme === 'dark' 
                            ? 'bg-slate-900 border-slate-800 focus:border-blue-500 text-white' 
                            : 'bg-slate-50 border-slate-200 focus:border-blue-500 text-slate-900'
                        }`}
                      />
                    </div>

                    <button 
                      onClick={() => handleSubmitUtrPayment(userUtrInput)}
                      disabled={userUtrInput.length !== 12}
                      className={`w-full font-bold py-3 rounded-2xl text-xs transition ${
                        userUtrInput.length === 12
                          ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                          : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                      }`}
                    >
                      Verify & Place Order
                    </button>
                  </div>
                </div>
              )}

              {gatewayStatus === 'success' && (
                <div className="space-y-3 py-4 text-emerald-500 animate-scaleIn">
                  <Check className="w-12 h-12 mx-auto bg-emerald-500/20 rounded-full p-2.5 border border-emerald-500/40 animate-ping" />
                  <h4 className="font-bold text-sm">🎉 Confirming payment...</h4>
                  <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Generating secure receipt & collection token from server...</p>
                </div>
              )}

              {gatewayStatus === 'failed' && (
                <div className="space-y-4 py-4 text-red-500">
                  <AlertCircle className="w-12 h-12 mx-auto text-red-500" />
                  <h4 className="font-bold text-sm">Payment Verification Failed</h4>
                  <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>{gatewayError}</p>
                  
                  <button 
                    onClick={() => {
                      setGatewayStatus('waiting');
                      setGatewayError(null);
                    }}
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 rounded-xl text-xs transition mt-2"
                  >
                    Retry Verification 🔄
                  </button>
                </div>
              )}

              <button 
                onClick={handleGatewayCancel}
                disabled={gatewayStatus === 'success'}
                className={`w-full py-2.5 rounded-xl text-xs font-bold transition border ${
                  theme === 'dark' ? 'bg-slate-900 hover:bg-slate-800 text-slate-400 border-slate-800' : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                }`}
              >
                {gatewayStatus === 'success' ? 'Loading...' : 'Cancel & Go Back'}
              </button>
            </div>
          </div>
        );
      })()}

      {/* QR SCAN FRESH RECEIPT & HANDOVER POPUP MODAL */}
      {scanResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
          <div className={`w-full max-w-lg p-6 rounded-3xl space-y-5 shadow-2xl relative border max-h-[90vh] overflow-y-auto ${
            theme === 'dark' ? 'glass-panel border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className={`flex items-center justify-between pb-3 border-b ${theme === 'dark' ? 'border-slate-800' : 'border-slate-200'}`}>
              <h3 className="font-extrabold font-heading text-lg">
                {scanResult.success ? '🧾 Order Verification Receipt' : '🚫 Scan Verification Failed'}
              </h3>
              <button onClick={() => setScanResult(null)} className="text-slate-400 hover:text-slate-700"><X className="w-5 h-5" /></button>
            </div>

            {scanResult.success ? (
              <div className="space-y-4">
                <div className={`border p-3 rounded-2xl text-center space-y-0.5 ${
                  theme === 'dark' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                }`}>
                  <h4 className="font-bold text-xs flex items-center justify-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    Order Handover Successful!
                  </h4>
                  <p className={`text-[10px] ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Marked as completed & disabled QR token</p>
                </div>

                <div className="flex flex-col items-center space-y-3">
                  <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-white shadow-lg p-2 max-w-full">
                    {receiptImgSrc ? (
                      <img 
                        src={receiptImgSrc} 
                        alt="Order Receipt" 
                        className="max-h-[350px] object-contain rounded-xl w-full"
                      />
                    ) : (
                      <div className="p-10 text-center text-slate-400">Loading receipt...</div>
                    )}
                  </div>
                  {receiptImgSrc && (
                    <a 
                      href={receiptImgSrc} 
                      download={`receipt-${scanResult.orderId}.png`} 
                      className="w-full text-center bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors shadow-md shadow-emerald-950/20"
                    >
                      Download Receipt Image 📥
                    </a>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className={`border p-4 rounded-2xl text-center space-y-2 ${
                  theme === 'dark' ? 'bg-red-950/60 border-red-500/40 text-red-400' : 'bg-red-50 border-red-200 text-red-700'
                }`}>
                  <AlertTriangle className="w-10 h-10 mx-auto text-red-500 animate-bounce" />
                  <h4 className="font-bold text-sm">Access Denied & Token Blocked</h4>
                  <p className={`text-xs leading-relaxed ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>{scanResult.message}</p>
                </div>

                <div className={`p-3.5 rounded-xl border text-[11px] leading-relaxed space-y-1 ${
                  theme === 'dark' 
                    ? 'bg-slate-900/40 border-slate-800 text-slate-400' 
                    : 'bg-slate-50 border-slate-200 text-slate-600'
                }`}>
                  <span className={`font-bold block ${theme === 'dark' ? 'text-red-400' : 'text-red-600'}`}>Safeguards enforced:</span>
                  <span>• Reused screenshots / tokens are automatically identified and rejected.</span>
                  <span>• Order must belong to this specific canteen shop.</span>
                  <span>• Verify order is in "Ready for Pickup" status before verification.</span>
                </div>
              </div>
            )}

            <button 
              onClick={() => setScanResult(null)}
              className="w-full bg-gradient-to-r from-blue-700 to-emerald-600 text-white font-bold py-2.5 rounded-xl text-xs"
            >
              Dismiss Verification Receipt
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
