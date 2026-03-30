/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  poweredByHeader: false,
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
    ],
  },
  async redirects() {
    return [
      // Invoicing hub consolidation
      { source: "/invoices", destination: "/invoicing", permanent: false },
      { source: "/payments", destination: "/invoicing", permanent: false },
      { source: "/expenses", destination: "/invoicing", permanent: false },
      { source: "/subscriptions", destination: "/invoicing", permanent: false },
      // Marketing hub consolidation
      { source: "/campaigns", destination: "/marketing", permanent: false },
      { source: "/automations", destination: "/marketing", permanent: false },
      { source: "/promo-codes", destination: "/marketing", permanent: false },
      { source: "/content", destination: "/marketing", permanent: false },
      { source: "/gallery", destination: "/marketing", permanent: false },
      // Settings consolidation
      { source: "/services", destination: "/settings", permanent: false },
      { source: "/staff", destination: "/settings", permanent: false },
      { source: "/templates", destination: "/settings", permanent: false },
      { source: "/checklists", destination: "/settings", permanent: false },
      { source: "/fleet", destination: "/settings", permanent: false },
      { source: "/routes", destination: "/settings", permanent: false },
      { source: "/webhooks", destination: "/settings", permanent: false },
      { source: "/pricing", destination: "/settings", permanent: false },
      // Jobs hub consolidation
      { source: "/leads", destination: "/jobs", permanent: false },
      { source: "/quotes", destination: "/jobs", permanent: false },
      { source: "/estimates", destination: "/jobs", permanent: false },
      { source: "/recurring-jobs", destination: "/jobs", permanent: false },
    ];
  },
};

export default nextConfig;
