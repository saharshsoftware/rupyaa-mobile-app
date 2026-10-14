package com.rupyaa.loan.security

import android.content.Context
import com.facebook.react.modules.network.OkHttpClientProvider
import java.io.File
import okhttp3.Interceptor

/**
 * Disables the React Native OkHttp disk cache and deletes any cache left
 * from an older install. Must run before loadReactNative creates the client.
 */
object ApiHttpCacheSecurity {
  private const val CACHE_CONTROL = "Cache-Control"
  private const val NO_STORE = "no-store"
  private const val HTTP_CACHE_DIR = "http-cache"

  fun install(context: Context) {
    clearHttpCache(context)
    OkHttpClientProvider.setOkHttpClientFactory {
      OkHttpClientProvider.createClientBuilder()
        .cache(null)
        .addNetworkInterceptor(noStoreInterceptor())
        .build()
    }
  }

  private fun noStoreInterceptor(): Interceptor {
    return Interceptor { chain ->
      val request = chain.request().newBuilder().header(CACHE_CONTROL, NO_STORE).build()
      chain.proceed(request).newBuilder().header(CACHE_CONTROL, NO_STORE).build()
    }
  }

  private fun clearHttpCache(context: Context) {
    File(context.cacheDir, HTTP_CACHE_DIR).deleteRecursively()
  }
}
