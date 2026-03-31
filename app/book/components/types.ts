export interface VehicleModifier {
  vehicleType: string;
  priceAdjustment: number;
}

export interface ServiceOption {
  id: string;
  name: string;
  description: string | null;
  basePrice: number;
  category: string;
  estimatedMinutes: number | null;
  modifiers: VehicleModifier[];
}

export interface BookingConfig {
  businessName: string;
  phone: string;
  pageTitle: string;
  pageDescription: string | null;
  workingDays: number[];
}

export interface BookingForm {
  name: string;
  phone: string;
  email: string;
  vehicleMake: string;
  vehicleModel: string;
  vehicleYear: string;
  vehicleColor: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  notes: string;
}

export const STEPS = ["Services", "Vehicle", "Date & Time", "Your Info", "Confirm"];

export const VEHICLE_SIZES = [
  { value: "Sedan", label: "Sedan", icon: "🚗" },
  { value: "Coupe", label: "Coupe", icon: "🏎️" },
  { value: "SUV", label: "SUV", icon: "🚙" },
  { value: "Truck", label: "Truck", icon: "🛻" },
  { value: "Van", label: "Van", icon: "🚐" },
  { value: "Luxury", label: "Luxury", icon: "✨" },
];

export const VEHICLE_MAKES = [
  "Acura", "Audi", "BMW", "Buick", "Cadillac", "Chevrolet", "Chrysler",
  "Dodge", "Ford", "Genesis", "GMC", "Honda", "Hyundai", "Infiniti",
  "Jaguar", "Jeep", "Kia", "Land Rover", "Lexus", "Lincoln", "Mazda",
  "Mercedes-Benz", "Mini", "Mitsubishi", "Nissan", "Porsche", "Ram",
  "Subaru", "Tesla", "Toyota", "Volkswagen", "Volvo", "Other",
];

export const YEARS = Array.from({ length: 28 }, (_, i) => 2027 - i);

export function formatTime(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${m.toString().padStart(2, "0")} ${ampm}`;
}
