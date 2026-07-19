// Real-time order/receipt layer.
// Implements QR-based auto handover confirmation (NO manual handover button).

import firestore from '@react-native-firebase/firestore';

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
 * Subscribes to a single order document. Fires the callback instantly on
 * every status change. Returns an unsubscribe fn.
 */
export function subscribeToOrder(orderId: string, onChange: (order: OrderDoc | null) => void) {
  return firestore()
    .collection(ORDERS)
    .doc(orderId)
    .onSnapshot(
      snap => onChange(snap.exists ? ({orderId: snap.id, ...snap.data()} as OrderDoc) : null),
      err => console.warn('[orders] onSnapshot error', err),
    );
}

/** Shop-owner view: live list of active orders for a shop. */
export function subscribeToShopOrders(shopId: string, onChange: (orders: OrderDoc[]) => void) {
  return firestore()
    .collection(ORDERS)
    .where('shopId', '==', shopId)
    .where('status', 'in', ['Order Confirmed', 'Being Prepared', 'Food Ready'])
    .onSnapshot(
      snap => onChange(snap.docs.map(d => ({orderId: d.id, ...d.data()} as OrderDoc))),
      err => console.warn('[orders] shop onSnapshot error', err),
    );
}

interface CreateOrderInput {
  shopId: string;
  items: {id: string; name: string; price: number; qty: number}[];
  grandTotal: number;
  paymentMethod: 'upi' | 'card' | 'netbanking';
}

export async function createOrder(input: CreateOrderInput): Promise<{orderId: string; qrToken: string}> {
  const ref = firestore().collection(ORDERS).doc();
  const qrToken = `OKKPR-QR-${ref.id}-${Date.now()}`;
  await ref.set({
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
  });
  return {orderId: ref.id, qrToken};
}

/** Shop owner action: "Food Ready" button. */
export async function markFoodReady(orderId: string) {
  await firestore().collection(ORDERS).doc(orderId).update({
    status: 'Food Ready' as OrderStatus,
    updatedAt: Date.now(),
  });
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
      // Fallback: check if raw order ID or string token was passed
      parsed = { orderId: qrPayload };
    }

    const targetOrderId = parsed.orderId || parsed.id || qrPayload;
    if (!targetOrderId) {
      return { success: false, message: 'Invalid QR Code payload format.' };
    }

    const docRef = firestore().collection(ORDERS).doc(targetOrderId);
    const snap = await docRef.get();

    if (!snap.exists) {
      return { success: false, message: `Order #${targetOrderId} not found in database.` };
    }

    const orderData = snap.data() as OrderDoc;

    // Check shop authorization
    if (orderData.shopId !== authenticatedShopId) {
      return { success: false, message: `Access Denied: Order #${targetOrderId} belongs to another shop.` };
    }

    // Check if already handed over
    if (orderData.status === 'Completed' || orderData.foodCollected) {
      return { success: false, message: `Order #${targetOrderId} has ALREADY been marked as handed over.` };
    }

    // Check if order is ready
    if (orderData.status !== 'Food Ready') {
      return { 
        success: false, 
        message: `Order #${targetOrderId} is currently '${orderData.status}'. It must be marked 'Food Ready' before handover.` 
      };
    }

    // Execute automatic handover
    await docRef.update({
      status: 'Completed' as OrderStatus,
      foodCollected: true,
      handedOverAt: Date.now(),
      handedOverBy: scannedByShopOwner,
      updatedAt: Date.now(),
    });

    return { 
      success: true, 
      message: `🎉 Order #${targetOrderId} verified and marked as Handed Over!`,
      orderId: targetOrderId 
    };

  } catch (err: any) {
    return { success: false, message: `Handover Error: ${err.message || 'QR Verification failed'}` };
  }
}
