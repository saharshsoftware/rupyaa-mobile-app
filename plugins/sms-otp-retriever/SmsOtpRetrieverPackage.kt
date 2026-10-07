package com.rupyaa.loan.smsotp

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

/**
 * Registers SmsOtpRetrieverModule with React Native. Added to
 * MainApplication.kt by the `withSmsOtpRetriever` Expo config plugin
 * during `expo prebuild`.
 */
class SmsOtpRetrieverPackage : ReactPackage {
  override fun createNativeModules(
      reactContext: ReactApplicationContext
  ): List<NativeModule> = listOf(SmsOtpRetrieverModule(reactContext))

  override fun createViewManagers(
      reactContext: ReactApplicationContext
  ): List<ViewManager<*, *>> = emptyList()
}
