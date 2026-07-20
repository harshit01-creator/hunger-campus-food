// i18n Translation dictionary & language preference manager for Hunger App

export type LanguageCode = 'en' | 'hi' | 'ta';

export const TRANSLATIONS: Record<LanguageCode, Record<string, string>> = {
  en: {
    appTitle: 'Hunger',
    appSubtitle: 'Campus Food Ordering & Camera QR Auto Handover Platform',
    customerLogin: 'Customer Login',
    shopkeeperLogin: 'Shopkeeper Login',
    emailLabel: 'Email Address',
    passwordLabel: 'Password',
    loginButton: 'Log In to Hunger',
    logout: 'Log Out',
    overview: 'Overview',
    fullMenu: 'Full Menu',
    liveOrder: 'Live Order',
    cart: 'Cart',
    canteenShops: 'Campus Canteens',
    featuredDishes: 'Featured Dishes & Operating Windows',
    addToCart: 'Add to Cart',
    slotClosed: 'Slot Closed',
    todaysSpecial: "Today's Special 🌟",
    orderStatus: 'Order Status',
    paymentStatus: 'Payment Status',
    scanQrToHandover: 'Single-Use Order Collection QR Code',
    shopkeeperDashboard: 'Shopkeeper Dashboard',
    superAdminDashboard: 'Super Admin Control Center',
    startCameraScanner: 'Start Camera Scanner 📷',
    stopCamera: 'Stop Camera ⏹',
    foodMenuManagement: 'Food Menu Management',
    addNewItem: 'Add New Item',
    salesAnalytics: 'Sales & Revenue Analytics',
    totalOrders: 'Total Orders',
    totalRevenue: 'Total Revenue',
    topSellingDishes: 'Best-Selling Dishes',
    themeLight: 'Light Mode ☀️',
    themeDark: 'Dark Mode 🌙',
    copyVercelLink: 'Share App Link 🌐',
    liveVercelUrl: 'https://hunger-campus-food.vercel.app'
  },
  hi: {
    appTitle: 'हंगर (Hunger)',
    appSubtitle: 'कैंपस फूड ऑर्डरिंग और कैमरा क्यूआर ऑटो हैंडओवर प्लेटफॉर्म',
    customerLogin: 'छात्र लॉगिन',
    shopkeeperLogin: 'दुकानदार लॉगिन',
    emailLabel: 'ईमेल पता',
    passwordLabel: 'पासवर्ड',
    loginButton: 'हंगर में लॉगिन करें',
    logout: 'लॉग आउट',
    overview: 'मुख्य पृष्ठ',
    fullMenu: 'पूरा मेनू',
    liveOrder: 'लाइव ऑर्डर',
    cart: 'कार्ट (Cart)',
    canteenShops: 'कैंपस कैंटीन',
    featuredDishes: 'प्रसिद्ध व्यंजन और समय',
    addToCart: 'कार्ट में जोड़ें',
    slotClosed: 'समय समाप्त',
    todaysSpecial: "आज का खास डिश 🌟",
    orderStatus: 'ऑर्डर स्थिति',
    paymentStatus: 'भुगतान स्थिति',
    scanQrToHandover: 'ऑर्डर संग्रह क्यूआर कोड',
    shopkeeperDashboard: 'दुकानदार डैशबोर्ड',
    superAdminDashboard: 'सुपर एडमिन कंट्रोल सेंटर',
    startCameraScanner: 'कैमरा स्कैनर शुरू करें 📷',
    stopCamera: 'कैमरा बंद करें ⏹',
    foodMenuManagement: 'फूड मेनू प्रबंधन',
    addNewItem: 'नया व्यंजन जोड़ें',
    salesAnalytics: 'बिक्री और राजस्व विश्लेषण',
    totalOrders: 'कुल ऑर्डर',
    totalRevenue: 'कुल राजस्व',
    topSellingDishes: 'सबसे ज्यादा बिकने वाले व्यंजन',
    themeLight: 'लाइट मोड ☀️',
    themeDark: 'डार्क मोड 🌙',
    copyVercelLink: 'ऐप लिंक शेयर करें 🌐',
    liveVercelUrl: 'https://hunger-campus-food.vercel.app'
  },
  ta: {
    appTitle: 'ஹங்கர் (Hunger)',
    appSubtitle: 'கேம்பஸ் உணவு ஆர்டர் மற்றும் கேமரா QR ஆட்டோ ஹேண்டோவர் தளம்',
    customerLogin: 'மாணவர் உள்நுழைவு',
    shopkeeperLogin: 'கடைக்காரர் உள்நுழைவு',
    emailLabel: 'மின்னஞ்சல் முகவரி',
    passwordLabel: 'கடவுச்சொல்',
    loginButton: 'ஹங்கரில் உள்நுழையவும்',
    logout: 'வெளியேறு',
    overview: 'முகப்பு',
    fullMenu: 'முழு மெனு',
    liveOrder: 'லைவ் ஆர்டர்',
    cart: 'கார்ட் (Cart)',
    canteenShops: 'கேம்பஸ் உணவகங்கள்',
    featuredDishes: 'சிறப்பு உணவுகள்',
    addToCart: 'கார்ட்டில் சேர்',
    slotClosed: 'நேரம் முடிந்தது',
    todaysSpecial: "இன்றைய சிறப்பு 🌟",
    orderStatus: 'ஆர்டர் நிலை',
    paymentStatus: 'பணம் செலுத்தும் நிலை',
    scanQrToHandover: 'ஒற்றை பயன்பாட்டு QR குறியீடு',
    shopkeeperDashboard: 'கடைக்காரர் டாஷ்போர்டு',
    superAdminDashboard: 'சூப்பர் அட்மின் மையம்',
    startCameraScanner: 'கேமரா ஸ்கேனர் 📷',
    stopCamera: 'கேமராவை நிறுத்து ⏹',
    foodMenuManagement: 'உணவு மெனு நிர்வாகம்',
    addNewItem: 'புதிய உணவு சேர்க்க',
    salesAnalytics: 'விற்பனை மற்றும் வருவாய் பகுப்பாய்வு',
    totalOrders: 'மொத்த ஆர்டர்கள்',
    totalRevenue: 'மொத்த வருவாய்',
    topSellingDishes: 'அதிகம் விற்கப்பட்ட உணவுகள்',
    themeLight: 'லைட் மோட் ☀️',
    themeDark: 'டார்க் மோட் 🌙',
    copyVercelLink: 'ஆப் லிங்க் பகிரவும் 🌐',
    liveVercelUrl: 'https://hunger-campus-food.vercel.app'
  }
};

const LANG_KEY = 'hunger_lang_pref_v1';

export function getSavedLanguage(): LanguageCode {
  try {
    const saved = localStorage.getItem(LANG_KEY);
    if (saved && ['en', 'hi', 'ta'].includes(saved)) {
      return saved as LanguageCode;
    }
  } catch (e) {
    console.warn('[i18n] Read error:', e);
  }
  return 'en';
}

export function saveLanguage(lang: LanguageCode): void {
  try {
    localStorage.setItem(LANG_KEY, lang);
  } catch (e) {
    console.error('[i18n] Save error:', e);
  }
}

export function t(key: string, lang: LanguageCode = 'en'): string {
  const dict = TRANSLATIONS[lang] || TRANSLATIONS.en;
  return dict[key] || TRANSLATIONS.en[key] || key;
}
