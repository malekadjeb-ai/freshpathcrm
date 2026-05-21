import { NextRequest, NextResponse } from "next/server";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { getDb } from "@/src/db";
import { businessSettings, customers, vehicles, jobs, jobServices, jobStatusHistory, users, notifications, serviceItems } from "@/src/db/schema";
import { eq, and, inArray, or } from "drizzle-orm";
import { z } from "zod";
import { scheduleBookingConfirmation, scheduleJobReminder } from "@/lib/services/scheduled-messages";

const bookingSchema = z.object({
  name: z.string().min(1).max(100),
  phone: z.string().min(7).max(20),
  email: z.string().email().optional().nullable(),
  date: z.string(),
  time: z.string(),
  serviceIds: z.array(z.string()).min(1, "Select at least one service"),
  vehicleMake: z.string().optional(),
  vehicleModel: z.string().optional(),
  vehicleYear: z.number().optional(),
  vehicleColor: z.string().optional(),
  vehicleType: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
    const { success } = rateLimit(`booking:${ip}`, 10, 60_000);
    if (!success) return rateLimitResponse();

    const db = getDb();
    const settings = await db
      .select({ tenantId: businessSettings.tenantId, bookingEnabled: businessSettings.bookingEnabled, autoConfirmBookings: businessSettings.autoConfirmBookings })
      .from(businessSettings)
      .limit(1)
      .then((r) => r[0]);
    if (!settings || !settings.bookingEnabled) {
      return NextResponse.json(
        { error: "Online booking is not currently available" },
        { status: 400 }
      );
    }
    const tenantId = settings.tenantId;

    const body = await req.json();
    const parsed = bookingSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;

    const scheduledAt = new Date(`${data.date}T${data.time}:00`);
    if (isNaN(scheduledAt.getTime())) {
      return NextResponse.json({ error: "Invalid date/time" }, { status: 400 });
    }

    // Get services
    const services = await db.select().from(serviceItems).where(
      and(
        inArray(serviceItems.id, data.serviceIds),
        eq(serviceItems.isActive, true)
      )
    );

    if (services.length === 0) {
      return NextResponse.json({ error: "No valid services selected" }, { status: 400 });
    }

    const subtotal = services.reduce((sum, s) => sum + s.basePrice, 0);
    const total = subtotal;

    // Find or create customer — scoped to this tenant
    const phoneOrEmail = data.email
      ? or(eq(customers.phone, data.phone), eq(customers.email, data.email))
      : eq(customers.phone, data.phone);
    let customer = await db
      .select()
      .from(customers)
      .where(and(eq(customers.tenantId, tenantId), phoneOrEmail))
      .limit(1)
      .then((r) => r[0]);

    if (!customer) {
      [customer] = await db.insert(customers).values({
        name: data.name,
        phone: data.phone,
        email: data.email || null,
        address: data.address || null,
        source: "Website",
        lifecycleStage: "active",
        tenantId,
      }).returning();
    }

    // Find or create vehicle if info provided
    let vehicleId: string | null = null;
    if (data.vehicleMake && data.vehicleModel) {
      const vehicleWhere = and(
        eq(vehicles.customerId, customer.id),
        eq(vehicles.make, data.vehicleMake),
        eq(vehicles.model, data.vehicleModel),
        ...(data.vehicleYear ? [eq(vehicles.year, data.vehicleYear)] : [])
      );
      const existingVehicle = await db.select().from(vehicles).where(vehicleWhere).limit(1).then(r => r[0]);

      if (existingVehicle) {
        vehicleId = existingVehicle.id;
      } else {
        const [vehicle] = await db.insert(vehicles).values({
          customerId: customer.id,
          make: data.vehicleMake,
          model: data.vehicleModel,
          year: data.vehicleYear || new Date().getFullYear(),
          color: data.vehicleColor || null,
          vehicleType: data.vehicleType || "Sedan",
        }).returning();
        vehicleId = vehicle.id;
      }
    }

    // Create job
    const [job] = await db.insert(jobs).values({
      customerId: customer.id,
      vehicleId,
      scheduledAt: scheduledAt.toISOString(),
      location: "Richmond",
      address: data.address || null,
      status: "Scheduled",
      subtotal,
      total,
      notes: data.notes || null,
    }).returning();

    // Create job services
    await db.insert(jobServices).values(
      services.map((s) => ({
        jobId: job.id,
        serviceItemId: s.id,
        price: s.basePrice,
        quantity: 1,
      }))
    );

    // Create status history
    await db.insert(jobStatusHistory).values({
      jobId: job.id,
      fromStatus: null,
      toStatus: "Scheduled",
    });

    const allUsers = await db.select({ id: users.id }).from(users);
    if (allUsers.length > 0) {
      const message = `${data.name} booked ${services
        .map((s) => s.name)
        .join(", ")} for ${scheduledAt.toLocaleDateString()}`;
      await db.insert(notifications).values(
        allUsers.map((u) => ({
          userId: u.id,
          type: "new_booking",
          title: "New Online Booking",
          message,
          link: `/jobs/${job.id}`,
        })),
      );
    }

    try {
      await scheduleBookingConfirmation(job.id);
      await scheduleJobReminder(job.id, 24);
    } catch (err) {
      console.error("[booking] message scheduling failed:", err);
    }

    return NextResponse.json(
      {
        success: true,
        jobId: job.id,
        message: settings.autoConfirmBookings
          ? "Your booking is confirmed!"
          : "Your booking request has been submitted. We'll confirm shortly.",
      },
      { status: 201 },
    );
  } catch (err) {
    console.error("[booking] submit error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
