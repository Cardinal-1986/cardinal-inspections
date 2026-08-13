# Email to ABC API Support — sandbox order testing

*Drafted 13 Aug 2026. Copy the block below into an email and send it.*

**To:** apisupport@abcsupply.com
**Subject:** Sandbox order placement testing — Cardinal Roofing & Renovations (Source System ID 649)

⚠️ **Nothing in this email is a credential.** Account numbers and the Source
System ID are identifiers ABC already holds and needs in order to find you in
their system; the Client ID/Secret are NOT here and must never be emailed.

---

Hello,

We're an ABC Supply customer in Dayton, Ohio integrating your Partner API into
our own internal field application, on the Individual Business track. Our
production application is registered and active in the Developer Portal under
Source System ID **649** ("Cardinal Resource App").

We already have the read side working against production — catalog search,
frequent items, and branch pricing all return correctly against our account
(Bill-To 2153354-1, Ship-To 2153354-2, Branch 106 in Dayton).

The next thing we want to build is **order placement**
(`POST /api/order/v2/orders`). Your Individual Business Integration Track
documentation says to contact API Support to test and validate order placement
in the Sandbox environment, so that's what this message is.

Could you please advise on:

1. **Which sandbox test account** we should place orders against — sandbox
   ship-to / bill-to / branch numbers valid for our sandbox application.
2. **Confirming receipt** of our test orders on your side once we start sending
   them, and any feedback on the request payloads.
3. **Anything else you require** before we place live production orders.

Happy to work to whatever sequence you prefer. If it's easier to talk it
through, my details are below.

Thank you,

Theo Dorion
Cardinal Roofing & Renovations, LLC
Dayton, OH
theo@cardinalrenovations.net

---

## Notes for whoever picks this up next

- **Why this email exists**: ABC's Individual Business Integration Track states
  verbatim — *"To test and validate order placement in our Sandbox environment,
  please contact API Support. Our team will be able to confirm successful order
  receipt and provide additional feedback."* It is their prescribed process, not
  optional, and it is a human loop with unknown latency — which is why it was
  sent before any ordering code was written.
- **Production access is already granted.** That step ("Request Production
  Access" + account number + myABCsupply email) is behind us; the production app
  works. This is only about sandbox order validation.
- **The sandbox needs its own credentials.** The sandbox app is registered and
  ACTIVE but has a different Client ID/Secret. Add them as a SEPARATE Vercel env
  pair (e.g. `ABC_SB_CLIENT_ID` / `ABC_SB_CLIENT_SECRET`) rather than swapping
  the production values out — swapping would break live pricing, which now
  works and is in daily reach.
- **`placeOrder`'s body shape is wrong today.** ABC expects an **array** of
  orders (`[{...}]`); `api/abc.js` currently forwards a bare object. It also
  needs far more than we send: `deliveryService`, `typeCode`, `currency`,
  `shipTo` with full address and contacts, and lines carrying
  `orderedQty{value,uom}` and `unitPrice{value,uom}`. Same defect class as the
  pricing body fixed at 763 — verify against
  `apidocs.abcsupply.com/place-orders/` before writing the builder.
- **Ordering is the highest-risk surface in this integration.** A wrong request
  costs money and puts materials on a truck. Whatever gets built should show the
  full order back to a human and require an explicit confirm before sending.
