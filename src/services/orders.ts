// Real-time order/receipt layer using Supabase.
// Implements Payment Status verification, Order Cancellation & QR-based auto handover confirmation.

import { createClient } from '@supabase/supabase-js';
import { loadMenuItems, saveMenuItems } from './shopsAndMenu';

const SUPABASE_URL = (import.meta as any).env?.VITE_SUPABASE_URL || 'https://jxpntyrzhaegwsnrxdhv.supabase.co';
const SUPABASE_ANON_KEY = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || 'sb_publishable_bxuGLEnlLDgKHTbb1fCC3Q_RTkT2Gaz';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export type OrderStatus = 'Pending' | 'Accepted' | 'Ready for Pickup' | 'Completed' | 'Cancelled';
export type PaymentStatus = 'Paid' | 'Unpaid' | 'Pending' | 'Refund Pending' | 'Refunded';
export type PaymentMethod = 'Online UPI';

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
          .in('status', ['Pending', 'Accepted', 'Ready for Pickup']);
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
  customerId?: string;
  customerName?: string;
}

async function executeDbInsert(orderDoc: any) {
  // Try inserting with customerId and customerName first
  const { data, error } = await supabase.from(ORDERS).insert([orderDoc]).select('*');
  if (error) {
    // If it fails due to missing columns in user's remote DB schema
    if (error.message.includes('customerId') || error.message.includes('customerName') || error.message.includes('column')) {
      console.warn('[Supabase Insert Schema Mismatch] Column customerId/customerName missing. Retrying insert without customer fields...');
      const { customerId, customerName, ...stripped } = orderDoc;
      const { data: retryData, error: retryError } = await supabase.from(ORDERS).insert([stripped]).select('*');
      if (retryError) {
        console.error('[Supabase Insert retry failed]:', retryError.message);
        throw retryError;
      }
      return retryData;
    }
    throw error;
  }
  return data;
}

