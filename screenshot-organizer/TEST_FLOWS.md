# Test Flows (localhost:8081)

Run the web app with `npm start` and open http://localhost:8081. These flows can be tested manually or with browser automation (Playwright / Cursor browser).

## 1. Sign-in flow (existing user)

- Open `/sign-in`.
- Enter email and password (e.g. `testuser-reg@example.com` / `TestPass123` or your account).
- Click **Sign In** (button has `accessibilityLabel="Sign In"`).
- Expect: redirect to onboarding or inbox.

## 2. Registration flow

- Open `/sign-in`.
- Click **Sign Up** (button with `accessibilityLabel="Sign Up"`).
- Fill email and password (min 6 chars).
- Click **Create Account** (`accessibilityLabel="Create Account"`).
- Expect: success message and/or redirect to onboarding.

## 3. Onboarding flow

- From `/onboarding` (first time or after sign-up).
- **Option A:** Click **Skip** (`accessibilityLabel="Skip"`) → goes to inbox.
- **Option B:** Click **Next** 4 times (last is **Get Started**) → request permission → inbox.

## 4. Stack (Inbox) flow

- **No permission:** See "Gallery Access Required". Click **Grant Permission** (`accessibilityLabel="Grant Permission"`). On web, permission may not persist; you may see Loading or empty queue.
- **With assets:** Use **Delete** / **Archive** / **Keep** (each has `accessibilityRole="button"`). Trust counter (Daily Trust) decreases on Delete when entitlement is free.
- **All done:** When queue is empty, see "All Done!". Click **View Summary** (`accessibilityLabel="View Summary"`) → review-session.

## 5. Review Session flow

- From Stack after "View Summary", or navigate to `/review-session`.
- **Close:** Click close (X) button (`accessibilityLabel="Close"`).
- **Finish session:** Click **FINISH SESSION** (`accessibilityLabel="Finish session"`) → saves to Supabase when signed in, then "SESSION SAVED ✓".
- **Share:** Click **Share Stats** (`accessibilityLabel="Share stats"`).

## 6. Paywall flow (trust limit)

- In **Settings**, use **Set Free** (`accessibilityLabel="Set Free"`) if not already free.
- In **Stack**, perform 15 deletes (or use entitlement store to set `deletesRemaining` to 0) so next delete would exceed limit.
- Click **Delete** again → expect navigate to `/paywall`.
- On paywall: **Unlock Unlimited** (`accessibilityLabel="Unlock Unlimited"`) or **Wait 24h** (`accessibilityLabel="Wait 24h for next session"`).

## 7. Vault (Library) flow

- Open **Vault** tab or `/library`.
- **Filters:** Click **All Items**, **Screenshots**, **Oldest**, **Largest** (each has `accessibilityLabel`).
- **Tags:** If present, click **All Tags** or a tag to filter.
- **Selection:** Click grid items to select; batch bar appears.
- **Batch delete:** Click **Delete (N)** (`accessibilityLabel="Delete N selected"`).

## 8. Settings flow

- Open **Settings** tab or `/settings`.
- **Account:** Current plan and (if free) deletes remaining.
- **Subscription:** **Unlock Unlimited** card when free (`accessibilityLabel="Unlock Unlimited"`).
- **Debug:** **Set Free** / **Set Lifetime** (`accessibilityLabel="Set Free"`, `"Set Lifetime"`) to toggle entitlement for testing.

---

All primary actions use `accessibilityRole="button"` and `accessibilityLabel` for automation and screen readers.
