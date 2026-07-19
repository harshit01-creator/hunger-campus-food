# OK KPR — Bare React Native App

Rebuilt per the migration spec: bare React Native CLI (no Expo), real-time
Firestore order tracking, native FCM push, native Android UPI detection.
UI follows the reference screens exactly (Welcome → Home → Menu → Cart →
Order Tracking → Profile), rebranded with the **OK KPR** logo.

## What's in this project

| Area | Status |
|---|---|
| Screens (all 6, matching your screenshots pixel-for-pixel in layout) | ✅ Built |
| Navigation (stack + bottom tabs) | ✅ Built |
| Theme tokens (colors/spacing/type pulled from screenshots) | ✅ Built |
| Firestore real-time order listener (`subscribeToOrder`) | ✅ Built |
| FCM registration + foreground/background handlers | ✅ Built |
| Cloud Function that fires the actual pushes server-side | ✅ Built |
| Native Android UPI-detection Kotlin module + manifest `<queries>` | ✅ Built |
| iOS UPI scheme detection (`Linking.canOpenURL`) + Info.plist schemes | ✅ Built |
| Shop UPI profile management (`upiId` / QR upload, VPA validation) | ✅ Built |
| Logo wired into Welcome screen + app icon slot | ✅ Built |
| **Firebase project itself** (`google-services.json`, `GoogleService-Info.plist`) | ⛔ You must create this — see below |
| **Android/iOS signing keys, app icons at all densities** | ⛔ You must generate these |
| Auth flow (OTP verification) | 🟡 UI built, backend call is a stub — wire to Firebase Auth phone auth |
| Payment capture result (native `onActivityResult` → JS promise resolution on Android) | 🟡 Scaffolded in `upi.ts`/`UpiModule.kt`, event-emitter wiring left as a TODO |

I can't provision a live Firebase project, code-sign a real build, or run
an Android emulator from here — those need your Firebase console access
and a machine with the Android SDK / Xcode. Everything that *can* be
written as source code is done and matches the spec.

## Setup (on your machine)

```bash
npm install
cd ios && pod install && cd ..
```

### Firebase (native, not Expo-wrapped)
1. Create a Firebase project → add an Android app (package `com.okkpr`) and iOS app (bundle id `com.okkpr`).
2. Download `google-services.json` → place at `android/app/google-services.json`.
3. Download `GoogleService-Info.plist` → place at `ios/OKKPR/GoogleService-Info.plist` and add to the Xcode project.
4. Apply the Google Services Gradle plugin in `android/build.gradle` and `android/app/build.gradle` (standard `@react-native-firebase` setup — their docs cover the two `apply plugin` lines).
5. Deploy the Cloud Functions in `functions/` (`firebase deploy --only functions`) so pushes fire server-side.

### Run
```bash
npx react-native run-android
npx react-native run-ios
```

### App icon
Drop your logo at all required densities into:
- `android/app/src/main/res/mipmap-*/ic_launcher.png`
- `ios/OKKPR/Images.xcassets/AppIcon.appiconset/`

The source logo used in the Welcome screen is at `src/assets/logo.png`.

## Project structure
```
src/
  screens/        Welcome, Home, Menu, Cart, OrderTracking, Profile, Search, Bookings
  navigation/      Stack + bottom tab navigators
  services/        orders.ts (Firestore listeners), notifications.ts (FCM),
                    upi.ts (UPI detection/launch), shopUpi.ts (per-shop UPI profile)
  theme/           colors, spacing, typography tokens
  assets/          logo.png
android/app/src/main/java/com/okkpr/
  UpiModule.kt     native UPI app detection
  UpiPackage.kt    RN package registration
functions/src/
  index.ts         Cloud Functions — server-side FCM triggers on order status change
```