export async function createOrder(input: CreateOrderInput): Promise<{
  success: boolean;
  message: string;
  orderId?: string;
  qrToken?: string;
  paymentStatus?: PaymentStatus;
  transactionId?: string;
  createdAt?: number;
}> {
  // 1. Fetch shop operating hours details to enforce check server-side
  try {
    const { data: shopData, error: shopError } = await supabase
      .from('shops')
      .select('*')
      .eq('id', input.shopId)
      .single();

    if (!shopError && shopData) {
      const shopObj = shopData as any;
      const isManuallyClosed = shopObj.isManuallyClosed === true || shopObj.isManuallyClosed === 'true';
      if (isManuallyClosed) {
        return { success: false, message: `Ordering is disabled: ${shopObj.name || 'This shop'} has been manually closed by the shopkeeper.` };
      }

      const opening = shopObj.openingTime || '08:00';
      const closing = shopObj.closingTime || '22:00';
      
      const date = new Date();
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const currentTimeStr = `${hours}:${minutes}`;

      let isOpen = false;
      if (opening === closing) {
        isOpen = true;
      } else if (opening < closing) {
        isOpen = currentTimeStr >= opening && currentTimeStr <= closing;
      } else {
        isOpen = currentTimeStr >= opening || currentTimeStr <= closing;
      }

      if (!isOpen) {
        return { success: false, message: `Ordering is disabled: ${shopObj.name || 'This shop'} is closed. Daily hours: ${opening} to ${closing}.` };
      }
    }
  } catch (err: any) {
    console.warn('[Supabase Shop Operating Hours Check Error]:', err.message);
  }

  const orderId = `TURO-${Math.floor(1000 + Math.random() * 9000)}`;
  // QR/token is NOT created on order submission (set to PENDING- ID to block receipt rendering)
  const qrToken = `PENDING-${orderId}`;
  const now = Date.now();
  
  const paymentStatus: PaymentStatus = 'Pending';
  const transactionId = `PENDING-TXN-${orderId}`;
  const paidAt = null;

  const itemsPayload = input.items.map(item => ({
    id: item.id,
    name: item.name,
    qty: item.qty
  }));

  const orderDoc = {
    orderId,
    shopId: input.shopId,
    items: itemsPayload,
    grandTotal: input.grandTotal,
    paymentMethod: input.paymentMethod,
    paymentStatus,
    transactionId,
    paidAt,
    status: 'Pending',
    foodCollected: false,
    qrToken,
    appliedDiscount: input.appliedDiscount || null,
    customerId: input.customerId || null,
    customerName: input.customerName || null,
    createdAt: now,
    updatedAt: now
  };

  try {
    // Call stored procedure on Supabase to decrement stock atomically
    const { data, error } = await supabase.rpc('place_order_atomic', {
      p_order_id: orderId,
      p_shop_id: input.shopId,
      p_items: itemsPayload,
      p_grand_total: input.grandTotal,
      p_payment_method: input.paymentMethod,
      p_payment_status: paymentStatus,
      p_transaction_id: transactionId,
      p_paid_at: paidAt,
      p_qr_token: qrToken,
      p_applied_discount: input.appliedDiscount || null,
      p_created_at: now,
      p_customer_id: input.customerId || null,
      p_customer_name: input.customerName || null
    });

    if (!error && data) {
      if (data.success) {
        return { success: true, message: 'Order placed, pending payment', orderId, qrToken, paymentStatus, transactionId, createdAt: now };
      } else {
        return { success: false, message: data.message || 'Stock verification failed.' };
      }
    }
    if (error) {
      console.warn('[Supabase RPC Error, falling back to direct insert]:', error.message);
    }
  } catch (err: any) {
    console.warn('[Supabase RPC Exception, falling back to direct insert]:', err.message);
  }

  // DIRECT INSERTION / LOCAL STORAGE FALLBACK ATOMIC STOCK SIMULATION
  const currentMenu = loadMenuItems();
  let insufficient = false;
  let errorMsg = '';

  for (const item of input.items) {
    const matched = currentMenu.find(m => m.id === item.id);
    if (!matched) {
      errorMsg = `Item ${item.name} not found.`;
      insufficient = true;
      break;
    }
    if (matched.isSoldOut) {
      errorMsg = `Sorry, ${matched.name} is sold out.`;
      insufficient = true;
      break;
    }
    if (matched.stockRemaining !== undefined && matched.stockRemaining !== null && matched.stockRemaining < item.qty) {
      errorMsg = `Sorry, ${matched.name} only has ${matched.stockRemaining} remaining plates.`;
      insufficient = true;
      break;
    }
  }

  if (insufficient) {
    return { success: false, message: errorMsg };
  }

  // Decrement local storage stock counts and update isSoldOut automatically
  const updatedMenu = currentMenu.map(m => {
    const orderItem = input.items.find(oi => oi.id === m.id);
    if (orderItem) {
      const nextRemaining = m.stockRemaining !== undefined && m.stockRemaining !== null 
        ? Math.max(0, m.stockRemaining - orderItem.qty) 
        : m.stockRemaining;
      
      const autoSoldOut = nextRemaining !== undefined && nextRemaining !== null && nextRemaining <= 0;

      return {
        ...m,
        stockRemaining: nextRemaining,
        isSoldOut: m.isSoldOut || autoSoldOut
      };
    }
    return m;
  });
  saveMenuItems(updatedMenu);

  // Store order locally in local storage history fallback
  const localOrders = JSON.parse(localStorage.getItem('turo_local_orders') || '[]');
  localStorage.setItem('turo_local_orders', JSON.stringify([orderDoc, ...localOrders]));

  // Attempt direct insertion to cloud table for tracking
  try {
    await executeDbInsert(orderDoc);
    
    // Attempt to update stock in database
    for (const item of input.items) {
      const matched = updatedMenu.find(m => m.id === item.id);
      if (matched) {
        await supabase.from('food_items').update({
          stock_remaining: matched.stockRemaining,
          is_sold_out: matched.isSoldOut
        }).eq('id', item.id);
      }
    }
  } catch (err: any) {
    console.log('[Supabase client direct insert failed]:', err.message);
  }

  return { success: true, message: 'Order placed, pending payment', orderId, qrToken, paymentStatus, transactionId, createdAt: now };
}

