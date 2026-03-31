import { SquareClient, SquareEnvironment, WebhooksHelper } from "square";

export function getSquareClient(): SquareClient | null {
  const accessToken = process.env.SQUARE_ACCESS_TOKEN;
  if (!accessToken) return null;

  return new SquareClient({
    token: accessToken,
    environment:
      process.env.NODE_ENV === "production"
        ? SquareEnvironment.Production
        : SquareEnvironment.Sandbox,
  });
}

export async function createSquarePaymentLink(params: {
  invoiceId: string;
  invoiceNumber: string;
  amountDollars: number;
  customerEmail?: string | null;
  description?: string;
  successUrl: string;
}): Promise<string | null> {
  const client = getSquareClient();
  const locationId = process.env.SQUARE_LOCATION_ID;

  if (!client || !locationId) return null;

  const response = await client.checkout.paymentLinks.create({
    idempotencyKey: crypto.randomUUID(),
    order: {
      locationId,
      referenceId: params.invoiceId,
      lineItems: [
        {
          name: `Invoice ${params.invoiceNumber}`,
          quantity: "1",
          ...(params.description ? { note: params.description } : {}),
          basePriceMoney: {
            amount: BigInt(Math.round(params.amountDollars * 100)),
            currency: "USD",
          },
        },
      ],
    },
    checkoutOptions: {
      redirectUrl: params.successUrl,
    },
    ...(params.customerEmail
      ? { prePopulatedData: { buyerEmail: params.customerEmail } }
      : {}),
  });

  return response.paymentLink?.url ?? null;
}

export async function getSquareOrderInvoiceId(
  orderId: string
): Promise<string | null> {
  const client = getSquareClient();
  if (!client) return null;

  const response = await client.orders.get({ orderId });
  return response.order?.referenceId ?? null;
}

export async function verifySquareWebhook(
  body: string,
  signature: string,
  sigKey: string,
  notificationUrl: string
): Promise<boolean> {
  return WebhooksHelper.verifySignature({
    requestBody: body,
    signatureHeader: signature,
    signatureKey: sigKey,
    notificationUrl,
  });
}
