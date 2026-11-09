/**
 * Shared Supabase credentials for the one-off scripts in scripts/.
 *
 * Reads NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from the
 * environment, loading .env.local from the current directory if present.
 * Run scripts from the repo root:  node scripts/<name>.mjs
 *
 * Never hardcode keys in these scripts — they are committed to a public repo.
 */
import { existsSync } from "fs";
import { resolve } from "path";

const envPath = resolve(process.cwd(), ".env.local");
if (existsSync(envPath)) process.loadEnvFile(envPath);

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
export const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(
    "✗ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.\n" +
      "  Add them to .env.local in the repo root (see ENV_SETUP.md), then re-run."
  );
  process.exit(1);
}
