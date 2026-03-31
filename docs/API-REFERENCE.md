# API Reference

All API routes are located under `app/api/`. Unless noted otherwise, every endpoint requires authentication via `requireAuth()` and scopes queries by `tenantId`.

Paginated endpoints return: `{ data: [...], total, page, totalPages }` or similar.

---

## Auth

| Method | Path                          | Description                         |
| ------ | ----------------------------- | ----------------------------------- |
| POST   | `/api/auth/[...nextauth]`     | NextAuth sign-in/sign-out/session   |
| POST   | `/api/auth/forgot-password`   | Send password reset email           |
| POST   | `/api/auth/reset-password`    | Reset password with token           |

## Customers

| Method | Path                                    | Description                              |
| ------ | --------------------------------------- | ---------------------------------------- |
| GET    | `/api/customers`                        | List customers (paginated, filterable)   |
| POST   | `/api/customers`                        | Create a new customer                    |
| GET    | `/api/customers/[id]`                   | Get customer details                     |
| PUT    | `/api/customers/[id]`                   | Update a customer                        |
| DELETE | `/api/customers/[id]`                   | Delete a customer                        |
| GET    | `/api/customers/[id]/history`           | Customer job/invoice history             |
| GET    | `/api/customers/[id]/notes`             | Customer notes                           |
| POST   | `/api/customers/[id]/notes`             | Add a note                               |
| GET    | `/api/customers/[id]/timeline`          | Customer activity timeline               |
| GET    | `/api/customers/[id]/vehicles`          | Customer vehicles                        |
| POST   | `/api/customers/bulk`                   | Bulk import customers                    |
| GET    | `/api/customers/check-duplicate`        | Check for duplicate customer             |
| GET    | `/api/customers/health`                 | Customer health scores                   |
| GET    | `/api/customers/search`                 | Search customers by name/phone/email     |
| GET    | `/api/customers/segments`               | Customer segments                        |

## Jobs

| Method | Path                                        | Description                          |
| ------ | ------------------------------------------- | ------------------------------------ |
| GET    | `/api/jobs`                                 | List jobs (paginated, filterable)    |
| POST   | `/api/jobs`                                 | Create a new job                     |
| GET    | `/api/jobs/[id]`                            | Get job details                      |
| PUT    | `/api/jobs/[id]`                            | Update a job                         |
| DELETE | `/api/jobs/[id]`                            | Delete a job                         |
| POST   | `/api/jobs/[id]/assign`                     | Assign staff to a job                |
| GET    | `/api/jobs/[id]/checklists`                 | Get job checklists                   |
| POST   | `/api/jobs/[id]/checklists`                 | Add checklist to job                 |
| PUT    | `/api/jobs/[id]/checklists/[checklistId]`   | Update checklist item                |
| POST   | `/api/jobs/[id]/photos`                     | Upload job photos                    |
| POST   | `/api/jobs/[id]/signature`                  | Capture customer signature           |
| PUT    | `/api/jobs/[id]/status`                     | Update job status                    |
| POST   | `/api/jobs/bulk`                            | Bulk job operations                  |

## Invoices

| Method | Path                                | Description                          |
| ------ | ----------------------------------- | ------------------------------------ |
| GET    | `/api/invoices`                     | List invoices (paginated)            |
| POST   | `/api/invoices`                     | Create an invoice                    |
| GET    | `/api/invoices/[id]`                | Get invoice details                  |
| PUT    | `/api/invoices/[id]`                | Update an invoice                    |
| DELETE | `/api/invoices/[id]`                | Delete an invoice                    |
| POST   | `/api/invoices/[id]/send`           | Send invoice to customer             |
| GET    | `/api/invoices/[id]/checkout`       | Get checkout session                 |
| GET    | `/api/invoices/[id]/public`         | Public invoice view (no auth)        |
| POST   | `/api/invoices/bulk`                | Bulk invoice operations              |

## Leads

| Method | Path                          | Description                          |
| ------ | ----------------------------- | ------------------------------------ |
| GET    | `/api/leads`                  | List leads (paginated, filterable)   |
| POST   | `/api/leads`                  | Create a lead                        |
| GET    | `/api/leads/[id]`             | Get lead details                     |
| PUT    | `/api/leads/[id]`             | Update a lead                        |
| DELETE | `/api/leads/[id]`             | Delete a lead                        |
| POST   | `/api/leads/[id]/convert`     | Convert lead to customer             |
| POST   | `/api/leads/bulk`             | Bulk lead operations                 |

## Estimates