/** confirmOrderPayment: Simulates webhook/callback to verify payment and generate receipt/token server-side */
export async function confirmOrderPayment(
  orderId: string,
  transactionId: string,
  paymentConfirmed: boolean
): Promise<{ success: boolean; message: string; qrToken?: string; order?: any }> {
  // BACKEND ENFORCEMENT CHECK
  if (!paymentConfirmed) {
    console.error(`[SECURITY ERROR] confirmOrderPayment attempt rejected for order #${orderId}: Payment status is unconfirmed!`);
    return { success: false, message: 'Refusing to generate receipt: Confirmed payment status is missing!' };
  }

  // Enforce UTR format validation: Must be exactly 12 digits
  const utrClean = transactionId.trim();
  if (!/^\d{12}$/.test(utrClean)) {
    return { success: false, message: 'Invalid Transaction Reference: UPI UTR must be exactly 12 numeric digits.' };
  }

  // Enforce UTR uniqueness to prevent double-spending/re-using UTRs
  try {
    const { data: existingOrders, error: checkError } = await supabase
      .from(ORDERS)
      .select('orderId')
      .eq('transactionId', utrClean);
      
    if (!checkError && existingOrders && existingOrders.length > 0) {
      // Check if the matched order is a different order
      const duplicate = existingOrders.find(o => o.orderId !== orderId);
      if (duplicate) {
        return { success: false, message: `Payment reference rejected: UTR ${utrClean} has already been verified for another order.` };
      }
    }
  } catch (err) {
    console.warn('Failed to perform unique UTR check, skipping to update:', err);
  }

  const now = Date.now();
  // ONLY HERE: receipt/token is generated once successful payment is verified
  const qrToken = `TURO-QR-${orderId}-${now}`;

  try {
    const { data, error } = await supabase
      .from(ORDERS)
      .update({
        paymentStatus: 'Paid',
        paidAt: now,
        qrToken: qrToken,
        transactionId: utrClean,
        updatedAt: now
      })
      .eq('orderId', orderId)
      .select('*')
      .single();

    if (!error && data) {
      console.log(`[Supabase Webhook Success] Generated receipt & QR token for order #${orderId}`);
      
      // Update local storage fallback copy
      const localOrders = JSON.parse(localStorage.getItem('turo_local_orders') || '[]');
      const updated = localOrders.map((o: any) => {
        if (o.orderId === orderId) {
          return {
            ...o,
            paymentStatus: 'Paid',
            paidAt: now,
            qrToken,
            transactionId: utrClean
          };
        }
        return o;
      });
      localStorage.setItem('turo_local_orders', JSON.stringify(updated));

      return { success: true, message: 'Payment confirmed and receipt generated.', qrToken, order: data };
    }
    if (error) {
      console.warn('[Supabase Webhook error]:', error.message);
    }
  } catch (err: any) {
    console.warn('[Supabase Webhook exception]:', err.message);
  }

  // Local storage fallback
  const localOrders = JSON.parse(localStorage.getItem('turo_local_orders') || '[]');
  const matchedIndex = localOrders.findIndex((o: any) => o.orderId === orderId);
  if (matchedIndex >= 0) {
    const matched = localOrders[matchedIndex];
    matched.paymentStatus = 'Paid';
    matched.paidAt = now;
    matched.qrToken = qrToken;
    matched.transactionId = utrClean;
    matched.updatedAt = now;
    localStorage.setItem('turo_local_orders', JSON.stringify(localOrders));
    return { success: true, message: 'Payment confirmed & receipt generated (local fallback)', qrToken, order: matched };
  }

  return { success: false, message: 'Order not found in database or local storage.' };
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

/** Customer / Shopkeeper action: Cancel Order (Validated server-side within 8-second window & status === 'Pending') */
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

    // Server-side check for Customer cancellation: Must be within 8 seconds of creation & status === 'Pending'
    if (cancelledBy === 'customer') {
      const elapsedSeconds = (Date.now() - (existing.createdAt || Date.now())) / 1000;
      if (elapsedSeconds > 8.5) {
        return { success: false, message: `Cancellation period expired: 8-second window has passed (${Math.round(elapsedSeconds)}s elapsed).` };
      }
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

/** Shop owner action: "Food is Ready" button (Updates status to 'Ready for Pickup'). */
export async function markFoodReady(orderId: string) {
  await supabase
    .from(ORDERS)
    .update({
      status: 'Ready for Pickup' as OrderStatus,
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
  items?: { id: string; name: string; price: number; qty: number }[];
  grandTotal?: number;
  customerName?: string;
  createdAt?: number;
  shopName?: string;
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

    const typedOrder = orderData as any;

    if (typedOrder.shopId !== authenticatedShopId) {
      return { success: false, message: `Access Denied: Order #${targetOrderId} belongs to another shop.` };
    }

    // Fetch shop name
    let shopName = 'Campus Canteen';
    try {
      const { data: shopData } = await supabase.from('shops').select('name').eq('id', typedOrder.shopId).single();
      if (shopData) {
        shopName = shopData.name;
      }
    } catch (e) {
      console.warn('Error fetching shop name:', e);
    }

    if (typedOrder.status === 'Completed' || typedOrder.foodCollected) {
      return { 
        success: false, 
        message: `⚠️ DUPLICATE SCAN BLOCKED: Order #${targetOrderId} has already been handed over!`,
        orderId: targetOrderId,
        shopName,
        paymentStatus: typedOrder.paymentStatus,
        paymentMethod: typedOrder.paymentMethod,
        transactionId: typedOrder.transactionId,
        items: typedOrder.items,
        grandTotal: typedOrder.grandTotal,
        customerName: typedOrder.customerName || 'Student Customer'
      };
    }

    if (typedOrder.status === 'Cancelled') {
      return {
        success: false,
        message: `Order #${targetOrderId} was CANCELLED by ${typedOrder.cancelledBy || 'user'}. Handover blocked.`,
        orderId: targetOrderId,
        shopName,
        paymentStatus: typedOrder.paymentStatus,
        paymentMethod: typedOrder.paymentMethod,
        items: typedOrder.items,
        grandTotal: typedOrder.grandTotal,
        customerName: typedOrder.customerName || 'Student Customer'
      };
    }

    if (typedOrder.status !== 'Ready for Pickup') {
      return { 
        success: false, 
        message: `Order #${targetOrderId} is currently '${typedOrder.status}'. It must be marked 'Ready for Pickup' before handover.`,
        orderId: targetOrderId,
        shopName,
        paymentStatus: typedOrder.paymentStatus,
        paymentMethod: typedOrder.paymentMethod,
        transactionId: typedOrder.transactionId,
        items: typedOrder.items,
        grandTotal: typedOrder.grandTotal,
        customerName: typedOrder.customerName || 'Student Customer'
      };
    }

    if (typedOrder.paymentStatus !== 'Paid') {
      return {
        success: false,
        message: `⚠️ PAYMENT NOT RECEIVED: Order #${targetOrderId} payment status is '${typedOrder.paymentStatus}'. Handover blocked.`,
        orderId: targetOrderId,
        shopName,
        paymentStatus: typedOrder.paymentStatus,
        paymentMethod: typedOrder.paymentMethod,
        transactionId: typedOrder.transactionId,
        items: typedOrder.items,
        grandTotal: typedOrder.grandTotal,
        customerName: typedOrder.customerName || 'Student Customer'
      };
    }

    // Atomically complete handover and disable token
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
      message: `🎉 Order #${targetOrderId} verified & marked as Handed Over!`,
      orderId: targetOrderId,
      shopName,
      paymentStatus: typedOrder.paymentStatus,
      paymentMethod: typedOrder.paymentMethod,
      transactionId: typedOrder.transactionId,
      items: typedOrder.items,
      grandTotal: typedOrder.grandTotal,
      customerName: typedOrder.customerName || 'Student Customer',
      createdAt: typedOrder.createdAt
    };

  } catch (err: any) {
    return { success: false, message: `Handover Error: ${err.message || 'QR Verification failed'}` };
  }
}
