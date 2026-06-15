# DELRON AI POS

**Rwanda's first AI-powered Point of Sale and Business Management System**

Built for supermarkets, bakeries, bars, and restaurants — with an intelligent AI assistant that understands your business.

---

## Features

- **Supermarket Module** — Barcode scanning, product management, inventory tracking, supplier management
- **Bakery Module** — Production logging, recipe management, ingredient tracking, waste logging, label printing
- **Bar Module** — Table/tab management, shot tracking (theft detection), KDS display, real-time floor view
- **Credits & Debt Management** — Customer credit tracking, partial payments, SMS reminders in Kinyarwanda
- **DELRON AI Assistant** — AI chat powered by Claude that reads your actual business data and answers questions like "Who owes us money?" or "What sold most today?"
- **Daily AI Briefing** — Automated morning briefing with revenue summary, stock alerts, and a business tip
- **SMS Notifications** — Africa's Talking integration with Kinyarwanda templates for credits, stock alerts, and daily summaries
- **Comprehensive Reports** — Sales, stock, bakery, bar, credits, and staff reports with PDF/Excel export
- **Multi-Branch Support** — Manage multiple locations with branch-aware data
- **Mobile Responsive** — Works on tablets and phones for staff on the floor

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) + TypeScript |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| AI | Anthropic Claude API (Sonnet 4.6 for chat, Haiku for briefing) |
| SMS | Africa's Talking |
| Charts | Recharts |
| UI | Tailwind CSS + Radix UI |
| State | Zustand |
| Deployment | Vercel |

---

## Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/your-username/delron-ai-pos.git
cd delron-ai-pos

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp ENV_SETUP.md .env.local
# Edit .env.local with your actual keys

# 4. Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Environment Variables

See `ENV_SETUP.md` for all required environment variables and where to find them.

Required:
- `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase project
- `ANTHROPIC_API_KEY` — For DELRON AI chat and briefing
- `AFRICAS_TALKING_API_KEY` + `AFRICAS_TALKING_USERNAME` — For SMS notifications

---

## Deployment

### Deploy to Vercel

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com) and import the repository
3. Add all environment variables in Vercel Dashboard → Settings → Environment Variables
4. Deploy

The `vercel.json` file already configures the daily cron job (6AM UTC) for automated SMS reminders.

### Supabase Setup

1. Create a new project at [supabase.com](https://supabase.com)
2. Run the schema from `supabase/schema.sql`
3. In Supabase Auth settings:
   - Set **Site URL** to your production domain
   - Add your domain to **Redirect URLs**
   - Enable **Email** authentication

---

## Architecture

```
src/
├── app/
│   ├── (auth)/          # Login, onboarding
│   ├── (dashboard)/     # All dashboard pages
│   │   ├── dashboard/   # Owner dashboard
│   │   ├── supermarket/ # Supermarket module
│   │   ├── bakery/      # Bakery module
│   │   ├── bar/         # Bar module
│   │   ├── credits/     # Credit management
│   │   ├── reports/     # 7 report pages
│   │   ├── settings/    # Business settings
│   │   └── profile/     # User profile
│   └── api/             # All API routes
├── components/
│   ├── layout/          # Sidebar, Topbar, DashboardShell
│   ├── ui/              # Reusable UI components
│   ├── ai/              # AI chat widget
│   └── reports/         # Report-specific components
├── lib/
│   ├── auth.ts          # Server auth helper
│   ├── sms.ts           # Africa's Talking SMS service
│   ├── export.ts        # PDF/Excel export utilities
│   └── supabase/        # Supabase clients (client/server)
├── store/
│   ├── auth-store.ts    # Zustand auth state
│   └── ai-store.ts      # Zustand AI chat state
└── types/
    └── index.ts         # All TypeScript types
```

---

## Built by

**Delfin Manzi** — Rwanda 🇷🇼

*DELRON AI POS — Empowering Rwandan businesses with AI*
