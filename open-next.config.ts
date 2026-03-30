import { defineCloudflareConfig } from "@opennextjs/cloudflare";

const config = defineCloudflareConfig({
  override: {
    wrapper: "cloudflare-node",
    converter: "edge",
  },
});

export default config;
