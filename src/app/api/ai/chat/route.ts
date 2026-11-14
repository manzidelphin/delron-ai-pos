import { GoogleGenerativeAI, type Content, type Part } from "@google/generative-ai";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { GEMINI_MODEL } from "@/lib/ai";
import { kigaliNowText, kigaliToday, runAITool, toolsFor, type AIToolContext } from "@/lib/ai-tools";

const FALLBACK = "AI assistant is temporarily unavailable. Please try again in a moment.";
const MAX_TOOL_ROUNDS = 6;
const MAX_HISTORY = 12;

type HistoryMessage = { role: "user" | "assistant"; content: string };

/** Earlier turns of this conversation, in Gemini's format (must start with the user). */
function toGeminiHistory(raw: unknown): Content[] {
  if (!Array.isArray(raw)) return [];
  const msgs = raw
    .filter((m): m is HistoryMessage => !!m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim() !== "")
    .slice(-MAX_HISTORY)
    .map((m) => ({ role: m.role === "user" ? "user" : "model", parts: [{ text: m.content.slice(0, 4000) }] }));
  while (msgs.length && msgs[0].role !== "user") msgs.shift();
  return msgs;
}

export async function POST(req: NextRequest) {
  // Outer catch — ensures we always return valid JSON, never an empty body
  try {
    const auth = await getAuthContext();
    if (auth.error) return auth.error;

    const body = await req.json().catch(() => ({}));
    const { message, history } = body as { message?: string; history?: unknown };

    if (!message?.trim()) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("[AI Chat] GEMINI_API_KEY is not set in environment");
      return NextResponse.json({ response: FALLBACK });
    }

    const supabase = createAdminClient();
    const { businessId, staffId, role } = auth;
    const fullAccess = role === "owner" || role === "manager";

    const [{ data: biz }, { data: me }] = await Promise.all([
      supabase.from("businesses").select("name, modules").eq("id", businessId).maybeSingle(),
      supabase.from("staff").select("name, user_id").eq("id", staffId).maybeSingle(),
    ]);
    const modules = Array.isArray(biz?.modules) ? (biz!.modules as string[]).join(", ") : "";

    const systemInstruction = `You are DELRON AI, the assistant inside DELRON POS for the business "${biz?.name ?? "this business"}" in Rwanda.
Modules in use: ${modules || "unknown"}.
Right now in Kigali it is ${kigaliNowText()} (today is ${kigaliToday()}). Resolve words like "today", "yesterday", "this week" (Monday to today), "last month" into exact YYYY-MM-DD dates yourself.
You are talking to ${me?.name ?? "a staff member"} (role: ${role}).${fullAccess ? "" : " This person is not an owner or manager: they can see items, open tabs and only their own sales. If they ask for anything else, say only the owner or a manager can see it."}

How to answer:
- Use the tools to look up real data for every question about sales, stock, prices, customers, staff, shifts, tabs, waste or orders. Never guess or invent numbers, names or items. Call several tools, or the same tool several times (for example two periods to compare), when needed.
- If a tool returns nothing, say there is no record for that period instead of making something up. If a tool returns an error, say the data could not be loaded.
- Reply in the language the user writes in (Kinyarwanda or English). Keep answers short and clear, with the key number first. Use simple lists for several items.
- Write money as "12,500 RWF". Mention the period you looked at when it is not obvious.
- You can also give practical advice (what to restock, which product sells best, which staff has cash shortages) based on the data you looked up.
- Plain text only: no markdown tables, no headings, no bold markers.`;

    const ctx: AIToolContext = { admin: supabase, businessId, staffId, fullAccess };

    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({
        model: GEMINI_MODEL,
        systemInstruction,
        tools: [{ functionDeclarations: toolsFor(fullAccess) }],
      });
      const chat = model.startChat({ history: toGeminiHistory(history) });

      let result = await chat.sendMessage(message.slice(0, 4000));
      for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
        const calls = result.response.functionCalls() ?? [];
        if (!calls.length) break;
        const parts: Part[] = await Promise.all(
          calls.map(async (c) => ({
            functionResponse: { name: c.name, response: await runAITool(ctx, c.name, (c.args ?? {}) as Record<string, unknown>) },
          }))
        );
        result = await chat.sendMessage(parts);
      }

      const aiResponse = result.response.text().trim() || "I couldn't find an answer to that. Try asking in a different way.";

      // Keep the conversation. user_id is the login account (auth user), not the
      // staff row; PIN-only staff have none.
      const { error: saveError } = await supabase.from("ai_conversations").insert([
        { business_id: businessId, user_id: me?.user_id ?? null, role: "user", message },
        { business_id: businessId, user_id: me?.user_id ?? null, role: "assistant", message: aiResponse },
      ]);
      if (saveError) console.error("[AI Chat] could not save conversation:", saveError.message);

      return NextResponse.json({ response: aiResponse });
    } catch (geminiErr) {
      console.error("[AI Chat] Gemini API error:", geminiErr);
      return NextResponse.json({ response: FALLBACK });
    }
  } catch (err) {
    console.error("[AI Chat] Unhandled route error:", err);
    return NextResponse.json({ error: "Internal server error", response: FALLBACK }, { status: 500 });
  }
}
