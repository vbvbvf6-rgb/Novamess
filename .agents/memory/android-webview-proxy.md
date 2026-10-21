---
name: Android WebView proxy
description: Network proxy constraints for Nova's Android Capacitor client.
---

For Nova on Android, a user-configured proxy must be applied to the native WebView before Capacitor loads the remote app URL. Keep the setting in native device preferences and use AndroidX WebView proxy override for standard HTTP or SOCKS5 endpoints. A JavaScript-only preference cannot help when the app page itself is unreachable and its code has not loaded. Telegram MTProto is protocol-specific and cannot relay Nova's ordinary HTTPS/API traffic.

**Why:** The Android app starts by loading Nova's remote web origin; proxy setup after JavaScript boot is too late for networks that block that origin.

**How to apply:** Restrict this setting to Android, check WebView proxy feature support, validate and test the endpoint before keeping it, and clearly separate it from browser-wide proxy settings. Do not treat a Telegram MTProto link as a general-purpose proxy.
