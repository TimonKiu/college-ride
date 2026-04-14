# Authentication (CollegeRide)

## Supabase mode

1. Create a project at [Supabase](https://supabase.com).
2. **Authentication → Providers → Email**: enable Email; turn **Confirm email** ON if you want mailbox verification after sign-up.
3. **Project Settings → API**: copy URL and anon key into `.env`:

   ```bash
   VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
   VITE_SUPABASE_ANON_KEY=your_anon_key_here
   ```

4. Restart `npm run dev`.

## Local mode

If the two `VITE_*` variables are unset, accounts are stored in `localStorage` only (demo).

## `.edu` and school name

Only `.edu` emails can register or sign in. **`school`** in user metadata is derived from the email domain (see `src/auth/schoolFromEmail.js`). Add entries to `KNOWN_SCHOOLS` for exact full names.

## Stronger enforcement

Client checks can be bypassed; use Supabase Edge Functions or Auth hooks for server-side rules if needed.
