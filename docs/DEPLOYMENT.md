# Deployment

## Required Environment Variables

| Variable              | Description                              | Required |
| --------------------- | ---------------------------------------- | -------- |
| `TURSO_DATABASE_URL`  | Turso database URL                       | Yes      |
| `TURSO_AUTH_TOKEN`    | Turso authentication token               | Yes      |
| `NEXTAUTH_SECRET`     | Secret for signing JWT sessions          | Yes      |
| `NEXTAUTH_URL`        | Application URL (e.g. https://crm.freshpathmobiledetailing.com) | Yes |
| `TWILIO_ACCOUNT_SID`  | Twilio account SID for SMS               | If SMS   |
| `TWILIO_AUTH_TOKEN`   | Twilio auth token                        | If SMS   |
| `TWILIO_PHONE_NUMBER` | Twilio phone number                      | If SMS   |
| `SENDGRID_API_KEY`    | SendGrid API key for email               | If email |
| `STRIPE_SECRET_KEY`   | Stripe secret key for payments           | If payments |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret          | If payments |
| `OPENAI_API_KEY`      | OpenAI API key for AI features           | If AI    |
| `GOOGLE_CLIENT_ID`    | Google OAuth client ID                   | If Google|
| `GOOGLE_CLIENT_SECRET`| Google OAuth client secret               | If Google|

## Local Development Setup

1. Clone the repository:
   ```bash
   git clone <repo-url>
   cd freshpath-crm
   ```

2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your Turso credentials and NEXTAUTH_SECRET
   ```

4. Push schema to local database:
   ```bash
   pnpm db:push
   ```

5. (Optional) Seed the database:
   ```bash
   pnpm db:seed
   ```

6. Start the dev server:
   ```bash
   pnpm dev
   ```

7. Open http://localhost:3000

## Vercel Deployment

### Initial Setup

1. Connect the GitHub repository to Vercel.
2. Set the framework to **Next.js**.
3. Set the build command to `next build`.
4. Set the output directory to `.next`.
5. Add all required environment variables in Vercel project settings.

### Deploying

Push to `main` for production deployment. Vercel auto-deploys on push.

For manual deployment:
```bash
vercel --prod
```

### Preview Deployments

Every push to a non-main branch creates a preview deployment automatically.

## Database Migrations

### Generating Migrations

After modifying `src/db/schema.ts`:

```bash
pnpm db:generate
```

This creates SQL migration files in `src/db/migrations/`.

### Applying Migrations

For Turso (production):

```bash
# Migrations are applied automatically via drizzle-kit push
pnpm db:push
```

For Cloudflare D1 (if using that deployment path):

```bash
# Local
npx wrangler d1 migrations apply fresh-path-crm --local

# Production
npx wrangler d1 migrations apply fresh-path-crm --remote
```

### Verifying Schema

Open Drizzle Studio to inspect the database:

```bash
pnpm db:studio
```

## Build Verification

After deployment, verify:

1. Health check: `GET /api/health` returns 200.
2. Auth flow: Login at `/login` works.
3. Dashboard loads with data.
4. Bundle sizes are within budget: `pnpm bundle-check`.

## Rollback

Vercel keeps deployment history. To rollback:

1. Go to Vercel dashboard > Deployments.
2. Find the last working deployment.
3. Click "Promote to Production".