| Method | Path                              | Description                          |
| ------ | --------------------------------- | ------------------------------------ |
| GET    | `/api/estimates`                  | List estimates                       |
| POST   | `/api/estimates`                  | Create an estimate                   |
| GET    | `/api/estimates/[id]`             | Get estimate details                 |
| PUT    | `/api/estimates/[id]`             | Update an estimate                   |
| DELETE | `/api/estimates/[id]`             | Delete an estimate                   |
| POST   | `/api/estimates/[id]/accept`      | Mark estimate accepted               |
| POST   | `/api/estimates/[id]/convert`     | Convert estimate to job/invoice      |
| POST   | `/api/estimates/[id]/follow-up`   | Send follow-up                       |
| POST   | `/api/estimates/[id]/send`        | Send estimate to customer            |

## Quotes

| Method | Path                              | Description                          |
| ------ | --------------------------------- | ------------------------------------ |
| GET    | `/api/quotes`                     | List quotes                          |
| POST   | `/api/quotes`                     | Create a quote                       |
| GET    | `/api/quotes/[id]`                | Get quote details                    |
| PUT    | `/api/quotes/[id]`                | Update a quote                       |
| DELETE | `/api/quotes/[id]`                | Delete a quote                       |
| POST   | `/api/quotes/[id]/accept`         | Accept a quote (auth)                |
| POST   | `/api/quotes/[id]/public-accept`  | Accept a quote (public link)         |
| GET    | `/api/quotes/[id]/public`         | Public quote view (no auth)          |
| POST   | `/api/quotes/[id]/send`           | Send quote to customer               |

## Communications

| Method | Path                                    | Description                          |
| ------ | --------------------------------------- | ------------------------------------ |
| GET    | `/api/communications`                   | List communications                  |
| POST   | `/api/communications`                   | Log a communication                  |
| GET    | `/api/communications/[id]`              | Get communication details            |
| POST   | `/api/communications/send`              | Send SMS/email                       |
| POST   | `/api/communications/send-sms-email`    | Send via SMS or email                |
| GET    | `/api/communications/status`            | Check delivery status                |
| POST   | `/api/communications/test`              | Test communication channel           |
| GET    | `/api/conversations`                    | List conversations                   |
| GET    | `/api/conversations/[customerId]`       | Get customer conversation thread     |

## Campaigns

| Method | Path                                | Description                          |
| ------ | ----------------------------------- | ------------------------------------ |
| GET    | `/api/campaigns`                    | List campaigns                       |
| POST   | `/api/campaigns`                    | Create a campaign                    |
| GET    | `/api/campaigns/[id]`               | Get campaign details                 |
| PUT    | `/api/campaigns/[id]`               | Update a campaign                    |
| DELETE | `/api/campaigns/[id]`               | Delete a campaign                    |
| POST   | `/api/campaigns/[id]/send`          | Send/execute a campaign              |
| POST   | `/api/campaigns/preview-audience`   | Preview target audience              |

## Analytics & Reports

| Method | Path                              | Description                          |
| ------ | --------------------------------- | ------------------------------------ |
| GET    | `/api/analytics`                  | Dashboard analytics data             |
| GET    | `/api/dashboard`                  | Dashboard summary stats              |
| GET    | `/api/reports`                    | Generate reports                     |
| GET    | `/api/reports/scheduled`          | List scheduled reports               |
| POST   | `/api/reports/scheduled`          | Create a scheduled report            |
| PUT    | `/api/reports/scheduled/[id]`     | Update scheduled report              |
| DELETE | `/api/reports/scheduled/[id]`     | Delete scheduled report              |

## AI

| Method | Path                          | Description                          |
| ------ | ----------------------------- | ------------------------------------ |
| POST   | `/api/ai/chat`                | AI chat assistant                    |
| POST   | `/api/ai/extract`             | Extract data from text               |
| POST   | `/api/ai/apply-extracted`     | Apply extracted data                 |
| POST   | `/api/ai/call-summary`        | Summarize a call                     |
| POST   | `/api/ai/social-post`         | Generate social media post           |
| POST   | `/api/ai/suggest`             | Get AI suggestions                   |
| POST   | `/api/ai/testimonial`         | Generate testimonial request         |

## Intelligence

| Method | Path                                | Description                          |
| ------ | ----------------------------------- | ------------------------------------ |
| GET    | `/api/intelligence/forecast`        | Revenue/demand forecast              |
| GET    | `/api/intelligence/health-scores`   | Customer health scoring              |
| GET    | `/api/intelligence/pricing`         | Dynamic pricing suggestions          |

## Services & Pricing

