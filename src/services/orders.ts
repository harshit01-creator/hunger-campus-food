// Real-time order/receipt layer using Supabase.
// Implements Payment Status verification, Order Cancellation & QR-based auto handover confirmation.

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://YOUR_PROJECT_ID.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR_ANON_KEY';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export type OrderStatus = 'Pending' | 'Accepted' | 'Food Ready' | 'Completed' | 'Cancelled';
export type PaymentStatus = 'Paid' | 'Unpaid' | 'Pending' | 'Refund Pending' | 'Refunded';
export type PaymentMethod = 'Online UPI' | 'Cash on Handover';

export interface OrderDoc {
  orderId: string;
  shopId: string;
  shopName?: string;
  itemName?: string;
  slot?: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  transactionId?: string;
  paidAt?: number;
  grandTotal: number;
  foodCollected: boolean;
  qrToken: string;
  handedOverAt?: number;
  handedOverBy?: string;
  cancelledBy?: 'customer' | 'shopkeeper';
  cancelledAt?: number;
  cancellationReason?: string;
  createdAt: number;
  updatedAt: number;
}

const ORDERS = 'orders';

/** Subscribes to a single order document via Supabase Realtime. */
export function subscribeToOrder(orderId: string, onChange: (order: OrderDoc | null) => void) {
  const channel = supabase
    .channel(`order-${orderId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: ORDERS, filter: `orderId=eq.${orderId}` },
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
          .in('status', ['Pending', 'Accepted', 'Food Ready']);
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
  paymentMethod: PaymentMethod;
  isOnlineVerified?: boolean;
  transactionId?: string;
  appliedDiscount?: any;
}

export async function createOrder(input: CreateOrderInput): Promise<{orderId: string; qrToken: string; paymentStatus: PaymentStatus; transactionId?: string}> {
  const orderId = `HUNGER-${Math.floor(1000 + Math.random() * 9000)}`;
  const qrToken = `HUNGER-QR-${orderId}-${Date.now()}`;
  
  const isOnline = input.paymentMethod === 'Online UPI';
  const paymentStatus: PaymentStatus = isOnline ? (input.isOnlineVerified ? 'Paid' : 'Pending') : 'Unpaid';
  const transactionId = isOnline ? (input.transactionId || `UPI-TXN-${Math.floor(1000000000 + Math.random() * 9000000000)}`) : undefined;
  const paidAt = paymentStatus === 'Paid' ? Date.now() : undefined;

  await supabase.from(ORDERS).insert([{
    orderId,
    shopId: input.shopId,
    items: input.items,
    grandTotal: input.grandTotal,
    paymentMethod: input.paymentMethod,
    paymentStatus,
    transactionId,
    paidAt,
    status: 'Pending' as OrderStatus,
    foodCollected: false,
    qrToken,
    appliedDiscount: input.appliedDiscount || null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }]);

  return { orderId, qrToken, paymentStatus, transactionId };
}

/** Shopkeeper action: Accept Order (Locks order, moves status from Pending -> Accepted) */
export async function acceptOrder(orderId: string) {
  await supabase
    .from(ORDERS)
    .update({
      status: 'Accepted' as OrderStatus,
      updatedAt: Date.now(),
    })
    .eq('orderId', orderId);
}

/** Customer / Shopkeeper action: Cancel Order (Only valid while status === 'Pending') */
export async function cancelOrder(
  orderId: string, 
  cancelledBy: 'customer' | 'shopkeeper', 
  reason: string = 'User requested cancellation'
): Promise<{ success: boolean; message: string; refundStatus?: PaymentStatus }> {
  try {
    const { data: existing } = await supabase.from(ORDERS).select('*').eq('orderId', orderId).single();
    if (!existing) {
      return { success: false, message: 'Order not found.' };
    }

    if (existing.status !== 'Pending') {
      return { success: false, message: `Cannot cancel: Order is already '${existing.status}'!` };
    }

    let nextPaymentStatus = existing.paymentStatus;
    if (existing.paymentStatus === 'Paid') {
      nextPaymentStatus = 'Refund Pending';
    }

    await supabase
      .from(ORDERS)
      .update({
        status: 'Cancelled' as OrderStatus,
        paymentStatus: nextPaymentStatus,
        cancelledBy,
        cancelledAt: Date.now(),
        cancellationReason: reason,
        updatedAt: Date.now(),
      })
      .eq('orderId', orderId);

    return { 
      success: true, 
      message: `Order #${orderId} has been cancelled successfully.`, 
      refundStatus: nextPaymentStatus 
    };
  } catch (err: any) {
    return { success: false, message: `Cancellation error: ${err.message || 'Failed'}` };
  }
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

