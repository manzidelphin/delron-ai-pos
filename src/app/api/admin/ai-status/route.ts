import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { checkPlatformAdmin } from "@/lib/admin-auth";
import { GEMINI_MODEL } from "@/lib/ai";

export const dynamic = "force-dynamic";

/**
 * Platform admins only: is the AI (Gemini) working?
 * Reports whether the key is set, whether the configured model answers, and
 * which Gemini "flash" models the key can use. Never returns any part of the key.
 */
export async function GET() {
  const { error } = await checkPlatformAdmin();
  if (error) return error;

  const apiKey = process.env.GEMINI_API_KEY ?? "";
  if (!apiKey) {
    return NextResponse.json({ ok: false, key_set: false, model: GEMINI_MODEL, error: "GEMINI_API_KEY is not set in Vercel" });
  }

  let availableModels: string[] = [];
  try {
    const res = await fetch("https://generativelanguage.googleapis.com/v1beta/models?pageSize=200", {
      headers: { "x-goog-api-key": apiKey },
      cache: "no-store",
    });
    if (res.ok) {
      const json = (await res.json()) as { models?: { name: string; supportedGenerationMethods?: string[] }[] };
      availableModels = (json.models ?? [])
        .filter((m) => m.supportedGenerationMethods?.includes("generateContent") && /flash/i.test(m.name))
        .map((m) => m.name.replace(/^models\//, ""));
    }
  } catch {
    // listing is a bonus; the test below is what matters
  }

  try {
    const model = new GoogleGenerativeAI(apiKey).getGenerativeModel({ model: GEMINI_MODEL });
    const started = Date.now();
    const result = await model.generateContent("Reply with exactly: DELRON AI OK");
    return NextResponse.json({
      ok: true,
      key_set: true,
      model: GEMINI_MODEL,
      reply: result.response.text().trim().slice(0, 100),
      ms: Date.now() - started,
      available_flash_models: availableModels,
    });
  } catch (e) {
    return NextResponse.json({
      ok: false,
      key_set: true,
      model: GEMINI_MODEL,
      error: (e instanceof Error ? e.message : String(e)).slice(0, 300),
      available_flash_models: availableModels,
      hint: "If the model is retired, set GEMINI_MODEL in Vercel to one of available_flash_models and redeploy.",
    });
  }
}
