import { Resend } from "resend";
import nodemailer from "nodemailer";
import { getAuthedGoogleClient } from "@/lib/google";
import { google } from "googleapis";

interface EmailResult {
  success: boolean;
  mode: "live" | "dev";
  id?: string;
  error?: string;
}

interface SendEmailParams {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  from?: string;
}

/**
 * Send email via the configured provider (Resend, SendGrid, or SMTP).
 * Falls back to dev mode (console log only) if no provider is configured.
 */
export async function sendEmailDirect(
  params: SendEmailParams,
  settings: {
    emailProvider?: string | null;
    senderEmail?: string | null;
    emailFromName?: string | null;
    businessName?: string;
    googleEmail?: string | null;
  }
): Promise<EmailResult> {
  const { to, subject, html, text, from } = params;

  // Read secrets from environment variables
  const resendApiKey = process.env.RESEND_API_KEY;
  const sendgridApiKey = process.env.SENDGRID_API_KEY;
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : null;
  const smtpUser = process.env.SMTP_USER;
  const smtpPassword = process.env.SMTP_PASSWORD;

  const envSecrets = { resendApiKey, sendgridApiKey, smtpUser, googleEmail: settings.googleEmail };
  const provider = settings.emailProvider || detectProvider(envSecrets);
  const senderName = settings.emailFromName || settings.businessName || "Fresh Path Mobile Detailing";
  const senderAddr = from || settings.senderEmail;

  // ── Resend ──────────────────────────────────────────────
  if (provider === "resend" && resendApiKey) {
    try {
      const resend = new Resend(resendApiKey);
      const fromAddr = senderAddr
        ? `${senderName} <${senderAddr}>`
        : `${senderName} <onboarding@resend.dev>`;

      // Resend requires at least html or text
      const emailPayload = html
        ? { from: fromAddr, to, subject, html }
        : { from: fromAddr, to, subject, text: text || subject };

      const { data, error } = await resend.emails.send(emailPayload);

      if (error) {
        console.error("[EMAIL ERROR - Resend]", error);
        return { success: false, mode: "live", error: error.message };
      }

      return { success: true, mode: "live", id: data?.id };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      console.error("[EMAIL ERROR - Resend]", msg);
      return { success: false, mode: "live", error: msg };
    }
  }

  // ── SendGrid ────────────────────────────────────────────
  if (provider === "sendgrid" && sendgridApiKey && senderAddr) {
    try {
      const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${sendgridApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: to }] }],
          from: { email: senderAddr, name: senderName },
          subject,
          content: [
            html ? { type: "text/html", value: html } : { type: "text/plain", value: text || subject },
          ],
          tracking_settings: {
            click_tracking: { enable: true },
            open_tracking: { enable: true },
          },
        }),
      });

      if (res.ok || res.status === 202) {
        const externalId = res.headers.get("x-message-id") || undefined;
        return { success: true, mode: "live", id: externalId };
      }

      const errorBody = await res.text();
      console.error("[EMAIL ERROR - SendGrid]", res.status, errorBody);
      return { success: false, mode: "live", error: `SendGrid ${res.status}: ${errorBody}` };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      console.error("[EMAIL ERROR - SendGrid]", msg);
      return { success: false, mode: "live", error: msg };
    }
  }

  // ── SMTP (Gmail or custom) ──────────────────────────────
  if (provider === "smtp" && smtpUser && smtpPassword) {
    try {
      const port = smtpPort || 587;
      const transporter = nodemailer.createTransport({
        host: smtpHost || "smtp.gmail.com",
        port,
        secure: port === 465,
        auth: {
          user: smtpUser,
          pass: smtpPassword,
        },
      });

      const info = await transporter.sendMail({
        from: `"${senderName}" <${smtpUser}>`,
        to,
        subject,
        html: html || undefined,
        text: text || undefined,
      });

      return { success: true, mode: "live", id: info.messageId };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      console.error("[EMAIL ERROR - SMTP]", msg);
      return { success: false, mode: "live", error: msg };
    }
  }

  // ── Gmail API (free, uses connected Google account) ────
  if (provider === "gmail" || (!provider && settings.googleEmail)) {
    try {
      const authClient = await getAuthedGoogleClient();
      if (!authClient) {
        console.error("[EMAIL] Google account not connected");
        return { success: true, mode: "dev" };
      }

      const fromEmail = settings.googleEmail || "me";
      const fromHeader = senderName
        ? `${senderName} <${fromEmail}>`
        : fromEmail;

      const boundary = `boundary_${Date.now()}`;
      const emailLines = [
        `From: ${fromHeader}`,
        `To: ${to}`,
        `Subject: ${subject}`,
        `MIME-Version: 1.0`,
        `Content-Type: multipart/alternative; boundary="${boundary}"`,
        ``,
        `--${boundary}`,
        `Content-Type: text/plain; charset="UTF-8"`,
        ``,
        text || subject || "",
        `--${boundary}`,
        `Content-Type: text/html; charset="UTF-8"`,
        ``,
        html || text || subject || "",
        `--${boundary}--`,
      ];
      const rawEmail = emailLines.join("\r\n");

      const encodedEmail = Buffer.from(rawEmail)
        .toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");

      const gmail = google.gmail({ version: "v1", auth: authClient });
      const res = await gmail.users.messages.send({
        userId: "me",
        requestBody: { raw: encodedEmail },
      });

      return { success: true, mode: "live", id: res.data.id || undefined };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Gmail send failed";
      console.error("[EMAIL ERROR - Gmail]", msg);
      return { success: false, mode: "live", error: msg };
    }
  }

  // ── Dev mode ────────────────────────────────────────────
  return { success: true, mode: "dev" };
}

/**
 * Auto-detect which email provider is configured based on available keys.
 */
function detectProvider(keys: {
  resendApiKey?: string | null;
  sendgridApiKey?: string | null;
  smtpUser?: string | null;
  googleEmail?: string | null;
}): string | null {
  if (keys.resendApiKey) return "resend";
  if (keys.sendgridApiKey) return "sendgrid";
  if (keys.smtpUser) return "smtp";
  if (keys.googleEmail) return "gmail";
  return null;
}
