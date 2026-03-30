import { getDb } from "@/src/db";
import { businessSettings, customers, communications, jobs, jobServices, serviceItems, vehicles, invoices } from "@/src/db/schema";
import { eq } from "drizzle-orm";
import { sendEmailDirect } from "./email";
import { sendSMSDirect } from "./sms";
import { getAuthedGoogleClient } from "@/lib/google";
import { google } from "googleapis";

// ─── Interfaces ─────────────────────────────────────────────────

interface SendSMSOptions {
  to: string;
  body: string;
  customerId?: string;
  jobId?: string;
  campaignId?: string;
}

interface SendEmailOptions {
  to: string;
  subject: string;
  body: string;
  html?: string;
  customerId?: string;
  jobId?: string;
  campaignId?: string;
}

interface LogCallOptions {
  customerId: string;
  duration: number;
  outcome: string;
  notes?: string;
  jobId?: string;
}

interface SendResult {
  success: boolean;
  mode: "live" | "dev";
  externalId?: string;
  error?: string;
  communicationId?: string;
}

// ─── Template Variables ─────────────────────────────────────────

const VARIABLE_DESCRIPTIONS: Record<string, string> = {
  "{{customer_name}}": "Customer full name",
  "{{customer_first_name}}": "Customer first name",
  "{{job_date}}": "Job date (e.g., March 25, 2026)",
  "{{job_time}}": "Job time (e.g., 10:00 AM)",
  "{{services}}": "Comma-separated service names",
  "{{total}}": "Total price formatted",
  "{{payment_link}}": "Payment link URL",
  "{{review_link}}": "Google review link",
  "{{business_name}}": "Business name",
  "{{business_phone}}": "Business phone number",
  "{{booking_link}}": "Online booking page URL",
  "{{estimate_total}}": "Estimate total formatted",
  "{{estimate_number}}": "Estimate number",
  "{{invoice_number}}": "Invoice number",
  "{{due_date}}": "Invoice due date",
  "{{vehicle}}": "Vehicle year make model",
  "{{address}}": "Service address",
};

export function getAvailableVariables() {
  return VARIABLE_DESCRIPTIONS;
}

export function resolveTemplate(
  template: string,
  variables: Record<string, string>
): string {
  let resolved = template;
  for (const [key, value] of Object.entries(variables)) {
    resolved = resolved.replace(new RegExp(key.replace(/[{}]/g, "\\$&"), "g"), value);
  }
  return resolved;
}

export async function getTemplateVariables(
  customerId?: string,
  jobId?: string
): Promise<Record<string, string>> {
  const db = getDb();
  const vars: Record<string, string> = {};

  const [settings] = await db.select().from(businessSettings);
  if (settings) {
    vars["{{business_name}}"] = settings.businessName;
    vars["{{business_phone}}"] = settings.phone;
    vars["{{review_link}}"] = settings.googleReviewUrl || "#";
    vars["{{booking_link}}"] = settings.bookingEnabled
      ? `${process.env.NEXTAUTH_URL || ""}/${settings.bookingPageSlug || "book"}`
      : "#";
  }

  if (customerId) {
    const [customer] = await db
      .select()
      .from(customers)
      .where(eq(customers.id, customerId));
    if (customer) {
      vars["{{customer_name}}"] = customer.name;
      vars["{{customer_first_name}}"] = customer.name.split(" ")[0];
      vars["{{address}}"] = customer.address || "";
    }
  }

  if (jobId) {
    const [job] = await db
      .select()
      .from(jobs)
      .where(eq(jobs.id, jobId));

    if (job) {
      if (job.scheduledAt) {
        const scheduledDate = new Date(job.scheduledAt);
        vars["{{job_date}}"] = scheduledDate.toLocaleDateString("en-US", {
          weekday: "long",
          month: "long",
          day: "numeric",
          year: "numeric",
        });
        vars["{{job_time}}"] = scheduledDate.toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
        });
      }

      // Get services
      const jobServiceRows = await db
        .select({ serviceItemId: jobServices.serviceItemId, name: jobServices.name })
        .from(jobServices)
        .where(eq(jobServices.jobId, jobId));

      if (jobServiceRows.length > 0) {
        const serviceNames: string[] = [];
        for (const js of jobServiceRows) {
          if (js.serviceItemId) {
            const [si] = await db
              .select({ name: serviceItems.name })
              .from(serviceItems)
              .where(eq(serviceItems.id, js.serviceItemId));
            if (si) serviceNames.push(si.name);
          } else if (js.name) {
            serviceNames.push(js.name);
          }
        }
        vars["{{services}}"] = serviceNames.join(", ");
      }

      vars["{{total}}"] = `$${job.total.toFixed(2)}`;
      vars["{{address}}"] = job.address || vars["{{address}}"] || "";

      if (job.vehicleId) {
        const [vehicle] = await db
          .select()
          .from(vehicles)
          .where(eq(vehicles.id, job.vehicleId));
        if (vehicle) {
          vars["{{vehicle}}"] = `${vehicle.year} ${vehicle.make} ${vehicle.model}`;
        }
      }

      // Get invoice
      const [invoice] = await db
        .select()
        .from(invoices)
        .where(eq(invoices.jobId, jobId));
      if (invoice) {
        vars["{{invoice_number}}"] = invoice.invoiceNumber;
        vars["{{payment_link}}"] = invoice.paymentLink || "#";
        vars["{{due_date}}"] = invoice.dueDate
          ? new Date(invoice.dueDate).toLocaleDateString("en-US")
          : "Due on receipt";
      }
    }
  }

  return vars;
}

