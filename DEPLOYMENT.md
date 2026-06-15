# DELRON AI POS — Deployment Guide

## Step-by-Step Vercel Deployment

### 1. Prepare the code

```bash
# Test production build locally first
npm run build

# Make sure there are no TypeScript errors
# Fix any issues before deploying
```

### 2. Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit — DELRON AI POS v1.0"
git branch -M main
git remote add origin https://github.com/your-username/delron-ai-pos.git
git push -u origin main
```

### 3. Connect to Vercel

1. Go to [vercel.com](https://vercel.com)
2. Click **Add New Project**
3. Import your GitHub repository
4. Select **Next.js** framework (auto-detected)
5. Do NOT deploy yet — add env vars first

### 4. Add Environment Variables

In Vercel Dashboard → Your Project → Settings → Environment Variables:

| Key | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Your Supabase service role key |
| `ANTHROPIC_API_KEY` | Your Claude API key |
| `AFRICAS_TALKING_API_KEY` | Your Africa's Talking API key |
| `AFRICAS_TALKING_USERNAME` | Your AT username |
| `CRON_SECRET` | Random secret for cron auth |
| `NEXT_PUBLIC_APP_URL` | Your Vercel domain (e.g. https://delron.vercel.app) |

### 5. Deploy

Click **Deploy** in Vercel.

### 6. Configure Supabase Auth

After deployment, go to your Supabase project:

1. **Authentication** → **URL Configuration**
2. Set **Site URL**: `https://your-project.vercel.app`
3. Add to **Redirect URLs**: `https://your-project.vercel.app/**`

### 7. Test the deployment

- [ ] Visit your Vercel URL
- [ ] Create a new account via onboarding
- [ ] Test POS for each active module
- [ ] Test AI chat
- [ ] Test SMS (use Africa's Talking sandbox first)
- [ ] Check cron job in Vercel Dashboard → Cron Jobs

---

## Cron Job

The daily cron (`/api/cron/daily`) runs at **6:00 AM UTC** (8:00 AM Kigali time).

It automatically:
- Sends SMS reminders for credits due today
- Sends overdue alerts for 2+ day overdue credits
- Sends low stock alerts
- Sends daily business summary to the owner

The cron is secured with `CRON_SECRET` bearer token authentication.

---

## Custom Domain

1. In Vercel → Your Project → Settings → Domains
2. Add your domain (e.g. `pos.yourbusiness.rw`)
3. Update DNS records at your domain registrar
4. Update `NEXT_PUBLIC_APP_URL` in Vercel env vars
5. Update Supabase Redirect URLs with the new domain

---

## Updating the app

```bash
# Make changes, then:
git add .
git commit -m "feat: description of changes"
git push origin main
# Vercel auto-deploys on push to main
```
