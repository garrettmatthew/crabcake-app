/**
 * Email delivery via Resend. No-ops if RESEND_API_KEY isn't configured
 * (so dev mode + missing-env-var deploys don't crash). When enabled,
 * the email is sent from EMAIL_FROM (default "Crabcakes <hi@crabcakes.app>").
 */

let resend: import("resend").Resend | null = null;

async function getResend() {
  if (!process.env.RESEND_API_KEY) return null;
  if (!resend) {
    const { Resend } = await import("resend");
    resend = new Resend(process.env.RESEND_API_KEY);
  }
  return resend;
}

const FROM = process.env.EMAIL_FROM ?? "Crabcakes <hi@crabcakes.app>";

export async function sendEmail(input: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}) {
  const client = await getResend();
  if (!client) {
    console.log(
      `[email] Skipped (no RESEND_API_KEY): to=${input.to} subject="${input.subject}"`
    );
    return { ok: false, skipped: true };
  }
  try {
    const res = await client.emails.send({
      from: FROM,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
    });
    if (res.error) {
      console.warn("[email] Resend error", res.error);
      return { ok: false, error: res.error };
    }
    return { ok: true, id: res.data?.id };
  } catch (e) {
    console.warn("[email] send failed", e);
    return { ok: false, error: e };
  }
}
