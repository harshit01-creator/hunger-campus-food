import React, { useState, useEffect, useRef } from 'react';
import { 
  ShoppingBag, Search, Clock, MapPin, CheckCircle2, ChevronRight, 
  Sparkles, QrCode, ArrowLeft, Plus, Minus, CreditCard, Smartphone,
  Utensils, Store, User, Bell, Flame, Filter, RefreshCw, X, ShieldCheck,
  Camera, Lock, Edit3, Trash2, Calendar, AlertCircle, LogOut, Check, Upload,
  Users, Shield, BarChart3, AlertTriangle, Key, Mail, Eye, EyeOff, LogIn, DollarSign,
  Video, VideoOff
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
  addOrUpdateShopAccount, deleteShopAccount, addOrUpdateFoodItem, deleteFoodItemById
} from './services/shopsAndMenu';

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
  // Navigation & Session State
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);
  const [activeTab, setActiveTab] = useState<'home' | 'menu' | 'tracking' | 'owner' | 'admin'>('home');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedShopId, setSelectedShopId] = useState<string>('all');
  const [location, setLocation] = useState('Hostel Block B — Room 204');

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

  // Real-Time Event Listener for Customer & Shopkeeper Dashboards
  useEffect(() => {
    const handleSync = () => {
      setShops(loadShops());
      setMenuItems(loadMenuItems());
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
  }>({
    name: '',
    category: 'Fast Food',
    price: 90,
    description: '',
    image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&auto=format&fit=crop&q=80',
    isVeg: true,
    isAvailable: true,
    availableFrom: '08:00',
    availableUntil: '22:00'
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

  // AUTH SUBMISSION
  const handleAuthSubmit = async (e?: React.FormEvent, directEmail?: string, directPassword?: string, directShopId?: string) => {
    if (e) e.preventDefault();
    setAuthError(null);

    const targetEmail = directEmail || authEmail;
    const targetPassword = directPassword || authPassword;

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

    // Server verification API
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

  // SUPER ADMIN 1: ADD NEW CANTEEN SHOP (IMMEDIATELY WRITES TO DB & REFLECTS ON CUSTOMER DASHBOARD)
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

        const updatedShops = addOrUpdateShopAccount(newShopObj);
        setShops(updatedShops);

        alert(`🎉 Success: Shopkeeper account & Canteen "${createdShopName}" created! Immediately visible on Customer Dashboard.`);
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

  // SUPER ADMIN 2: DELETE CANTEEN SHOP (DELETES FROM DB & REMOVES ALL ASSOCIATED DISHES)
  const handleDeleteShop = (shopId: string, shopName: string) => {
    if (confirm(`Are you sure you want to delete "${shopName}"? This will permanently remove the shop and all its menu items.`)) {
      try {
        const { shops: updatedShops, menuItems: updatedMenu } = deleteShopAccount(shopId);
        setShops(updatedShops);
        setMenuItems(updatedMenu);
        alert(`✅ Shop "${shopName}" and all associated menu items have been deleted!`);
      } catch (err: any) {
        alert(`❌ Failed to delete shop: ${err.message || 'Error occurred'}`);
      }
    }
  };

  // SHOPKEEPER 3: ADD OR EDIT FOOD ITEM (WRITES TO DB & REFLECTS ON CUSTOMER DASHBOARD)
  const handleSaveFoodItem = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const activeShopId = currentUser?.shopId || 'shop-1';
      const activeShop = shops.find(s => s.id === activeShopId) || shops[0];

      const itemToSave: FoodItem = editingItem ? {
        ...editingItem,
        ...itemForm,
        shopId: activeShop.id,
        shopName: activeShop.name
      } : {
        id: `m-${Date.now()}`,
        ...itemForm,
        rating: 4.8,
        prepTime: '10-12 mins',
        shopId: activeShop.id,
        shopName: activeShop.name
      };

      const updatedMenu = addOrUpdateFoodItem(itemToSave);
      setMenuItems(updatedMenu);

      setIsItemModalOpen(false);
      setEditingItem(null);
      alert(`✅ Food item "${itemToSave.name}" saved successfully! Visible on Customer Dashboard.`);
    } catch (err: any) {
      alert(`❌ Error saving food item: ${err.message || 'Failed to save'}`);
    }
  };

  // SHOPKEEPER 4: DELETE FOOD ITEM (DELETES FROM DB & DISAPPEARS EVERYWHERE)
  const handleDeleteItem = (id: string) => {
    const itemToDelete = menuItems.find(i => i.id === id);
    const itemName = itemToDelete ? itemToDelete.name : 'this item';
    if (confirm(`Are you sure you want to delete "${itemName}"?`)) {
      try {
        const updatedMenu = deleteFoodItemById(id);
        setMenuItems(updatedMenu);
        alert(`✅ Food item "${itemName}" deleted successfully!`);
      } catch (err: any) {
        alert(`❌ Error deleting food item: ${err.message || 'Failed to delete'}`);
      }
    }
  };

  const openAddItemModal = () => {
    setEditingItem(null);
    setItemForm({
      name: '',
      category: 'Fast Food',
      price: 90,
      description: '',
      image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&auto=format&fit=crop&q=80',
      isVeg: true,
      isAvailable: true,
      availableFrom: '08:00',
      availableUntil: '22:00'
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
      availableUntil: item.availableUntil || '22:00'
    });
    setIsItemModalOpen(true);
  };

  const categories = ['All', 'South Indian', 'Fast Food', 'Beverages', 'Main Course'];

  const filteredMenu = menuItems.filter(item => {
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
    const matchesShop = selectedShopId === 'all' || item.shopId === selectedShopId;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          item.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesShop && matchesSearch;
  });

  const activeShopForOwner = shops.find(s => s.id === (currentUser?.shopId || 'shop-1')) || shops[0];

  const triggerManualSync = () => {
    setShops(loadShops());
    setMenuItems(loadMenuItems());
    setLastSyncTime(new Date().toLocaleTimeString());
  };

  // UNAUTHENTICATED -> RENDER LOGIN SCREEN
  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 text-slate-100 selection:bg-blue-600">
        <div className="w-full max-w-lg glass-panel border border-slate-800 p-6 sm:p-8 rounded-3xl space-y-6 shadow-2xl relative animate-fadeIn">
          
          <div className="text-center space-y-2">
            <div className="w-16 h-16 logo-badge mx-auto mb-2">
              <img src={kprLogo} alt="Hunger Logo" className="w-full h-full object-contain" />
            </div>
            <h1 className="font-heading font-extrabold text-3xl sm:text-4xl gradient-text">Hunger</h1>
            <p className="text-xs text-slate-400">Campus Food Ordering & Camera QR Auto Handover Platform</p>
          </div>

          <div className="flex bg-slate-900/90 p-1.5 rounded-2xl border border-slate-800">
            <button 
              onClick={() => {
                setAuthTab('customer');
                setAuthEmail('');
                setAuthPassword('');
              }}
              className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition ${authTab === 'customer' ? 'bg-blue-700 text-white shadow-lg shadow-blue-700/25' : 'text-slate-400 hover:text-white'}`}
            >
              Customer Login
            </button>
            <button 
              onClick={() => {
                setAuthTab('shopkeeper');
                setAuthEmail('');
                setAuthPassword('');
              }}
              className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition ${authTab === 'shopkeeper' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/25' : 'text-slate-400 hover:text-white'}`}
            >
              Shopkeeper Login
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
              <label className="text-xs font-semibold text-slate-300">Email Address</label>
              <input 
                type="email" 
                required
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                placeholder="Enter your email address..."
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Password</label>
              <input 
                type="password" 
                required
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
              />
            </div>

            <button 
              type="submit"
              className={`w-full text-white font-extrabold py-3.5 rounded-2xl text-xs shadow-xl transition transform active:scale-95 ${
                authTab === 'shopkeeper' ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/25' : 'bg-gradient-to-r from-blue-700 to-emerald-600 hover:opacity-95 shadow-blue-700/25'
              }`}
            >
              Log In to Hunger & Open {authTab === 'shopkeeper' ? 'Shopkeeper' : 'Customer'} Dashboard &rarr;
            </button>
          </form>

        </div>
      </div>
    );
  }

  // LOGGED IN DASHBOARDS
  return (
    <div className="min-h-screen flex flex-col text-slate-100 selection:bg-blue-600 selection:text-white">
      
      {/* Top Header */}
      <header className="sticky top-0 z-40 glass-panel border-b border-slate-800/80 px-4 lg:px-8 py-3 transition-all">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('home')}>
            <div className="w-10 h-10 logo-badge">
              <img src={kprLogo} alt="Hunger Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-heading font-extrabold text-2xl tracking-tight gradient-text">Hunger</span>
                <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Active Session
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
              className="w-full bg-slate-900/90 border border-slate-800 rounded-xl pl-9 pr-4 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
            />
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={triggerManualSync}
              className="bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 p-2 rounded-xl text-xs transition flex items-center gap-1"
              title={`Last synced at ${lastSyncTime}. Click to refresh latest shopkeeper edits.`}
            >
              <RefreshCw className="w-3.5 h-3.5 text-emerald-400 animate-spin-slow" />
              <span className="hidden md:inline text-[11px] font-medium">Sync Data</span>
            </button>

            <div className="flex items-center gap-2">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-bold text-white leading-tight">{currentUser.name}</p>
                <span className={`text-[10px] uppercase font-bold tracking-wider ${
                  currentUser.role === 'super_admin' ? 'text-purple-400' :
                  currentUser.role === 'shopkeeper' ? 'text-emerald-400' : 'text-slate-400'
                }`}>
                  {currentUser.role.replace('_', ' ')}
                </span>
              </div>
              <button 
                onClick={handleLogout}
                className="bg-slate-900 hover:bg-red-950/60 border border-slate-800 text-slate-300 hover:text-red-400 px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
                <span>Log Out</span>
              </button>
            </div>

            {currentUser.role === 'customer' && (
              <button 
                onClick={() => setIsCartOpen(true)}
                className="relative bg-gradient-to-r from-blue-700 to-emerald-600 hover:opacity-95 text-white p-2 sm:px-4 sm:py-2 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg shadow-blue-700/20 transition active:scale-95"
              >
                <ShoppingBag className="w-4 h-4" />
                <span className="hidden sm:inline">Cart</span>
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
      <div className="bg-slate-950/80 border-b border-slate-800/60 px-4 py-2 sticky top-[61px] z-30 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between text-xs font-medium">
          
          {currentUser.role === 'customer' && (
            <div className="flex items-center gap-1 sm:gap-2">
              <button 
                onClick={() => setActiveTab('home')}
                className={`px-3 py-1.5 rounded-lg transition ${activeTab === 'home' ? 'bg-blue-700 text-white font-semibold' : 'text-slate-400 hover:text-white hover:bg-slate-900'}`}
              >
                Overview
              </button>
              <button 
                onClick={() => setActiveTab('menu')}
                className={`px-3 py-1.5 rounded-lg transition ${activeTab === 'menu' ? 'bg-blue-700 text-white font-semibold' : 'text-slate-400 hover:text-white hover:bg-slate-900'}`}
              >
                Full Menu
              </button>
              {currentOrder && (
                <button 
                  onClick={() => setActiveTab('tracking')}
                  className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${activeTab === 'tracking' ? 'bg-blue-700 text-white font-semibold' : 'text-slate-400 hover:text-white hover:bg-slate-900'}`}
                >
                  <span>Live Order</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                </button>
              )}
            </div>
          )}

          {currentUser.role === 'shopkeeper' && (
            <div className="flex items-center gap-2">
              <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs px-3.5 py-1.5 rounded-xl font-bold flex items-center gap-2">
                <Store className="w-4 h-4 text-emerald-400" />
                <span>Shopkeeper Dashboard ({activeShopForOwner.name})</span>
              </span>
            </div>
          )}

          {currentUser.role === 'super_admin' && (
            <div className="flex items-center gap-2">
              <span className="bg-purple-600/20 text-purple-300 border border-purple-500/40 text-xs px-3.5 py-1.5 rounded-xl font-bold flex items-center gap-2">
                <Shield className="w-4 h-4 text-purple-400" />
                <span>Super Admin Control Center</span>
              </span>
            </div>
          )}

        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        
        {/* CUSTOMER DASHBOARD: OVERVIEW */}
        {currentUser.role === 'customer' && activeTab === 'home' && (
          <div className="space-y-8 animate-fadeIn">
            <div className="relative rounded-3xl overflow-hidden glass-panel p-6 sm:p-10 border border-slate-800 bg-gradient-to-r from-slate-900 via-slate-900/90 to-blue-950/40">
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
                <h2 className="text-xl font-bold font-heading text-slate-100">Campus Canteens ({shops.length})</h2>
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
                    className="glass-card p-4 rounded-2xl cursor-pointer group space-y-3"
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
                      <h3 className="font-bold text-sm text-slate-100 group-hover:text-blue-400 transition">{shop.name}</h3>
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

            {/* Menu Items Preview */}
            <div className="space-y-4 pt-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold font-heading text-slate-100">Featured Dishes & Operating Windows ({filteredMenu.length})</h2>
                <span className="text-xs text-slate-400">Updates dynamically when shopkeepers edit food items</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredMenu.slice(0, 6).map(item => {
                  const availableNow = isItemInTimeSlot(item);
                  return (
                    <div key={item.id} className="glass-card rounded-2xl overflow-hidden flex flex-col justify-between group">
                      <div>
                        <div className="relative h-44 overflow-hidden">
                          <img 
                            src={item.image} 
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
                            <h3 className="font-bold text-base text-slate-100 group-hover:text-blue-400 transition">{item.name}</h3>
                            <span className={`w-3 h-3 rounded-full border ${item.isVeg ? 'border-emerald-500 bg-emerald-500/20' : 'border-red-500 bg-red-500/20'}`} />
                          </div>
                          <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">{item.description}</p>
                        </div>
                      </div>

                      <div className="p-4 pt-0 flex items-center justify-between border-t border-slate-800/60 mt-3">
                        <div>
                          <span className="text-xs text-slate-400">Price</span>
                          <p className="font-heading font-extrabold text-lg text-white">₹{item.price}</p>
                        </div>

                        <button 
                          disabled={!availableNow}
                          onClick={() => addToCart(item)}
                          className={`font-semibold px-4 py-2 rounded-xl text-xs transition flex items-center gap-1.5 ${
                            availableNow 
                              ? 'bg-blue-600/10 hover:bg-blue-600 text-blue-400 hover:text-white border border-blue-600/30 active:scale-95' 
                              : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                          }`}
                        >
                          <Plus className="w-4 h-4" />
                          <span>{availableNow ? 'Add to Cart' : 'Slot Closed'}</span>
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
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 glass-panel p-4 rounded-2xl border border-slate-800">
              <div>
                <h2 className="text-2xl font-extrabold font-heading text-slate-100">Full Canteen Menu ({filteredMenu.length} items)</h2>
                <p className="text-xs text-slate-400">Time-slot availability & shop payment QR enabled</p>
              </div>

              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-emerald-400" />
                <select 
                  value={selectedShopId} 
                  onChange={(e) => setSelectedShopId(e.target.value)}
                  className="bg-slate-900 border border-slate-800 text-slate-200 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-blue-500"
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
                  <div key={item.id} className="glass-card rounded-2xl p-4 flex flex-col justify-between space-y-3">
                    <div className="flex gap-4">
                      <img src={item.image} alt={item.name} className={`w-24 h-24 rounded-xl object-cover ${!availableNow ? 'grayscale opacity-60' : ''}`} />
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase text-emerald-400 tracking-wider">{item.shopName}</span>
                          <span className="text-xs font-semibold text-emerald-400">★ {item.rating}</span>
                        </div>
                        <h3 className="font-bold text-sm text-slate-100">{item.name}</h3>
                        <p className="text-[11px] text-slate-400 line-clamp-2">{item.description}</p>
                        <p className="font-heading font-extrabold text-base text-white pt-1">₹{item.price}</p>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px]">
                      <span className={`px-2 py-0.5 rounded ${availableNow ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-500/30' : 'bg-red-950/80 text-red-400 border border-red-500/30'}`}>
                        {availableNow ? `Slot: ${item.availableFrom || '08:00'} - ${item.availableUntil || '22:00'}` : 'Slot Closed'}
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
                              ? 'bg-blue-600/10 hover:bg-blue-600 text-blue-400 hover:text-white border border-blue-600/30 active:scale-95' 
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

        {/* CUSTOMER DASHBOARD: UNIQUE PER-ORDER QR CODE */}
        {currentUser.role === 'customer' && activeTab === 'tracking' && currentOrder && (
          <div className="max-w-2xl mx-auto space-y-6 animate-fadeIn">
            <div className="glass-panel p-6 rounded-3xl border border-slate-800 text-center space-y-3 relative overflow-hidden">
              
              <div className="flex items-center justify-center gap-2 flex-wrap">
                <span className={`inline-flex items-center gap-1.5 border px-3 py-1 rounded-full text-xs font-bold ${
                  currentOrder.paymentStatus === 'Paid' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' :
                  currentOrder.paymentStatus === 'Pending' ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400' :
                  'bg-red-500/10 border-red-500/30 text-red-400'
                }`}>
                  {currentOrder.paymentStatus === 'Paid' ? '✅ Payment Status: PAID' :
                   currentOrder.paymentStatus === 'Pending' ? '⏳ Payment Status: PENDING' :
                   '❌ Payment Status: UNPAID (Cash on Handover)'}
                </span>

                {currentOrder.transactionId && (
                  <span className="bg-slate-900 border border-slate-800 text-slate-300 font-mono text-[10px] px-2.5 py-1 rounded-full">
                    Ref: {currentOrder.transactionId}
                  </span>
                )}
              </div>

              <h2 className="text-3xl font-extrabold font-heading text-slate-100">
                {currentOrder.status === 'Completed' ? '✅ Food Handed Over!' : currentOrder.status}
              </h2>
              
              <p className="text-xs text-slate-400">
                {currentOrder.status === 'Completed' 
                  ? `Handed over at ${currentOrder.handedOverAt || 'just now'}` 
                  : 'Show your unique QR code at counter when status is Food Ready'}
              </p>

              <div className="w-full bg-slate-900 rounded-full h-3 overflow-hidden p-0.5 border border-slate-800">
                <div 
                  className="bg-gradient-to-r from-blue-600 to-emerald-400 h-full rounded-full transition-all duration-500" 
                  style={{ width: `${currentOrder.status === 'Order Confirmed' ? 25 : currentOrder.status === 'Being Prepared' ? prepProgress : currentOrder.status === 'Food Ready' ? 90 : 100}%` }}
                />
              </div>
            </div>

            <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-6">
              <h3 className="font-bold text-sm text-slate-200 border-b border-slate-800 pb-3">Real-time Order Status</h3>

              <div className="space-y-6 relative before:absolute before:left-4 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-800">
                <div className="flex items-start gap-4 relative z-10">
                  <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs font-bold">1</div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-100">Order Confirmed</h4>
                    <p className="text-xs text-slate-400">Method: {currentOrder.paymentMethod} • Status: <span className="text-emerald-400 font-bold">{currentOrder.paymentStatus}</span></p>
                  </div>
                </div>

                <div className="flex items-start gap-4 relative z-10">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${['Being Prepared', 'Food Ready', 'Completed'].includes(currentOrder.status) ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'}`}>2</div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-100">Being Prepared</h4>
                    <p className="text-xs text-slate-400">Kitchen preparing meal</p>
                  </div>
                </div>

                <div className="flex items-start gap-4 relative z-10">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${['Food Ready', 'Completed'].includes(currentOrder.status) ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-400'}`}>3</div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-100">Food Ready (Scan QR for Handover)</h4>
                    <p className="text-xs text-slate-400">Show QR code below to shopkeeper</p>
                  </div>
                </div>

                <div className="flex items-start gap-4 relative z-10">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${currentOrder.status === 'Completed' ? 'bg-blue-500 text-white' : 'bg-slate-800 text-slate-400'}`}>4</div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-100">Food Handed Over</h4>
                    <p className="text-xs text-slate-400">Confirmed automatically via QR scan</p>
                  </div>
                </div>
              </div>
            </div>

            {/* CUSTOMER UNIQUE SINGLE-USE COLLECTION QR CODE CARD */}
            <div className="glass-card p-6 rounded-3xl border border-slate-800 text-center space-y-4">
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
                Order ID: <span className="text-white font-bold">{currentOrder.id}</span> • Token: <span className="text-blue-400 font-bold">{currentOrder.qrToken}</span>
              </p>
            </div>
          </div>
        )}

        {/* SHOPKEEPER DASHBOARD: LIVE CAMERA QR SCANNER & MENU MANAGEMENT */}
        {currentUser.role === 'shopkeeper' && (
          <div className="max-w-4xl mx-auto space-y-8 animate-fadeIn">
            
            <div className="glass-panel p-6 rounded-3xl border border-emerald-500/40 bg-gradient-to-r from-emerald-950/30 via-slate-900 to-slate-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Store className="w-6 h-6 text-emerald-400" />
                  <h2 className="text-2xl font-extrabold font-heading text-slate-100">
                    {activeShopForOwner.name} Dashboard
                  </h2>
                </div>
                <p className="text-xs text-slate-400">
                  Shopkeeper Account: <span className="text-emerald-300 font-mono">{currentUser.email}</span> • Shop ID: <span className="font-bold text-white">{activeShopForOwner.id}</span>
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs px-3.5 py-1.5 rounded-xl font-bold flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Verified Camera Scanner Active</span>
                </span>
              </div>
            </div>

            {/* SECTION A: DEVICE CAMERA QR AUTO HANDOVER SCANNER */}
            <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Camera className="w-5 h-5 text-emerald-400" />
                  <h3 className="font-extrabold font-heading text-base text-white">Live Camera QR Auto Handover Scanner</h3>
                </div>
                <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold px-2.5 py-0.5 rounded-md">
                  WebRTC Device Camera API
                </span>
              </div>

              {cameraError && (
                <div className="bg-red-950/80 border border-red-500/50 text-red-300 p-4 rounded-2xl text-xs font-bold flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <div className="space-y-1">
                    <p className="text-sm font-extrabold">Camera Access Issue</p>
                    <p className="text-xs text-red-200 font-normal">{cameraError}</p>
                  </div>
                </div>
              )}

              {scanResult && (
                <div className={`p-4 rounded-2xl border text-xs font-bold space-y-2 animate-fadeIn ${
                  scanResult.isUnpaidWarning ? 'bg-yellow-950/80 border-yellow-500/50 text-yellow-300' :
                  scanResult.success ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300' :
                  'bg-red-950/80 border-red-500/50 text-red-300'
                }`}>
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-extrabold">{scanResult.message}</p>
                      
                      {scanResult.paymentStatus && (
                        <div className="flex items-center gap-3 pt-1 text-xs">
                          <span className={`px-2.5 py-0.5 rounded-md font-bold uppercase border ${
                            scanResult.paymentStatus === 'Paid' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' :
                            scanResult.paymentStatus === 'Pending' ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40' :
                            'bg-red-500/20 text-red-300 border-red-500/40'
                          }`}>
                            Payment: {scanResult.paymentStatus}
                          </span>
                          
                          {scanResult.paymentMethod && (
                            <span className="text-slate-300 font-normal">Method: {scanResult.paymentMethod}</span>
                          )}

                          {scanResult.transactionId && (
                            <span className="font-mono text-[11px] text-slate-300">Txn: {scanResult.transactionId}</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {scanResult.isUnpaidWarning && scanResult.orderId && (
                    <div className="pt-2 flex items-center gap-3 border-t border-yellow-500/30">
                      <button 
                        onClick={() => handleMarkOrderPaidCash(scanResult.orderId!)}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold px-4 py-2 rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-emerald-600/30"
                      >
                        <DollarSign className="w-4 h-4" />
                        <span>Collect Cash (₹{currentOrder?.grandTotal || 0}) & Mark as Paid 💵</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                <div className="glass-card p-5 rounded-2xl space-y-3 text-center border border-slate-800">
                  <div className="w-full h-48 bg-slate-950 rounded-xl overflow-hidden relative border border-slate-800 flex items-center justify-center">
                    <video 
                      ref={videoRef} 
                      playsInline 
                      muted 
                      className={`w-full h-full object-cover ${isCameraActive ? 'block' : 'hidden'}`}
                    />

                    {!isCameraActive && (
                      <div className="space-y-2 text-center p-4">
                        <Camera className="w-10 h-10 text-slate-600 mx-auto" />
                        <p className="text-xs text-slate-400">Device Camera Viewfinder Standby</p>
                      </div>
                    )}

                    {isCameraActive && (
                      <div className="absolute inset-0 border-2 border-emerald-400/80 rounded-xl m-6 pointer-events-none animate-pulse" />
                    )}
                  </div>

                  <div className="flex gap-2">
                    {!isCameraActive ? (
                      <button 
                        onClick={startCameraScanner}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 rounded-xl text-xs shadow-lg shadow-emerald-600/20 transition flex items-center justify-center gap-2"
                      >
                        <Camera className="w-4 h-4" />
                        <span>Start Camera Scanner 📷</span>
                      </button>
                    ) : (
                      <button 
                        onClick={stopCameraScanner}
                        className="flex-1 bg-red-950/80 hover:bg-red-900 border border-red-500/40 text-red-300 font-bold py-2.5 rounded-xl text-xs transition flex items-center justify-center gap-2"
                      >
                        <VideoOff className="w-4 h-4" />
                        <span>Stop Camera ⏹</span>
                      </button>
                    )}
                  </div>

                  {currentOrder && (
                    <button 
                      onClick={() => processQrScanHandover(currentOrder.qrToken)}
                      className="w-full bg-gradient-to-r from-blue-700 to-emerald-600 hover:from-blue-800 hover:to-emerald-700 text-white font-bold py-2.5 rounded-xl text-xs shadow-lg shadow-blue-700/20 transition active:scale-95 flex items-center justify-center gap-2"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Scan Active Customer Order #{currentOrder.id}</span>
                    </button>
                  )}
                </div>

                <div className="glass-card p-5 rounded-2xl space-y-3 border border-slate-800">
                  <h4 className="font-bold text-sm text-white flex items-center gap-2">
                    <QrCode className="w-4 h-4 text-emerald-400" />
                    <span>Manual Token Entry Fallback</span>
                  </h4>
                  <p className="text-xs text-slate-400">Use if camera permission is disabled or scanning unreadable token</p>
                  
                  <div className="space-y-2 pt-1">
                    <input 
                      type="text" 
                      placeholder="e.g. HUNGER-8924 or HUNGER-QR-8924..."
                      value={simulatedQrInput}
                      onChange={(e) => setSimulatedQrInput(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500 font-mono"
                    />
                    <button 
                      onClick={() => processQrScanHandover(simulatedQrInput)}
                      className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 rounded-xl text-xs transition"
                    >
                      Verify Order Handover
                    </button>
                  </div>
                </div>

              </div>
            </div>

            {/* SECTION B: INCOMING CANTEEN ORDERS */}
            <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
              <h3 className="font-extrabold font-heading text-base text-white border-b border-slate-800 pb-3">
                Incoming Canteen Orders ({currentOrder && currentOrder.shopId === activeShopForOwner.id ? 1 : 0})
              </h3>

              {currentOrder && currentOrder.shopId === activeShopForOwner.id ? (
                <div className="glass-card p-5 rounded-2xl space-y-4 border border-slate-800">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-sm text-white">Order #{currentOrder.id} • {currentOrder.customerName}</h4>
                        
                        <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border uppercase ${
                          currentOrder.paymentStatus === 'Paid' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' :
                          currentOrder.paymentStatus === 'Pending' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40' :
                          'bg-red-500/20 text-red-400 border-red-500/40'
                        }`}>
                          {currentOrder.paymentStatus === 'Paid' ? '✅ Paid' :
                           currentOrder.paymentStatus === 'Pending' ? '⏳ Pending' :
                           '❌ Unpaid (Cash)'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400">Placed at {currentOrder.createdAt} • Total: ₹{currentOrder.grandTotal} ({currentOrder.paymentMethod})</p>
                    </div>

                    <span className={`text-xs font-bold px-3 py-1 rounded-full border ${
                      currentOrder.status === 'Completed' ? 'bg-blue-500/20 text-blue-400 border-blue-500/40' :
                      currentOrder.status === 'Food Ready' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' :
                      'bg-blue-600/20 text-blue-400 border-blue-600/40'
                    }`}>
                      {currentOrder.status}
                    </span>
                  </div>

                  <div className="space-y-2">
                    {currentOrder.items.map(item => (
                      <div key={item.id} className="flex justify-between text-xs text-slate-200 bg-slate-900/60 p-2.5 rounded-xl">
                        <span>{item.qty}x {item.name}</span>
                        <span className="font-bold">₹{item.price * item.qty}</span>
                      </div>
                    ))}
                  </div>

                  <div className="pt-2 flex flex-wrap items-center gap-3">
                    {currentOrder.status !== 'Food Ready' && currentOrder.status !== 'Completed' && (
                      <button 
                        onClick={async () => {
                          if (currentOrder) {
                            await markFoodReadyApi(currentOrder.id);
                            setCurrentOrder(prev => prev ? { ...prev, status: 'Food Ready' } : null);
                          }
                        }}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2 rounded-xl text-xs transition flex items-center gap-2 shadow-lg shadow-emerald-600/20"
                      >
                        <Bell className="w-4 h-4" />
                        <span>Mark "Food Ready 🔔"</span>
                      </button>
                    )}

                    {currentOrder.paymentStatus !== 'Paid' && (
                      <button 
                        onClick={() => handleMarkOrderPaidCash(currentOrder.id)}
                        className="bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white border border-emerald-500/40 font-bold px-3 py-2 rounded-xl text-xs transition flex items-center gap-1.5"
                      >
                        <DollarSign className="w-4 h-4" />
                        <span>Mark Paid (Cash Collected)</span>
                      </button>
                    )}

                    {currentOrder.status === 'Food Ready' && (
                      <div className="bg-blue-600/10 border border-blue-600/30 text-blue-400 text-xs px-3 py-2 rounded-xl font-semibold flex items-center gap-2">
                        <QrCode className="w-4 h-4" />
                        <span>Awaiting Customer QR Scan Handover...</span>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-slate-500 text-xs">
                  No active incoming orders for {activeShopForOwner.name} right now.
                </div>
              )}
            </div>

            {/* SECTION C: FOOD MENU MANAGEMENT (ADD & DELETE FOOD ITEMS) */}
            <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <h3 className="font-extrabold font-heading text-base text-white">Food Menu Management</h3>
                  <p className="text-xs text-slate-400">Edits and new dishes reflect instantly on Customer Dashboard</p>
                </div>

                <button 
                  onClick={openAddItemModal}
                  className="bg-gradient-to-r from-blue-700 to-emerald-600 hover:from-blue-800 hover:to-emerald-700 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-blue-700/20 transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add New Item</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {menuItems.filter(i => i.shopId === activeShopForOwner.id).map(item => (
                  <div key={item.id} className="glass-card p-4 rounded-2xl flex justify-between gap-3 border border-slate-800">
                    <div className="flex gap-3">
                      <img src={item.image} alt={item.name} className="w-16 h-16 rounded-xl object-cover" />
                      <div className="space-y-1">
                        <h4 className="font-bold text-xs text-white">{item.name}</h4>
                        <p className="text-xs font-extrabold text-blue-400">₹{item.price}</p>
                        <p className="text-[10px] text-slate-400">Slot: {item.availableFrom || '08:00'} - {item.availableUntil || '22:00'}</p>
                      </div>
                    </div>

                    <div className="flex flex-col justify-between items-end">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${item.isAvailable ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                        {item.isAvailable ? 'Active' : 'Inactive'}
                      </span>

                      <div className="flex items-center gap-1">
                        <button 
                          onClick={() => openEditItemModal(item)}
                          className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition"
                          title="Edit Food Item"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={() => handleDeleteItem(item.id)}
                          className="p-1.5 bg-red-950/60 hover:bg-red-900 text-red-400 rounded-lg transition"
                          title="Delete Food Item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* SECTION D: SHOP UPI PAYMENT QR CODE MANAGEMENT */}
            <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
              <h3 className="font-extrabold font-heading text-base text-white border-b border-slate-800 pb-3">
                Shop Payment QR Code & UPI VPA Profile
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-300">Shop UPI VPA ID</label>
                  <input 
                    type="text" 
                    value={editingShopUpi || activeShopForOwner.upiId}
                    onChange={(e) => setEditingShopUpi(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-300">Payment QR Code Image URL</label>
                  <input 
                    type="text" 
                    value={editingShopQrUrl || activeShopForOwner.qrImageUrl}
                    onChange={(e) => setEditingShopQrUrl(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <button 
                onClick={() => {
                  const updatedShops = shops.map(s => s.id === activeShopForOwner.id ? {
                    ...activeShopForOwner,
                    upiId: editingShopUpi || activeShopForOwner.upiId,
                    qrImageUrl: editingShopQrUrl || activeShopForOwner.qrImageUrl
                  } : s);
                  setShops(updatedShops);
                  saveShops(updatedShops);
                  alert('Shop payment UPI QR and VPA updated & synced to Customer Dashboard!');
                }}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-5 py-2.5 rounded-xl text-xs transition shadow-md shadow-emerald-600/20"
              >
                Save Shop Payment Settings
              </button>
            </div>

          </div>
        )}

        {/* HIDDEN SUPER ADMIN DASHBOARD (ADD SHOP & DELETE SHOP) */}
        {currentUser.role === 'super_admin' && (
          <div className="max-w-5xl mx-auto space-y-8 animate-fadeIn">
            <div className="glass-panel p-6 rounded-3xl border border-purple-500/40 bg-gradient-to-r from-purple-950/40 via-slate-900 to-slate-900 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400">
                    <Shield className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-extrabold font-heading text-slate-100">Hunger Super Admin Panel</h2>
                    <p className="text-xs text-slate-400">Reserved Account: <span className="text-purple-300 font-mono">{SUPER_ADMIN_EMAIL}</span></p>
                  </div>
                </div>

                <button 
                  onClick={() => setIsAddShopkeeperOpen(true)}
                  className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-purple-600/30 transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add New Shopkeeper & Canteen</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="glass-card p-5 rounded-2xl border border-slate-800 space-y-2">
                <span className="text-xs text-slate-400 font-medium">Total Campus Orders</span>
                <p className="font-heading font-extrabold text-3xl text-white">{ordersHistory.length + 42}</p>
                <p className="text-[11px] text-emerald-400 font-semibold">↑ 18% growth this week</p>
              </div>

              <div className="glass-card p-5 rounded-2xl border border-slate-800 space-y-2">
                <span className="text-xs text-slate-400 font-medium">Active Campus Canteens</span>
                <p className="font-heading font-extrabold text-3xl text-purple-400">{shops.length}</p>
                <p className="text-[11px] text-slate-400">{shops.length} active canteens registered</p>
              </div>

              <div className="glass-card p-5 rounded-2xl border border-slate-800 space-y-2">
                <span className="text-xs text-slate-400 font-medium">Gross Platform Revenue</span>
                <p className="font-heading font-extrabold text-3xl text-blue-400">₹{ordersHistory.reduce((acc, o) => acc + o.grandTotal, 0) + 14850}</p>
                <p className="text-[11px] text-slate-400">Direct UPI settlement</p>
              </div>
            </div>

            {/* SUPER ADMIN SHOP & SHOPKEEPER MANAGEMENT LIST WITH DELETE SHOP BUTTON */}
            <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
              <h3 className="font-extrabold font-heading text-base text-white border-b border-slate-800 pb-3 flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-400" />
                <span>Shopkeeper & Canteen Shops Management ({shops.length} Canteens)</span>
              </h3>

              <div className="space-y-3">
                {shops.map(s => (
                  <div key={s.id} className="glass-card p-4 rounded-2xl flex items-center justify-between border border-slate-800">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-sm text-white">{s.name}</h4>
                        <span className="bg-purple-500/20 text-purple-300 text-[10px] font-bold px-2 py-0.5 rounded-md border border-purple-500/30">
                          {s.id}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 font-mono">Owner Email: {s.email} • UPI VPA: {s.upiId}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => handleDeleteShop(s.id, s.name)}
                        className="bg-red-950/60 hover:bg-red-900 border border-red-500/30 text-red-400 font-bold px-3 py-1.5 rounded-xl text-xs transition flex items-center gap-1.5"
                        title="Delete Canteen Shop and dishes"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete Shop</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
              <h3 className="font-extrabold font-heading text-base text-white border-b border-slate-800 pb-3 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-emerald-400" />
                <span>All-Canteens Real-Time Order & Payment Audit</span>
              </h3>

              {ordersHistory.length > 0 ? (
                <div className="space-y-3">
                  {ordersHistory.map(o => (
                    <div key={o.id} className="glass-card p-4 rounded-2xl flex items-center justify-between text-xs border border-slate-800">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white">Order #{o.id}</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            o.paymentStatus === 'Paid' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                          }`}>
                            {o.paymentStatus}
                          </span>
                        </div>
                        <p className="text-slate-400">{o.shopName} • Customer: {o.customerName}</p>
                      </div>
                      <div className="text-right">
                        <span className="font-extrabold text-blue-400">₹{o.grandTotal}</span>
                        <p className="text-emerald-400 font-semibold">{o.status}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500 py-4 text-center">No orders recorded in current session yet.</p>
              )}
            </div>
          </div>
        )}

      </main>

      {/* SUPER ADMIN MODAL (ADD SHOPKEEPER & NEW CANTEEN SHOP) */}
      {isAddShopkeeperOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-md glass-panel border border-purple-500/40 p-6 rounded-3xl space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-extrabold font-heading text-lg text-white">Create Shopkeeper & Canteen</h3>
              <button onClick={() => setIsAddShopkeeperOpen(false)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={handleAddShopkeeper} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Shopkeeper Full Name</label>
                <input 
                  type="text" 
                  required
                  value={newShopkeeperName}
                  onChange={(e) => setNewShopkeeperName(e.target.value)}
                  placeholder="e.g. Anand Kumar"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Email Address</label>
                <input 
                  type="email" 
                  required
                  value={newShopkeeperEmail}
                  onChange={(e) => setNewShopkeeperEmail(e.target.value)}
                  placeholder="e.g. owner@hunger.com"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">New Canteen Shop Name</label>
                <input 
                  type="text" 
                  required
                  value={newShopName}
                  onChange={(e) => setNewShopName(e.target.value)}
                  placeholder="e.g. Campus Juice & Waffle Bar"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Canteen Shop ID</label>
                <input 
                  type="text" 
                  required
                  value={newShopkeeperShopId}
                  onChange={(e) => setNewShopkeeperShopId(e.target.value)}
                  placeholder="e.g. shop-waffle"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-purple-500 font-mono"
                />
              </div>

              <button 
                type="submit"
                className="w-full bg-purple-600 hover:bg-purple-500 text-white font-extrabold py-3 rounded-2xl text-xs transition shadow-lg shadow-purple-600/30"
              >
                Create Shopkeeper & Activate Shop
              </button>
            </form>
          </div>
        </div>
      )}

      {/* FOOD ITEM MODAL */}
      {isItemModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-lg glass-panel border border-slate-800 p-6 rounded-3xl space-y-4 shadow-2xl relative max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-extrabold font-heading text-lg text-white">
                {editingItem ? 'Edit Food Item' : 'Add New Food Item'}
              </h3>
              <button onClick={() => setIsItemModalOpen(false)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={handleSaveFoodItem} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Item Name</label>
                <input 
                  type="text" 
                  required
                  value={itemForm.name}
                  onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
                  placeholder="e.g. Masala Dosa"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Price (₹)</label>
                  <input 
                    type="number" 
                    required
                    value={itemForm.price}
                    onChange={(e) => setItemForm({ ...itemForm, price: Number(e.target.value) })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Category</label>
                  <select 
                    value={itemForm.category}
                    onChange={(e) => setItemForm({ ...itemForm, category: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                  >
                    <option value="South Indian">South Indian</option>
                    <option value="Fast Food">Fast Food</option>
                    <option value="Beverages">Beverages</option>
                    <option value="Main Course">Main Course</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Description</label>
                <textarea 
                  rows={2}
                  value={itemForm.description}
                  onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="p-3 bg-slate-900/80 rounded-2xl border border-slate-800 space-y-3">
                <span className="text-xs font-bold text-blue-400 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Time-based Availability Window</span>
                </span>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] text-slate-400">Available From</label>
                    <input 
                      type="time" 
                      value={itemForm.availableFrom}
                      onChange={(e) => setItemForm({ ...itemForm, availableFrom: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] text-slate-400">Available Until</label>
                    <input 
                      type="time" 
                      value={itemForm.availableUntil}
                      onChange={(e) => setItemForm({ ...itemForm, availableUntil: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200"
                    />
                  </div>
                </div>

                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer pt-1">
                  <input 
                    type="checkbox" 
                    checked={itemForm.isAvailable}
                    onChange={(e) => setItemForm({ ...itemForm, isAvailable: e.target.checked })}
                  />
                  <span>Mark Item Active Currently</span>
                </label>
              </div>

              <button 
                type="submit"
                className="w-full bg-gradient-to-r from-blue-700 to-emerald-600 text-white font-extrabold py-3 rounded-xl text-xs"
              >
                Save Food Item
              </button>
            </form>
          </div>
        </div>
      )}

      {/* CART & CHECKOUT MODALS */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-slate-900 border-l border-slate-800 p-6 flex flex-col justify-between space-y-4 shadow-2xl">
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <h2 className="font-bold font-heading text-lg text-white flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-emerald-400" />
                  <span>Cart ({totalItemsCount})</span>
                </h2>
                <button onClick={() => setIsCartOpen(false)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
              </div>

              {cart.map(item => (
                <div key={item.id} className="glass-card p-3 rounded-xl flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-xs text-white">{item.name}</h4>
                    <p className="text-[11px] text-slate-400">₹{item.price} each</p>
                  </div>
                  <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-2 py-1 rounded-lg text-xs font-bold">
                    <button onClick={() => updateQty(item.id, -1)}><Minus className="w-3 h-3 text-slate-400" /></button>
                    <span className="text-white px-1">{item.qty}</span>
                    <button onClick={() => updateQty(item.id, 1)}><Plus className="w-3 h-3 text-slate-400" /></button>
                  </div>
                </div>
              ))}
            </div>

            {cart.length > 0 && (
              <div className="space-y-3 pt-4 border-t border-slate-800">
                <div className="flex justify-between font-bold text-sm text-white">
                  <span>Grand Total</span>
                  <span className="text-emerald-400">₹{cartTotal + 15}</span>
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

      {/* DYNAMIC CHECKOUT MODAL */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-lg glass-panel border border-slate-800 p-6 rounded-3xl space-y-5 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="font-extrabold font-heading text-lg text-white">Select Payment Mode for {currentCheckoutShop.name}</h3>
                <p className="text-xs text-slate-400">Shop UPI VPA: <span className="text-emerald-400 font-mono">{currentCheckoutShop.upiId}</span></p>
              </div>
              <button onClick={() => setIsCheckoutOpen(false)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => setSelectedPaymentMethod('Online UPI')}
                className={`p-3.5 rounded-2xl border text-left space-y-1 transition ${
                  selectedPaymentMethod === 'Online UPI' 
                    ? 'bg-blue-600/20 border-blue-500 text-white shadow-lg shadow-blue-500/20' 
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs">Online UPI (Server Verified)</span>
                  <Smartphone className="w-4 h-4 text-emerald-400" />
                </div>
                <p className="text-[10px] text-slate-400">GPay / PhonePe / Paytm direct UPI settlement</p>
              </button>

              <button 
                onClick={() => setSelectedPaymentMethod('Cash on Handover')}
                className={`p-3.5 rounded-2xl border text-left space-y-1 transition ${
                  selectedPaymentMethod === 'Cash on Handover' 
                    ? 'bg-emerald-600/20 border-emerald-500 text-white shadow-lg shadow-emerald-500/20' 
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs">Cash on Handover</span>
                  <DollarSign className="w-4 h-4 text-emerald-400" />
                </div>
                <p className="text-[10px] text-slate-400">Pay cash at counter when collecting food</p>
              </button>
            </div>

            {selectedPaymentMethod === 'Online UPI' ? (
              <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl text-center space-y-3">
                <span className="text-xs font-semibold text-slate-300">Scan Shop's Uploaded UPI QR Code</span>
                <div className="w-44 h-44 bg-white p-2.5 rounded-xl mx-auto flex items-center justify-center shadow-lg border-2 border-blue-600/20">
                  <img 
                    src={currentCheckoutShop.qrImageUrl} 
                    alt="Shop Payment QR" 
                    className="w-full h-full object-contain"
                  />
                </div>
                <p className="text-[11px] text-slate-400">Server verified transaction confirmation</p>
              </div>
            ) : (
              <div className="bg-slate-900 border border-yellow-500/30 p-4 rounded-2xl text-center space-y-2 text-yellow-300">
                <AlertCircle className="w-6 h-6 mx-auto text-yellow-400" />
                <h4 className="font-bold text-xs">Cash on Handover Selected</h4>
                <p className="text-[11px] text-slate-400">
                  Your order payment status will show <span className="text-red-400 font-bold">UNPAID</span> until you pay ₹{cartTotal + 15} cash to the shopkeeper at the counter.
                </p>
              </div>
            )}

            <button 
              onClick={handlePlaceOrder}
              className="w-full bg-gradient-to-r from-blue-700 to-emerald-600 text-white font-extrabold py-3.5 rounded-2xl text-sm shadow-xl shadow-blue-700/30"
            >
              Confirm Order & Pay ₹{cartTotal + 15} &rarr;
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
