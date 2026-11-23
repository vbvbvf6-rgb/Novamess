---
name: Prime gift pricing and updates
description: Pricing and persistence rules for gifting a Prime or Prime+ subscription.
---

When gifting Prime, charge the selected plan's configured `spark` amount for the chosen tier, not a price keyed only by plan ID. Prime and Prime+ use different prices for the same duration. Lock sender and recipient rows and debit/extend the recipient in one database transaction to avoid balance races. Preserve an active Prime+ tier when extending it with a Prime gift, and add a Prime+ recipient to the lounge.

**Why:** The previous gift endpoint used a separate plan-ID-only price map and separate balance/subscription updates, so prices did not match the subscription screen and concurrent requests could spend incorrectly.

**How to apply:** Keep gift charges aligned with the tier's plan definitions and make financial changes atomic whenever subscription tiers or durations change.
