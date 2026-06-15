# DELRON AI POS — Environment Variables

Copy this file to `.env.local` and fill in the values.
NEVER commit `.env.local` to version control.

```env
# ─── Supabase ────────────────────────────────────────────────────
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# ─── Anthropic (Claude AI) ───────────────────────────────────────
ANTHROPIC_API_KEY=sk-ant-api...

# ─── Africa's Talking (SMS) ──────────────────────────────────────
AFRICAS_TALKING_API_KEY=your_at_api_key
AFRICAS_TALKING_USERNAME=your_at_username
# For sandbox testing, use username: "sandbox"

# ─── Mobile Money (Optional) ─────────────────────────────────────
MTN_MOMO_API_KEY=
AIRTEL_MONEY_API_KEY=

# ─── App Config ──────────────────────────────────────────────────
NEXT_PUBLIC_APP_NAME=DELRON AI POS
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app

# ─── Vercel Cron Security ────────────────────────────────────────
CRON_SECRET=your_random_secret_string_here
```

## Where to get each value

| Variable | Where to find it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Dashboard → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Dashboard → Project Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard → Project Settings → API (keep secret!) |
| `ANTHROPIC_API_KEY` | console.anthropic.com → API Keys |
| `AFRICAS_TALKING_API_KEY` | account.africastalking.com → Settings → API Key |
| `AFRICAS_TALKING_USERNAME` | Your Africa's Talking username (or "sandbox" for testing) |
| `CRON_SECRET` | Generate with: `openssl rand -hex 32` |
