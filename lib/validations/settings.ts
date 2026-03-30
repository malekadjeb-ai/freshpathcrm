import { z } from "zod";

export const settingsSchema = z.object({
  // Business info
  businessName: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  website: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  logoPath: z.string().optional(),
  taxRate: z.number().min(0).max(100).optional(),
  defaultPaymentTerms: z.string().optional(),
  invoiceFooter: z.string().optional(),

  // Communication mode
  communicationMode: z.string().optional(),

  // Email settings
  emailProvider: z.string().nullable().optional(),
  senderEmail: z.string().nullable().optional(),
  emailFromName: z.string().nullable().optional(),

  // SMS settings
  enableEmailToSMS: z.boolean().optional(),

  // Stripe / Payment settings (only publishable key stored in DB)
  stripePublishableKey: z.string().nullable().optional(),
  depositRequired: z.boolean().optional(),
  depositPercentage: z.number().min(0).max(100).optional(),

  // Booking settings
  bookingEnabled: z.boolean().optional(),
  bookingPageSlug: z.string().optional(),
  bookingPageTitle: z.string().optional(),
  bookingPageDescription: z.string().nullable().optional(),
  workingHoursStart: z.string().optional(),
  workingHoursEnd: z.string().optional(),
  workingDays: z.string().optional(), // JSON string of day numbers
  maxJobsPerDay: z.number().min(1).optional(),
  slotDurationMinutes: z.number().min(15).optional(),
  bufferMinutes: z.number().min(0).optional(),
  autoConfirmBookings: z.boolean().optional(),
  autoSendReminders: z.boolean().optional(),

  // Review settings
  googleReviewUrl: z.string().nullable().optional(),
  autoRequestReviews: z.boolean().optional(),
  reviewRequestDelay: z.number().min(1).optional(),

  // Re-engagement
  rebookPromptDays: z.number().min(1).optional(),
  dormantThresholdDays: z.number().min(1).optional(),

  // Revenue
  monthlyRevenueGoal: z.number().min(0).optional(),

  // Setup
  setupComplete: z.boolean().optional(),

  // Google Voice sync
  gvSyncEnabled: z.boolean().optional(),
}).passthrough(); // Allow any additional fields to pass through
