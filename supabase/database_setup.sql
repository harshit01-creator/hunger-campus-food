-- ======================================================================
-- HUNGER CAMPUS FOOD - COMPLETE DATABASE SETUP & MIGRATION SCRIPT
-- Run this script in the Supabase SQL Editor (Dashboard -> SQL Editor)
-- ======================================================================

-- 1. CREATE SHOPS TABLE
CREATE TABLE IF NOT EXISTS public.shops (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    "upiId" TEXT NOT NULL,
    "qrImageUrl" TEXT NOT NULL,
    rating NUMERIC DEFAULT 4.8
);

-- 2. CREATE FOOD ITEMS TABLE WITH STOCK AVAILABILITY CONTROLS
CREATE TABLE IF NOT EXISTS public.food_items (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    price NUMERIC NOT NULL,
    rating NUMERIC DEFAULT 4.5,
    "prepTime" TEXT NOT NULL,
    image TEXT NOT NULL,
    "isVeg" BOOLEAN DEFAULT true,
    "shopId" TEXT REFERENCES public.shops(id) ON DELETE CASCADE,
    "shopName" TEXT NOT NULL,
    description TEXT NOT NULL,
    "isAvailable" BOOLEAN DEFAULT true,
    "availableFrom" TEXT,
    "availableUntil" TEXT,
    "isSpecial" BOOLEAN DEFAULT false,
    is_sold_out BOOLEAN DEFAULT false,
    stock_limit INTEGER DEFAULT NULL,
    stock_remaining INTEGER DEFAULT NULL
);

-- 3. CREATE USER ACCOUNTS TABLE
CREATE TABLE IF NOT EXISTS public.user_accounts (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('customer', 'shopkeeper', 'super_admin')),
    "shopId" TEXT REFERENCES public.shops(id) ON DELETE SET NULL,
    "isActive" BOOLEAN DEFAULT true,
    "createdAt" BIGINT NOT NULL,
    password TEXT
);

-- 4. CREATE DISCOUNTS TABLE
CREATE TABLE IF NOT EXISTS public.discounts (
    id TEXT PRIMARY KEY,
    "shopId" TEXT REFERENCES public.shops(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    title TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('percentage', 'flat')),
    value NUMERIC NOT NULL,
    "appliesTo" TEXT NOT NULL CHECK ("appliesTo" IN ('shop', 'category', 'items')),
    "categoryName" TEXT,
    "itemIds" TEXT[],
    "validFrom" TEXT NOT NULL,
    "validUntil" TEXT NOT NULL,
    "isActive" BOOLEAN DEFAULT true,
    "createdAt" BIGINT NOT NULL
);

-- 5. UPDATE ORDERS TABLE FOR COMPLETE SCHEMA
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS "transactionId" TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS "paidAt" BIGINT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS "appliedDiscount" JSONB;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS "customerId" TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS "customerName" TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS "handedOverBy" TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS "cancelledBy" TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS "cancelledAt" BIGINT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS "cancellationReason" TEXT;

-- 6. CONFIGURE ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.food_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Shops Read/Write Policies
DROP POLICY IF EXISTS "Enable read access for all users" ON public.shops;
DROP POLICY IF EXISTS "Enable write access for super admins" ON public.shops;
DROP POLICY IF EXISTS "Enable insert for super admins only" ON public.shops;
DROP POLICY IF EXISTS "Enable update for super admins or owners" ON public.shops;
DROP POLICY IF EXISTS "Enable delete for super admins only" ON public.shops;

CREATE POLICY "Enable read access for all users" ON public.shops FOR SELECT USING (true);

CREATE POLICY "Enable insert for super admins only" ON public.shops
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_accounts
      WHERE email = auth.jwt() ->> 'email' AND role = 'super_admin'
    )
  );

CREATE POLICY "Enable update for super admins or owners" ON public.shops
  FOR UPDATE
  TO authenticated
  USING (
    (auth.jwt() ->> 'email' = email) OR 
    (EXISTS (
      SELECT 1 FROM public.user_accounts 
      WHERE email = auth.jwt() ->> 'email' AND role = 'super_admin'
    ))
  );

CREATE POLICY "Enable delete for super admins only" ON public.shops
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_accounts 
      WHERE email = auth.jwt() ->> 'email' AND role = 'super_admin'
    )
  );

