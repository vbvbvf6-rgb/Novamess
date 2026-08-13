---
name: Biometric screen lock
description: Product rule for using platform biometrics with the app lock
---

Face ID and fingerprint are an actual app-unlock method, not just a settings toggle. Enabling a platform credential must activate the screen-lock flag even when the user has no PIN; disabling the credential must also turn the lock off when no PIN remains.

**Why:** A biometric switch that did not enable the lock gave users a false sense of protection, while leaving the lock enabled after disabling the only credential could make the app impossible to open.

**How to apply:** Keep biometric registration, the screen-lock enabled flag, and the unlock UI in sync. Treat WebAuthn support as device/browser-dependent and retain a password reset escape hatch.