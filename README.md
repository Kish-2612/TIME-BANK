# TimeBank

TimeBank is a static HTML, CSS, and JavaScript application where time is exchanged as the currency. Supabase provides authentication, PostgreSQL data, row-level security, and atomic time-credit transfers.

## Connect Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. Open **Project Settings > API**.
3. Copy the project URL and the public publishable/anon key. Never use the `service_role` key in this project.
4. Open the Supabase SQL Editor and run `supabase/migrations/001_initial_schema.sql`.
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

## Current integration boundary

Supabase Auth is connected when runtime configuration is present. The existing UI continues to use mock repository data for marketplace, wallet, request, notification, and transaction screens until their methods in `js/api.js` are replaced with the corresponding Supabase queries and RPC calls. This fallback keeps the static UI usable while the database is being configured.

## Security

- RLS is enabled on application tables.
- Wallet balances cannot be directly updated by browser users.
- Transactions are append-only for browser users.
- `complete_service_and_transfer` locks both wallets and performs the ledger transfer atomically.
- No password, service-role key, database password, or private token belongs in this repository.

## Local preview

Serve the folder with any static server. ES modules and the Supabase CDN client require HTTP rather than opening the HTML files directly from `file://`.