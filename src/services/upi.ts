// UPI app detection + deep-link payment launch. Part 4 of the migration spec.
// Android detection is backed by the native Kotlin module in
// android/app/src/main/java/com/okkpr/UpiModule.kt (queryIntentActivities
// against upi://pay, exposed to JS as NativeModules.UpiModule).
// iOS detection uses Linking.canOpenURL against LSApplicationQueriesSchemes
// declared in ios/OKKPR/Info.plist.

import {Platform, NativeModules, Linking} from 'react-native';

export interface UpiApp {
  id: string;      // e.g. 'gpay', 'phonepe', 'paytm', 'bhim'
  label: string;
  packageName?: string; // Android only
}

const IOS_UPI_SCHEMES: {id: string; label: string; scheme: string}[] = [
  {id: 'gpay', label: 'GPay', scheme: 'gpay://'},
  {id: 'phonepe', label: 'PhonePe', scheme: 'phonepe://'},
  {id: 'paytm', label: 'Paytm', scheme: 'paytmmp://'},
  {id: 'bhim', label: 'BHIM', scheme: 'bhim://'},
  {id: 'credpay', label: 'CRED Pay', scheme: 'credpay://'},
  {id: 'tez', label: 'Tez', scheme: 'tez://'},
];

/** Returns the list of UPI apps actually installed on this device. */
export async function getInstalledUpiApps(): Promise<UpiApp[]> {
  if (Platform.OS === 'android') {
    const {UpiModule} = NativeModules;
    if (!UpiModule) {
      console.warn('[upi] Native UpiModule not linked yet — returning empty list.');
      return [];
    }
    try {
      return await UpiModule.getInstalledUpiApps();
    } catch (err) {
      console.warn('[upi] getInstalledUpiApps failed', err);
      return [];
    }
  }

  // iOS: probe each known scheme with canOpenURL.
  const results = await Promise.all(
    IOS_UPI_SCHEMES.map(async app => ({
      app,
      installed: await Linking.canOpenURL(app.scheme).catch(() => false),
    })),
  );
  return results.filter(r => r.installed).map(r => ({id: r.app.id, label: r.app.label}));
}

interface LaunchUpiPaymentInput {
  payeeVpa: string;   // shop's own upiId — never hardcoded/platform-level
  payeeName: string;
  amount: number;
  orderId: string;
  txnRef: string;
}

/** Builds the standard UPI deep link and opens it via the OS. */
export async function launchUpiPayment(input: LaunchUpiPaymentInput): Promise<void> {
  const url =
    `upi://pay?pa=${encodeURIComponent(input.payeeVpa)}` +
    `&pn=${encodeURIComponent(input.payeeName)}` +
    `&am=${input.amount}` +
    `&tn=${encodeURIComponent(input.orderId)}` +
    `&tr=${encodeURIComponent(input.txnRef)}` +
    `&cu=INR`;

  const canOpen = await Linking.canOpenURL(url);
  if (!canOpen) throw new Error('No UPI app available to handle this payment.');
  await Linking.openURL(url);

  // Android: the definitive result comes back via native onActivityResult
  // in UpiModule.kt, resolved back to JS through a promise/event emitter.
  // iOS has no reliable activity-result equivalent, so the checkout screen
  // must fall back to a manual "Did the payment go through?" confirmation
  // + optional screenshot upload, per the spec.
}

/** Basic UPI VPA format validation, per the spec's regex. */
export function isValidUpiVpa(vpa: string): boolean {
  return /^[\w.\-]{2,256}@[a-zA-Z]{2,64}$/.test(vpa);
}
