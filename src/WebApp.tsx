import React, { useState, useEffect, useRef } from 'react';
import { 
  ShoppingBag, Search, Clock, MapPin, CheckCircle2, ChevronRight, 
  Sparkles, QrCode, ArrowLeft, Plus, Minus, CreditCard, Smartphone,
  Utensils, Store, User, Bell, Flame, Filter, RefreshCw, X, ShieldCheck,
  Camera, Lock, Edit3, Trash2, Calendar, AlertCircle, LogOut, Check, Upload,
  Users, Shield, BarChart3, AlertTriangle, Key, Mail, Eye, EyeOff, LogIn, DollarSign,
  Video, VideoOff, Sun, Moon, Globe, Star, Share2, Copy, TrendingUp
} from 'lucide-react';
import confetti from 'canvas-confetti';
import kprLogo from './assets/logo.png';
import { 
  UserAccount, UserRole, SUPER_ADMIN_EMAIL, SUPER_ADMIN_PASSWORD,
  authenticateUser, registerCustomer, createShopkeeperAccount, deactivateShopkeeper, getAllShopkeepers 
} from './services/auth';
import {
  createOrder as createOrderApi,
  markFoodReady as markFoodReadyApi,
  markAsPaidByShopkeeper as markAsPaidByShopkeeperApi,
  verifyAndProcessQrHandover as verifyAndProcessQrHandoverApi,
  OrderDoc, PaymentStatus, PaymentMethod, QrHandoverResult
} from './services/orders';
import {
  ShopAccount, FoodItem, loadShops, saveShops, loadMenuItems, saveMenuItems,
  addOrUpdateShopAccount, deleteShopAccount, addOrUpdateFoodItem, deleteFoodItemById,
  fetchShopsFromSupabase, fetchMenuItemsFromSupabase, getCategoryDefaultImage, toggleSpecialStatus
} from './services/shopsAndMenu';
import { LanguageCode, getSavedLanguage, saveLanguage, t } from './services/i18n';

interface CartItem extends FoodItem {
  qty: number;
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
  status: 'Order Confirmed' | 'Being Prepared' | 'Food Ready' | 'Completed';
  createdAt: string;
  estimatedMinutes: number;
  qrToken: string;
  handedOverAt?: string;
  payeeUpiId: string;
  payeeQrUrl?: string;
}

