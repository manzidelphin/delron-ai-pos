import { createBrowserClient } from "@supabase/ssr";

// Use untyped client here; types are enforced via src/types/index.ts throughout the app.
// Once you link to a real Supabase project, run:
//   npx supabase gen types typescript --project-id <id> > src/types/database.ts
// and restore the <Database> generic.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
