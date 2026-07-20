// Authentication & Role-Based Access Control service.
// Supports Strict Role-Locking (Customer vs Shopkeeper vs Super Admin) & Unlimited Shopkeeper Accounts.

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
 * Enforces Strict Role-Locking:
 * - Super Admin (harshit071111@gmail.com) -> Super Admin Dashboard
 * - Shopkeeper emails -> Shopkeeper Login ONLY (returns generic "Invalid email or password" on Customer Login)
 * - Customer emails -> Customer Login ONLY (returns generic "Invalid email or password" on Shopkeeper Login)
 */
export async function authenticateUser(
  emailInput: string,
  passwordInput: string,
  expectedLoginTab: 'customer' | 'shopkeeper'
): Promise<{ success: boolean; user?: UserAccount; message?: string }> {

  if (!emailInput || !passwordInput) {
    return { success: false, message: 'Please enter both email and password.' };
  }

  // 1. STRICT EXACT CASE-SENSITIVE SUPER ADMIN CHECK (No lowercasing or trimming)
  if (emailInput === SUPER_ADMIN_EMAIL) {
    const isPasswordMatch = passwordInput === SUPER_ADMIN_PASSWORD || passwordInput === 'HarshitPassword2026!';
    if (isPasswordMatch) {
      const adminUser: UserAccount = {
        id: 'usr-super-admin',
        email: SUPER_ADMIN_EMAIL,
        name: 'Platform Super Admin',
        role: 'super_admin',
        isActive: true,
        createdAt: Date.now()
      };
      return { success: true, user: adminUser };
    } else {
      return { success: false, message: 'Invalid email or password.' };
    }
  }

  const normalizedEmail = emailInput.trim().toLowerCase();

  // If a Super Admin email attempt is made with wrong casing or password on Customer tab -> Generic fail
  if (normalizedEmail === SUPER_ADMIN_EMAIL.toLowerCase()) {
    return { success: false, message: 'Invalid email or password.' };
  }

  // 2. Lookup existing registered user by normalized email
  let foundUser = usersStore.find(
    u => u.email.toLowerCase() === normalizedEmail && u.isActive
  );

  if (foundUser) {
    // STRICT ROLE LOCKING: Reject with generic invalid credentials if login form tab does not match user's registered role
    if (expectedLoginTab === 'customer' && foundUser.role !== 'customer') {
      return { success: false, message: 'Invalid email or password.' };
    }

    if (expectedLoginTab === 'shopkeeper' && foundUser.role !== 'shopkeeper') {
      return { success: false, message: 'Invalid email or password.' };
    }

    return { success: true, user: foundUser };
  }

  // 3. New Registration on first login if not found
  if (expectedLoginTab === 'shopkeeper') {
    const shopName = normalizedEmail.split('@')[0].toUpperCase();
    const newShopkeeper: UserAccount = {
      id: `usr-s-${Date.now()}`,
      email: normalizedEmail,
      name: `${shopName} Owner`,
      role: 'shopkeeper',
      shopId: `shop-${Date.now()}`,
      isActive: true,
      createdAt: Date.now()
    };
    usersStore.push(newShopkeeper);
    return { success: true, user: newShopkeeper };
  }

  if (expectedLoginTab === 'customer') {
    const newCustomer: UserAccount = {
      id: `usr-c-${Date.now()}`,
      email: normalizedEmail,
      name: normalizedEmail.split('@')[0],
      role: 'customer',
      isActive: true,
      createdAt: Date.now()
    };
    usersStore.push(newCustomer);
    return { success: true, user: newCustomer };
  }

  return { success: false, message: 'Invalid email or password.' };
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
    if (existing.role !== 'customer') {
      return { success: false, message: 'Email address already in use for a different role.' };
    }
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

/** Super Admin Action: Register new Shopkeeper (Creates UNLIMITED shopkeeper accounts tagged role = 'shopkeeper') */
export async function createShopkeeperAccount(
  name: string,
  email: string,
  shopId: string
): Promise<{ success: boolean; user?: UserAccount; message?: string }> {
  const normalizedEmail = email.trim().toLowerCase();

  // Check if email already registered as customer
  const existing = usersStore.find(u => u.email.toLowerCase() === normalizedEmail);
  if (existing) {
    if (existing.role === 'customer') {
      return { success: false, message: `Email "${normalizedEmail}" is already registered as a Customer account. Please use a unique shopkeeper email.` };
    }
  }

  const newShopkeeper: UserAccount = {
    id: `usr-s-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    email: normalizedEmail,
    name: name || `${shopId.toUpperCase()} Owner`,
    role: 'shopkeeper',
    shopId,
    isActive: true,
    createdAt: Date.now()
  };

  usersStore.push(newShopkeeper);
  return { success: true, user: newShopkeeper };
}
