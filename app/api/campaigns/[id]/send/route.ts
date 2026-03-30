import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDb } from "@/src/db";
import { campaigns, campaignRecipients, customers } from "@/src/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { sendSMS, sendEmail, resolveTemplate, getTemplateVariables } from "@/lib/services/communication";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return auth.error;
    const { session: _session, tenantId } = auth;

    const db = getDb();
    const [campaign] = await db.select().from(campaigns).where(eq(campaigns.id, params.id));
    if (!campaign) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (campaign.status !== "Draft" && campaign.status !== "Scheduled") {
      return NextResponse.json({ error: "Campaign already sent or in progress" }, { status: 400 });
    }

    // Mark as in-progress
    await db
      .update(campaigns)
      .set({ status: "Sending", updatedAt: new Date().toISOString() })
      .where(eq(campaigns.id, campaign.id));

    // Parse target criteria and find matching customers
    const criteria = JSON.parse(campaign.targetCriteria || "{}");

    let allCustomers = await db.select().from(customers).where(and(isNull(customers.deletedAt), eq(customers.tenantId, tenantId)));

    if (criteria.lifecycleStage) {
      allCustomers = allCustomers.filter((c) => c.lifecycleStage === criteria.lifecycleStage);
    }
    if (criteria.city) {
      allCustomers = allCustomers.filter((c) => c.city === criteria.city);
    }
    if (criteria.source) {
      allCustomers = allCustomers.filter((c) => c.source === criteria.source);
    }

    // Filter by channel availability
    let matchingCustomers = allCustomers;
    if (campaign.type === "sms") {
      matchingCustomers = matchingCustomers.filter((c) => c.phone !== null);
    } else if (campaign.type === "email") {
      matchingCustomers = matchingCustomers.filter((c) => c.email !== null);
    } else {
      matchingCustomers = matchingCustomers.filter((c) => c.phone !== null || c.email !== null);
    }

    if (matchingCustomers.length === 0) {
      await db
        .update(campaigns)
        .set({ status: "Draft", updatedAt: new Date().toISOString() })
        .where(eq(campaigns.id, campaign.id));
      return NextResponse.json({ error: "No matching recipients found" }, { status: 400 });
    }

    // Clear any existing recipients for re-send
    await db.delete(campaignRecipients).where(eq(campaignRecipients.campaignId, campaign.id));

    let sentCount = 0;
    let failedCount = 0;

    // Actually send to each customer
    for (const customer of matchingCustomers) {
      // Resolve template variables per customer
      const vars = await getTemplateVariables(customer.id);
      const messageBody = resolveTemplate(campaign.body || "", vars);
      const messageSubject = campaign.subject
        ? resolveTemplate(campaign.subject, vars)
        : "Message from Fresh Path";

      // Send SMS if applicable
      if ((campaign.type === "sms" || campaign.type === "both") && customer.phone) {
        const smsResult = await sendSMS({
          to: customer.phone,
          body: messageBody,
          customerId: customer.id,
          campaignId: campaign.id,
        });

        await db.insert(campaignRecipients).values({
          campaignId: campaign.id,
          customerId: customer.id,
          channel: "sms",
          to: customer.phone,
          status: smsResult.success ? "sent" : "failed",
          sentAt: new Date().toISOString(),
          error: smsResult.error || null,
        });

        if (smsResult.success) sentCount++;
        else failedCount++;
      }

      // Send email if applicable
      if ((campaign.type === "email" || campaign.type === "both") && customer.email) {
        const emailResult = await sendEmail({
          to: customer.email,
          subject: messageSubject,
          body: messageBody,
          customerId: customer.id,
          campaignId: campaign.id,
        });

        await db.insert(campaignRecipients).values({
          campaignId: campaign.id,
          customerId: customer.id,
          channel: "email",
          to: customer.email,
          status: emailResult.success ? "sent" : "failed",
          sentAt: new Date().toISOString(),
          error: emailResult.error || null,
        });

        if (emailResult.success) sentCount++;
        else failedCount++;
      }
    }

    // Update campaign stats
    await db
      .update(campaigns)
      .set({
        status: "Sent",
        sentCount,
        failedCount,
        audienceCount: matchingCustomers.length,
        sentAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(campaigns.id, campaign.id));

    return NextResponse.json({
      success: true,
      recipientCount: matchingCustomers.length,
      messagesSent: sentCount,
      messagesFailed: failedCount,
    });
  } catch (error) {
    console.error("Campaign send error:", error);
    // Try to reset campaign status on error
    try {
      const db = getDb();
      await db
        .update(campaigns)
        .set({ status: "Draft", updatedAt: new Date().toISOString() })
        .where(eq(campaigns.id, params.id));
    } catch { /* ignore */ }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
