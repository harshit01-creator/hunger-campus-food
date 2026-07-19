// Real-time order/receipt layer using Supabase.
// Implements QR-based auto handover confirmation (NO manual handover button).

import { createClient } from '@supabase/supabase-js';

// Replace with your actual Supabase URL & Public Anon Key from your Supabase Dashboard
const SUPABASE_URL = 'https://YOUR_PROJECT_ID.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR_ANON_KEY';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export type OrderStatus = 'Order Confirmed' | 'Being Prepared' | 'Food Ready' | 'Completed';

export interface OrderDoc {
  orderId: string;
  shopId: string;
  shopName?: string;
  itemName?: string;
  slot?: string;
  status: OrderStatus;
  paymentStatus: 'Paid' | 'Pending' | 'Failed';
  paymentMethod?: string;
  grandTotal: number;
  foodCollected: boolean;
  qrToken: string;
  handedOverAt?: number;
  handedOverBy?: string;
  createdAt: number;
  updatedAt: number;
}

const ORDERS = 'orders';

/**
 * Subscribes to a single order document via Supabase Realtime.
 * Fires the callback instantly on every status change.
 */
export function subscribeToOrder(orderId: string, onChange: (order: OrderDoc | null) => void) {
  const channel = supabase
    .channel(`order-${orderId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: ORDERS, filter: `id=eq.${orderId}` },
      (payload) => {
        onChange(payload.new as OrderDoc);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/** Shop-owner view: live list of active orders for a shop via Supabase Realtime. */
export function subscribeToShopOrders(shopId: string, onChange: (orders: OrderDoc[]) => void) {
  const channel = supabase
    .channel(`shop-orders-${shopId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: ORDERS, filter: `shopId=eq.${shopId}` },
      async () => {
        const { data } = await supabase
          .from(ORDERS)
          .select('*')
          .eq('shopId', shopId)
          .in('status', ['Order Confirmed', 'Being Prepared', 'Food Ready']);
        onChange((data as OrderDoc[]) || []);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

interface CreateOrderInput {
  shopId: string;
  items: {id: string; name: string; price: number; qty: number}[];
  grandTotal: number;
  paymentMethod: 'upi' | 'card' | 'netbanking';
}

export async function createOrder(input: CreateOrderInput): Promise<{orderId: string; qrToken: string}> {
  const orderId = `HUNGER-${Math.floor(1000 + Math.random() * 9000)}`;
  const qrToken = `HUNGER-QR-${orderId}-${Date.now()}`;
  
  await supabase.from(ORDERS).insert([{
    orderId,
    shopId: input.shopId,
    items: input.items,
    grandTotal: input.grandTotal,
    paymentMethod: input.paymentMethod,
    status: 'Order Confirmed' as OrderStatus,
    paymentStatus: 'Paid',
    foodCollected: false,
    qrToken,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }]);

  return {orderId, qrToken};
}

/** Shop owner action: "Food Ready" button. */
export async function markFoodReady(orderId: string) {
  await supabase
    .from(ORDERS)
    .update({
      status: 'Food Ready' as OrderStatus,
      updatedAt: Date.now(),
    })
    .eq('orderId', orderId);
}

/**
 * QR-BASED AUTO HANDOVER CONFIRMATION (REPLACES MANUAL BUTTON)
 * Scans and validates the customer's QR code token.
 */
export async function verifyAndProcessQrHandover(
  qrPayload: string,
  authenticatedShopId: string,
  scannedByShopOwner: string
): Promise<{success: boolean; message: string; orderId?: string}> {
  try {
    let parsed: any;
    try {
      parsed = JSON.parse(qrPayload);
    } catch {
      parsed = { orderId: qrPayload.trim() };
    }

    const targetOrderId = parsed.orderId || parsed.id || qrPayload.trim();
    if (!targetOrderId) {
      return { success: false, message: 'Invalid QR Code payload format.' };
    }

    const { data: orderData, error } = await supabase
      .from(ORDERS)
      .select('*')
      .eq('orderId', targetOrderId)
      .single();

    if (error || !orderData) {
      return { success: false, message: `Order #${targetOrderId} not found in database.` };
    }

    if (orderData.shopId !== authenticatedShopId) {
      return { success: false, message: `Access Denied: Order #${targetOrderId} belongs to another shop.` };
    }

    if (orderData.status === 'Completed' || orderData.foodCollected) {
      return { success: false, message: `Order #${targetOrderId} has ALREADY been marked as handed over.` };
    }

    if (orderData.status !== 'Food Ready') {
      return { 
        success: false, 
        message: `Order #${targetOrderId} is currently '${orderData.status}'. It must be marked 'Food Ready' before handover.` 
      };
    }

    await supabase
      .from(ORDERS)
      .update({
        status: 'Completed' as OrderStatus,
        foodCollected: true,
        handedOverAt: Date.now(),
        handedOverBy: scannedByShopOwner,
        updatedAt: Date.now(),
      })
      .eq('orderId', targetOrderId);

    return { 
      success: true, 
      message: `🎉 Order #${targetOrderId} verified and marked as Handed Over!`,
      orderId: targetOrderId 
    };

  } catch (err: any) {
    return { success: false, message: `Handover Error: ${err.message || 'QR Verification failed'}` };
  }
}
