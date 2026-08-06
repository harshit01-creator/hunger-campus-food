-- 1. ALTER TABLE to add stock columns
ALTER TABLE food_items ADD COLUMN IF NOT EXISTS is_sold_out BOOLEAN DEFAULT false NOT null;
ALTER TABLE food_items ADD COLUMN IF NOT EXISTS stock_limit INTEGER DEFAULT null;
ALTER TABLE food_items ADD COLUMN IF NOT EXISTS stock_remaining INTEGER DEFAULT null;

-- Drop NOT NULL constraints on shops payment settings to support null/cleared configurations
ALTER TABLE shops ALTER COLUMN "upiId" DROP NOT NULL;
ALTER TABLE shops ALTER COLUMN "qrImageUrl" DROP NOT NULL;

-- 2. CREATE SUPABASE STORAGE BUCKET FOR CUSTOM QR CODES
INSERT INTO storage.buckets (id, name, public) 
VALUES ('qrcodes', 'qrcodes', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for the bucket (allow public reads, restrict uploads to authenticated users)
DROP POLICY IF EXISTS "Public access to QR codes" ON storage.objects;
CREATE POLICY "Public access to QR codes" ON storage.objects 
  FOR SELECT USING (bucket_id = 'qrcodes');

DROP POLICY IF EXISTS "Shopkeeper upload custom QR" ON storage.objects;
CREATE POLICY "Shopkeeper upload custom QR" ON storage.objects 
  FOR INSERT WITH CHECK (
    bucket_id = 'qrcodes' AND 
    (auth.role() = 'authenticated')
  );

DROP POLICY IF EXISTS "Shopkeeper delete custom QR" ON storage.objects;
CREATE POLICY "Shopkeeper delete custom QR" ON storage.objects 
  FOR DELETE USING (
    bucket_id = 'qrcodes' AND 
    (auth.role() = 'authenticated')
  );

-- 3. ADD OPERATING HOURS COLUMNS TO SHOPS TABLE
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS "openingTime" TEXT DEFAULT '08:00';
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS "closingTime" TEXT DEFAULT '22:00';
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS "isManuallyClosed" BOOLEAN DEFAULT false;

-- 4. CREATE STORED PROCEDURE FOR ATOMIC ORDER PLACEMENT
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

-- 3. ENFORCE ROW LEVEL SECURITY (RLS) POLICIES FOR SHOPS, MENU, AND ORDERS

-- Disable and recreate policies for Shops table
ALTER TABLE shops ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read access for all users" ON shops;
DROP POLICY IF EXISTS "Allow select for all" ON shops;
DROP POLICY IF EXISTS "Shops read policy" ON shops;
DROP POLICY IF EXISTS "Shops write policy" ON shops;
DROP POLICY IF EXISTS "Enable insert for super admins only" ON shops;
DROP POLICY IF EXISTS "Enable update for super admins or owners" ON shops;
DROP POLICY IF EXISTS "Enable delete for super admins only" ON shops;

CREATE POLICY "Enable read access for all users" ON shops FOR SELECT USING (true);

CREATE POLICY "Enable insert for super admins only" ON shops
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_accounts
      WHERE email = auth.jwt() ->> 'email' AND role = 'super_admin'
    )
  );

CREATE POLICY "Enable update for super admins or owners" ON shops
  FOR UPDATE
  TO authenticated
  USING (
    (auth.jwt() ->> 'email' = email) OR 
    (EXISTS (
      SELECT 1 FROM public.user_accounts 
      WHERE email = auth.jwt() ->> 'email' AND role = 'super_admin'
    ))
  );

CREATE POLICY "Enable delete for super admins only" ON shops
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_accounts 
      WHERE email = auth.jwt() ->> 'email' AND role = 'super_admin'
    )
  );

-- Disable and recreate policies for Food Items table
ALTER TABLE food_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read access for all users" ON food_items;
DROP POLICY IF EXISTS "Allow select for all" ON food_items;
DROP POLICY IF EXISTS "Food items read policy" ON food_items;
DROP POLICY IF EXISTS "Food items write policy" ON food_items;
CREATE POLICY "Enable read access for all users" ON food_items FOR SELECT USING (true);
CREATE POLICY "Enable insert for authenticated users" ON food_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for shopkeepers and admins" ON food_items FOR UPDATE USING (true);
CREATE POLICY "Enable delete for shopkeepers and admins" ON food_items FOR DELETE USING (true);

-- Disable and recreate policies for Orders table
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Orders read policy" ON orders;
DROP POLICY IF EXISTS "Orders write policy" ON orders;
DROP POLICY IF EXISTS "Allow select for owners and customers" ON orders;
CREATE POLICY "Enable read access for orders table" ON orders FOR SELECT USING (true);
CREATE POLICY "Enable insert for all users" ON orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for all users" ON orders FOR UPDATE USING (true);
CREATE POLICY "Enable delete for all users" ON orders FOR DELETE USING (true);

