/**
 * MTN MoMo Pay (Rwanda): customers pay a business's merchant code (till number)
 * by dialling *182*8*1*<code>#. Codes are digits only, so anything else typed
 * (spaces, dashes, a pasted "*182*8*1*…#") is stripped down to the number.
 */
export function cleanMomoPayCode(value: string | null | undefined): string {
  const digits = (value ?? "").replace(/^\s*\*182\*8\*1\*/, "").replace(/\D/g, "");
  return digits.slice(0, 12);
}

export function momoPayDial(code: string | null | undefined): string | null {
  const clean = cleanMomoPayCode(code);
  return clean ? `*182*8*1*${clean}#` : null;
}
