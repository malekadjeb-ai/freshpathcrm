# Task: Add CRON_SECRET to Vercel + Update vercel.json

## Context
Fresh Path CRM is deployed at https://fresh-path-crm.vercel.app (Vercel project: `fresh-path-crm`, org: `maleks-projects-bcdc415e`).

All 4 cron endpoints were recently hardened to require `Authorization: Bearer <CRON_SECRET>` in the request header. Without this env var set and the vercel.json cron headers configured, the cron jobs will return 401 and stop working.

## Step 1 — Generate the secret

Run this in the terminal:
```bash
openssl rand -hex 32
```

Copy the output. That's your `CRON_SECRET`.

## Step 2 — Add CRON_SECRET to Vercel

Run:
```bash
vercel env add CRON_SECRET production
```

When prompted, paste the value from Step 1.

Then pull env to verify:
```bash
vercel env ls
```

Confirm `CRON_SECRET` appears in the production environment.

## Step 3 — Update vercel.json

The current `vercel.json` only contains `{ "framework": "nextjs" }`.

Replace the entire contents of `vercel.json` with:

```json
{
  "framework": "nextjs",
  "crons": [
    {
      "path": "/api/cron/process-messages",
      "schedule": "*/5 * * * *"
    },
    {
      "path": "/api/cron/overdue-invoices",
      "schedule": "0 9 * * *"
    },
    {
      "path": "/api/cron/recurring-expenses",
      "schedule": "0 0 1 * *"
    },
    {
      "path": "/api/cron/sync-voice",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

**Note:** Vercel Cron automatically includes the `Authorization: Bearer <CRON_SECRET>` header when `CRON_SECRET` is set as an env var — you do NOT need to add it manually to each cron entry. The middleware in `lib/cron-auth.ts` reads it from `process.env.CRON_SECRET` and validates the incoming `Authorization` header.

## Step 4 — Deploy

```bash
cd "c:/Users/malek/OneDrive/Documents/freshpath-crm"
npx next build && vercel --prod
```

## Step 5 — Verify

After deploy, test one cron endpoint manually:

```bash
# Should return 401
curl https://fresh-path-crm.vercel.app/api/cron/process-messages

# Should return 200 with processed count (replace YOUR_SECRET)
curl -H "Authorization: Bearer YOUR_SECRET" https://fresh-path-crm.vercel.app/api/cron/process-messages
```

## Files changed in this task
- `vercel.json` — add crons array
- Vercel env vars — add CRON_SECRET (production)

## Done when
- `CRON_SECRET` is set in Vercel production env
- `vercel.json` has the crons array
- Deploy succeeds
- `curl` without auth returns 401
- `curl` with correct `Authorization` header returns `{"processed":...}`
