---
name: Contact requests feature
description: Friend/contact request system — DB table, API routes, SSE events, badge UI
---

## Rule
Contact requests are stored in `contact_requests` table (created via startup SQL in index.ts). Routes live in `artifacts/api-server/src/routes/contact-requests.ts` and are registered in `routes/index.ts`.

## SSE events
- Server → client: `"contact-request"` (new incoming) and `"contact-request-accepted"` (requester notified)
- Frontend custom events: `pulse:contact-request`, `pulse:contact-request-accepted`, `pulse:contact-requests-resolved` (fired from Contacts.tsx on accept/decline/cancel)

## Badge pattern
Sidebar.tsx and BottomNav.tsx both:
1. Fetch `/api/contact-requests/incoming` on mount
2. Increment on `pulse:contact-request`
3. Re-fetch (not decrement) on `pulse:contact-request-accepted` and `pulse:contact-requests-resolved`

**Why:** Re-fetch is safer than decrement because SSE may fire for someone else's accept; always stay in sync with server truth.

## Accept atomicity
Accept uses a CTE query (`WITH upd AS (...) INSERT...`) to update status + insert both contact directions in one statement.
