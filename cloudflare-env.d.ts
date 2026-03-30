interface CloudflareEnv {
  DB: D1Database;
}

declare module "@opennextjs/cloudflare" {
  function getCloudflareContext(options?: {
    async?: boolean;
  }): { env: CloudflareEnv };
}