/** Shop owner manual action: Mark order as Paid (for Cash on Handover fallback). */
export async function markAsPaidByShopkeeper(orderId: string, shopOwnerName: string) {
  await supabase
    .from(ORDERS)
    .update({
      paymentStatus: 'Paid' as PaymentStatus,
      transactionId: `CASH-COLLECTED-BY-${shopOwnerName.toUpperCase().replace(/\s+/g, '-')}`,
      paidAt: Date.now(),
      updatedAt: Date.now(),
    })
    .eq('orderId', orderId);
}

export interface QrHandoverResult {
  success: boolean;
  message: string;
  orderId?: string;
  paymentStatus?: PaymentStatus;
  paymentMethod?: PaymentMethod;
  transactionId?: string;
  isUnpaidWarning?: boolean;
}

/** QR-BASED AUTO HANDOVER CONFIRMATION & PAYMENT STATUS CHECK */
export async function verifyAndProcessQrHandover(
  qrPayload: string,
  authenticatedShopId: string,
  scannedByShopOwner: string
): Promise<QrHandoverResult> {
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

    const typedOrder = orderData as OrderDoc;

    if (typedOrder.shopId !== authenticatedShopId) {
      return { success: false, message: `Access Denied: Order #${targetOrderId} belongs to another shop.` };
    }

    if (typedOrder.status === 'Completed' || typedOrder.foodCollected) {
      return { 
        success: false, 
        message: `Order #${targetOrderId} has ALREADY been marked as handed over.`,
        paymentStatus: typedOrder.paymentStatus,
        paymentMethod: typedOrder.paymentMethod,
        transactionId: typedOrder.transactionId
      };
    }

    if (typedOrder.status === 'Cancelled') {
      return {
        success: false,
        message: `Order #${targetOrderId} was CANCELLED by ${typedOrder.cancelledBy || 'user'}. Handover blocked.`,
        paymentStatus: typedOrder.paymentStatus,
        paymentMethod: typedOrder.paymentMethod
      };
    }

    if (typedOrder.status !== 'Food Ready') {
      return { 
        success: false, 
        message: `Order #${targetOrderId} is currently '${typedOrder.status}'. It must be marked 'Food Ready' before handover.`,
        paymentStatus: typedOrder.paymentStatus,
        paymentMethod: typedOrder.paymentMethod,
        transactionId: typedOrder.transactionId
      };
    }

    if (typedOrder.paymentStatus !== 'Paid') {
      return {
        success: false,
        isUnpaidWarning: true,
        message: `⚠️ PAYMENT NOT RECEIVED: Order #${targetOrderId} payment status is '${typedOrder.paymentStatus}' (${typedOrder.paymentMethod}). Please collect cash before handing over food!`,
        orderId: targetOrderId,
        paymentStatus: typedOrder.paymentStatus,
        paymentMethod: typedOrder.paymentMethod,
        transactionId: typedOrder.transactionId
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
      message: `🎉 Order #${targetOrderId} verified & marked as Handed Over! (Payment: PAID via ${typedOrder.transactionId || typedOrder.paymentMethod})`,
      orderId: targetOrderId,
      paymentStatus: 'Paid',
      paymentMethod: typedOrder.paymentMethod,
      transactionId: typedOrder.transactionId
    };

  } catch (err: any) {
    return { success: false, message: `Handover Error: ${err.message || 'QR Verification failed'}` };
  }
}
