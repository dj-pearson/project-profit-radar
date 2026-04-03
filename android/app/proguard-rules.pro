# BuildDesk ProGuard Rules
# Production release build obfuscation and minification

# ============================================================
# Capacitor Core - Keep bridge and plugin classes
# ============================================================
-keep class com.getcapacitor.** { *; }
-keep class com.getcapacitor.plugin.** { *; }
-keep @com.getcapacitor.annotation.CapacitorPlugin class * { *; }
-keep class * extends com.getcapacitor.Plugin { *; }
-keep class com.getcapacitor.BridgeActivity { *; }
-keep class com.getcapacitor.Bridge { *; }
-keep class com.getcapacitor.PluginCall { *; }
-keep class com.getcapacitor.JSObject { *; }
-keep class com.getcapacitor.JSArray { *; }

# ============================================================
# WebView JavaScript Interface
# ============================================================
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Keep WebView related classes
-keepclassmembers class * extends android.webkit.WebViewClient {
    public void *(android.webkit.WebView, java.lang.String, android.graphics.Bitmap);
    public boolean *(android.webkit.WebView, java.lang.String);
    public void *(android.webkit.WebView, java.lang.String);
}

# ============================================================
# Capacitor Plugins
# ============================================================

# Camera plugin
-keep class com.capacitorjs.plugins.camera.** { *; }

# Geolocation plugin
-keep class com.capacitorjs.plugins.geolocation.** { *; }

# Push Notifications plugin
-keep class com.capacitorjs.plugins.pushnotifications.** { *; }

# Local Notifications plugin
-keep class com.capacitorjs.plugins.localnotifications.** { *; }

# Network plugin
-keep class com.capacitorjs.plugins.network.** { *; }

# Preferences plugin
-keep class com.capacitorjs.plugins.preferences.** { *; }

# ============================================================
# AndroidX / Support Libraries
# ============================================================
-keep class androidx.** { *; }
-keep interface androidx.** { *; }
-dontwarn androidx.**

# Biometric APIs
-keep class androidx.biometric.** { *; }

# ============================================================
# Firebase / Push Notifications
# ============================================================
-keep class com.google.firebase.** { *; }
-keep class com.google.android.gms.** { *; }
-dontwarn com.google.firebase.**
-dontwarn com.google.android.gms.**

# ============================================================
# Serialization / JSON
# ============================================================
-keepclassmembers class * {
    @com.google.gson.annotations.SerializedName <fields>;
}
-keep class * implements java.io.Serializable { *; }

# ============================================================
# Release Optimizations
# ============================================================

# Strip debug and verbose log calls in release
-assumenosideeffects class android.util.Log {
    public static int d(...);
    public static int v(...);
}

# Keep line numbers for crash reporting (Sentry)
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile

# Keep annotation metadata
-keepattributes *Annotation*
-keepattributes Signature
-keepattributes Exceptions

# ============================================================
# Cordova compatibility (Capacitor uses some Cordova plugins)
# ============================================================
-keep class org.apache.cordova.** { *; }
-dontwarn org.apache.cordova.**

# ============================================================
# Suppress warnings for optional dependencies
# ============================================================
-dontwarn org.conscrypt.**
-dontwarn org.bouncycastle.**
-dontwarn org.openjsse.**
