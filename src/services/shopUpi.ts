// Per-shop UPI profile management & Shop Owner Authentication data services.

import firestore from '@react-native-firebase/firestore';
import {isValidUpiVpa} from './upi';

export interface ShopProfile {
  shopId: string;
  name: string;
  ownerEmail: string;
  upiId?: string;
  upiQrImageUrl?: string;
  category?: string;
  upiUpdatedAt?: number;
}

export interface FoodItemDoc {
  id: string;
  shopId: string;
  name: string;
  price: number;
  category: string;
  description: string;
  image: string;
  isVeg: boolean;
  isAvailable: boolean;
  availableFrom?: string; // e.g. "08:00"
  availableUntil?: string; // e.g. "21:00"
  createdAt?: number;
}

export async function getShopProfile(shopId: string): Promise<ShopProfile | null> {
  try {
    const doc = await firestore().collection('shops').doc(shopId).get();
    if (!doc.exists) return null;
    const data = doc.data()!;
    return {
      shopId: doc.id,
      name: data.name,
      ownerEmail: data.ownerEmail,
      upiId: data.upiId,
      upiQrImageUrl: data.upiQrImageUrl,
      category: data.category,
      upiUpdatedAt: data.upiUpdatedAt
    };
  } catch (err) {
    console.warn('[shopUpi] getShopProfile error', err);
    return null;
  }
}

export async function updateShopUpiProfile(
  shopId: string, 
  upiId: string, 
  qrImageUrl?: string
): Promise<void> {
  if (upiId && !isValidUpiVpa(upiId)) {
    throw new Error('Invalid UPI VPA ID format. Example: shopname@okaxis');
  }

  const payload: any = {
    upiId,
    upiUpdatedAt: Date.now()
  };
  if (qrImageUrl) {
    payload.upiQrImageUrl = qrImageUrl;
  }

  await firestore().collection('shops').doc(shopId).set(payload, {merge: true});
}

/** Check if item is available based on time-slot window */
export function isItemAvailableInTimeSlot(item: FoodItemDoc): boolean {
  if (!item.isAvailable) return false;
  if (!item.availableFrom || !item.availableUntil) return true;

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const [fromH, fromM] = item.availableFrom.split(':').map(Number);
  const [untilH, untilM] = item.availableUntil.split(':').map(Number);

  const fromTotal = fromH * 60 + (fromM || 0);
  const untilTotal = untilH * 60 + (untilM || 0);

  return currentMinutes >= fromTotal && currentMinutes <= untilTotal;
}
