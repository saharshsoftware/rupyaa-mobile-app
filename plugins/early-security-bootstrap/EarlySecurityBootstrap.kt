package com.rupyaa.loan.security

import android.app.Application
import android.os.Debug
import java.io.File

/**
 * Runs in MainApplication.onCreate before React Native starts.
 * Records debugger attachment and injected hook libraries for the JS bridge.
 */
object EarlySecurityBootstrap {
  @Volatile
  var debuggerAttached: Boolean = false
    private set

  @Volatile
  var suspiciousLibraryDetected: Boolean = false
    private set

  @Suppress("UNUSED_PARAMETER")
  fun install(application: Application) {
    debuggerAttached = Debug.isDebuggerConnected() || Debug.waitingForDebugger() || hasTracerPid()
    suspiciousLibraryDetected = hasSuspiciousMaps()
  }

  private fun hasTracerPid(): Boolean {
    return try {
      File("/proc/self/status").bufferedReader().useLines { lines ->
        val tracerLine = lines.firstOrNull { line -> line.startsWith("TracerPid:") } ?: return@useLines false
        val tracerPid = tracerLine.substringAfter(':').trim()
        tracerPid.isNotEmpty() && tracerPid != "0"
      }
    } catch (_: Exception) {
      false
    }
  }

  private fun hasSuspiciousMaps(): Boolean {
    return try {
      File("/proc/self/maps").bufferedReader().useLines { lines ->
        lines.any { line ->
          val normalized = line.lowercase()
          SUSPICIOUS_LIBRARY_MARKERS.any { marker -> normalized.contains(marker) }
        }
      }
    } catch (_: Exception) {
      false
    }
  }

  private val SUSPICIOUS_LIBRARY_MARKERS = listOf(
    "frida",
    "gum-js-loop",
    "gmain",
    "linjector",
    "xposed",
    "substrate",
    "libgadget",
  )
}
