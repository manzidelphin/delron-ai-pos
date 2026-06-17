import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

export async function GET() {
  const apiKey = process.env.GEMINI_API_KEY ?? "";
  const keyPreview = apiKey ? `${apiKey.slice(0, 10)}... (length: ${apiKey.length})` : "NOT SET";

  console.log("[AI Test] GEMINI_API_KEY preview:", keyPreview);

  if (!apiKey) {
    return NextResponse.json({
      ok: false,
      key_preview: keyPreview,
      error: "GEMINI_API_KEY is not set in environment",
    });
  }

  // Test 1: constructor
  let genAI: GoogleGenerativeAI;
  try {
    genAI = new GoogleGenerativeAI(apiKey);
    console.log("[AI Test] GoogleGenerativeAI constructor: OK");
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[AI Test] Constructor failed:", msg);
    return NextResponse.json({ ok: false, key_preview: keyPreview, stage: "constructor", error: msg });
  }

  // Test 2: simple generateContent call
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    console.log("[AI Test] Calling generateContent...");
    const result = await model.generateContent("Say: Hello from DELRON AI POS");
    const text = result.response.text();
    console.log("[AI Test] Success, response:", text.slice(0, 100));
    return NextResponse.json({ ok: true, key_preview: keyPreview, model: "gemini-2.0-flash", response: text });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack?.slice(0, 500) : undefined;
    console.error("[AI Test] generateContent failed:", msg);
    return NextResponse.json({ ok: false, key_preview: keyPreview, model: "gemini-1.5-flash", stage: "generateContent", error: msg, stack });
  }
}
