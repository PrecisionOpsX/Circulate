# Supabase setup — auth, email & phone verification

Everything in the app is coded and ready. These are the **dashboard-side**
steps that only you can do (they need project-owner access, not just API
keys). Do them in order.

---

## 1. Apply the database schema

The app needs the `profiles`, `wallets`, and other tables — plus the
`handle_new_user()` trigger that creates a profile + wallet automatically
when someone signs up. Without this, sign-up succeeds at the auth layer but
the app treats the user as having no account.

1. Supabase dashboard → **SQL Editor** → **New query**.
2. Open [`supabase/setup.sql`](../supabase/setup.sql) from this repo, copy
   its entire contents, paste into the editor.
3. Click **Run**. You should see "Success. No rows returned."
4. Back in your terminal, verify it worked end-to-end:

   ```bash
   node scripts/verify-auth.mjs
   ```

   Expect `RESULT: all checks passed`.

> Re-running `setup.sql` on a project that already has the schema will error
> on `CREATE TYPE` / `CREATE TABLE`. To start over, use **Database → reset**
> (or drop the objects) first.

---

## 2. Configure Auth URLs

Supabase dashboard → **Authentication → URL Configuration**:

- **Site URL:** `http://localhost:3000` for dev (your production domain
  later).
- **Redirect URLs** — add both:
  - `http://localhost:3000/auth/callback`
  - `http://localhost:3000/auth/confirm`
  - (and the production equivalents when you deploy)

These must be allow-listed or email confirmation and password-reset links
will be rejected.

---

## 3. Email verification

Supabase dashboard → **Authentication → Providers → Email**:

- Ensure **Email** is enabled.
- Turn **Confirm email** ON. New users then get a confirmation link; the app
  routes them to `/verify-email` until they click it.

The default email template works as-is — its link lands on
`/auth/callback`, which exchanges the code for a session. (Optional: if you
switch the template to use `{{ .TokenHash }}`, point it at `/auth/confirm`
instead — that route is already implemented.)

On the **free tier** Supabase's built-in email is rate-limited and best for
testing only. For production, set up a custom SMTP provider under
**Authentication → Emails → SMTP Settings** (e.g. Resend).

Password reset uses the same machinery — no extra config needed.

---

## 4. Phone / SMS verification (Twilio)

Phone verification is fully built in the app but **gated off by default**.
Here's how to turn it on.

### 4a. Create a Twilio account & get a messaging sender

1. Sign up at [twilio.com](https://www.twilio.com/try-twilio) and verify
   your own number.
2. In the **Twilio Console**, note your **Account SID** and **Auth Token**
   (Console home page).
3. Get a sender. Either:
   - **Buy a phone number** with SMS capability (Console → **Phone Numbers →
     Manage → Buy a number**), or
   - Create a **Messaging Service** (Console → **Messaging → Services**) and
     note its **Messaging Service SID** (starts with `MG…`).
4. While on a Twilio trial, SMS can only be sent to numbers you've verified
   in the Twilio console. Upgrade the account to message anyone.

### 4b. Connect Twilio to Supabase

Supabase dashboard → **Authentication → Providers → Phone**:

1. Toggle **Phone provider** ON.
2. **SMS provider:** select **Twilio**.
3. Fill in:
   - **Twilio Account SID**
   - **Twilio Auth Token**
   - **Twilio Message Service SID** — your `MG…` Messaging Service SID, *or*
     the purchased phone number in E.164 format (e.g. `+14155550100`).
4. Leave **Enable phone confirmations** ON.
5. (Optional) Customize the SMS OTP template and OTP expiry.
6. **Save.**

### 4c. Flip the app flag

In `.env.local`:

```ini
NEXT_PUBLIC_PHONE_VERIFICATION_ENABLED=true
```

Restart `npm run dev`. (Set the same variable in Vercel for production.)

### 4d. Test it

1. Log in, go to **Settings** (`/settings`).
2. Under **Phone number**, enter a number in international format
   (`+14155550100`) and click **Send code**.
3. You'll get an SMS with a 6-digit code. Enter it and click **Verify**.
4. On success the profile's `phone_verified` flips to true (via the
   `on_auth_user_verified` DB trigger) and the **Phone verified** trust
   badge appears on your dashboard and profile.

### How it works in the code

| Piece | Location |
| ----- | -------- |
| Env flag → `isPhoneVerificationEnabled` | `src/lib/env.ts` |
| Send OTP / verify OTP server actions | `src/app/(auth)/actions.ts` |
| Two-step UI (number → code) | `src/components/account/PhoneVerification.tsx` |
| Duplicate-number guard | `sendPhoneOtpAction` + `profiles_phone_unique` index |
| `phone_verified` sync | `on_auth_user_verified` trigger in `supabase/migrations/0001` |

`sendPhoneOtpAction` calls `supabase.auth.updateUser({ phone })` (sends the
SMS); `verifyPhoneOtpAction` calls `supabase.auth.verifyOtp({ type:
"phone_change" })`.

### Troubleshooting

| Symptom | Likely cause |
| ------- | ------------ |
| "Phone verification isn't enabled yet" notice | `NEXT_PUBLIC_PHONE_VERIFICATION_ENABLED` not `true`, or dev server not restarted |
| "Error sending confirmation OTP" | Twilio credentials wrong in Supabase, or trial account texting an unverified number |
| Code never arrives | Wrong Messaging Service SID / sender number; check Twilio Console → **Monitor → Logs → Messaging** |
| "Token has expired or is invalid" | OTP expired — request a new code |
| Number rejected by the form | Must be E.164: a leading `+` then 8–15 digits |
