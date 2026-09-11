---
name: Twilio connector setup
description: Non-obvious setup limits and runtime requirements for PetCita's Twilio WhatsApp bridge.
---

The attached Twilio connector can be used by the server through the Replit connector proxy, but an account-list request may return Twilio error 70004 because the connected credential is scoped for messaging rather than account administration. Sending still requires a configured WhatsApp sender and account path.

**Why:** The connector authorization alone does not identify a WhatsApp Business sender or make an inbound webhook public.

**How to apply:** Keep provider values out of source code; configure the Account SID and WhatsApp sender through workspace environment variables, then register the published HTTPS webhook path in Twilio.