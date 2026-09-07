# TimeBank

TimeBank is a static HTML, CSS, and JavaScript application where time is exchanged as the currency. Supabase provides authentication, PostgreSQL data, row-level security, and atomic time-credit transfers.

## Connect Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. Open **Project Settings > API**.
3. Copy the project URL and the public publishable/anon key. Never use the `service_role` key in this project.
4. Open the Supabase SQL Editor and run `001_initial_schema.sql`, `002_service_sessions.sql`, `003_public_marketplace_read.sql`, `004_community_donation.sql`, then `005_public_pool_read.sql`.
5. In an untracked local copy of `js/runtime-config.js`, set:

```js
window.TIMEBANK_CONFIG = {
  url: "your-project-url",
  publishableKey: "your-public-anon-key"
};
```

The tracked file intentionally contains no credentials. Keep local runtime credentials out of Git. For static hosting, inject the same `window.TIMEBANK_CONFIG` object in a deployment-only script before the page module loads.

## Authentication

Enable Email authentication in **Authentication > Providers**. The registration form sends `full_name`, `username`, and `location` as Auth metadata. The database trigger creates the matching `profiles` and `wallets` rows automatically.

## Service sessions

Providers accept requests through `accept_service_request()`, which creates one private `service_sessions` row. Both participants join through `join_service_session()`. The browser countdown is display-only and is calculated from server timestamps. Credit settlement is performed only by `complete_service_session()`, which locks both wallets and is idempotent by `transactions.session_id`.

The current browser video path uses WebRTC with Supabase Realtime broadcast signaling and a public STUN server. A TURN provider is still required for reliable connections across restrictive networks.

## Current integration boundary

All application data is read from Supabase. Marketplace and public pool reads use public RLS policies; wallet, requests, transactions, notifications, reviews, and profile activity require the authenticated user's `auth.uid()`. Empty or unavailable data is shown as an explicit empty/error state rather than replaced with demo records.

## Security

- RLS is enabled on application tables.
- Wallet balances cannot be directly updated by browser users.
- Transactions are append-only for browser users.
- The legacy `complete_service_and_transfer` and direct request-status functions are not executable by authenticated clients; session settlement uses only `complete_service_session()`.
- No password, service-role key, database password, or private token belongs in this repository.

## Local preview

Serve the folder with any static server. ES modules and the Supabase CDN client require HTTP rather than opening the HTML files directly from `file://`.