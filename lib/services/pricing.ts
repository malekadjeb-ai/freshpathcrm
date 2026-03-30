import { getDbAsync } from "@/src/db";
import { pricingRules } from "@/src/db/schema";
import { eq } from "drizzle-orm";
import { desc } from "drizzle-orm";
import { getDay, getMonth } from "date-fns";

interface PriceAdjustment {
  ruleName: string;
  type: string;
  modifier: number;
  amount: number;
}

interface PriceResult {
  basePrice: number;
  finalPrice: number;
  adjustments: PriceAdjustment[];
  savings: number;
}

export async function calculatePrice(
  basePrice: number,
  scheduledDate: Date,
  vehicleType?: string,
  existingBookingsOnDay?: number,
  maxBookingsPerDay?: number,
  scheduledTime?: string
): Promise<PriceResult> {
  const db = await getDbAsync();

  const rules = await db
    .select()
    .from(pricingRules)
    .where(eq(pricingRules.isActive, true))
    .orderBy(desc(pricingRules.priority));

  const adjustments: PriceAdjustment[] = [];
  let finalPrice = basePrice;

  for (const rule of rules) {
    const conditions = JSON.parse(rule.conditions || "{}");
    let applies = false;

    switch (rule.type) {
      case "day_of_week": {
        const dayOfWeek = getDay(scheduledDate);
        const targetDays: number[] = conditions.days || [];
        applies = targetDays.includes(dayOfWeek);
        break;
      }
      case "season": {
        const month = getMonth(scheduledDate) + 1;
        const targetMonths: number[] = conditions.months || [];
        applies = targetMonths.includes(month);
        break;
      }
      case "vehicle_type": {
        const targetTypes: string[] = conditions.vehicleTypes || [];
        applies = !!vehicleType && targetTypes.some((t) => t.toLowerCase() === vehicleType.toLowerCase());
        break;
      }
      case "demand": {
        if (existingBookingsOnDay !== undefined && maxBookingsPerDay) {
          const utilization = existingBookingsOnDay / maxBookingsPerDay;
          const threshold = conditions.threshold || 0.8;
          applies = utilization >= threshold;
        }
        break;
      }
      case "time_of_day": {
        if (scheduledTime) {
          const hour = parseInt(scheduledTime.split(":")[0]);
          const beforeHour = conditions.beforeHour;
          const afterHour = conditions.afterHour;
          if (beforeHour !== undefined) applies = hour < beforeHour;
          if (afterHour !== undefined) applies = applies || hour >= afterHour;
        }
        break;
      }
      case "same_day": {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const schedDay = new Date(scheduledDate);
        schedDay.setHours(0, 0, 0, 0);
        applies = schedDay.getTime() === today.getTime();
        break;
      }
    }

    if (applies) {
      let amount: number;
      if (rule.modifier >= 1) {
        // Surcharge
        amount = basePrice * (rule.modifier - 1);
      } else {
        // Discount
        amount = basePrice * (rule.modifier - 1); // will be negative
      }

      // Check for flat amount override
      if (conditions.flatAmount) {
        amount = conditions.flatAmount;
      }

      adjustments.push({
        ruleName: rule.name,
        type: rule.type,
        modifier: rule.modifier,
        amount: Math.round(amount * 100) / 100,
      });

      finalPrice += amount;
    }
  }

  finalPrice = Math.max(finalPrice, 0);
  finalPrice = Math.round(finalPrice * 100) / 100;

  const savings = adjustments.filter((a) => a.amount < 0).reduce((sum, a) => sum + Math.abs(a.amount), 0);

  return { basePrice, finalPrice, adjustments, savings };
}
