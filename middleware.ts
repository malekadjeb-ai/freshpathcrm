export { default } from "next-auth/middleware";

export const config = {
  matcher: [
    /*
     * Match all paths EXCEPT:
     * - Public API webhooks (Twilio, Stripe, SendGrid)
     * - Public booking/quote/invoice/payment pages
     * - Customer portal
     * - Health check
     * - Login page
     * - Static assets and Next.js internals
     */
    "/((?!api/webhooks/twilio|api/webhooks/stripe|api/webhooks/sendgrid|api/booking|api/pay|api/portal|api/quotes/[^/]+/public|api/invoices/[^/]+/public|api/health|login|book|quote|invoice|pay|portal|_next|favicon\\.ico|icons|uploads|fonts|manifest\\.json).*)",
  ],
};
