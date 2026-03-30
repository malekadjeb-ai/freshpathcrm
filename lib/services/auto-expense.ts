import { getDbAsync } from "@/src/db";
import {
  expenses,
  jobs,
  jobServices,
  serviceItems,
  businessSettings,
} from "@/src/db/schema";
import { eq } from "drizzle-orm";

/**
 * Auto-create expenses when a job is completed.
 * Creates mileage expense (if mileage logged) and supply cost expenses (per service).
 */
export async function createAutoExpenses(jobId: string) {
  const db = await getDbAsync();

  // Get settings
  const [settings] = await db.select().from(businessSettings).limit(1);
  if (!settings?.autoExpenseEnabled) return;

  // Get the job
  const [job] = await db.select().from(jobs).where(eq(jobs.id, jobId));
  if (!job) return;

  const today = new Date().toISOString().split("T")[0];
  const expensesToCreate: {
    category: string;
    description: string;
    amount: number;
    date: string;
    jobId: string;
    isRecurring: boolean;
  }[] = [];

  // 1. Mileage expense
  if (settings.autoExpenseMileage && job.mileage && job.mileage > 0) {
    const mileageCost = job.mileage * settings.mileageRate;
    expensesToCreate.push({
      category: "Fuel",
      description: `Mileage: ${job.mileage} mi @ $${settings.mileageRate}/mi`,
      amount: Math.round(mileageCost * 100) / 100,
      date: today,
      jobId: job.id,
      isRecurring: false,
    });
  }

  // 2. Supply costs per service
  if (settings.autoExpenseSupplies) {
    const services = await db
      .select({
        serviceItemId: jobServices.serviceItemId,
        customName: jobServices.name,
        quantity: jobServices.quantity,
      })
      .from(jobServices)
      .where(eq(jobServices.jobId, jobId));

    let totalSupplyCost = 0;
    const supplyDetails: string[] = [];

    for (const svc of services) {
      if (!svc.serviceItemId) continue;
      const [item] = await db
        .select({ name: serviceItems.name, supplyCost: serviceItems.supplyCost })
        .from(serviceItems)
        .where(eq(serviceItems.id, svc.serviceItemId));

      if (item && item.supplyCost > 0) {
        const cost = item.supplyCost * svc.quantity;
        totalSupplyCost += cost;
        supplyDetails.push(`${item.name} x${svc.quantity}`);
      }
    }

    if (totalSupplyCost > 0) {
      expensesToCreate.push({
        category: "Supplies",
        description: `Supplies: ${supplyDetails.join(", ")}`,
        amount: Math.round(totalSupplyCost * 100) / 100,
        date: today,
        jobId: job.id,
        isRecurring: false,
      });
    }
  }

  // Insert all auto-expenses
  if (expensesToCreate.length > 0) {
    await db.insert(expenses).values(expensesToCreate);
  }

  return expensesToCreate.length;
}
