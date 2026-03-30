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
  docTitle: {
    fontSize: 24,
    fontFamily: "Helvetica-Bold",
    color: "#1e293b",
    textAlign: "right",
  },
  docNumber: {
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
  validUntilBox: {
    marginTop: 12,
    padding: 10,
    backgroundColor: "#f8fafc",
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
});

interface EstimatePDFProps {
  estimate: {
    estimateNumber: string;
    status: string;
    subtotal: number;
    discount: number;
    taxRate: number;
    total: number;
    notes: string | null;
    validUntil: string | null;
    createdAt: string;
    customer: {
      name: string;
      phone: string | null;
      email: string | null;
      address: string | null;
      city: string | null;
      zip: string | null;
    };
    vehicle: {
      make: string;
      model: string;
      year: number;
      color: string | null;
    } | null;
    lineItems: {
      id: string;
      name: string;
      description: string | null;
      price: number;
      quantity: number;
    }[];
  };
  settings: {
    businessName?: string;
    phone?: string;
    email?: string;
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
  } | null;
}

export function EstimatePDF({ estimate, settings }: EstimatePDFProps) {
  const taxAmount = estimate.subtotal * (estimate.taxRate / 100);

  const statusColors: Record<string, { bg: string; text: string }> = {
    Approved: { bg: "#d1fae5", text: "#065f46" },
    Declined: { bg: "#fee2e2", text: "#991b1b" },
    Sent: { bg: "#dbeafe", text: "#1e40af" },
    Draft: { bg: "#f1f5f9", text: "#475569" },
    Expired: { bg: "#fef3c7", text: "#92400e" },
    Converted: { bg: "#ede9fe", text: "#5b21b6" },
  };

  const sc = statusColors[estimate.status] || statusColors.Draft;

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
            <Text style={styles.docTitle}>ESTIMATE</Text>
            <Text style={styles.docNumber}>{estimate.estimateNumber}</Text>
            <Text style={[styles.docNumber, { marginTop: 8 }]}>
              Date: {new Date(estimate.createdAt).toLocaleDateString()}
            </Text>
            {estimate.validUntil && (
              <Text style={styles.docNumber}>
                Valid Until: {new Date(estimate.validUntil).toLocaleDateString()}
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
              {estimate.status}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Prepared For</Text>
          <Text style={styles.bold}>{estimate.customer.name}</Text>
          {estimate.customer.email && (
            <Text>{estimate.customer.email}</Text>
          )}
          {estimate.customer.phone && (
            <Text>{estimate.customer.phone}</Text>
          )}
          {estimate.customer.address && (
            <Text>
              {estimate.customer.address}
              {estimate.customer.city ? `, ${estimate.customer.city}` : ""}
              {estimate.customer.zip ? ` ${estimate.customer.zip}` : ""}
            </Text>
          )}
        </View>

        {estimate.vehicle && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Vehicle</Text>
            <Text>
              {estimate.vehicle.year} {estimate.vehicle.make}{" "}
              {estimate.vehicle.model}
              {estimate.vehicle.color ? ` — ${estimate.vehicle.color}` : ""}
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
          {estimate.lineItems.map((item, i) => (
            <View key={i} style={styles.tableRow}>
              <View style={styles.colService}>
                <Text style={styles.bold}>{item.name}</Text>
                {item.description && (
                  <Text style={{ fontSize: 8, color: "#94a3b8", marginTop: 2 }}>
                    {item.description}
                  </Text>
                )}
              </View>
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
            <Text style={styles.totalsValue}>
              ${estimate.subtotal.toFixed(2)}
            </Text>
          </View>
          {taxAmount > 0 && (
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>Tax ({estimate.taxRate}%)</Text>
              <Text style={styles.totalsValue}>${taxAmount.toFixed(2)}</Text>
            </View>
          )}
          {estimate.discount > 0 && (
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>Discount</Text>
              <Text style={styles.totalsValue}>
                -${estimate.discount.toFixed(2)}
              </Text>
            </View>
          )}
          <View style={styles.grandTotal}>
            <Text style={[styles.totalsLabel, styles.bold, { fontSize: 14 }]}>
              Total
            </Text>
            <Text style={[styles.totalsValue, styles.bold, { fontSize: 14 }]}>
              ${estimate.total.toFixed(2)}
            </Text>
          </View>
        </View>

        {estimate.validUntil && (
          <View style={styles.validUntilBox}>
            <Text style={{ fontSize: 9, color: "#64748b" }}>
              This estimate is valid until{" "}
              {new Date(estimate.validUntil).toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
              . Prices may change after this date.
            </Text>
          </View>
        )}

        {estimate.notes && (
          <View style={[styles.section, { marginTop: 12 }]}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <Text>{estimate.notes}</Text>
          </View>
        )}

        <Text style={styles.footer}>
          Thank you for considering{" "}
          {settings?.businessName || "Fresh Path Mobile Detailing"}!
        </Text>
      </Page>
    </Document>
  );
}
