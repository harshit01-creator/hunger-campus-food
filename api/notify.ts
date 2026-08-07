import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import admin from 'firebase-admin';
import webpush from 'web-push';

// Supabase client initialization
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://jxpntyrzhaegwsnrxdhv.supabase.co';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_bxuGLEnlLDgKHTbb1fCC3Q_RTkT2Gaz';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// VAPID keys setup (using persistent generated keys as fallbacks)
const vapidPublicKey = process.env.VAPID_PUBLIC_KEY || 'BIdqwJ_PbzmpZ7g0kZ2LHPp7Q4Zpl9UXsriGtL1a0TyMdygHo7tfAOi0AtWltko5edstl0CSCRwPbar5HUYVBhA';
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || 'JDSysenFF65cEogIz3aiwLdlSnf-BtMcHwX_BlKciW4';

try {
  webpush.setVapidDetails(
    'mailto:canteen@okkpr.com',
    vapidPublicKey,
    vapidPrivateKey
  );
} catch (e: any) {
  console.error('Failed to configure VAPID details:', e.message);
}

// Firebase Admin initialization
if (!admin.apps.length) {
  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (serviceAccountKey) {
    try {
      const serviceAccount = JSON.parse(serviceAccountKey);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
      console.log('[FCM Backend] Firebase Admin SDK initialized successfully.');
    } catch (e: any) {
      console.error('[FCM Backend] Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY JSON:', e.message);
    }
  } else {
    console.warn('[FCM Backend] FIREBASE_SERVICE_ACCOUNT_KEY not set. Native FCM pushes will be skipped.');
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    let orderId = '';
    let customerId = '';
    let status = '';
    let shopName = '';

    // Support both direct frontend POST requests and Supabase Database Webhook bodies
    const body = req.body || {};
    if (body.record && body.type) {
      // Supabase webhook format
      orderId = body.record.orderId || body.record.order_id || '';
      status = body.record.status || '';
      customerId = body.record.customerId || body.record.customer_id || '';
      shopName = body.record.shopName || body.record.shop_name || '';
      
      // We only care about order status moving to "Ready for Pickup"
      if (status !== 'Ready for Pickup') {
        return res.status(200).json({ success: true, message: `Ignored status: ${status}` });
      }
    } else {
      // Direct POST payload format
      orderId = body.orderId || '';
      status = body.status || '';
      customerId = body.customerId || '';
      shopName = body.shopName || '';
    }

    if (!orderId) {
      return res.status(400).json({ error: 'Missing orderId' });
    }

    console.log(`[Push Server] Triggered for Order: ${orderId}, Status: ${status}`);

    // 1. Fetch missing order details from database if necessary
    if (!customerId || !shopName) {
      const { data: orderData, error: orderErr } = await supabase
        .from('orders')
        .select('*')
        .eq('orderId', orderId)
        .or(`order_id.eq.${orderId}`)
        .single();

      if (orderErr || !orderData) {
        console.warn(`[Push Server] Could not locate order ${orderId} in DB:`, orderErr?.message);
      } else {
        customerId = customerId || orderData.customerId || orderData.customer_id;
        shopName = shopName || orderData.shopName || orderData.shop_name || 'Campus Canteen';
      }
    }

    if (!customerId) {
      return res.status(400).json({ error: 'Could not resolve customerId for order' });
    }

    // 2. Fetch customer token from database
    const { data: userData, error: userErr } = await supabase
      .from('user_accounts')
      .select('*')
      .eq('id', customerId)
      .single();

    if (userErr || !userData) {
      console.warn(`[Push Server] User account not found for id ${customerId}:`, userErr?.message);
      return res.status(404).json({ error: 'User account not found' });
    }

    const pushToken = userData.pushToken || userData.push_token;
    if (!pushToken) {
      console.log(`[Push Server] User ${customerId} has no registered pushToken.`);
      return res.status(200).json({ success: true, message: 'User has no registered push token' });
    }

    const tokenStr = pushToken.trim();
    const tokenVal = orderId.split('-')[1] || orderId;
    const messageTitle = 'Order Ready! 🍽️';
    const messageBody = `🍽️ Your order at ${shopName} is ready for pickup! Token #${tokenVal}.`;

    // 3. Determine if pushToken is standard W3C Web Push JSON or raw FCM string
    let isWebPush = false;
    let webSub: any = null;
    try {
      if (tokenStr.startsWith('{')) {
        webSub = JSON.parse(tokenStr);
        if (webSub && webSub.endpoint) {
          isWebPush = true;
        }
      }
    } catch (e) {
      // Treat as standard FCM token string
    }

    if (isWebPush && webSub) {
      console.log(`[Push Server] Dispatching W3C Web Push to endpoint: ${webSub.endpoint}`);
      try {
        await webpush.sendNotification(
          webSub,
          JSON.stringify({
            title: messageTitle,
            body: messageBody,
            orderId: orderId
          })
        );
        console.log('[Push Server] Web Push dispatched successfully.');
        return res.status(200).json({ success: true, type: 'web_push', message: 'Web Push sent.' });
      } catch (pushErr: any) {
        console.error('[Push Server] Web Push dispatch failed:', pushErr.message);
        return res.status(500).json({ error: `Web Push dispatch failed: ${pushErr.message}` });
      }
    } else {
      console.log(`[Push Server] Dispatching FCM notification to token: ${tokenStr}`);
      if (!admin.apps.length) {
        console.warn('[Push Server] FCM Admin SDK is not initialized (missing credentials).');
        return res.status(400).json({ error: 'FCM Service Account not configured on server' });
      }

      try {
        const response = await admin.messaging().send({
          token: tokenStr,
          notification: {
            title: messageTitle,
            body: messageBody
          },
          data: {
            orderId: orderId,
            status: status
          },
          android: {
            priority: 'high',
            notification: {
              sound: 'default'
            }
          },
          apns: {
            payload: {
              aps: {
                sound: 'default'
              }
            }
          }
        });
        console.log('[Push Server] FCM notification dispatched successfully. Msg ID:', response);
        return res.status(200).json({ success: true, type: 'fcm', message: 'FCM push sent.', messageId: response });
      } catch (fcmErr: any) {
        console.error('[Push Server] FCM notification dispatch failed:', fcmErr.message);
        return res.status(500).json({ error: `FCM dispatch failed: ${fcmErr.message}` });
      }
    }
  } catch (err: any) {
    console.error('[Push Server] Error processing notification:', err);
    return res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
}
