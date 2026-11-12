# Contact Us email — Supabase Edge Function

This function sends every valid Contact Us submission to the MediFind support
inbox using [Resend](https://resend.com). The browser never sees the Resend API
key: it lives in the Supabase Edge Function secrets.

- Function name: `contact`
- Source: `supabase/functions/contact/index.ts`
- Recipient (default): `dhyaneshwarj26@gmail.com`
- Reply-To: the visitor's email address

## 1. Create a Resend account and API key

1. Sign in at <https://resend.com> (the free tier is enough for a contact form).
2. Open **API Keys → Create API Key**. Use a sending-only permission and copy the
   key once. Do not paste it into chat, source code, `.env.local`, or any
   `VITE_` variable.
3. Choose a sender:
   - **Quick test:** keep the default `onboarding@resend.dev` sender. Resend only
     delivers test emails to the address that owns the Resend account, so this
     works immediately for `dhyaneshwarj26@gmail.com`.
   - **Production:** add and verify your domain under **Domains**, then set
     `CONTACT_FROM_EMAIL` to an address on that domain, e.g.
     `MediFind Support <support@yourdomain.com>`.

## 2. Add the secrets

From the project root (Supabase CLI installed and logged in):

```bash
supabase secrets set RESEND_API_KEY=re_your_key_here
```

Optional settings:

```bash
supabase secrets set CONTACT_TO_EMAIL=dhyaneshwarj26@gmail.com
supabase secrets set CONTACT_FROM_EMAIL="MediFind Support <onboarding@resend.dev>"
supabase secrets set ALLOWED_ORIGIN=http://localhost:3000,https://your-production-domain
```

`ALLOWED_ORIGIN` is a comma-separated allow-list for CORS. When it is unset the
function reflects the request origin, which is convenient for local development
but should be set before going live.

## 3. Deploy the function

```bash
supabase link --project-ref aexgfmegahdauimfcjgz
supabase functions deploy contact --no-verify-jwt
```

If the CLI reports that the project is not initialised, run `supabase init`
first. It only adds `supabase/config.toml`; it does not touch the existing
`migrations/` or `seed/` folders.

`--no-verify-jwt` is required because the Contact Us form is public and is
submitted by visitors who are not signed in. The function still validates and
rate-limits every request, and the anon key used by `supabase.functions.invoke`
is only a public client key.

After deploying you can confirm the function exists:

```bash
supabase functions list
```

## 4. Test it

1. Restart `npm run dev` (frontend environment unchanged; no new public env var).
2. Open the site, scroll to **Contact Us**, and submit a real message.
3. The button shows **Sending…** while the function runs. The success panel must
   only appear after Resend accepted the message.
4. Check `dhyaneshwarj26@gmail.com` (and the Resend dashboard **Emails** log).
5. Reply to the email — the reply must go to the visitor's address, not to the
   support inbox.

If the success panel appears but no email arrives, check the Resend dashboard
first (it reports bounce/rejection reasons), then the function logs:

```bash
supabase functions logs contact
```

## Behaviour and limits

- POST with `Content-Type: application/json` only; OPTIONS is handled for CORS.
- Body capped at 16 KB.
- Server-side validation: name 2–80 chars, valid email, subject ≤ 140 chars,
  message 10–4000 chars, control characters stripped before use.
- The visitor's name, subject, and message are HTML-escaped in the email body.
- Hidden honeypot field `company`: filled-in submissions are silently discarded.
- In-memory rate limit: 5 submissions per 10 minutes per IP and per email.
  This is per function isolate, so it is a first line of defence rather than a
  global quota. Resend's own limits apply as a second layer.
- Missing `RESEND_API_KEY` returns HTTP 503; Resend failures return HTTP 502.
  Error responses never include the API key or provider internals.