| Method | Path                          | Description                          |
| ------ | ----------------------------- | ------------------------------------ |
| GET    | `/api/services`               | List services                        |
| POST   | `/api/services`               | Create a service                     |
| PUT    | `/api/services/[id]`          | Update a service                     |
| DELETE | `/api/services/[id]`          | Delete a service                     |
| GET    | `/api/pricing-rules`          | List pricing rules                   |
| POST   | `/api/pricing-rules`          | Create a pricing rule                |
| PUT    | `/api/pricing-rules/[id]`     | Update a pricing rule                |
| DELETE | `/api/pricing-rules/[id]`     | Delete a pricing rule                |
| POST   | `/api/pricing/calculate`      | Calculate price for services         |
| GET    | `/api/promo-codes`            | List promo codes                     |
| POST   | `/api/promo-codes`            | Create a promo code                  |
| PUT    | `/api/promo-codes/[id]`       | Update a promo code                  |
| DELETE | `/api/promo-codes/[id]`       | Delete a promo code                  |
| POST   | `/api/promo-codes/validate`   | Validate a promo code                |

## Staff

| Method | Path                  | Description                          |
| ------ | --------------------- | ------------------------------------ |
| GET    | `/api/staff`          | List staff members                   |
| POST   | `/api/staff`          | Create staff member                  |
| GET    | `/api/staff/[id]`     | Get staff details                    |
| PUT    | `/api/staff/[id]`     | Update staff member                  |
| DELETE | `/api/staff/[id]`     | Delete staff member                  |

## Payments

| Method | Path                          | Description                          |
| ------ | ----------------------------- | ------------------------------------ |
| GET    | `/api/payments`               | List payments                        |
| GET    | `/api/payments/summary`       | Payment summary stats                |
| GET    | `/api/pay/[id]`               | Public payment page (no auth)        |
| POST   | `/api/pay/[id]/checkout`      | Create checkout session              |

## Expenses

| Method | Path                      | Description                          |
| ------ | ------------------------- | ------------------------------------ |
| GET    | `/api/expenses`           | List expenses                        |
| POST   | `/api/expenses`           | Create an expense                    |
| GET    | `/api/expenses/[id]`      | Get expense details                  |
| PUT    | `/api/expenses/[id]`      | Update an expense                    |
| DELETE | `/api/expenses/[id]`      | Delete an expense                    |

## Recurring Jobs & Subscriptions

| Method | Path                                  | Description                          |
| ------ | ------------------------------------- | ------------------------------------ |
| GET    | `/api/recurring-jobs`                 | List recurring jobs                  |
| POST   | `/api/recurring-jobs`                 | Create recurring job                 |
| GET    | `/api/recurring-jobs/[id]`            | Get recurring job details            |
| PUT    | `/api/recurring-jobs/[id]`            | Update recurring job                 |
| DELETE | `/api/recurring-jobs/[id]`            | Delete recurring job                 |
| POST   | `/api/recurring-jobs/[id]/generate`   | Generate next occurrence             |
| GET    | `/api/subscriptions`                  | List subscriptions                   |
| POST   | `/api/subscriptions`                  | Create subscription                  |
| GET    | `/api/subscriptions/[id]`             | Get subscription details             |
| PUT    | `/api/subscriptions/[id]`             | Update subscription                  |
| GET    | `/api/subscriptions/stats`            | Subscription statistics              |
| GET    | `/api/service-plans`                  | List service plans                   |
| POST   | `/api/service-plans`                  | Create a service plan                |
| PUT    | `/api/service-plans/[id]`             | Update a service plan                |
| DELETE | `/api/service-plans/[id]`             | Delete a service plan                |

## Reviews & Referrals

| Method | Path                              | Description                          |
| ------ | --------------------------------- | ------------------------------------ |
| GET    | `/api/reviews`                    | List reviews                         |
| GET    | `/api/reviews/[id]`               | Get review details                   |
| POST   | `/api/reviews/[id]/send`          | Send review request                  |
| GET    | `/api/referrals`                  | List referrals                       |
| POST   | `/api/referrals`                  | Create a referral                    |
| PUT    | `/api/referrals/[id]`             | Update a referral                    |
| GET    | `/api/referrals/leaderboard`      | Referral leaderboard                 |

## Workflows & Automations

| Method | Path                          | Description                          |
| ------ | ----------------------------- | ------------------------------------ |
| GET    | `/api/workflows`              | List workflows                       |
| POST   | `/api/workflows`              | Create a workflow                    |
| GET    | `/api/workflows/[id]`         | Get workflow details                 |
| PUT    | `/api/workflows/[id]`         | Update a workflow                    |
| DELETE | `/api/workflows/[id]`         | Delete a workflow                    |
| GET    | `/api/workflows/[id]/logs`    | Workflow execution logs              |
| POST   | `/api/workflows/seed`         | Seed default workflows               |

