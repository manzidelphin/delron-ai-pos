/**
 * One-time MTN MoMo sandbox API user provisioning script.
 *
 * Usage:
 *   node scripts/provision-momo.mjs
 *
 * Reads MOMO_COLLECTION_PRIMARY_KEY from .env.local automatically.
 * Prints MOMO_API_USER and MOMO_API_KEY — paste them into .env.local.
 *
 * Requires Node 18+ (built-in fetch). No npm install needed.
 */

import { readFileSync } from "fs";
import { randomUUID } from "crypto";
import { resolve } from "path";

// ── Read .env.local ───────────────────────────────────────────────────────────
const envPath = resolve(process.cwd(), ".env.local");
let primaryKey = "";

try {
  const lines = readFileSync(envPath, "utf8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("MOMO_COLLECTION_PRIMARY_KEY=")) {
      primaryKey = trimmed.split("=")[1].trim();
      break;
    }
  }
} catch {
  // fall through — will be caught below
}

if (!primaryKey || primaryKey === "placeholder") {
  console.error("✗ MOMO_COLLECTION_PRIMARY_KEY not found in .env.local or is still 'placeholder'.");
  console.error("  Add your sandbox Primary Key to .env.local first, then re-run this script.");
  process.exit(1);
}

const BASE = "https://sandbox.momodeveloper.mtn.com";
const apiUserId = randomUUID();

console.log("");
console.log("MTN MoMo Sandbox — API User Provisioning");
console.log("─────────────────────────────────────────");
console.log(`Primary Key : ${primaryKey}`);
console.log(`API User ID : ${apiUserId}  (freshly generated UUID)`);
console.log("");

// ── Step 1: Create API User ───────────────────────────────────────────────────
console.log("Step 1 — Creating API user...");

const createRes = await fetch(`${BASE}/v1_0/apiuser`, {
  method: "POST",
  headers: {
    "Ocp-Apim-Subscription-Key": primaryKey,
    "X-Reference-Id":            apiUserId,
    "Content-Type":              "application/json",
  },
  body: JSON.stringify({ providerCallbackHost: "delron-ai-pos.vercel.app" }),
});

if (createRes.status !== 201) {
  const text = await createRes.text();
  console.error(`✗ Create API user failed: HTTP ${createRes.status}`);
  console.error(`  Response: ${text}`);
  process.exit(1);
}

console.log("✓ API user created (HTTP 201)");

// ── Step 2: Fetch API Key ─────────────────────────────────────────────────────
console.log("Step 2 — Fetching API key...");

const keyRes = await fetch(`${BASE}/v1_0/apiuser/${apiUserId}/apikey`, {
  method: "POST",
  headers: {
    "Ocp-Apim-Subscription-Key": primaryKey,
  },
});

if (keyRes.status !== 201) {
  const text = await keyRes.text();
  console.error(`✗ Get API key failed: HTTP ${keyRes.status}`);
  console.error(`  Response: ${text}`);
  process.exit(1);
}

const { apiKey } = await keyRes.json();
console.log("✓ API key received");

// ── Step 3: Verify the user exists ───────────────────────────────────────────
console.log("Step 3 — Verifying user...");

const verifyRes = await fetch(`${BASE}/v1_0/apiuser/${apiUserId}`, {
  headers: { "Ocp-Apim-Subscription-Key": primaryKey },
});

if (!verifyRes.ok) {
  console.warn(`  Warning: verification returned HTTP ${verifyRes.status} — keys may still work`);
} else {
  const info = await verifyRes.json();
  console.log(`✓ User verified — targetEnvironment: ${info.targetEnvironment}`);
}

// ── Output ────────────────────────────────────────────────────────────────────
console.log("");
console.log("════════════════════════════════════════════════════════════════");
console.log("  Add these two lines to your .env.local:");
console.log("════════════════════════════════════════════════════════════════");
console.log("");
console.log(`MOMO_API_USER=${apiUserId}`);
console.log(`MOMO_API_KEY=${apiKey}`);
console.log("");
console.log("════════════════════════════════════════════════════════════════");
console.log("");
console.log("Also set these if not already done:");
console.log("  MOMO_TARGET_ENVIRONMENT=sandbox");
console.log("  MOMO_CALLBACK_URL=https://delron-ai-pos.vercel.app/api/webhooks/momo-callback");
console.log("  MOMO_WEBHOOK_SECRET=<any random secret you choose>");
console.log("");
console.log("Done. You can now test Request to Pay in sandbox mode.");
