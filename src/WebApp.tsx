import React, { useState, useEffect, useRef } from 'react';
import { 
  ShoppingBag, Search, Clock, MapPin, CheckCircle2, ChevronRight, 
  Sparkles, QrCode, ArrowLeft, Plus, Minus, CreditCard, Smartphone,
  Utensils, Store, User, Bell, Flame, Filter, RefreshCw, X, ShieldCheck,
  Camera, Lock, Edit3, Trash2, Calendar, AlertCircle, LogOut, Check, Upload,
  Users, Shield, BarChart3, AlertTriangle, Key, Mail, Eye, EyeOff, LogIn, DollarSign,
  Video, VideoOff, Sun, Moon, Globe, Star, Share2, Copy, TrendingUp, Tag, Percent, Ban, RotateCcw
} from 'lucide-react';
import confetti from 'canvas-confetti';
import kprLogo from './assets/logo.png';
import { 
  UserAccount, UserRole, SUPER_ADMIN_EMAIL, SUPER_ADMIN_PASSWORD,
  authenticateUser, registerCustomer, createShopkeeperAccount
} from './services/auth';
import {
  createOrder as createOrderApi,
  markFoodReady as markFoodReadyApi,
  verifyAndProcessQrHandover as verifyAndProcessQrHandoverApi,
  acceptOrder as acceptOrderApi,
  cancelOrder as cancelOrderApi,
  OrderDoc, PaymentStatus, PaymentMethod, QrHandoverResult, OrderStatus
} from './services/orders';
import {
  ShopAccount, FoodItem, loadShops, saveShops, loadMenuItems, saveMenuItems,
  addOrUpdateShopAccount, deleteShopAccount, addOrUpdateFoodItem, deleteFoodItemById,
  fetchShopsFromSupabase, fetchMenuItemsFromSupabase, getCategoryDefaultImage, toggleSpecialStatus
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

export default function WebApp() {
  // Theme State
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    try {
      const saved = localStorage.getItem('hunger_theme_pref');
      if (saved === 'dark' || saved === 'light') return saved;
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    } catch {
      return 'dark';
    }
  });

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('hunger_theme_pref', nextTheme);
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
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);
  const [activeTab, setActiveTab] = useState<'home' | 'menu' | 'tracking' | 'owner' | 'admin'>('home');
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

  // Real-Time Event Listener & Cloud Database Hydration
  useEffect(() => {
    fetchShopsFromSupabase().then(dbShops => setShops(dbShops));
    fetchMenuItemsFromSupabase().then(dbMenu => setMenuItems(dbMenu));
    fetchDiscountsFromSupabase().then(dbDisc => setDiscounts(dbDisc));

    const handleSync = async () => {
      const dbShops = await fetchShopsFromSupabase();
      const dbMenu = await fetchMenuItemsFromSupabase();
      const dbDisc = await fetchDiscountsFromSupabase();
      setShops(dbShops);
      setMenuItems(dbMenu);
      setDiscounts(dbDisc);
      setLastSyncTime(new Date().toLocaleTimeString());
    };

    window.addEventListener('storage', handleSync);
    window.addEventListener('hunger_shops_updated', handleSync);
    window.addEventListener('hunger_menu_updated', handleSync);
    window.addEventListener('hunger_discounts_updated', handleSync);
    window.addEventListener('focus', handleSync);

    return () => {
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('hunger_shops_updated', handleSync);
      window.removeEventListener('hunger_menu_updated', handleSync);
      window.removeEventListener('hunger_discounts_updated', handleSync);
      window.removeEventListener('focus', handleSync);
    };
  }, []);

  // Auth Form State
  const [authTab, setAuthTab] = useState<'customer' | 'shopkeeper'>('customer');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);

  // Menu Editor Modal State
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<FoodItem | null>(null);
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
    isSpecial: false
  });

  // Shop Owner Settings State
  const [editingShopUpi, setEditingShopUpi] = useState('');
  const [editingShopQrUrl, setEditingShopQrUrl] = useState('');

  // Super Admin Add Shop & Shopkeeper State
  const [isAddShopkeeperOpen, setIsAddShopkeeperOpen] = useState(false);
  const [newShopkeeperName, setNewShopkeeperName] = useState('');
  const [newShopkeeperEmail, setNewShopkeeperEmail] = useState('');
  const [newShopkeeperShopId, setNewShopkeeperShopId] = useState(() => `shop-${Date.now()}`);
  const [newShopName, setNewShopName] = useState('');

  // Camera QR Scanner State
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<QrHandoverResult | null>(null);
  const [simulatedQrInput, setSimulatedQrInput] = useState('');
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  // Shopkeeper Dashboard Sub-Tab
  const [shopkeeperSubTab, setShopkeeperSubTab] = useState<'orders' | 'analytics'>('orders');

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

  // LIVE CAMERA ACCESS ENGINE (WebRTC getUserMedia)
  const startCameraScanner = async () => {
    setCameraError(null);
    setIsCameraActive(true);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access API is not supported on this browser or requires an HTTPS connection.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      });

      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err: any) {
      console.warn('[Camera] Permission or access error:', err);
      setCameraError(err.message || 'Camera access denied — please allow camera permissions in browser settings.');
      setIsCameraActive(false);
    }
  };

  const stopCameraScanner = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    setIsCameraActive(false);
  };

  useEffect(() => {
    return () => {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const isItemInTimeSlot = (item: FoodItem) => {
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

  // AUTH SUBMISSION WITH STRICT CASE-SENSITIVE SUPER ADMIN REDIRECT
  const handleAuthSubmit = async (e?: React.FormEvent, directEmail?: string, directPassword?: string, directShopId?: string) => {
    if (e) e.preventDefault();
    setAuthError(null);

    // Pass raw credentials without trimming or lowercasing beforehand for Super Admin check
    const targetEmail = directEmail || authEmail;
    const targetPassword = directPassword || authPassword;

    if (!targetEmail || !targetPassword) {
      setAuthError('Please enter both email address and password.');
      return;
    }

    const res = await authenticateUser(targetEmail, targetPassword, authTab);
    if (res.success && res.user) {
      const finalUser: UserAccount = {
        ...res.user,
        shopId: directShopId || res.user.shopId || 'shop-1'
      };
      setCurrentUser(finalUser);

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
  };

  const handleLogout = () => {
    stopCameraScanner();
    setCurrentUser(null);
    setActiveTab('home');
  };

  // UNIQUE PER-ORDER PLACEMENT WITH DISCOUNT PRESERVATION & STATUS: 'Pending'
  const handlePlaceOrder = async () => {
    if (cart.length === 0) return;
    const targetShop = currentCheckoutShop;
    const isOnline = selectedPaymentMethod === 'Online UPI';

    const grandTotal = cartSubtotal + 15;

    const apiRes = await createOrderApi({
      shopId: targetShop.id,
      items: cart.map(i => ({ id: i.id, name: i.name, price: i.discountedPrice, qty: i.qty })),
      grandTotal,
      paymentMethod: selectedPaymentMethod,
      isOnlineVerified: true // Enforced true because payment-before-navigation succeeded!
    });

    const orderId = apiRes.orderId;
    const uniqueQrToken = apiRes.qrToken;
    const createdAtTimestamp = apiRes.createdAt || Date.now();

    const newOrder: Order = {
      id: orderId,
      shopId: targetShop.id,
      shopName: targetShop.name,
      customerId: currentUser?.id || 'guest-1',
      customerName: currentUser?.name || 'Student Customer',
      items: [...cart],
      grandTotal,
      paymentMethod: selectedPaymentMethod,
      paymentStatus: 'Paid', // Enforced Paid
      transactionId: apiRes.transactionId,
      paidAt: new Date().toLocaleTimeString(),
      status: 'Pending',
      createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      createdAtTimestamp,
      estimatedMinutes: 12,
      qrToken: uniqueQrToken,
      payeeUpiId: targetShop.upiId,
      payeeQrUrl: targetShop.qrImageUrl
    };

    setCurrentOrder(newOrder);
    setOrdersHistory(prev => [newOrder, ...prev]);
    setCart([]);
    setIsCheckoutOpen(false);
    setIsCartOpen(false);
    setActiveTab('tracking');

    confetti({
      particleCount: 120,
      spread: 70,
      origin: { y: 0.6 }
    });
  };

  const handleStartPaymentVerification = () => {
    setIsPayingGateway(true);
    setGatewayStatus('waiting');
    setGatewayError(null);
  };

  const handleGatewaySuccess = async () => {
    setGatewayStatus('success');
    // Simulate server processing time (1.2 seconds)
    setTimeout(async () => {
      await handlePlaceOrder();
      setIsPayingGateway(false);
    }, 1200);
  };

  const handleGatewayFailure = () => {
    setGatewayStatus('failed');
    setGatewayError('❌ Transaction declined by issuing bank. Please check your UPI balance or choose a different app.');
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
  const processQrScanHandover = async (scannedRaw: string) => {
    setScanResult(null);
    const loggedInShopId = currentUser?.shopId || 'shop-1';
    const shopOwnerName = currentUser?.name || 'Canteen Manager';

    // Call server-side verification in order service
    const apiRes = await verifyAndProcessQrHandoverApi(scannedRaw, loggedInShopId, shopOwnerName);
    
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
      if (!newShopkeeperEmail || !newShopName) {
        alert('⚠️ Please fill in all required fields (Shopkeeper Email & Canteen Shop Name).');
        return;
      }

      // Generate unique targetShopId if empty or default 'shop-new' to prevent ID collisions
      const targetShopId = (newShopkeeperShopId.trim() && newShopkeeperShopId.trim() !== 'shop-new')
        ? newShopkeeperShopId.trim()
        : `shop-${Date.now()}`;

      const res = await createShopkeeperAccount(newShopkeeperName, newShopkeeperEmail, targetShopId);
      
      if (res.success) {
        const createdShopName = newShopName.trim();
        const newShopObj: ShopAccount = {
          id: targetShopId,
          name: createdShopName,
          email: newShopkeeperEmail.trim().toLowerCase(),
          upiId: `${targetShopId.replace(/[^a-zA-Z0-9]/g, '')}@okaxis`,
          qrImageUrl: `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=upi://pay?pa=${targetShopId}@okaxis&pn=${encodeURIComponent(createdShopName)}`,
          rating: 5.0
        };

        const updatedShops = await addOrUpdateShopAccount(newShopObj);
        setShops(updatedShops);

        alert(`🎉 Success: Canteen Shop "${createdShopName}" and Shopkeeper account (${newShopkeeperEmail}) saved to database!`);
        setIsAddShopkeeperOpen(false);
        setNewShopkeeperName('');
        setNewShopkeeperEmail('');
        setNewShopName('');
        setNewShopkeeperShopId(`shop-${Date.now()}`);
      } else {
        alert(`❌ Error: ${res.message || 'Failed to create shopkeeper account.'}`);
      }
    } catch (err: any) {
      alert(`❌ Error adding shop: ${err.message || 'Failed to complete request'}`);
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

      const itemToSave: FoodItem = editingItem ? {
        ...editingItem,
        ...itemForm,
        image: finalImage,
        id: editingItem.id,
        shopId: activeShop.id,
        shopName: activeShop.name
      } : {
        id: `m-${Date.now()}`,
        ...itemForm,
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
      isSpecial: false
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
      isSpecial: !!item.isSpecial
    });
    setIsItemModalOpen(true);
  };

  const categories = ['All', 'South Indian', 'Fast Food', 'Beverages', 'Main Course', 'Snacks', 'Desserts'];

  const filteredMenu = menuItems.filter(item => {
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
    const matchesShop = selectedShopId === 'all' || item.shopId === selectedShopId;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          item.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesShop && matchesSearch;
  });

  const activeShopForOwner = shops.find(s => s.id === (currentUser?.shopId || 'shop-1')) || {
    id: currentUser?.shopId || 'shop-1',
    name: currentUser?.name ? `${currentUser.name}'s Canteen` : 'Campus Canteen',
    email: currentUser?.email || 'canteen@hunger.com',
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
    // Filter paid/completed orders for this shop
    const shopOrders = ordersHistory.filter(o => o.shopId === activeShopForOwner.id && o.paymentStatus === 'Paid');

    const totalRev = shopOrders.reduce((sum, o) => sum + o.grandTotal, 0);
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
      // Analyze hour
      const date = new Date(o.createdAtTimestamp);
      const hr = date.getHours() || 12;
      hourlySales[hr] = (hourlySales[hr] || 0) + o.grandTotal;

      const day = date.getDay();
      daySales[day] = (daySales[day] || 0) + o.grandTotal;

      o.items.forEach(i => {
        const cat = i.category || 'Fast Food';
        categorySales[cat] = (categorySales[cat] || 0) + (i.discountedPrice * i.qty);

        if (!itemSales[i.name]) {
          itemSales[i.name] = { name: i.name, qty: 0, revenue: 0, category: cat };
        }
        itemSales[i.name].qty += i.qty;
        itemSales[i.name].revenue += i.discountedPrice * i.qty;
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

    // AI generated insights
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
              <img src={kprLogo} alt="Hunger Logo" className="w-full h-full object-contain" />
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

          <form onSubmit={handleAuthSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold">{t('emailLabel', currentLang)}</label>
              <input 
                type="email" 
                required
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                placeholder="Enter email address..."
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

            <button 
              type="submit"
              className={`w-full text-white font-extrabold py-3.5 rounded-2xl text-xs shadow-xl transition transform active:scale-95 ${
                authTab === 'shopkeeper' ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/25' : 'bg-gradient-to-r from-blue-700 to-emerald-600 hover:opacity-95 shadow-blue-700/25'
              }`}
            >
              {t('loginButton', currentLang)} &rarr;
            </button>
          </form>

        </div>
      </div>
    );
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
              <img src={kprLogo} alt="Hunger Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-heading font-extrabold text-2xl tracking-tight gradient-text">{t('appTitle', currentLang)}</span>
                <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Active
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">Camera QR Auto Handover</p>
            </div>
          </div>

          <div className="flex-1 max-w-xs relative hidden sm:block">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input 
              type="text"
              placeholder="Search dishes, discounts, canteens..."
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
              title="Share Vercel App Link"
            >
              <Share2 className="w-4 h-4" />
              <span className="hidden md:inline">{t('copyVercelLink', currentLang)}</span>
            </button>

            <button 
              onClick={toggleTheme}
              className={`p-2 rounded-xl text-xs font-bold transition border ${
                theme === 'dark' ? 'bg-slate-900 hover:bg-slate-800 text-yellow-400 border-slate-800' : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
              }`}
              title="Toggle Light/Dark Theme"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-yellow-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
            </button>

            <button 
              onClick={triggerManualSync}
              className={`border p-2 rounded-xl text-xs transition flex items-center gap-1 ${
                theme === 'dark' ? 'bg-slate-900 border-slate-800 text-slate-300' : 'bg-slate-100 border-slate-300 text-slate-700'
              }`}
              title={`Last synced at ${lastSyncTime}`}
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
            <div className="flex items-center gap-1 sm:gap-2">
              <button 
                onClick={() => setActiveTab('home')}
                className={`px-3 py-1.5 rounded-lg transition ${activeTab === 'home' ? 'bg-blue-700 text-white font-semibold' : 'text-slate-400 hover:text-slate-700'}`}
              >
                {t('overview', currentLang)}
              </button>
              <button 
                onClick={() => setActiveTab('menu')}
                className={`px-3 py-1.5 rounded-lg transition ${activeTab === 'menu' ? 'bg-blue-700 text-white font-semibold' : 'text-slate-400 hover:text-slate-700'}`}
              >
                {t('fullMenu', currentLang)}
              </button>
              {currentOrder && (
                <button 
                  onClick={() => setActiveTab('tracking')}
                  className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${activeTab === 'tracking' ? 'bg-blue-700 text-white font-semibold' : 'text-slate-400 hover:text-slate-700'}`}
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
                  <span>Welcome to Hunger, {currentUser.name}!</span>
                </div>
                
                <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight">
                  Campus Canteen Food <span className="gradient-text">Zero Queue Waiting</span>
                </h1>
                
                <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
                  Place your order on Hunger, pay directly to the shopkeeper's UPI QR code with instant payment verification, and scan your collection QR code for auto handover.
                </p>

                <div className="flex flex-wrap gap-3 pt-2">
                  <button 
                    onClick={() => setActiveTab('menu')}
                    className="bg-gradient-to-r from-blue-700 to-emerald-600 hover:from-blue-800 hover:to-emerald-700 text-white font-bold px-6 py-3 rounded-xl shadow-lg shadow-blue-700/25 flex items-center gap-2 text-sm transition transform hover:-translate-y-0.5"
                  >
                    <span>Browse Menu & Order</span>
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
                  <span>Active Shop Discounts & Offers</span>
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
                <h2 className="text-xl font-bold font-heading">{t('canteenShops', currentLang)} ({shops.length})</h2>
                <span className="text-xs text-slate-400">Verified UPI QR Code Enabled</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {shops.map(shop => (
                  <div 
                    key={shop.id}
                    onClick={() => {
                      setSelectedShopId(shop.id);
                      setActiveTab('menu');
                    }}
                    className={`p-4 rounded-2xl cursor-pointer group space-y-3 border transition ${
                      theme === 'dark' ? 'glass-card border-slate-800 hover:border-blue-500' : 'bg-white border-slate-200 hover:border-blue-500 shadow-md'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500 font-bold group-hover:bg-blue-700 group-hover:text-white transition">
                        <Store className="w-5 h-5" />
                      </div>
                      <span className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 text-[11px] font-bold px-2 py-0.5 rounded-md">
                        ★ {shop.rating}
                      </span>
                    </div>

                    <div>
                      <h3 className="font-bold text-sm group-hover:text-blue-500 transition">{shop.name}</h3>
                      <p className="text-[11px] text-slate-400 font-mono mt-1">UPI: {shop.upiId}</p>
                    </div>

                    <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                      <span>Time-Slot Availability</span>
                      <span className="text-emerald-500 font-semibold group-hover:translate-x-1 transition flex items-center">
                        Menu &rarr;
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* FEATURED DISHES */}
            <div className="space-y-4 pt-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold font-heading">{t('featuredDishes', currentLang)} ({filteredMenu.length})</h2>
                <span className="text-xs text-slate-400">Dynamically updated</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredMenu.slice(0, 6).map(item => {
                  const availableNow = isItemInTimeSlot(item);
                  const { finalPrice, discountAmount, appliedOffer } = getDiscountedPrice(item, discounts);
                  const hasDiscount = discountAmount > 0;

                  return (
                    <div key={item.id} className={`rounded-2xl overflow-hidden flex flex-col justify-between group border relative transition ${
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
                            className={`w-full h-full object-cover group-hover:scale-105 transition duration-500 ${!availableNow ? 'grayscale opacity-60' : ''}`} 
                          />
                          
                          <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md backdrop-blur-md border ${availableNow ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-400' : 'bg-red-950/80 border-red-500/40 text-red-400'}`}>
                              {availableNow ? `Available (${item.availableFrom || '08:00'} - ${item.availableUntil || '22:00'})` : `Slot Closed`}
                            </span>
                          </div>
                        </div>

                        <div className="p-4 space-y-2">
                          <div className="flex items-center justify-between">
                            <h3 className="font-bold text-base group-hover:text-blue-500 transition">{item.name}</h3>
                            <span className={`w-3 h-3 rounded-full border ${item.isVeg ? 'border-emerald-500 bg-emerald-500/20' : 'border-red-500 bg-red-500/20'}`} />
                          </div>
                          <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">{item.description}</p>
                        </div>
                      </div>

                      <div className="p-4 pt-0 flex items-center justify-between border-t border-slate-800/60 mt-3">
                        <div>
                          <span className="text-xs text-slate-400">Price</span>
                          <div className="flex items-center gap-2">
                            {hasDiscount && (
                              <span className="text-xs text-slate-500 line-through">₹{item.price}</span>
                            )}
                            <span className="font-heading font-extrabold text-lg text-emerald-500">₹{finalPrice}</span>
                          </div>
                        </div>

                        <button 
                          disabled={!availableNow}
                          onClick={() => addToCart(item)}
                          className={`font-semibold px-4 py-2 rounded-xl text-xs transition flex items-center gap-1.5 ${
                            availableNow 
                              ? 'bg-blue-600/10 hover:bg-blue-600 text-blue-500 hover:text-white border border-blue-600/30 active:scale-95' 
                              : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                          }`}
                        >
                          <Plus className="w-4 h-4" />
                          <span>{availableNow ? t('addToCart', currentLang) : t('slotClosed', currentLang)}</span>
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
                <p className="text-xs text-slate-400">Time-slot availability & shop payment QR enabled</p>
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
                  <option value="all">All Canteens & Shops ({shops.length})</option>
                  {shops.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredMenu.map(item => {
                const inCart = cart.find(i => i.id === item.id);
                const availableNow = isItemInTimeSlot(item);
                const { finalPrice, discountAmount } = getDiscountedPrice(item, discounts);
                const hasDiscount = discountAmount > 0;

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

                    <div className="flex gap-4">
                      <img src={getCategoryDefaultImage(item.category, item.image)} alt={item.name} className={`w-24 h-24 rounded-xl object-cover ${!availableNow ? 'grayscale opacity-60' : ''}`} />
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase text-emerald-500 tracking-wider">{item.shopName}</span>
                          <span className="text-xs font-semibold text-emerald-500">★ {item.rating}</span>
                        </div>
                        <h3 className="font-bold text-sm">{item.name}</h3>
                        <p className="text-[11px] text-slate-400 line-clamp-2">{item.description}</p>
                        
                        <div className="flex items-center gap-2 pt-1">
                          {hasDiscount && (
                            <span className="text-xs text-slate-500 line-through">₹{item.price}</span>
                          )}
                          <span className="font-heading font-extrabold text-base text-emerald-500">₹{finalPrice}</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px]">
                      <span className={`px-2 py-0.5 rounded ${availableNow ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-500/30' : 'bg-red-950/80 text-red-400 border border-red-500/30'}`}>
                        {availableNow ? `Slot: ${item.availableFrom || '08:00'} - ${item.availableUntil || '22:00'}` : t('slotClosed', currentLang)}
                      </span>

                      {inCart ? (
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
                          + Add
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

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
                  {currentOrder.status === 'Completed' ? '✅ Food Handed Over!' : 
                   currentOrder.status === 'Cancelled' ? '❌ Order Cancelled' :
                   currentOrder.status === 'Ready for Pickup' ? '🍽️ Food is Ready — Please collect your order' :
                   currentOrder.status === 'Accepted' ? '🍳 Kitchen is Preparing Your Meal...' :
                   '⏳ Order Placed — Waiting for Canteen Acceptance'}
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

                <div className="w-full bg-slate-900 rounded-full h-3 overflow-hidden p-0.5 border border-slate-800">
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
                <h3 className="font-bold text-sm border-b border-slate-800 pb-3">Real-time Order Status Flow</h3>

                <div className="space-y-6 relative before:absolute before:left-4 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-800">
                  <div className="flex items-start gap-4 relative z-10">
                    <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs font-bold">1</div>
                    <div>
                      <h4 className="font-bold text-sm">Order Placed</h4>
                      <p className="text-xs text-slate-400">Status: <span className="text-yellow-500 font-bold">{currentOrder.status}</span> • Payment: <span className="text-emerald-500 font-bold">{currentOrder.paymentStatus}</span></p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 relative z-10">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${['Accepted', 'Ready for Pickup', 'Completed'].includes(currentOrder.status) ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'}`}>2</div>
                    <div>
                      <h4 className="font-bold text-sm">Accepted & Preparing</h4>
                      <p className="text-xs text-slate-400">Accepted by canteen • Cancellation locked</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 relative z-10">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${['Ready for Pickup', 'Completed'].includes(currentOrder.status) ? 'bg-emerald-500 text-white animate-bounce' : 'bg-slate-800 text-slate-400'}`}>3</div>
                    <div>
                      <h4 className="font-bold text-sm">🍽️ Food is Ready — Please collect your order</h4>
                      <p className="text-xs text-slate-400">Show QR code below to shopkeeper</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* UNIQUE SINGLE-USE QR CODE */}
              {currentOrder.status !== 'Cancelled' && (
                <div className={`p-6 rounded-3xl border text-center space-y-4 ${
                  theme === 'dark' ? 'glass-card border-slate-800' : 'bg-white border-slate-200 shadow-xl'
                }`}>
                  <div className="inline-flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl text-xs text-slate-300">
                    <QrCode className="w-4 h-4 text-emerald-400" />
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
            
            {/* Tab Swapper */}
            <div className={`flex p-1.5 rounded-2xl border transition ${
              theme === 'dark' ? 'bg-slate-900 border-slate-800/80 text-white' : 'bg-slate-100 border-slate-300 text-slate-800 shadow-sm'
            }`}>
              <button 
                onClick={() => setShopkeeperSubTab('orders')}
                className={`flex-1 py-3 text-xs font-extrabold rounded-xl transition-all flex items-center justify-center gap-2 ${
                  shopkeeperSubTab === 'orders' 
                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30 transform scale-[1.02]' 
                    : 'text-slate-400 hover:text-slate-700'
                }`}
              >
                <ShoppingBag className="w-4 h-4" />
                <span>Orders & Canteen Menu</span>
              </button>
              <button 
                onClick={() => setShopkeeperSubTab('analytics')}
                className={`flex-1 py-3 text-xs font-extrabold rounded-xl transition-all flex items-center justify-center gap-2 ${
                  shopkeeperSubTab === 'analytics' 
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 transform scale-[1.02]' 
                    : 'text-slate-400 hover:text-slate-700'
                }`}
              >
                <TrendingUp className="w-4 h-4" />
                <span>Smart AI Sales Insights</span>
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
                      {isCameraActive ? (
                        <div className="space-y-3">
                          <div className="relative mx-auto rounded-xl overflow-hidden max-w-[280px] border-4 border-emerald-500/30 aspect-square flex items-center justify-center bg-black">
                            <video 
                              ref={videoRef} 
                              className="w-full h-full object-cover scale-x-[-1]" 
                            />
                            {/* Scanning Reticle */}
                            <div className="absolute inset-4 border-2 border-dashed border-emerald-400 animate-pulse rounded-lg pointer-events-none" />
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
                            <p className="text-[10px] text-slate-400 max-w-xs mx-auto">Access WebRTC scanner to verify customer collection receipt QR code instantly</p>
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
                          Copy the customer's QR Token or Order ID (e.g. `HUNGER-3456`) and paste it below to simulate verification without using a physical camera.
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
                      <div key={item.id} className={`p-4 rounded-2xl flex justify-between gap-3 border transition ${
                        item.isSpecial ? 'border-amber-400/80 shadow-md shadow-amber-400/10' :
                        theme === 'dark' ? 'glass-card border-slate-800' : 'bg-slate-50 border-slate-200'
                      }`}>
                        <div className="flex gap-3">
                          <img src={getCategoryDefaultImage(item.category, item.image)} alt={item.name} className="w-16 h-16 rounded-xl object-cover" />
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-bold text-xs">{item.name}</h4>
                              {item.isSpecial && (
                                <span className="bg-amber-400/20 text-amber-500 border border-amber-400/40 text-[9px] font-extrabold px-1.5 py-0.5 rounded">
                                  🌟 Special
                                </span>
                              )}
                            </div>
                            <p className="text-xs font-extrabold text-blue-500">₹{item.price}</p>
                            <p className="text-[10px] text-slate-400">Slot: {item.availableFrom || '08:00'} - {item.availableUntil || '22:00'}</p>
                          </div>
                        </div>

                        <div className="flex flex-col justify-between items-end">
                          <button 
                            onClick={() => handleToggleSpecial(item.id)}
                            className={`p-1.5 rounded-lg border text-[10px] font-bold transition flex items-center gap-1 ${
                              item.isSpecial 
                                ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md' 
                                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                            }`}
                          >
                            <Star className={`w-3 h-3 ${item.isSpecial ? 'fill-slate-950' : ''}`} />
                            <span>{item.isSpecial ? 'Special' : 'Mark Special'}</span>
                          </button>

                          <div className="flex items-center gap-1 pt-2">
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
                          <line x1="40" y1="20" x2="460" y2="20" stroke="#334155" strokeDasharray="3,3" />
                          <line x1="40" y1="70" x2="460" y2="70" stroke="#334155" strokeDasharray="3,3" />
                          <line x1="40" y1="120" x2="460" y2="120" stroke="#334155" strokeDasharray="3,3" />
                          <line x1="40" y1="150" x2="460" y2="150" stroke="#475569" strokeWidth="1.5" />
                          
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
                                      fill={p.rev > 0 ? '#3b82f6' : '#475569'} 
                                      stroke="#1e293b" 
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
                  <div key={s.id} className={`p-4 rounded-2xl flex items-center justify-between border ${
                    theme === 'dark' ? 'glass-card border-slate-800' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-sm">{s.name}</h4>
                        <span className="bg-purple-500/20 text-purple-400 text-[10px] font-bold px-2 py-0.5 rounded-md border border-purple-500/30 font-mono">
                          {s.id}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 font-mono">Owner Email: {s.email} • UPI: {s.upiId}</p>
                    </div>

                    <button 
                      onClick={() => handleDeleteShop(s.id, s.name)}
                      className="bg-red-950/60 hover:bg-red-900 border border-red-500/30 text-red-400 font-bold px-3.5 py-2 rounded-xl text-xs transition flex items-center gap-1.5"
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
          <div className={`w-full max-w-md p-6 rounded-3xl space-y-4 shadow-2xl relative border ${
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
                  value={newShopkeeperEmail}
                  onChange={(e) => setNewShopkeeperEmail(e.target.value)}
                  placeholder="e.g. owner@hunger.com"
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
          <div className={`w-full max-w-md p-6 rounded-3xl space-y-4 shadow-2xl relative border ${
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
          <div className={`w-full max-w-md p-6 rounded-3xl space-y-5 shadow-2xl relative border ${
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
                  onClick={() => setIsCheckoutOpen(true)}
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
          <div className={`w-full max-w-lg p-6 rounded-3xl space-y-5 shadow-2xl relative border ${
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
              className="w-full bg-gradient-to-r from-blue-700 to-emerald-600 text-white font-extrabold py-3.5 rounded-2xl text-sm shadow-xl shadow-blue-700/30"
            >
              Verify Payment & Place Order (₹{cartSubtotal + 15}) &rarr;
            </button>
          </div>
        </div>
      )}
      {/* ONLINE PAYMENT GATEWAY WEBHOOK SIMULATOR MODAL */}
      {isPayingGateway && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-fadeIn">
          <div className={`w-full max-w-md p-6 rounded-3xl space-y-6 shadow-2xl border text-center ${
            theme === 'dark' ? 'glass-panel border-blue-500/40 text-white' : 'bg-white border-blue-200 text-slate-900 shadow-blue-300/50'
          }`}>
            <div className="space-y-2">
              <Smartphone className="w-12 h-12 mx-auto text-blue-500 animate-pulse" />
              <h3 className="text-xl font-extrabold font-heading">Secure Online UPI Gateway</h3>
              <p className="text-xs text-slate-400">Processing transaction for ₹{cartSubtotal + 15} to VPA: {currentCheckoutShop.upiId}</p>
            </div>

            {gatewayStatus === 'waiting' && (
              <div className="space-y-4 py-4">
                <div className="flex items-center justify-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <p className="text-xs text-slate-300 font-semibold">Waiting for server verification of online payment...</p>
                <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800 text-[11px] text-slate-400 leading-relaxed">
                  📱 To complete the payment simulation: Tap **"Simulate Gateway Success"** or cancel to return.
                </div>
              </div>
            )}

            {gatewayStatus === 'success' && (
              <div className="space-y-3 py-4 text-emerald-400 animate-scaleIn">
                <Check className="w-12 h-12 mx-auto bg-emerald-500/20 rounded-full p-2.5 border border-emerald-500/40 animate-ping" />
                <h4 className="font-bold text-sm">🎉 Webhook Callback Verified!</h4>
                <p className="text-xs text-slate-400">Payment status: PAID. Confirming order creation...</p>
              </div>
            )}

            {gatewayStatus === 'failed' && (
              <div className="space-y-3 py-4 text-red-400">
                <AlertCircle className="w-12 h-12 mx-auto text-red-500" />
                <h4 className="font-bold text-sm">Payment Verification Failed</h4>
                <p className="text-xs text-slate-400">{gatewayError}</p>
              </div>
            )}

            <div className="space-y-2 pt-2">
              {gatewayStatus === 'waiting' && (
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    onClick={handleGatewaySuccess}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 rounded-xl text-xs transition"
                  >
                    Simulate Success ✅
                  </button>
                  <button 
                    onClick={handleGatewayFailure}
                    className="bg-red-600 hover:bg-red-500 text-white font-bold py-2.5 rounded-xl text-xs transition"
                  >
                    Simulate Failure ❌
                  </button>
                </div>
              )}

              {gatewayStatus === 'failed' && (
                <button 
                  onClick={() => setGatewayStatus('waiting')}
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 rounded-xl text-xs transition"
                >
                  Retry Simulation 🔄
                </button>
              )}

              <button 
                onClick={handleGatewayCancel}
                className={`w-full py-2.5 rounded-xl text-xs font-bold transition border ${
                  theme === 'dark' ? 'bg-slate-900 hover:bg-slate-800 text-slate-400 border-slate-800' : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                }`}
              >
                {gatewayStatus === 'success' ? 'Loading...' : 'Cancel & Go Back'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR SCAN FRESH RECEIPT & HANDOVER POPUP MODAL */}
      {scanResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
          <div className={`w-full max-w-lg p-6 rounded-3xl space-y-5 shadow-2xl relative border ${
            theme === 'dark' ? 'glass-panel border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-extrabold font-heading text-lg">
                {scanResult.success ? '🧾 Order Verification Receipt' : '🚫 Scan Verification Failed'}
              </h3>
              <button onClick={() => setScanResult(null)} className="text-slate-400 hover:text-slate-700"><X className="w-5 h-5" /></button>
            </div>

            {scanResult.success ? (
              <div className="space-y-4">
                <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 p-3.5 rounded-2xl text-center space-y-1">
                  <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-400" />
                  <h4 className="font-bold text-sm">Order Verification Successful!</h4>
                  <p className="text-[11px] text-slate-400">Marked as completed & disabled QR token in server database</p>
                </div>

                <div className={`p-4 rounded-2xl border space-y-3 ${
                  theme === 'dark' ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[10px]">CUSTOMER NAME</span>
                      <span className="font-bold">{scanResult.customerName || 'Student Customer'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">ORDER ID</span>
                      <span className="font-mono font-bold text-blue-500">{scanResult.orderId}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">PAYMENT METHOD</span>
                      <span className="font-bold">Online UPI (PAID)</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">TRANSACTION REFERENCE</span>
                      <span className="font-mono text-[10px] text-emerald-400 truncate block">{scanResult.transactionId}</span>
                    </div>
                  </div>

                  <div className="border-t border-slate-800/80 pt-2 space-y-2">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Items Summary</span>
                    {scanResult.items?.map((item: any, idx: number) => (
                      <div key={idx} className="flex justify-between text-xs font-medium">
                        <span>{item.qty}x {item.name}</span>
                        <span>₹{item.price * item.qty}</span>
                      </div>
                    ))}
                    <div className="border-t border-slate-800/60 pt-2 flex justify-between font-bold text-xs text-emerald-400">
                      <span>Total Invoice Bill</span>
                      <span>₹{scanResult.grandTotal}</span>
                    </div>
                  </div>
                </div>

                <p className="text-[10px] text-center text-slate-500 italic">
                  💡 This QR token has been marked as used. Duplicate scans will be blocked atomically.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-red-950/60 border border-red-500/40 text-red-400 p-4 rounded-2xl text-center space-y-2">
                  <AlertTriangle className="w-10 h-10 mx-auto text-red-500 animate-bounce" />
                  <h4 className="font-bold text-sm">Access Denied & Token Blocked</h4>
                  <p className="text-xs text-slate-300 leading-relaxed">{scanResult.message}</p>
                </div>

                <div className="bg-slate-900/40 p-3.5 rounded-xl border border-slate-800 text-[11px] text-slate-400 leading-relaxed space-y-1">
                  <span className="font-bold text-red-400 block">Safeguards enforced:</span>
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
