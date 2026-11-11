/**
 * Gemini model used by the AI chat and the daily briefing.
 * Google retires older models over time; when that happens every AI answer falls
 * back to the "temporarily unavailable" text. Set GEMINI_MODEL in Vercel to a
 * current model (see Admin → AI status for the models your key can use) to switch
 * without a code change.
 */
export const GEMINI_MODEL = process.env.GEMINI_MODEL?.trim() || "gemini-2.0-flash";
