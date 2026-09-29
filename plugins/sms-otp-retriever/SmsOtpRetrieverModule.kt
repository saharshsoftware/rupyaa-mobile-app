package com.rupyaa.loan.smsotp

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.PackageManager
import android.content.pm.Signature
import android.os.Build
import android.util.Base64
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableArray
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.google.android.gms.auth.api.phone.SmsRetriever
import com.google.android.gms.common.api.CommonStatusCodes
import com.google.android.gms.common.api.Status
import java.security.MessageDigest

/**
 * Bridges the Android SMS Retriever API to JS so the login OTP screen can
 * auto-fill the code without requesting SMS read permissions.
 *
 * Flow:
 *   1. JS calls startSmsRetriever() right before requesting an OTP.
 *   2. Google Play Services listens (up to 5 minutes) for an SMS that ends
 *      with this app's 11-char hash (see getAppHash()).
 *   3. When matched, the broadcast receiver fires SMS_RETRIEVED_ACTION and
 *      we emit "SmsOtpRetriever:otpMessage" with the full SMS body.
 *   4. JS extracts the digits and fills the OTP field.
 */
class SmsOtpRetrieverModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

  private var smsReceiver: BroadcastReceiver? = null

  override fun getName(): String = MODULE_NAME

  // Required no-ops so RN's NativeEventEmitter does not warn about missing
  // listener bookkeeping on the native side.
  @ReactMethod
  fun addListener(eventName: String) {
    // No-op: subscription bookkeeping is handled JS-side.
  }

  @ReactMethod
  fun removeListeners(count: Int) {
    // No-op: subscription bookkeeping is handled JS-side.
  }

  @ReactMethod
  fun startSmsRetriever(promise: Promise) {
    try {
      val client = SmsRetriever.getClient(reactApplicationContext)
      client.startSmsRetriever()
          .addOnSuccessListener {
            registerReceiver()
            promise.resolve(true)
          }
          .addOnFailureListener { exception ->
            // Caller should treat this as "autofill unavailable" and fall back
            // to manual entry — never block OTP verification on it.
            promise.reject("SMS_RETRIEVER_START_FAILED", exception)
          }
    } catch (e: Exception) {
      promise.reject("SMS_RETRIEVER_START_ERROR", e)
    }
  }

  @ReactMethod
  fun stopSmsRetriever(promise: Promise) {
    try {
      unregisterReceiver()
      promise.resolve(true)
    } catch (e: Exception) {
      promise.reject("SMS_RETRIEVER_STOP_ERROR", e)
    }
  }

  /**
   * Returns every 11-char app hash for this APK's signing certificates.
   * Debug and release builds produce different hashes — backend must send
   * an SMS whose trailing hash matches the build installed on the device.
   * Surface this in dev to verify the backend template is correct.
   */
  @ReactMethod
  fun getAppHash(promise: Promise) {
    try {
      val hashes: WritableArray = Arguments.createArray()
      computeAppHashes().forEach { hashes.pushString(it) }
      promise.resolve(hashes)
    } catch (e: Exception) {
      promise.reject("APP_HASH_ERROR", e)
    }
  }

  private fun registerReceiver() {
    if (smsReceiver != null) return

    val receiver = object : BroadcastReceiver() {
      override fun onReceive(context: Context, intent: Intent) {
        if (SmsRetriever.SMS_RETRIEVED_ACTION != intent.action) return
        val extras = intent.extras ?: return
        val status = extras.get(SmsRetriever.EXTRA_STATUS) as? Status ?: return

        when (status.statusCode) {
          CommonStatusCodes.SUCCESS -> {
            val message = extras.getString(SmsRetriever.EXTRA_SMS_MESSAGE) ?: ""
            emitMessageEvent(message)
          }
          CommonStatusCodes.TIMEOUT -> {
            // 5-minute window elapsed without a matching SMS.
            emitTimeoutEvent()
          }
        }
        // Receiver is single-shot — Play Services delivers one broadcast then stops.
        unregisterReceiver()
      }
    }

    val intentFilter = IntentFilter(SmsRetriever.SMS_RETRIEVED_ACTION)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      // Android 13+ requires explicit export flag for runtime-registered receivers.
      reactApplicationContext.registerReceiver(
          receiver,
          intentFilter,
          SmsRetriever.SEND_PERMISSION,
          null,
          Context.RECEIVER_EXPORTED
      )
    } else {
      reactApplicationContext.registerReceiver(
          receiver,
          intentFilter,
          SmsRetriever.SEND_PERMISSION,
          null
      )
    }
    smsReceiver = receiver
  }

  private fun unregisterReceiver() {
    val receiver = smsReceiver ?: return
    try {
      reactApplicationContext.unregisterReceiver(receiver)
    } catch (_: IllegalArgumentException) {
      // Already unregistered (e.g. after broadcast). Safe to ignore.
    }
    smsReceiver = null
  }

  private fun emitMessageEvent(message: String) {
    val payload = Arguments.createMap()
    payload.putString("message", message)
    reactApplicationContext
        .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
        .emit(EVENT_OTP_MESSAGE, payload)
  }

  private fun emitTimeoutEvent() {
    reactApplicationContext
        .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
        .emit(EVENT_TIMEOUT, null)
  }

  override fun invalidate() {
    super.invalidate()
    unregisterReceiver()
  }

  // ---- App hash computation (mirrors Google's official sample) -------------
  // Reference: https://developers.google.com/identity/sms-retriever/verify

  private fun computeAppHashes(): List<String> {
    val packageName = reactApplicationContext.packageName
    val packageManager = reactApplicationContext.packageManager
    val signatures: Array<Signature> = try {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
        val info = packageManager.getPackageInfo(
            packageName,
            PackageManager.GET_SIGNING_CERTIFICATES
        )
        info.signingInfo?.apkContentsSigners ?: emptyArray()
      } else {
        @Suppress("DEPRECATION")
        val info = packageManager.getPackageInfo(packageName, PackageManager.GET_SIGNATURES)
        @Suppress("DEPRECATION")
        info.signatures ?: emptyArray()
      }
    } catch (_: PackageManager.NameNotFoundException) {
      emptyArray()
    }

    return signatures.mapNotNull { signature ->
      hashSignature(packageName, signature.toCharsString())
    }
  }

  private fun hashSignature(packageName: String, signatureCharString: String): String? {
    val appInfo = "$packageName $signatureCharString"
    return try {
      val digest = MessageDigest.getInstance(HASH_ALGORITHM)
      digest.update(appInfo.toByteArray(Charsets.UTF_8))
      val truncated = digest.digest().copyOfRange(0, HASH_BYTES)
      val base64Hash = Base64.encodeToString(truncated, Base64.NO_PADDING or Base64.NO_WRAP)
      base64Hash.substring(0, HASH_BASE64_CHAR_LENGTH)
    } catch (_: Exception) {
      null
    }
  }

  companion object {
    const val MODULE_NAME = "SmsOtpRetriever"
    private const val EVENT_OTP_MESSAGE = "SmsOtpRetriever:otpMessage"
    private const val EVENT_TIMEOUT = "SmsOtpRetriever:timeout"
    private const val HASH_ALGORITHM = "SHA-256"
    private const val HASH_BYTES = 9
    private const val HASH_BASE64_CHAR_LENGTH = 11
  }
}