// ─── Send SMS ───────────────────────────────────────────────────

export async function sendSMS({
  to,
  body,
  customerId,
  jobId,
  campaignId,
}: SendSMSOptions): Promise<SendResult> {
  const db = getDb();
  const [settings] = await db.select().from(businessSettings);

  // Lookup customer carrier if we have a customerId
  let customerCarrier: string | null = null;
  if (customerId) {
    const [customer] = await db
      .select({ phoneCarrier: customers.phoneCarrier })
      .from(customers)
      .where(eq(customers.id, customerId));
    customerCarrier = customer?.phoneCarrier || null;
  }

  let result: { success: boolean; mode: "live" | "dev"; sid?: string; error?: string; method?: string };

  // Strategy 1: Gmail carrier gateway (uses your connected Google account)
  if (customerCarrier) {
    const gateway = CARRIER_GATEWAYS[customerCarrier.toLowerCase()];
    if (gateway) {
      const gmailResult = await sendSMSViaGmail(to, body, gateway);
      if (gmailResult.success) {
        result = { success: true, mode: "live", sid: gmailResult.messageId, method: "carrier-gateway" };
      } else {
        // Gmail gateway failed — try other methods
        console.error("[SMS] Gmail gateway failed:", gmailResult.error);
        result = { success: false, mode: "dev", error: gmailResult.error };
      }
    } else {
      result = { success: false, mode: "dev", error: `Unknown carrier: ${customerCarrier}` };
    }
  }
  // Strategy 2: Email provider carrier gateway (if configured)
  else if (settings?.enableEmailToSMS && customerCarrier) {
    const gateway = CARRIER_GATEWAYS[(customerCarrier || "").toLowerCase()];
    if (gateway) {
      const phoneDigits = to.replace(/\D/g, "").slice(-10);
      const smsEmail = `${phoneDigits}@${gateway}`;

      const emailResult = await sendEmailDirect(
        { to: smsEmail, subject: "", text: body },
        {
          emailProvider: settings.emailProvider,
          senderEmail: settings.senderEmail,
          emailFromName: settings.emailFromName,
          businessName: settings.businessName,
          googleEmail: settings.googleEmail,
        }
      );

      if (emailResult.success) {
        result = { success: true, mode: emailResult.mode as "live" | "dev", sid: emailResult.id, method: "carrier-gateway" };
      } else {
        result = { success: false, mode: "dev", error: emailResult.error };
      }
    } else {
      result = { success: false, mode: "dev", error: "Unknown carrier" };
    }
  } else {
    // Strategy 3: Twilio (if configured)
    const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL;
    const statusCallbackUrl = baseUrl ? `${baseUrl}/api/webhooks/twilio` : undefined;

    const twilioResult = await sendSMSDirect(
      { to, body },
      statusCallbackUrl
    );
    result = { ...twilioResult };
  }

  // Determine status based on result
  const status = result.mode === "dev"
    ? "logged_dev"
    : result.success
      ? "sent"
      : "failed";

  // Log communication record
  let communicationId: string | undefined;
  if (customerId) {
    const [comm] = await db
      .insert(communications)
      .values({
        customerId,
        type: "sms",
        direction: "outbound",
        status,
        summary: body.length > 200 ? body.substring(0, 200) + "..." : body,
        body,
        externalId: result.sid || null,
        outcome: result.mode === "dev" ? "dev_mode" : result.error || null,
        channel: result.method === "carrier-gateway" ? "email-gateway" : "sms",
        jobId: jobId || null,
        campaignId: campaignId || null,
      })
      .returning();
    communicationId = comm.id;

    await db
      .update(customers)
      .set({ lastContactedAt: new Date().toISOString() })
      .where(eq(customers.id, customerId));
  }

  return {
    success: result.success,
    mode: result.mode,
    externalId: result.sid,
    error: result.error,
    communicationId,
  };
}

// ─── Send Email ─────────────────────────────────────────────────

