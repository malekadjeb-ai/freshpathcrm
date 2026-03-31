import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/utils";

interface Payment {
  id: string;
  amount: number;
  method: string;
  paymentDate: string;
  notes: string | null;
}

interface PaymentHistoryProps {
  payments: Payment[];
}

export function PaymentHistory({ payments }: PaymentHistoryProps) {
  if (payments.length === 0) return null;

  return (
    <Card className="mt-6">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Payment History</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {payments.map((p) => (
            <div key={p.id} className="flex items-center justify-between bg-slate-50 rounded-lg px-4 py-3">
              <div>
                <span className="font-medium text-sm text-slate-900">{p.method}</span>
                <span className="text-xs text-slate-400 ml-2">{formatDate(p.paymentDate)}</span>
              </div>
              <span className="font-semibold text-emerald-600">{formatCurrency(p.amount)}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