## Scheduling & Calendar

| Method | Path                          | Description                          |
| ------ | ----------------------------- | ------------------------------------ |
| GET    | `/api/booking/availability`   | Check availability                   |
| GET    | `/api/booking/config`         | Booking widget config                |
| GET    | `/api/booking/services`       | Public services list                 |
| POST   | `/api/booking/submit`         | Submit a booking (public)            |
| POST   | `/api/routes/optimize`        | Optimize route for day               |
| GET    | `/api/scheduled-messages`     | List scheduled messages              |
| POST   | `/api/scheduled-messages`     | Schedule a message                   |
| PUT    | `/api/scheduled-messages/[id]`| Update scheduled message             |
| DELETE | `/api/scheduled-messages/[id]`| Delete scheduled message             |

## Webhooks

| Method | Path                                    | Description                          |
| ------ | --------------------------------------- | ------------------------------------ |
| GET    | `/api/webhooks`                         | List webhook endpoints               |
| POST   | `/api/webhooks`                         | Register a webhook                   |
| GET    | `/api/webhooks/[id]`                    | Get webhook details                  |
| PUT    | `/api/webhooks/[id]`                    | Update webhook                       |
| DELETE | `/api/webhooks/[id]`                    | Delete webhook                       |
| GET    | `/api/webhooks/[id]/logs`               | Webhook delivery logs                |
| POST   | `/api/webhooks/[id]/test`               | Test webhook                         |
| POST   | `/api/webhooks/sendgrid`                | SendGrid inbound webhook             |
| POST   | `/api/webhooks/stripe`                  | Stripe payment webhook               |
| POST   | `/api/webhooks/twilio/*`                | Twilio SMS/voice webhooks            |

## Audit

| Method | Path              | Description                                              |
| ------ | ----------------- | -------------------------------------------------------- |
| GET    | `/api/audit`      | List audit logs (paginated, filterable by entity/user/date) |

Query params: `page`, `limit`, `entity`, `userId`, `dateFrom`, `dateTo`

## Settings & Misc

| Method | Path                          | Description                          |
| ------ | ----------------------------- | ------------------------------------ |
| GET    | `/api/settings`               | Get business settings                |
| PUT    | `/api/settings`               | Update business settings             |
| GET    | `/api/health`                 | Health check                         |
| GET    | `/api/sidebar-counts`         | Sidebar badge counts                 |
| GET    | `/api/search`                 | Global search                        |
| GET    | `/api/export`                 | Export data                          |
| GET    | `/api/tags`                   | List tags                            |
| POST   | `/api/tags`                   | Create a tag                         |
| GET    | `/api/notifications`          | List notifications                   |
| PUT    | `/api/notifications/[id]`     | Mark notification read               |
| GET    | `/api/notifications/stream`   | SSE notification stream              |
| GET    | `/api/tasks`                  | List tasks                           |
| POST   | `/api/tasks`                  | Create a task                        |
| PUT    | `/api/tasks/[id]`             | Update a task                        |
| DELETE | `/api/tasks/[id]`             | Delete a task                        |
| GET    | `/api/templates`              | List message templates               |
| POST   | `/api/templates`              | Create a template                    |
| PUT    | `/api/templates/[id]`         | Update a template                    |
| DELETE | `/api/templates/[id]`         | Delete a template                    |
| POST   | `/api/templates/seed`         | Seed default templates               |

## Customer Portal (public, token-based auth)

| Method | Path                                      | Description                          |
| ------ | ----------------------------------------- | ------------------------------------ |
| POST   | `/api/portal/auth`                        | Portal login                         |
| GET    | `/api/portal/me`                          | Get portal user info                 |
| GET    | `/api/portal/estimates`                   | List customer estimates              |
| POST   | `/api/portal/estimates/[id]/respond`      | Accept/decline estimate              |
| GET    | `/api/portal/token/[token]`               | Validate portal token                |

## Cron Jobs

| Method | Path                              | Description                          |
| ------ | --------------------------------- | ------------------------------------ |
| GET    | `/api/cron/overdue-invoices`      | Process overdue invoices             |
| GET    | `/api/cron/process-messages`      | Process queued messages              |
| GET    | `/api/cron/recurring-expenses`    | Generate recurring expenses          |
| GET    | `/api/cron/sync-voice`            | Sync voice recordings                |
