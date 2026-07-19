import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp();
const db = admin.firestore();

const CUSTOMER_MESSAGES: Record<string, {title: string; body: string}> = {
  'Order Confirmed': {title: 'Receipt Generated', body: 'Your order has been placed and the receipt is ready.'},
  'Being Prepared': {title: 'Payment Verified', body: 'Your payment is confirmed — your meal is being prepared.'},
  'Food Ready': {title: 'The Food is Ready', body: 'Your meal is ready! Head over to collect it.'},
  'Completed': {title: 'Order Completed', body: 'Food Successfully Collected. Enjoy your meal!'},
};

/**
 * Fires on any write to orders/{orderId}. Sends the customer an FCM push
 * whenever `status` changes. Server-side (not client-triggered) so it
 * still fires reliably even if the shop owner's app is backgrounded or
 * killed right after tapping "Food Ready" / "Handed Over".
 */
export const onOrderStatusChange = functions.firestore
  .document('orders/{orderId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    if (before.status === after.status) return null;

    const message = CUSTOMER_MESSAGES[after.status as string];
    if (!message) return null;

    const userDoc = await db.collection('users').doc(after.customerId).get();
    const token = userDoc.data()?.fcmToken;
    if (!token) return null;

    return admin.messaging().send({
      token,
      notification: {title: message.title, body: message.body},
      data: {orderId: context.params.orderId, status: after.status},
    });
  });

/** Notifies the shop owner when a new order is placed or payment proof is uploaded. */
export const onOrderCreatedNotifyShop = functions.firestore
  .document('orders/{orderId}')
  .onCreate(async (snap, context) => {
    const order = snap.data();
    const shopDoc = await db.collection('shops').doc(order.shopId).get();
    const ownerToken = shopDoc.data()?.ownerFcmToken;
    if (!ownerToken) return null;

    return admin.messaging().send({
      token: ownerToken,
      notification: {
        title: 'Customer Places Order',
        body: `New order ${context.params.orderId} received.`,
      },
      data: {orderId: context.params.orderId},
    });
  });
