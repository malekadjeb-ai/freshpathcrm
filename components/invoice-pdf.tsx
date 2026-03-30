"use client";

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: "#1e293b",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 30,
  },
  brandName: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    color: "#10b981",
  },
  invoiceTitle: {
    fontSize: 24,
    fontFamily: "Helvetica-Bold",
    color: "#1e293b",
    textAlign: "right",
  },
  invoiceNumber: {
    fontSize: 10,
    color: "#64748b",
    textAlign: "right",
    marginTop: 4,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 6,
  },
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    paddingBottom: 6,
    marginBottom: 6,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  colService: { flex: 3 },
  colQty: { flex: 1, textAlign: "center" },
  colPrice: { flex: 1, textAlign: "right" },
  colTotal: { flex: 1, textAlign: "right" },
  bold: { fontFamily: "Helvetica-Bold" },
  totalsRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingVertical: 3,
  },
  totalsLabel: {
    width: 100,
    textAlign: "right",
    paddingRight: 10,
  },
  totalsValue: {
    width: 80,
    textAlign: "right",
  },
  grandTotal: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingVertical: 6,
    borderTopWidth: 2,
    borderTopColor: "#1e293b",
    marginTop: 4,
  },
  footer: {
    position: "absolute",
    bottom: 40,
    left: 40,
    right: 40,
    textAlign: "center",
    color: "#94a3b8",
    fontSize: 9,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
  },
});

interface InvoicePDFProps {
  invoice: {
    invoiceNumber: string;
    status: string;
    subtotal: number;
    discount: number;
    tax: number;
    total: number;
    dueDate: string | null;
    notes: string | null;
    createdAt: string;
    job: {
      scheduledAt: string | null;
      customer: {
        name: string;
        phone: string | null;
        email: string | null;
        address: string | null;
        city: string | null;
        zip: string | null;
      };
      vehicle: { make: string; model: string; year: number; color: string | null } | null;
      services: { price: number; quantity: number; serviceItem: { name: string; category: string } | null; customName?: string | null }[];
    };
  };
  settings: {
    businessName?: string;
    phone?: string;
    email?: string;
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
    invoiceFooter?: string;
  } | null;
}

export function InvoicePDF({ invoice, settings }: InvoicePDFProps) {
  const subtotal = invoice.subtotal;
  const taxAmount = invoice.tax;
  const discount = invoice.discount;
  const total = invoice.total;

  const statusColors: Record<string, { bg: string; text: string }> = {
    Paid: { bg: "#d1fae5", text: "#065f46" },
    Overdue: { bg: "#fee2e2", text: "#991b1b" },
    Sent: { bg: "#dbeafe", text: "#1e40af" },
    Draft: { bg: "#f1f5f9", text: "#475569" },
  };

  const sc = statusColors[invoice.status] || statusColors.Draft;

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.brandName}>
              {settings?.businessName || "Fresh Path Mobile Detailing"}
            </Text>
            {settings?.address && (
              <Text style={{ marginTop: 4 }}>{settings.address}</Text>
            )}
            <Text>
              {[settings?.city, settings?.state, settings?.zip]
                .filter(Boolean)
                .join(", ")}
            </Text>
            {settings?.phone && <Text>{settings.phone}</Text>}
            {settings?.email && <Text>{settings.email}</Text>}
          </View>
          <View>
            <Text style={styles.invoiceTitle}>INVOICE</Text>
            <Text style={styles.invoiceNumber}>{invoice.invoiceNumber}</Text>
            <Text style={[styles.invoiceNumber, { marginTop: 8 }]}>
              Date: {new Date(invoice.createdAt).toLocaleDateString()}
            </Text>
            {invoice.dueDate && (
              <Text style={styles.invoiceNumber}>
                Due: {new Date(invoice.dueDate).toLocaleDateString()}
              </Text>
            )}
            <Text
              style={[
                styles.statusBadge,
                {
                  backgroundColor: sc.bg,
                  color: sc.text,
                  marginTop: 8,
                  textAlign: "right",
                  alignSelf: "flex-end",
                },
              ]}
            >
              {invoice.status}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Bill To</Text>
          <Text style={styles.bold}>
            {invoice.job.customer.name}
          </Text>
          {invoice.job.customer.email && (
            <Text>{invoice.job.customer.email}</Text>
          )}
          {invoice.job.customer.phone && (
            <Text>{invoice.job.customer.phone}</Text>
          )}
          {invoice.job.customer.address && (
            <Text>
              {invoice.job.customer.address}
              {invoice.job.customer.city
                ? `, ${invoice.job.customer.city}`
                : ""}
              {invoice.job.customer.zip
                ? ` ${invoice.job.customer.zip}`
                : ""}
            </Text>
          )}
        </View>

        {invoice.job.vehicle && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Vehicle</Text>
            <Text>
              {invoice.job.vehicle.year} {invoice.job.vehicle.make}{" "}
              {invoice.job.vehicle.model}
              {invoice.job.vehicle.color
                ? ` — ${invoice.job.vehicle.color}`
                : ""}
            </Text>
          </View>
        )}

        <View style={styles.section}>
          <View style={styles.tableHeader}>
            <Text style={[styles.colService, styles.bold]}>Service</Text>
            <Text style={[styles.colQty, styles.bold]}>Qty</Text>
            <Text style={[styles.colPrice, styles.bold]}>Price</Text>
            <Text style={[styles.colTotal, styles.bold]}>Total</Text>
          </View>
          {invoice.job.services.map((item, i) => (
            <View key={i} style={styles.tableRow}>
              <Text style={styles.colService}>{item.serviceItem?.name || item.customName || "Custom"}</Text>
              <Text style={styles.colQty}>{item.quantity || 1}</Text>
              <Text style={styles.colPrice}>
                ${(item.price || 0).toFixed(2)}
              </Text>
              <Text style={styles.colTotal}>
                ${((item.price || 0) * (item.quantity || 1)).toFixed(2)}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <View style={styles.totalsRow}>
            <Text style={[styles.totalsLabel, styles.bold]}>Subtotal</Text>
            <Text style={styles.totalsValue}>${subtotal.toFixed(2)}</Text>
          </View>
          {taxAmount > 0 && (
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>Tax</Text>
              <Text style={styles.totalsValue}>${taxAmount.toFixed(2)}</Text>
            </View>
          )}
          {discount > 0 && (
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>Discount</Text>
              <Text style={styles.totalsValue}>-${discount.toFixed(2)}</Text>
            </View>
          )}
          <View style={styles.grandTotal}>
            <Text style={[styles.totalsLabel, styles.bold, { fontSize: 14 }]}>
              Total
            </Text>
            <Text style={[styles.totalsValue, styles.bold, { fontSize: 14 }]}>
              ${total.toFixed(2)}
            </Text>
          </View>
        </View>

        {invoice.notes && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <Text>{invoice.notes}</Text>
          </View>
        )}

        <Text style={styles.footer}>
          {settings?.invoiceFooter ||
            "Thank you for your business!"}
        </Text>
      </Page>
    </Document>
  );
}
