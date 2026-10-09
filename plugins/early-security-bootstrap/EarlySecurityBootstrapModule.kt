package com.rupyaa.loan.security

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class EarlySecurityBootstrapModule(
  reactContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(reactContext) {
  override fun getName(): String = NAME

  @ReactMethod
  fun getStatus(promise: Promise) {
    val status = Arguments.createMap()
    status.putBoolean("debuggerAttached", EarlySecurityBootstrap.debuggerAttached)
    status.putBoolean("suspiciousLibraryDetected", EarlySecurityBootstrap.suspiciousLibraryDetected)
    promise.resolve(status)
  }

  companion object {
    const val NAME = "EarlySecurityBootstrap"
  }
}
