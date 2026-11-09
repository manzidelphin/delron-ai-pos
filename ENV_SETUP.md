# DELRON AI POS — Environment Variables

Copy the block below into `.env.local` in the repo root and fill in the values.
NEVER commit `.env.local` or paste real keys into any file in this repo.
In production, set the same variables in Vercel → Project → Settings → Environment Variables
(mark every key, token and secret as **Secret**).

The names below match exactly what the code reads — including the spelling
`AFRICASTALKING_USERNAME` (no underscore after AFRICAS), which differs from the API key's name.

```env
# ─── Supabase ────────────────────────────────────────────────────
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_xxx
SUPABASE_SERVICE_ROLE_KEY=sb_secret_xxx

# ─── Google Gemini AI ────────────────────────────────────────────
GEMINI_API_KEY=your_gemini_api_key_here

# ─── Africa's Talking (SMS) ──────────────────────────────────────
AFRICAS_TALKING_API_KEY=your_at_api_key
AFRICASTALKING_USERNAME=your_at_username
# For sandbox testing, use username: "sandbox"

# ─── Resend (email: shift summaries, daily reports) ──────────────
RESEND_API_KEY=re_xxx
RESEND_FROM_EMAIL=reports@your-domain.com

# ─── MTN MoMo (Collections) ──────────────────────────────────────
MOMO_COLLECTION_PRIMARY_KEY=your_momo_subscription_primary_key
MOMO_API_USER=your_momo_api_user_uuid
MOMO_API_KEY=your_momo_api_key
MOMO_TARGET_ENVIRONMENT=sandbox
MOMO_CALLBACK_URL=https://your-domain.com/api/webhooks/momo-callback

# ─── App Config ──────────────────────────────────────────────────
NEXT_PUBLIC_APP_URL=https://your-domain.com

# ─── Vercel Cron Security ────────────────────────────────────────
CRON_SECRET=your_random_secret_string_here
```

## Where to get each value

| Variable | Where to find it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Dashboard → Project Settings → Data API (Project URL) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Dashboard → Project Settings → API Keys → **Publishable key** (`sb_publishable_…`). Safe in the browser. |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard → Project Settings → API Keys → **Secret key** (`sb_secret_…`). Bypasses Row Level Security — server only, keep secret! |
| `GEMINI_API_KEY` | aistudio.google.com → Get API Key (free tier: 15 req/min, 1M tokens/day) |
| `AFRICAS_TALKING_API_KEY` | account.africastalking.com → Settings → API Key |
| `AFRICASTALKING_USERNAME` | Your Africa's Talking username (or "sandbox" for testing) |
| `RESEND_API_KEY` | resend.com → API Keys |
| `RESEND_FROM_EMAIL` | A sender address on a domain verified in Resend. Defaults to `onboarding@resend.dev` if unset. |
| `MOMO_COLLECTION_PRIMARY_KEY` | momodeveloper.mtn.com → Profile → Collections subscription → Primary key |
| `MOMO_API_USER` / `MOMO_API_KEY` | Sandbox: run `node scripts/provision-momo.mjs` (prints both). Production: issued by MTN. |
| `MOMO_TARGET_ENVIRONMENT` | `sandbox` for testing, or the production environment name MTN gives you (e.g. `mtnrwanda`). Defaults to `sandbox`. |
| `MOMO_CALLBACK_URL` | `https://<your-domain>/api/webhooks/momo-callback`. No secret is needed: the callback re-checks every payment with MTN (using the invoice's saved `momo_request_id`) and ignores the status in the callback body. |
| `NEXT_PUBLIC_APP_URL` | Your public site URL, e.g. `https://www.delronpos.com` |
| `CRON_SECRET` | Generate with: `openssl rand -hex 32`. If unset, the cron endpoints accept any request. |

## Running the scripts in `scripts/`

The one-off scripts (`seed-*.mjs`, `create-test-*.mjs`, `verify-test-users.mjs`) read
`NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` from `.env.local` via
`scripts/lib/supabase-env.mjs`. Run them from the repo root:

```bash
node scripts/verify-test-users.mjs
```

They write to the **production** database — only run them when you mean to.
