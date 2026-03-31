const QB_BASE_URL = "https://quickbooks.api.intuit.com/v3";

interface QBConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  realmId: string;
  accessToken: string;
  refreshToken: string;
}

export function getQBConfig(): Partial<QBConfig> {
  return {
    clientId: process.env.QB_CLIENT_ID,
    clientSecret: process.env.QB_CLIENT_SECRET,
    redirectUri:
      process.env.QB_REDIRECT_URI ||
      `${process.env.NEXTAUTH_URL}/api/integrations/quickbooks/callback`,
  };
}

export async function refreshQBToken(
  refreshToken: string
): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}> {
  const config = getQBConfig();
  const res = await fetch(
    "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(`${config.clientId}:${config.clientSecret}`).toString("base64")}`,
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }),
    }
  );
  if (!res.ok) throw new Error("Failed to refresh QuickBooks token");
  const data = await res.json();
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
  };
}

export async function qbRequest(
  path: string,
  accessToken: string,
  realmId: string,
  options?: RequestInit
) {
  const res = await fetch(`${QB_BASE_URL}/company/${realmId}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`QuickBooks API error: ${res.status} ${err}`);
  }
  return res.json();
}

export async function syncInvoiceToQB(
  invoice: {
    invoiceNumber: string;
    total: number;
    customerName: string;
    lineItems: { name: string; amount: number }[];
  },
  accessToken: string,
  realmId: string
) {
  return qbRequest("/invoice?minorversion=65", accessToken, realmId, {
    method: "POST",
    body: JSON.stringify({
      DocNumber: invoice.invoiceNumber,
      TotalAmt: invoice.total,
      CustomerRef: { name: invoice.customerName },
      Line: invoice.lineItems.map((item, i) => ({
        LineNum: i + 1,
        Amount: item.amount,
        DetailType: "SalesItemLineDetail",
        Description: item.name,
        SalesItemLineDetail: { UnitPrice: item.amount, Qty: 1 },
      })),
    }),
  });
}

export async function syncPaymentToQB(
  payment: { amount: number; method: string; invoiceRef: string },
  accessToken: string,
  realmId: string
) {
  return qbRequest("/payment?minorversion=65", accessToken, realmId, {
    method: "POST",
    body: JSON.stringify({
      TotalAmt: payment.amount,
      PaymentMethodRef: { name: payment.method },
    }),
  });
}
