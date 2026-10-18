---
name: Login OTP security
description: Security and compatibility constraints for email and Nova chat login verification codes
---

For password login accounts with an email, require the emailed one-time code before creating a session; if TOTP is enabled, keep it as an additional factor. Bind the stored code digest to the account ID and normalized current email, and invalidate it when the email changes. Accounts without an email retain the existing password/TOTP path to avoid locking out legacy users.

**Why:** The in-app Nova Security chat is not accessible on a first or logged-out device, so email remains the usable login factor. Creating the session only after all configured factors pass prevents pending challenges from becoming authenticated sessions.

**How to apply:** Preserve these constraints when changing login, email-change, TOTP, or session flows. Before relying on an external bot instead of email, establish a verified account-to-bot identity binding and an account recovery path.