-- Food Items Read/Write Policies
DROP POLICY IF EXISTS "Enable read access for all users" ON public.food_items;
CREATE POLICY "Enable read access for all users" ON public.food_items FOR SELECT USING (true);
CREATE POLICY "Enable write access for authenticated users" ON public.food_items FOR ALL USING (true);

-- User Accounts Read/Write Policies
DROP POLICY IF EXISTS "Enable read access for all users" ON public.user_accounts;
CREATE POLICY "Enable read access for all users" ON public.user_accounts FOR SELECT USING (true);
CREATE POLICY "Enable write access for all users" ON public.user_accounts FOR ALL USING (true);

-- Discounts Read/Write Policies
DROP POLICY IF EXISTS "Enable read access for all users" ON public.discounts;
CREATE POLICY "Enable read access for all users" ON public.discounts FOR SELECT USING (true);
CREATE POLICY "Enable write access for all users" ON public.discounts FOR ALL USING (true);

-- Orders Read/Write Policies
DROP POLICY IF EXISTS "Enable read access for orders table" ON public.orders;
CREATE POLICY "Enable read access for orders table" ON public.orders FOR SELECT USING (true);
CREATE POLICY "Enable write access for all users" ON public.orders FOR ALL USING (true);

-- 7. ATOMIC ORDER PLACEMENT STORED FUNCTION
CREATE OR REPLACE FUNCTION place_order_atomic(
  p_order_id TEXT,
  p_shop_id TEXT,
  p_items JSONB,
  p_grand_total NUMERIC,
  p_payment_method TEXT,
  p_payment_status TEXT,
  p_transaction_id TEXT,
  p_paid_at BIGINT,
  p_qr_token TEXT,
  p_applied_discount JSONB,
  p_created_at BIGINT,
  p_customer_id TEXT DEFAULT NULL,
  p_customer_name TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_item RECORD;
  v_stock RECORD;
  v_insufficient BOOLEAN := FALSE;
  v_error_msg TEXT := '';
BEGIN
  -- Loop through each item in the order to verify stock
  FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(id TEXT, name TEXT, qty INT) LOOP
    SELECT is_sold_out, stock_remaining, name INTO v_stock FROM food_items WHERE id = v_item.id FOR UPDATE;
    
    IF NOT FOUND THEN
      v_error_msg := 'Item ' || v_item.name || ' not found.';
      v_insufficient := TRUE;
      EXIT;
    END IF;
    
    IF v_stock.is_sold_out THEN
      v_error_msg := 'Sorry, ' || v_stock.name || ' is sold out.';
      v_insufficient := TRUE;
      EXIT;
    END IF;
    
    IF v_stock.stock_remaining IS NOT NULL AND v_stock.stock_remaining < v_item.qty THEN
      v_error_msg := 'Sorry, ' || v_stock.name || ' only has ' || v_stock.stock_remaining || ' remaining plates.';
      v_insufficient := TRUE;
      EXIT;
    END IF;
  END LOOP;
  
  IF v_insufficient THEN
    RETURN jsonb_build_object('success', FALSE, 'message', v_error_msg);
  END IF;
  
  -- Decrement stock and update is_sold_out automatically if remaining reaches 0
  FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(id TEXT, name TEXT, qty INT) LOOP
    UPDATE food_items 
    SET 
      stock_remaining = CASE 
        WHEN stock_remaining IS NOT NULL THEN stock_remaining - v_item.qty 
        ELSE stock_remaining 
      END,
      is_sold_out = CASE 
        WHEN stock_remaining IS NOT NULL AND stock_remaining - v_item.qty <= 0 THEN TRUE 
        ELSE is_sold_out 
      END
    WHERE id = v_item.id;
  END LOOP;
  
  -- Insert the order
  INSERT INTO orders (
    "orderId", "shopId", items, "grandTotal", "paymentMethod", "paymentStatus", 
    "transactionId", "paidAt", status, "foodCollected", "qrToken", 
    "appliedDiscount", "createdAt", "updatedAt", "customerId", "customerName"
  ) VALUES (
    p_order_id, p_shop_id, p_items, p_grand_total, p_payment_method, p_payment_status, 
    p_transaction_id, p_paid_at, 'Pending', FALSE, p_qr_token, 
    p_applied_discount, p_created_at, p_created_at, p_customer_id, p_customer_name
  );
  
  RETURN jsonb_build_object('success', TRUE, 'message', 'Order placed successfully');
END;
$$ LANGUAGE plpgsql;