export default function WebApp() {
  // Theme State (Persisted in localStorage with System fallback)
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
  const [cart, setCart] = useState<CartItem[]>([]);
  const [ordersHistory, setOrdersHistory] = useState<Order[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>('Online UPI');
  const [currentOrder, setCurrentOrder] = useState<Order | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<string>(new Date().toLocaleTimeString());

  // Real-Time Event Listener & Cloud Database Hydration
  useEffect(() => {
    fetchShopsFromSupabase().then(dbShops => setShops(dbShops));
    fetchMenuItemsFromSupabase().then(dbMenu => setMenuItems(dbMenu));

    const handleSync = async () => {
      const dbShops = await fetchShopsFromSupabase();
      const dbMenu = await fetchMenuItemsFromSupabase();
      setShops(dbShops);
      setMenuItems(dbMenu);
      setLastSyncTime(new Date().toLocaleTimeString());
    };

    window.addEventListener('storage', handleSync);
    window.addEventListener('hunger_shops_updated', handleSync);
    window.addEventListener('hunger_menu_updated', handleSync);
    window.addEventListener('focus', handleSync);

    return () => {
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('hunger_shops_updated', handleSync);
      window.removeEventListener('hunger_menu_updated', handleSync);
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
  const [newShopkeeperShopId, setNewShopkeeperShopId] = useState('shop-new');
  const [newShopName, setNewShopName] = useState('');

  // Camera QR Scanner State
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<QrHandoverResult | null>(null);
  const [simulatedQrInput, setSimulatedQrInput] = useState('');
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  // Prep progress simulation
  const [prepProgress, setPrepProgress] = useState(25);

  useEffect(() => {
    let interval: any;
    if (currentOrder && currentOrder.status === 'Being Prepared') {
      interval = setInterval(() => {
        setPrepProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            setCurrentOrder(o => o ? { ...o, status: 'Food Ready' } : null);
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
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) {
        return prev.map(i => i.id === item.id ? { ...i, qty: i.qty + 1 } : i);
      }
      return [...prev, { ...item, qty: 1 }];
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

  const cartTotal = cart.reduce((acc, item) => acc + item.price * item.qty, 0);
  const totalItemsCount = cart.reduce((acc, item) => acc + item.qty, 0);

  const currentCheckoutShop = cart.length > 0 ? shops.find(s => s.id === cart[0].shopId) || shops[0] : shops[0];

  // AUTH SUBMISSION WITH SUPER ADMIN REDIRECT
  const handleAuthSubmit = async (e?: React.FormEvent, directEmail?: string, directPassword?: string, directShopId?: string) => {
    if (e) e.preventDefault();
    setAuthError(null);

    const targetEmail = (directEmail || authEmail || '').trim().toLowerCase();
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

  // UNIQUE PER-ORDER PLACEMENT WITH CRYPTOGRAPHIC TOKEN GENERATION
  const handlePlaceOrder = async () => {
    if (cart.length === 0) return;
    const targetShop = currentCheckoutShop;
    const isOnline = selectedPaymentMethod === 'Online UPI';

    const apiRes = await createOrderApi({
      shopId: targetShop.id,
      items: cart.map(i => ({ id: i.id, name: i.name, price: i.price, qty: i.qty })),
      grandTotal: cartTotal + 15,
      paymentMethod: selectedPaymentMethod,
      isOnlineVerified: isOnline
    });

    const orderId = apiRes.orderId;
    const uniqueQrToken = apiRes.qrToken;

    const newOrder: Order = {
      id: orderId,
      shopId: targetShop.id,
      shopName: targetShop.name,
      customerId: currentUser?.id || 'guest-1',
      customerName: currentUser?.name || 'Student Customer',
      items: [...cart],
      grandTotal: cartTotal + 15,
      paymentMethod: selectedPaymentMethod,
      paymentStatus: apiRes.paymentStatus,
      transactionId: apiRes.transactionId,
      paidAt: apiRes.paymentStatus === 'Paid' ? new Date().toLocaleTimeString() : undefined,
      status: 'Order Confirmed',
      createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
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

    setTimeout(() => {
      setCurrentOrder(prev => prev ? { ...prev, status: 'Being Prepared' } : null);
    }, 3500);
  };

  // SHOPKEEPER MANUAL CASH PAYMENT OVERRIDE
  const handleMarkOrderPaidCash = async (orderIdToPay: string) => {
    const ownerName = currentUser?.name || 'Shop Owner';
    await markAsPaidByShopkeeperApi(orderIdToPay, ownerName);

    if (currentOrder && currentOrder.id === orderIdToPay) {
      const updated = {
        ...currentOrder,
        paymentStatus: 'Paid' as PaymentStatus,
        transactionId: `CASH-COLLECTED-BY-${ownerName.toUpperCase()}`,
        paidAt: new Date().toLocaleTimeString()
      };
      setCurrentOrder(updated);
      setOrdersHistory(prev => prev.map(o => o.id === orderIdToPay ? updated : o));
    }

    setScanResult({
      success: true,
      message: `💵 Cash payment of ₹${currentOrder?.grandTotal || 0} collected! Order #${orderIdToPay} marked as PAID.`,
      paymentStatus: 'Paid',
      paymentMethod: 'Cash on Handover',
      transactionId: `CASH-COLLECTED-BY-${ownerName.toUpperCase()}`
    });
  };

  // QR AUTO HANDOVER ENGINE WITH UNPAID SAFEGUARDS & SINGLE-USE VALIDATION
  const processQrScanHandover = async (scannedRaw: string) => {
    setScanResult(null);
    const loggedInShopId = currentUser?.shopId || 'shop-1';
    const shopOwnerName = currentUser?.name || 'Canteen Manager';

    const apiRes = await verifyAndProcessQrHandoverApi(scannedRaw, loggedInShopId, shopOwnerName);
    
    if (apiRes.isUnpaidWarning) {
      setScanResult(apiRes);
      return;
    }

    if (!apiRes.success && (!currentOrder || currentOrder.id !== scannedRaw.trim())) {
      setScanResult(apiRes);
      return;
    }

    try {
      let parsed: any;
      try {
        parsed = JSON.parse(scannedRaw);
      } catch {
        parsed = { orderId: scannedRaw.trim() };
      }

      const orderIdScanned = parsed.orderId || parsed.id || scannedRaw.trim();

      if (!currentOrder || currentOrder.id !== orderIdScanned) {
        setScanResult({
          success: false,
          message: `Order #${orderIdScanned} not found in database.`
        });
        return;
      }

      if (currentUser?.role === 'shopkeeper' && currentOrder.shopId !== loggedInShopId) {
        setScanResult({
          success: false,
          message: `Access Denied: Order #${orderIdScanned} belongs to ${currentOrder.shopName}.`
        });
        return;
      }

      if (currentOrder.status === 'Completed') {
        setScanResult({
          success: false,
          message: `Order #${currentOrder.id} has ALREADY been marked as handed over! Reuse blocked.`,
          paymentStatus: currentOrder.paymentStatus,
          paymentMethod: currentOrder.paymentMethod,
          transactionId: currentOrder.transactionId
        });
        return;
      }

      if (currentOrder.status !== 'Food Ready') {
        setScanResult({
          success: false,
          message: `Cannot Handover: Order #${currentOrder.id} is currently '${currentOrder.status}'. It must be marked 'Food Ready' first.`,
          paymentStatus: currentOrder.paymentStatus,
          paymentMethod: currentOrder.paymentMethod,
          transactionId: currentOrder.transactionId
        });
        return;
      }

      if (currentOrder.paymentStatus !== 'Paid') {
        setScanResult({
          success: false,
          isUnpaidWarning: true,
          message: `⚠️ UNPAID ORDER SAFEGUARD: Order #${currentOrder.id} is NOT PAID (${currentOrder.paymentMethod}). Please collect cash before handing over food!`,
          paymentStatus: currentOrder.paymentStatus,
          paymentMethod: currentOrder.paymentMethod,
          transactionId: currentOrder.transactionId
        });
        return;
      }

      const timeHanded = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const updatedOrder = {
        ...currentOrder,
        status: 'Completed' as const,
        handedOverAt: timeHanded
      };

      setCurrentOrder(updatedOrder);
      setOrdersHistory(prev => prev.map(o => o.id === updatedOrder.id ? updatedOrder : o));

      setScanResult({
        success: true,
        message: `🎉 Order #${currentOrder.id} verified & marked as Handed Over at ${timeHanded}!`,
        paymentStatus: 'Paid',
        paymentMethod: currentOrder.paymentMethod,
        transactionId: currentOrder.transactionId
      });

      stopCameraScanner();

      confetti({
        particleCount: 90,
        spread: 70,
        origin: { y: 0.7 }
      });

    } catch (err: any) {
      setScanResult({
        success: false,
        message: `Scan Verification Failed: ${err.message || 'Invalid format'}`
      });
    }
  };

  // SUPER ADMIN 1: ADD NEW CANTEEN SHOP
  const handleAddShopkeeper = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await createShopkeeperAccount(newShopkeeperName, newShopkeeperEmail, newShopkeeperShopId);
      
      if (res.success) {
        const createdShopName = newShopName.trim() || `Canteen ${newShopkeeperName}`;
        const newShopObj: ShopAccount = {
          id: newShopkeeperShopId,
          name: createdShopName,
          email: newShopkeeperEmail,
          upiId: `${newShopkeeperShopId.replace(/[^a-zA-Z0-9]/g, '')}@okaxis`,
          qrImageUrl: `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=upi://pay?pa=${newShopkeeperShopId}@okaxis&pn=${encodeURIComponent(createdShopName)}`,
          rating: 5.0
        };

        const updatedShops = await addOrUpdateShopAccount(newShopObj);
        setShops(updatedShops);

        alert(`🎉 Success: Shopkeeper account & Canteen "${createdShopName}" saved to database!`);
        setIsAddShopkeeperOpen(false);
        setNewShopkeeperName('');
        setNewShopkeeperEmail('');
        setNewShopName('');
      } else {
        alert(`❌ Error: ${res.message || 'Failed to create shopkeeper account.'}`);
      }
    } catch (err: any) {
      alert(`❌ Error adding shop: ${err.message || 'Failed to complete request'}`);
    }
  };

  // SUPER ADMIN 2: DELETE CANTEEN SHOP
  const handleDeleteShop = async (shopId: string, shopName: string) => {
    if (confirm(`Are you sure you want to delete "${shopName}"? This will permanently remove the shop and all its menu items from the database.`)) {
      try {
        const { shops: updatedShops, menuItems: updatedMenu } = await deleteShopAccount(shopId);
        setShops(updatedShops);
        setMenuItems(updatedMenu);
        alert(`✅ Shop "${shopName}" and all associated menu items deleted!`);
      } catch (err: any) {
        alert(`❌ Failed to delete shop: ${err.message || 'Error occurred'}`);
      }
    }
  };

  // SHOPKEEPER 3: ADD OR EDIT FOOD ITEM (WITH FEATURE 6: CATEGORY-BASED AUTO DEFAULT IMAGE)
  const handleSaveFoodItem = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const activeShopId = currentUser?.shopId || 'shop-1';
      const activeShop = shops.find(s => s.id === activeShopId) || shops[0];

      // Auto-assign category default image if blank
      const finalImage = getCategoryDefaultImage(itemForm.category, itemForm.image);

      const itemToSave: FoodItem = editingItem ? {
        ...editingItem,
        ...itemForm,
        image: finalImage,
        id: editingItem.id, // Preserve ID on edit!
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
      alert(`✅ Food item "${itemToSave.name}" saved to database!`);
    } catch (err: any) {
      alert(`❌ Error saving food item: ${err.message || 'Failed to save'}`);
    }
  };

  // SHOPKEEPER 4: DELETE FOOD ITEM
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

  // FEATURE 4: TOGGLE TODAY'S SPECIAL DISH
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

  const activeShopForOwner = shops.find(s => s.id === (currentUser?.shopId || 'shop-1')) || shops[0];

  const triggerManualSync = async () => {
    const dbShops = await fetchShopsFromSupabase();
    const dbMenu = await fetchMenuItemsFromSupabase();
    setShops(dbShops);
    setMenuItems(dbMenu);
    setLastSyncTime(new Date().toLocaleTimeString());
  };

  // FEATURE 5: SALES & REVENUE ANALYTICS CALCULATIONS
  const targetShopOrders = ordersHistory.filter(o => currentUser?.role === 'super_admin' || o.shopId === activeShopForOwner.id);
  const totalSalesRevenue = targetShopOrders.filter(o => o.paymentStatus === 'Paid').reduce((sum, o) => sum + o.grandTotal, 0);
  const paidOrdersCount = targetShopOrders.filter(o => o.paymentStatus === 'Paid').length;
  const unpaidOrdersCount = targetShopOrders.filter(o => o.paymentStatus !== 'Paid').length;
  const completedHandoverCount = targetShopOrders.filter(o => o.status === 'Completed').length;

  // Best selling dishes calculation
  const dishSalesMap: Record<string, { name: string; qty: number; total: number }> = {};
  targetShopOrders.forEach(order => {
    order.items.forEach(item => {
      if (!dishSalesMap[item.name]) {
        dishSalesMap[item.name] = { name: item.name, qty: 0, total: 0 };
      }
      dishSalesMap[item.name].qty += item.qty;
      dishSalesMap[item.name].total += item.price * item.qty;
    });
  });

  const topSellingDishes = Object.values(dishSalesMap).sort((a, b) => b.qty - a.qty).slice(0, 5);

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
              className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition ${authTab === 'customer' ? 'bg-blue-700 text-white shadow-lg shadow-blue-700/25' : 'text-slate-400 hover:text-white'}`}
            >
              {t('customerLogin', currentLang)}
            </button>
            <button 
              onClick={() => {
                setAuthTab('shopkeeper');
                setAuthEmail('');
                setAuthPassword('');
              }}
              className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition ${authTab === 'shopkeeper' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/25' : 'text-slate-400 hover:text-white'}`}
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
              placeholder="Search dishes, drinks, canteens..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full border rounded-xl pl-9 pr-4 py-1.5 text-xs focus:outline-none focus:border-blue-500 transition ${
                theme === 'dark' ? 'bg-slate-900/90 border-slate-800 text-slate-200' : 'bg-slate-100 border-slate-300 text-slate-800'
              }`}
            />
          </div>

          <div className="flex items-center gap-2.5">
            
            {/* Language Selector */}
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

            {/* Vercel Link Share */}
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

            {/* Theme Toggle Button */}
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
                className={`px-3 py-1.5 rounded-lg transition ${activeTab === 'home' ? 'bg-blue-700 text-white font-semibold' : 'text-slate-400 hover:text-white'}`}
              >
                {t('overview', currentLang)}
              </button>
              <button 
                onClick={() => setActiveTab('menu')}
                className={`px-3 py-1.5 rounded-lg transition ${activeTab === 'menu' ? 'bg-blue-700 text-white font-semibold' : 'text-slate-400 hover:text-white'}`}
              >
                {t('fullMenu', currentLang)}
              </button>
              {currentOrder && (
                <button 
                  onClick={() => setActiveTab('tracking')}
                  className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${activeTab === 'tracking' ? 'bg-blue-700 text-white font-semibold' : 'text-slate-400 hover:text-white'}`}
                >
                  <span>{t('liveOrder', currentLang)}</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                </button>
              )}
            </div>
          )}

          {currentUser.role === 'shopkeeper' && (
            <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs px-3.5 py-1.5 rounded-xl font-bold flex items-center gap-2">
              <Store className="w-4 h-4 text-emerald-400" />
              <span>{t('shopkeeperDashboard', currentLang)} ({activeShopForOwner.name})</span>
            </span>
          )}

          {currentUser.role === 'super_admin' && (
            <span className="bg-purple-600/20 text-purple-300 border border-purple-500/40 text-xs px-3.5 py-1.5 rounded-xl font-bold flex items-center gap-2">
              <Shield className="w-4 h-4 text-purple-400" />
              <span>{t('superAdminDashboard', currentLang)}</span>
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
                <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-3 py-1 rounded-full text-xs font-semibold">
                  <Flame className="w-3.5 h-3.5 text-emerald-400" />
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
                      <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 font-bold group-hover:bg-blue-700 group-hover:text-white transition">
                        <Store className="w-5 h-5" />
                      </div>
                      <span className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] font-bold px-2 py-0.5 rounded-md">
                        ★ {shop.rating}
                      </span>
                    </div>

                    <div>
                      <h3 className="font-bold text-sm group-hover:text-blue-500 transition">{shop.name}</h3>
                      <p className="text-[11px] text-slate-400 font-mono mt-1">UPI: {shop.upiId}</p>
                    </div>

                    <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                      <span>Time-Slot Availability</span>
                      <span className="text-emerald-400 font-semibold group-hover:translate-x-1 transition flex items-center">
                        Menu &rarr;
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* FEATURED & TODAY'S SPECIAL DISHES */}
            <div className="space-y-4 pt-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold font-heading">{t('featuredDishes', currentLang)} ({filteredMenu.length})</h2>
                <span className="text-xs text-slate-400">Dynamically updated</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredMenu.slice(0, 6).map(item => {
                  const availableNow = isItemInTimeSlot(item);
                  return (
                    <div key={item.id} className={`rounded-2xl overflow-hidden flex flex-col justify-between group border relative transition ${
                      item.isSpecial ? 'border-amber-400/80 shadow-lg shadow-amber-400/10' :
                      theme === 'dark' ? 'glass-card border-slate-800' : 'bg-white border-slate-200 shadow-md'
                    }`}>
                      
                      {/* FEATURE 4: TODAY'S SPECIAL BADGE */}
                      {item.isSpecial && (
                        <div className="absolute top-3 right-3 z-20 bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-extrabold text-[10px] px-2.5 py-1 rounded-full shadow-lg flex items-center gap-1 animate-pulse">
                          <Star className="w-3.5 h-3.5 fill-slate-950" />
                          <span>{t('todaysSpecial', currentLang)}</span>
                        </div>
                      )}

                      <div>
                        <div className="relative h-44 overflow-hidden">
                          <img 
                            src={getCategoryDefaultImage(item.category, item.image)} 
                            alt={item.name}
                            className={`w-full h-full object-cover group-hover:scale-105 transition duration-500 ${!availableNow ? 'grayscale opacity-60' : ''}`} 
                          />
                          <div className="absolute top-3 left-3 bg-slate-900/90 backdrop-blur-md border border-slate-800 text-[11px] font-semibold text-slate-200 px-2.5 py-1 rounded-lg">
                            {item.shopName}
                          </div>
                          
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
                          <p className="font-heading font-extrabold text-lg">₹{item.price}</p>
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
                <Filter className="w-4 h-4 text-emerald-400" />
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
                          <span className="text-[10px] font-bold uppercase text-emerald-400 tracking-wider">{item.shopName}</span>
                          <span className="text-xs font-semibold text-emerald-400">★ {item.rating}</span>
                        </div>
                        <h3 className="font-bold text-sm">{item.name}</h3>
                        <p className="text-[11px] text-slate-400 line-clamp-2">{item.description}</p>
                        <p className="font-heading font-extrabold text-base pt-1">₹{item.price}</p>
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

        {/* SHOPKEEPER & SUPER ADMIN DASHBOARD */}
        {(currentUser.role === 'shopkeeper' || currentUser.role === 'super_admin') && (
          <div className="max-w-5xl mx-auto space-y-8 animate-fadeIn">
            
            {/* FEATURE 5: SALES & REVENUE ANALYTICS DASHBOARD */}
            <div className={`p-6 rounded-3xl border space-y-6 ${
              theme === 'dark' ? 'glass-panel border-emerald-500/40 bg-slate-900' : 'bg-white border-slate-200 shadow-xl'
            }`}>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-emerald-500/20 border border-emerald-500/40 rounded-2xl text-emerald-400">
                    <TrendingUp className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-extrabold font-heading">{t('salesAnalytics', currentLang)}</h3>
                    <p className="text-xs text-slate-400">Calculated from confirmed order transactions</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <select 
                    value={salesTimeFilter}
                    onChange={(e) => setSalesTimeFilter(e.target.value as any)}
                    className={`text-xs rounded-xl px-3 py-1.5 font-bold border focus:outline-none ${
                      theme === 'dark' ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-100 border-slate-300 text-slate-800'
                    }`}
                  >
                    <option value="today">Today's Sales</option>
                    <option value="week">This Week</option>
                    <option value="all">All Time</option>
                  </select>
                </div>
              </div>

              {/* KPI STAT CARDS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className={`p-4 rounded-2xl border space-y-1 ${theme === 'dark' ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                  <span className="text-xs text-slate-400">{t('totalRevenue', currentLang)}</span>
                  <p className="font-heading font-extrabold text-2xl text-emerald-400">₹{totalSalesRevenue}</p>
                  <p className="text-[11px] text-slate-400">{paidOrdersCount} Paid Orders</p>
                </div>

                <div className={`p-4 rounded-2xl border space-y-1 ${theme === 'dark' ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                  <span className="text-xs text-slate-400">{t('totalOrders', currentLang)}</span>
                  <p className="font-heading font-extrabold text-2xl text-blue-400">{targetShopOrders.length}</p>
                  <p className="text-[11px] text-slate-400">{completedHandoverCount} Handed Over</p>
                </div>

                <div className={`p-4 rounded-2xl border space-y-1 ${theme === 'dark' ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                  <span className="text-xs text-slate-400">Paid vs Unpaid</span>
                  <p className="font-heading font-extrabold text-xl text-emerald-400">
                    {paidOrdersCount} <span className="text-xs text-slate-400">Paid</span> / {unpaidOrdersCount} <span className="text-xs text-red-400">Unpaid</span>
                  </p>
                </div>

                <div className={`p-4 rounded-2xl border space-y-1 ${theme === 'dark' ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                  <span className="text-xs text-slate-400">Handover Rate</span>
                  <p className="font-heading font-extrabold text-2xl text-purple-400">
                    {targetShopOrders.length > 0 ? Math.round((completedHandoverCount / targetShopOrders.length) * 100) : 100}%
                  </p>
                </div>
              </div>

              {/* TOP SELLING DISHES RANKING */}
              <div className="space-y-3 pt-2">
                <h4 className="font-bold text-sm">{t('topSellingDishes', currentLang)}</h4>
                {topSellingDishes.length > 0 ? (
                  <div className="space-y-2">
                    {topSellingDishes.map((dish, idx) => (
                      <div key={dish.name} className={`p-3 rounded-xl flex items-center justify-between border text-xs ${
                        theme === 'dark' ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
                      }`}>
                        <div className="flex items-center gap-3">
                          <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-xs">
                            #{idx + 1}
                          </span>
                          <span className="font-bold">{dish.name}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-slate-400">{dish.qty} items sold</span>
                          <span className="font-extrabold text-emerald-400">₹{dish.total}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 py-3 text-center">Place orders to generate live sales ranking metrics!</p>
                )}
              </div>
            </div>

            {/* SHOPKEEPER FOOD MENU MANAGEMENT WITH SPECIAL TOGGLE & AUTO IMAGE */}
            {currentUser.role === 'shopkeeper' && (
              <div className={`p-6 rounded-3xl border space-y-4 ${
                theme === 'dark' ? 'glass-panel border-slate-800' : 'bg-white border-slate-200 shadow-xl'
              }`}>
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div>
                    <h3 className="font-extrabold font-heading text-base">{t('foodMenuManagement', currentLang)}</h3>
                    <p className="text-xs text-slate-400">Mark "Today's Special" or edit dishes</p>
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
                  {menuItems.filter(i => i.shopId === activeShopForOwner.id).map(item => (
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
                              <span className="bg-amber-400/20 text-amber-300 border border-amber-400/40 text-[9px] font-extrabold px-1.5 py-0.5 rounded">
                                🌟 Special
                              </span>
                            )}
                          </div>
                          <p className="text-xs font-extrabold text-blue-400">₹{item.price}</p>
                          <p className="text-[10px] text-slate-400">Slot: {item.availableFrom || '08:00'} - {item.availableUntil || '22:00'}</p>
                        </div>
                      </div>

                      <div className="flex flex-col justify-between items-end">
                        {/* FEATURE 4: TOGGLE TODAY'S SPECIAL BUTTON */}
                        <button 
                          onClick={() => handleToggleSpecial(item.id)}
                          className={`p-1.5 rounded-lg border text-[10px] font-bold transition flex items-center gap-1 ${
                            item.isSpecial 
                              ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md' 
                              : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                          }`}
                          title="Toggle Today's Special Flag"
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
            )}

          </div>
        )}

      </main>

      {/* FEATURE 2: VERCEL APP LINK SHARING & QR CODE MODAL */}
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
              <button onClick={() => setIsVercelModalOpen(false)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl text-center space-y-3">
              <span className="text-xs font-semibold text-slate-300">Scan QR Code on Mobile to Open Live App</span>
              <div className="w-48 h-48 bg-white p-3 rounded-2xl mx-auto flex items-center justify-center shadow-lg border-2 border-blue-600/20">
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(vercelAppUrl)}`} 
                  alt="Vercel App QR Code" 
                  className="w-full h-full object-contain"
                />
              </div>
              
              <div className="pt-2 flex items-center gap-2 bg-slate-950 border border-slate-800 p-2.5 rounded-xl">
                <span className="text-xs font-mono text-blue-400 truncate flex-1">{vercelAppUrl}</span>
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
              <button onClick={() => setIsItemModalOpen(false)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
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
                  className={`w-full border rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-blue-500 ${
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
                    className={`w-full border rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-blue-500 ${
                      theme === 'dark' ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold">Category (Auto Image Default)</label>
                  <select 
                    value={itemForm.category}
                    onChange={(e) => setItemForm({ ...itemForm, category: e.target.value })}
                    className={`w-full border rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-blue-500 ${
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
                <label className="text-xs font-semibold">Custom Image URL (Optional - Category Default applies if blank)</label>
                <input 
                  type="text" 
                  value={itemForm.image}
                  onChange={(e) => setItemForm({ ...itemForm, image: e.target.value })}
                  placeholder="https://images.unsplash.com/..."
                  className={`w-full border rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-blue-500 ${
                    theme === 'dark' ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold">Description</label>
                <textarea 
                  rows={2}
                  value={itemForm.description}
                  onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
                  className={`w-full border rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-blue-500 ${
                    theme === 'dark' ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div className="p-3 bg-slate-900/80 rounded-2xl border border-slate-800 space-y-3">
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={itemForm.isSpecial}
                    onChange={(e) => setItemForm({ ...itemForm, isSpecial: e.target.checked })}
                  />
                  <span className="font-bold text-amber-400 flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 fill-amber-400" />
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

    </div>
  );
}