export async function sendEmail({
  to,
  subject,
  body,
  html,
  customerId,
  jobId,
  campaignId,
}: SendEmailOptions): Promise<SendResult> {
  const db = getDb();
  const [settings] = await db.select().from(businessSettings);

  const result = await sendEmailDirect(
    { to, subject, html: html || body, text: body },
    {
      emailProvider: settings?.emailProvider,
      senderEmail: settings?.senderEmail,
      emailFromName: settings?.emailFromName,
      businessName: settings?.businessName,
      googleEmail: settings?.googleEmail,
    }
  );

  const status = result.mode === "dev"
    ? "logged_dev"
    : result.success
      ? "sent"
      : "failed";

  let communicationId: string | undefined;
  if (customerId) {
    const [comm] = await db
      .insert(communications)
      .values({
        customerId,
        type: "email",
        direction: "outbound",
        status,
        summary: subject,
        body: html || body,
        externalId: result.id || null,
        outcome: result.mode === "dev" ? "dev_mode" : result.error || null,
        channel: "email",
        jobId: jobId || null,
        campaignId: campaignId || null,
      })
      .returning();
    communicationId = comm.id;

    await db
      .update(customers)
      .set({ lastContactedAt: new Date().toISOString() })
      .where(eq(customers.id, customerId));
  }

  return {
    success: result.success,
    mode: result.mode,
    externalId: result.id,
    error: result.error,
    communicationId,
  };
}

// ─── Log Call ───────────────────────────────────────────────────

export async function logCall({
  customerId,
  duration,
  outcome,
  notes,
  jobId,
}: LogCallOptions) {
  const db = getDb();

  const [comm] = await db
    .insert(communications)
    .values({
      customerId,
      type: "call",
      direction: "outbound",
      status:
        outcome === "no_answer"
          ? "no-answer"
          : outcome === "voicemail"
            ? "voicemail"
            : "completed",
      summary: notes || null,
      duration,
      outcome,
      channel: "call",
      jobId: jobId || null,
    })
    .returning();

  await db
    .update(customers)
    .set({ lastContactedAt: new Date().toISOString() })
    .where(eq(customers.id, customerId));

  return comm;
}

// ─── Email-to-SMS Gateway ───────────────────────────────────────

const CARRIER_GATEWAYS: Record<string, string> = {
  att: "txt.att.net",
  verizon: "vtext.com",
  "t-mobile": "tmomail.net",
  tmobile: "tmomail.net",
  sprint: "messaging.sprintpcs.com",
  boost: "sms.myboostmobile.com",
  virgin: "vmomail.com",
  uscellular: "mms.uscc.net",
  cricket: "sms.cricketwireless.net",
  metropcs: "mymetropcs.com",
};

export function getCarrierGateways() {
  return Object.keys(CARRIER_GATEWAYS);
}

export async function sendSMSViaEmail(
  to: string,
  body: string,
  carrier: string,
  customerId?: string,
  jobId?: string
) {
  const db = getDb();
  const gateway = CARRIER_GATEWAYS[carrier.toLowerCase()];
  if (!gateway) {
    return { success: false, error: "Unknown carrier" };
  }

  const phoneDigits = to.replace(/\D/g, "").slice(-10);
  const smsEmail = `${phoneDigits}@${gateway}`;

  const [settings] = await db.select().from(businessSettings);
  const result = await sendEmailDirect(
    { to: smsEmail, subject: "", text: body },
    {
      emailProvider: settings?.emailProvider,
      senderEmail: settings?.senderEmail,
      emailFromName: settings?.emailFromName,
      businessName: settings?.businessName,
      googleEmail: settings?.googleEmail,
    }
  );

  if (result.success && customerId) {
    await db.insert(communications).values({
      customerId,
      type: "sms",
      direction: "outbound",
      status: result.mode === "dev" ? "logged_dev" : "sent",
      summary: body.length > 200 ? body.substring(0, 200) + "..." : body,
      body,
      externalId: result.id || `sms-gateway-${Date.now()}`,
      outcome: result.mode === "dev" ? "dev_mode" : null,
      channel: "email-gateway",
      jobId: jobId || null,
    });
    await db
      .update(customers)
      .set({ lastContactedAt: new Date().toISOString() })
      .where(eq(customers.id, customerId));
  }

  return { success: result.success, mode: result.mode, method: "email-gateway" };
}

// ─── Gmail-based SMS via Carrier Gateway ─────────────────────────

async function sendSMSViaGmail(
  to: string,
  body: string,
  gatewayDomain: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const authClient = await getAuthedGoogleClient();
    if (!authClient) {
      return { success: false, error: "Google account not connected — reconnect in Settings" };
    }

    const db = getDb();
    const [settings] = await db
      .select({ googleEmail: businessSettings.googleEmail })
      .from(businessSettings);
    const fromEmail = settings?.googleEmail || "me";

    const phoneDigits = to.replace(/\D/g, "").slice(-10);
    const smsEmail = `${phoneDigits}@${gatewayDomain}`;

    // Build raw RFC 2822 email
    const emailLines = [
      `From: ${fromEmail}`,
      `To: ${smsEmail}`,
      `Subject: `, // Carrier gateways don't need a subject
      `Content-Type: text/plain; charset="UTF-8"`,
      ``,
      body,
    ];
    const rawEmail = emailLines.join("\r\n");

    // Base64url encode
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

    return { success: true, messageId: res.data.id || undefined };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Gmail send failed";
    console.error("[SMS via Gmail]", msg);
    return { success: false, error: msg };
  }
}
