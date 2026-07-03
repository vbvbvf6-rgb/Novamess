---
name: Admin DM block removed
description: Previous code blocked DMs to admin users — it has been removed
---

## Rule
The block `if (targetIsAdmin) return res.status(403)...` that prevented anyone from DMing admin users was removed from `POST /chats/direct` in `artifacts/api-server/src/routes/chats.ts`.

**Why:** The admin account (creater_messenger) should be reachable by all users. The block was an old restriction that conflicted with the product intent.

**How to apply:** Do not re-add admin DM blocking. If per-user DM privacy is needed in the future, use the `contact_requests` system or a user-level `allow_dms_from` setting.
