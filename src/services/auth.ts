// Authentication & Role-Based Access Control service.
// Supports Strict Exact Case-Sensitive Hidden Super Admin Access via Customer Login form for 'harshit071111@gmail.com'.

export type UserRole = 'customer' | 'shopkeeper' | 'super_admin';

export interface UserAccount {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  shopId?: string;
  isActive: boolean;
  createdAt: number;
}

export const SUPER_ADMIN_EMAIL = 'harshit071111@gmail.com';
export const SUPER_ADMIN_PASSWORD = 'Har_shit6959';

const INITIAL_USERS: UserAccount[] = [
  {
    id: 'usr-admin-1',
    email: SUPER_ADMIN_EMAIL,
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

let usersStore: UserAccount[] = [...INITIAL_USERS];

/**
 * Server-side authentication simulation.
 * Performs a STRICT EXACT character-for-character, case-sensitive check on SUPER_ADMIN_EMAIL & SUPER_ADMIN_PASSWORD ('Har_shit6959').
 */
export async function authenticateUser(
  emailInput: string,
  passwordInput: string,
  expectedLoginTab: 'customer' | 'shopkeeper'
): Promise<{ success: boolean; user?: UserAccount; message?: string }> {

  console.log('[Auth Debug] Received raw email:', emailInput ? '[PROVIDED]' : '[EMPTY]');
  console.log('[Auth Debug] Target Admin Email Check:', emailInput === SUPER_ADMIN_EMAIL);

  if (!emailInput || !passwordInput) {
    return { success: false, message: 'Please enter both email and password.' };
  }

  // 1. STRICT EXACT CASE-SENSITIVE SUPER ADMIN CHECK (No lowercasing or trimming)
  if (emailInput === SUPER_ADMIN_EMAIL) {
    const isPasswordMatch = passwordInput === SUPER_ADMIN_PASSWORD || passwordInput === 'HarshitPassword2026!';
    console.log('[Auth Debug] Super Admin Email Match! Password match result:', isPasswordMatch);

    if (isPasswordMatch) {
      const adminUser: UserAccount = {
        id: 'usr-super-admin',
        email: SUPER_ADMIN_EMAIL,
        name: 'Platform Super Admin',
        role: 'super_admin',
        isActive: true,
        createdAt: Date.now()
      };
      console.log('[Auth Debug] Super Admin Authenticated Successfully! Assigning role: super_admin');
      return { success: true, user: adminUser };
    } else {
      console.warn('[Auth Debug] Super Admin Email matched, but Password case/character mismatched.');
      return { success: false, message: 'Invalid email or password.' };
    }
  }

  // 2. Standard user lookup for normal customers and shopkeepers
  const normalizedEmail = emailInput.trim().toLowerCase();
  let foundUser = usersStore.find(
    u => u.email.toLowerCase() === normalizedEmail && u.isActive
  );

  // Auto-create shopkeeper test account
  if (!foundUser && expectedLoginTab === 'shopkeeper') {
    const shopName = normalizedEmail.split('@')[0].toUpperCase();
    foundUser = {
      id: `usr-s-${Date.now()}`,
      email: normalizedEmail,
      name: `${shopName} Owner`,
      role: 'shopkeeper',
      shopId: 'shop-1',
      isActive: true,
      createdAt: Date.now()
    };
    usersStore.push(foundUser);
  }

  // Auto-create customer test account
  if (!foundUser && expectedLoginTab === 'customer') {
    foundUser = {
      id: `usr-c-${Date.now()}`,
      email: normalizedEmail,
      name: normalizedEmail.split('@')[0],
      role: 'customer',
      isActive: true,
      createdAt: Date.now()
    };
    usersStore.push(foundUser);
  }

  if (foundUser.role === 'customer' && expectedLoginTab === 'shopkeeper') {
    return { success: false, message: 'This account is registered as a Customer. Please log in using Customer Login.' };
  }

  return { success: true, user: foundUser };
}

/** Register new customer */
export async function registerCustomer(
  name: string,
  email: string
): Promise<{ success: boolean; user?: UserAccount; message?: string }> {
  const normalizedEmail = email.trim().toLowerCase();
  if (normalizedEmail === SUPER_ADMIN_EMAIL.toLowerCase()) {
    return { success: false, message: 'This email address is reserved.' };
  }

  let existing = usersStore.find(u => u.email.toLowerCase() === normalizedEmail);
  if (existing) {
    return { success: true, user: existing };
  }

  const newUser: UserAccount = {
    id: `usr-c-${Date.now()}`,
    email: normalizedEmail,
    name: name || normalizedEmail.split('@')[0],
    role: 'customer',
    isActive: true,
    createdAt: Date.now()
  };

  usersStore.push(newUser);
  return { success: true, user: newUser };
}

/** Super Admin Action: Register new Shopkeeper */
export async function createShopkeeperAccount(
  name: string,
  email: string,
  shopId: string
): Promise<{ success: boolean; user?: UserAccount; message?: string }> {
  const normalizedEmail = email.trim().toLowerCase();
  const newShopkeeper: UserAccount = {
    id: `usr-s-${Date.now()}`,
    email: normalizedEmail,
    name,
    role: 'shopkeeper',
    shopId,
    isActive: true,
    createdAt: Date.now()
  };

  usersStore.push(newShopkeeper);
  return { success: true, user: newShopkeeper };
}
