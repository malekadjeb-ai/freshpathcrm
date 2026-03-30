import twilio from "twilio";

interface SMSResult {
  success: boolean;
  mode: "live" | "dev";
  sid?: string;
  error?: string;
}

/**
 * Send SMS via Twilio. Falls back to dev mode (console log only)
 * if Twilio credentials are not configured in environment variables.
 */
export async function sendSMSDirect(
  params: { to: string; body: string },
  statusCallbackUrl?: string
): Promise<SMSResult> {
  const { to, body } = params;

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const phoneNumber = process.env.TWILIO_PHONE_NUMBER;

  if (accountSid && authToken && phoneNumber) {
    try {
      const client = twilio(accountSid, authToken);

      const messageOpts: {
        body: string;
        from: string;
        to: string;
        statusCallback?: string;
      } = {
        body,
        from: phoneNumber,
        to,
      };

      if (statusCallbackUrl) {
        messageOpts.statusCallback = statusCallbackUrl;
      }

      const message = await client.messages.create(messageOpts);

      return { success: true, mode: "live", sid: message.sid };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      console.error("[SMS ERROR - Twilio]", msg);
      return { success: false, mode: "live", error: msg };
    }
  }

  // ── Dev mode ────────────────────────────────────────────
  return { success: true, mode: "dev" };
}
