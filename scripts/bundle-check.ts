import fs from "fs";
import path from "path";

const BUDGETS = {
  maxInitialJs: 200 * 1024,
  maxTotalJsPerPage: 500 * 1024,
  maxFirstLoad: 300 * 1024,
};

function formatBytes(bytes: number): string {
  return `${(bytes / 1024).toFixed(1)}KB`;
}

function run() {
  const manifestPath = path.join(process.cwd(), ".next", "build-manifest.json");

  if (!fs.existsSync(manifestPath)) {
    console.error("Build manifest not found. Run `next build` first.");
    process.exit(1);
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
  const pages: Record<string, string[]> = manifest.pages;
  let violations = 0;

  console.log("\n--- Bundle Size Check ---\n");
  console.log(
    `Budgets: Initial JS=${formatBytes(BUDGETS.maxInitialJs)}, ` +
    `Total JS/page=${formatBytes(BUDGETS.maxTotalJsPerPage)}, ` +
    `First Load=${formatBytes(BUDGETS.maxFirstLoad)}\n`
  );

  for (const [pagePath, files] of Object.entries(pages)) {
    let totalSize = 0;

    for (const file of files) {
      const filePath = path.join(process.cwd(), ".next", file);
      if (fs.existsSync(filePath)) {
        totalSize += fs.statSync(filePath).size;
      }
    }

    if (totalSize > BUDGETS.maxTotalJsPerPage) {
      console.warn(
        `WARNING: ${pagePath} total JS = ${formatBytes(totalSize)} ` +
        `(budget: ${formatBytes(BUDGETS.maxTotalJsPerPage)})`
      );
      violations++;
    }
  }

  if (violations === 0) {
    console.log("All pages within budget.\n");
  } else {
    console.warn(`\n${violations} page(s) exceeded the JS budget.\n`);
  }

  // Check shared/initial chunks
  const sharedFiles: string[] = manifest.pages["/_app"] || [];
  let initialSize = 0;
  for (const file of sharedFiles) {
    const filePath = path.join(process.cwd(), ".next", file);
    if (fs.existsSync(filePath)) {
      initialSize += fs.statSync(filePath).size;
    }
  }

  if (initialSize > BUDGETS.maxInitialJs) {
    console.warn(
      `WARNING: Initial JS bundle = ${formatBytes(initialSize)} ` +
      `(budget: ${formatBytes(BUDGETS.maxInitialJs)})`
    );
  } else {
    console.log(`Initial JS bundle: ${formatBytes(initialSize)} (within budget)`);
  }

  console.log("\n--- Done ---\n");
}

run();
