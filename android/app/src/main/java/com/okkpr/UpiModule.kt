package com.okkpr

import android.content.Intent
import android.net.Uri
import com.facebook.react.bridge.*

/**
 * Detects installed UPI apps by querying the package manager against a
 * upi://pay intent (see AndroidManifest.xml <queries> block). Exposed to
 * JS as NativeModules.UpiModule.getInstalledUpiApps().
 *
 * Wire-up: add `new UpiPackage()` to MainApplication's getPackages() list.
 */
class UpiModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName() = "UpiModule"

    @ReactMethod
    fun getInstalledUpiApps(promise: Promise) {
        try {
            val intent = Intent(Intent.ACTION_VIEW, Uri.parse("upi://pay"))
            val pm = reactApplicationContext.packageManager
            val resolvedApps = pm.queryIntentActivities(intent, 0)

            val result: WritableArray = Arguments.createArray()
            for (resolveInfo in resolvedApps) {
                val app: WritableMap = Arguments.createMap()
                val packageName = resolveInfo.activityInfo.packageName
                val label = resolveInfo.loadLabel(pm).toString()
                app.putString("id", packageName)
                app.putString("label", label)
                app.putString("packageName", packageName)
                result.pushMap(app)
            }
            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject("UPI_DETECTION_FAILED", e)
        }
    }
}
