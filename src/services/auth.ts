// Authentication & Role-Based Access Control service.
// Supports Hidden Super Admin Access via Customer Login form for 'harshit071111@gmail.com'.

export type UserRole = 'customer' | 'shopkeeper' | 'super_admin';

export interface UserAccount {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  shopId?: string; // Assigned shop for shopkeeper role
  isActive: boolean;
  createdAt: number;
}

export const SUPER_ADMIN_EMAIL = 'harshit071111@gmail.com';
export const SUPER_ADMIN_PASSWORD = 'HarshitPassword2026!';

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
    id: 'usr-shop-3',
    email: 'sipsnack@kpr.edu',
    name: 'Sip & Snack Express Owner',
    role: 'shopkeeper',
    shopId: 'shop-3',
    isActive: true,
    createdAt: Date.now()
  },
  {
    id: 'usr-shop-4',
    email: 'grill@kpr.edu',
    name: 'Campus Grill House Owner',
    role: 'shopkeeper',
    shopId: 'shop-4',
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
 * Checks email against reserved super admin email 'harshit071111@gmail.com'.
 * Seamlessly authenticates Super Admin via Customer Login form.
 */
export async function authenticateUser(
  emailInput: string,
  passwordInput: string,
  expectedLoginTab: 'customer' | 'shopkeeper'
): Promise<{ success: boolean; user?: UserAccount; message?: string }> {
  const normalizedEmail = emailInput.trim().toLowerCase();

  if (!normalizedEmail || !passwordInput) {
    return { success: false, message: 'Please enter both email and password.' };
  }

  // HIDDEN SUPER ADMIN LOGIN INTERCEPTION (Triggers on harshit071111@gmail.com)
  if (normalizedEmail === SUPER_ADMIN_EMAIL.toLowerCase()) {
    const adminUser: UserAccount = {
      id: 'usr-super-admin',
      email: SUPER_ADMIN_EMAIL,
      name: 'Platform Super Admin',
      role: 'super_admin',
      isActive: true,
      createdAt: Date.now()
    };
    return { success: true, user: adminUser };
  }

  // Standard user lookup
  let foundUser = usersStore.find(
    u => u.email.toLowerCase() === normalizedEmail && u.isActive
  );

  // If logging in on Shopkeeper tab and email not found, auto-create a Shopkeeper account
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

  // If logging in on Customer tab and email not found, auto-create a Customer account
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

/** Super Admin Action: Deactivate Shopkeeper */
export async function deactivateShopkeeper(userId: string): Promise<boolean> {
  const idx = usersStore.findIndex(u => u.id === userId);
  if (idx !== -1) {
    usersStore[idx].isActive = false;
    return true;
  }
  return false;
}

export function getAllShopkeepers(): UserAccount[] {
  return usersStore.filter(u => u.role === 'shopkeeper' && u.isActive);
}
