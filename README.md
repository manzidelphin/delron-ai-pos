# DELRON AI POS

**Multi-module point-of-sale and business management software for Rwandan SMEs.**

DELRON AI POS brings sales, inventory, production, customer credit, reporting, and AI-assisted business insights into one web application. It is designed for businesses that operate supermarkets, bakeries, bars, or a combination of these activities.

**Live application:** [delronpos.com](https://delronpos.com) · **Repository:** [manzidelphin/delron-ai-pos](https://github.com/manzidelphin/delron-ai-pos)

> **Project status:** Actively developed and tested. The live deployment is not a guarantee of production readiness for every business workflow.

## What it does

| Area | Capabilities |
| --- | --- |
| **Point of sale** | Sales workflows, barcode-based product handling, and transaction records |
| **Inventory** | Products, stock movements, restocking, and supplier management |
| **Bakery** | Recipes, ingredients, production batches, baked goods, and waste tracking |
| **Bar** | Table-oriented workflows, stock tracking, and operational views |
| **Customer credit** | Outstanding balances, partial payments, and customer follow-up |
| **Reporting** | Sales and operational summaries, charts, and export utilities |
| **AI assistance** | Business-data questions and dashboard briefings, subject to configured integrations |
| **Business operations** | Staff roles, multiple branches, and responsive dashboard interfaces |

Feature availability depends on business configuration and the deployed application version.

## Technology

| Layer | Stack |
| --- | --- |
| Frontend | Next.js 14 App Router, React 18, TypeScript |
| Styling and components | Tailwind CSS, Radix UI, Lucide icons |
| Data and authentication | Supabase (PostgreSQL and Supabase Auth) |
| State management | Zustand |
| AI integrations | Google Generative AI and Anthropic SDK dependencies |
| Charts and exports | Recharts, jsPDF, SheetJS |
| Notifications | Africa's Talking, Resend |
| Deployment | Vercel |

## Getting started

**Prerequisites:** Node.js and npm, a Supabase project, and credentials for any optional integrations you plan to use.

```bash
git clone https://github.com/manzidelphin/delron-ai-pos.git
cd delron-ai-pos
npm install
```

Create a local environment file:

```powershell
# PowerShell (Windows)
Copy-Item ENV_SETUP.md .env.local
```

Or on macOS/Linux:

```bash
cp ENV_SETUP.md .env.local
```

**Important:** `ENV_SETUP.md` is a reference document, not a ready-to-run environment file. Edit `.env.local` so it contains only valid `KEY=value` entries with your own credentials. Never commit it.

At minimum, configure the Supabase URL, the appropriate browser-safe publishable/anon key, and the server-only Supabase secret key required by the application's current configuration. See [ENV_SETUP.md](ENV_SETUP.md) for the variable names used by the codebase. Other integrations require their own credentials.

Start the development server:

```bash
npm run dev
```

Open **http://localhost:3000**.

### Database setup

The repository includes [supabase/schema.sql](supabase/schema.sql) as a schema reference. Review it before applying it to a **new development project**. Do not run the schema blindly against an existing production database. Depending on the current code and migration state, additional setup may be necessary.

## Available commands

```bash
npm run dev     # Start local development
npm run build   # Create a production build
npm run start   # Serve the production build
npm run lint    # Run Next.js lint checks
```

The repository does **not** currently declare an automated `npm test` script. Automated test coverage and end-to-end validation remain areas for improvement.

## Project structure

```text
src/
├── app/           # Next.js routes, dashboards, and API endpoints
├── components/    # Shared interface components
├── lib/           # Business logic, integrations, and Supabase clients
├── store/         # Client-side state
└── types/         # TypeScript definitions
supabase/          # Database schema and related assets
vercel.json        # Deployment and scheduled job configuration
```

### Deployment

The application is deployed using Vercel with Supabase for backend services. The [vercel.json](vercel.json) file defines scheduled routes for daily processing, reporting, and invoice generation. Configure the required environment variables in Vercel before deployment, and validate scheduled jobs in your own environment.

## Security considerations

- Keep server-side credentials, database secrets, webhook secrets, and AI API keys **out of source control**.
- Never expose a Supabase secret/service-role key in `NEXT_PUBLIC_*` variables or client-side code. Privileged clients must run on the server.
- Apply and verify appropriate database Row Level Security (RLS) policies for browser-accessible operations.
- Rotate and revoke credentials immediately if they are accidentally exposed. Deleting a file from the latest commit alone does not remove it from Git history.
- Use separate credentials and data for development and production.
- Review authentication, authorization, payments, and inventory operations before onboarding real customers.

**Security note:** A previously tracked local settings file containing a credential was removed from the current repository and rewritten history; the affected credential was revoked. Additional GitHub-hosted cached-reference cleanup has been requested from GitHub Support. Do not reuse older credentials or restore old history.

## Roadmap

- Add automated unit, integration, and end-to-end tests
- Improve developer setup and database migration documentation
- Expand deployment monitoring and operational checks
- Continue validating business workflows with representative test data

## Author

**Manzi Delphin** · Software Engineering · Rwanda 🇷🇼

Built to make day-to-day business operations easier to manage, understand, and improve.
