# Keep security SDKs that use reflection or JNI. App R8 must not strip them.
-keep class com.freeraspreactnative.** { *; }
-keep class com.aheaditec.** { *; }
-keep class com.sslpublickeypinning.** { *; }
-dontwarn com.aheaditec.**
