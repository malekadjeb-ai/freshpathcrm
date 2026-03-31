import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDb } from "@/src/db";
import { businessSettings, invoices, payments, customers } from "@/src/db/schema";
import { eq, inArray } from "drizzle-orm";
import { syncInvoiceToQB, syncPaymentToQB, refreshQBToken } from "@/lib/quickbooks";

async function getQBCredentials(tenantId: string) {
  const db = getDb();
  const settings = await db
    .select({
      accessToken: businessSettings.qbAccessToken,
      refreshToken: businessSettings.qbRefreshToken,
      realmId: businessSettings.qbRealmId,
      tokenExpiry: businessSettings.qbTokenExpiry,
      syncEnabled: businessSettings.qbSyncEnabled,
    })
    .from(businessSettings)
    .where(eq(businessSettings.tenantId, tenantId))
    .limit(1)
    .then((r) => r[0]);

  if (!settings?.accessToken || !settings?.refreshToken || !settings?.realmId) {
    return null;
  }

  const isExpired =
    settings.tokenExpiry && new Date(settings.tokenExpiry) < new Date();

  if (isExpired) {
    const refreshed = await refreshQBToken(settings.refreshToken);
    const expiresAt = new Date(
      Date.now() + refreshed.expiresIn * 1000
    ).toISOString();

    await db
      .update(businessSettings)
      .set({
        qbAccessToken: refreshed.accessToken,
        qbRefreshToken: refreshed.refreshToken,
        qbTokenExpiry: expiresAt,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(businessSettings.tenantId, tenantId));

    return {
      accessToken: refreshed.accessToken,
      realmId: settings.realmId,
    };
  }

  return {
    accessToken: settings.accessToken,
    realmId: settings.realmId,
  };
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const { type } = (await req.json()) as {
    type: "invoices" | "payments" | "expenses";
  };

  if (!type || !["invoices", "payments", "expenses"].includes(type)) {
    return NextResponse.json(
      { error: "Invalid sync type. Must be: invoices, payments, or expenses" },
      { status: 400 }
    );
  }

  const creds = await getQBCredentials(auth.tenantId);
  if (!creds) {
    return NextResponse.json(
      { error: "QuickBooks not connected. Go to Settings to connect." },
      { status: 400 }
    );
  }

  const db = getDb();
  const errors: string[] = [];
  let synced = 0;

  // Get tenant's customer IDs for scoping (invoices/payments lack tenantId)
  const tenantCustomers = await db
    .select({ id: customers.id, name: customers.name })
    .from(customers)
    .where(eq(customers.tenantId, auth.tenantId));

  const customerMap = new Map(tenantCustomers.map((c) => [c.id, c.name]));
  const customerIds = [...customerMap.keys()];

  if (type === "invoices") {
    if (customerIds.length === 0) {
      return NextResponse.json({ synced: 0, errors: [] });
    }

    const recentInvoices = await db
      .select()
      .from(invoices)
      .where(inArray(invoices.customerId, customerIds))
      .limit(50);

    for (const inv of recentInvoices) {
      try {
        await syncInvoiceToQB(
          {
            invoiceNumber: inv.invoiceNumber,
            total: inv.total,
            customerName: customerMap.get(inv.customerId) || "Unknown",
            lineItems: [
              { name: `Invoice ${inv.invoiceNumber}`, amount: inv.total },
            ],
          },
          creds.accessToken,
          creds.realmId
        );
        synced++;
      } catch (err) {
        errors.push(
          `Invoice ${inv.invoiceNumber}: ${err instanceof Error ? err.message : "Unknown error"}`
        );
      }
    }
  }

  if (type === "payments") {
    if (customerIds.length === 0) {
      return NextResponse.json({ synced: 0, errors: [] });
    }

    // Get invoice IDs belonging to tenant's customers
    const tenantInvoices = await db
      .select({ id: invoices.id })
      .from(invoices)
      .where(inArray(invoices.customerId, customerIds));

    const invoiceIds = tenantInvoices.map((inv) => inv.id);
    if (invoiceIds.length === 0) {
      return NextResponse.json({ synced: 0, errors: [] });
    }

    const recentPayments = await db
      .select()
      .from(payments)
      .where(inArray(payments.invoiceId, invoiceIds))
      .limit(50);

    for (const pmt of recentPayments) {
      try {
        await syncPaymentToQB(
          {
            amount: pmt.amount,
            method: pmt.method || "Other",
            invoiceRef: pmt.invoiceId,
          },
          creds.accessToken,
          creds.realmId
        );
        synced++;
      } catch (err) {
        errors.push(
          `Payment ${pmt.id}: ${err instanceof Error ? err.message : "Unknown error"}`
        );
      }
    }
  }

  if (type === "expenses") {
    return NextResponse.json({
      synced: 0,
      errors: ["Expense sync not yet implemented"],
    });
  }

  return NextResponse.json({ synced, errors });
}
