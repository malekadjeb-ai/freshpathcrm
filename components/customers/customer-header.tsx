"use client";

import Link from "next/link";
import {
  ArrowLeft, Phone, Mail, MapPin, Plus, Trash2, ChevronRight,
  MessageSquare, Pencil, Building2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { formatCurrency, getInitials } from "@/lib/utils";
import { AIActionButton } from "@/components/ai/ai-action-button";
import type { CustomerDetailData } from "./customer-types";

interface CustomerHeaderProps {
  customer: CustomerDetailData;
  onEdit: () => void;
  onDelete: () => void;
}

export function CustomerHeader({ customer, onEdit, onDelete }: CustomerHeaderProps) {
  return (
    <>
      <div className="flex items-center gap-2 text-sm text-slate-500 mb-4">
        <Link href="/customers" className="hover:text-slate-900 flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" />
          Customers
        </Link>
        <ChevronRight className="w-4 h-4" />
        <span className="text-slate-900">{customer.name}</span>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <Avatar className="w-16 h-16">
              <AvatarFallback className="bg-emerald-100 text-emerald-700 text-xl font-bold">
                {getInitials(customer.name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-slate-900">{customer.name}</h1>
                {customer.isCommercial && (
                  <Badge className="bg-blue-100 text-blue-700 text-xs">
                    <Building2 className="w-3 h-3 mr-1" /> Fleet
                  </Badge>
                )}
              </div>
              {customer.companyName && (
                <p className="text-sm text-slate-500">{customer.companyName}</p>
              )}
              <div className="flex flex-wrap items-center gap-3 mt-1.5 text-sm text-slate-500">
                {customer.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5" />
                    <a href={`tel:${customer.phone}`} className="hover:text-emerald-600 transition-colors">{customer.phone}</a>
                    <a href={`sms:${customer.phone}`} className="text-slate-400 hover:text-emerald-600 transition-colors" title="Send SMS">
                      <MessageSquare className="w-3.5 h-3.5" />
                    </a>
                  </span>
                )}
                {customer.email && (
                  <span className="flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5" />
                    <a href={`mailto:${customer.email}`} className="hover:text-emerald-600 transition-colors">{customer.email}</a>
                  </span>
                )}
                {customer.city && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" />
                    {[customer.address, customer.neighborhood, customer.city, customer.zip]
                      .filter(Boolean)
                      .join(", ")}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {customer.tags.map((tag) => (
                  <span
                    key={tag.id}
                    className="px-2 py-0.5 rounded-full text-xs font-medium"
                    style={{ backgroundColor: tag.color + "20", color: tag.color }}
                  >
                    {tag.name}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="text-right mr-4">
              <div className="text-2xl font-bold text-emerald-600">
                {formatCurrency(customer.totalSpent)}
              </div>
              <div className="text-xs text-slate-500">Lifetime Value</div>
            </div>
            <Button variant="outline" onClick={onEdit}>
              <Pencil className="w-4 h-4 mr-2" />
              Edit
            </Button>
            <Link href={`/jobs/new?customerId=${customer.id}`}>
              <Button className="bg-emerald-500 hover:bg-emerald-600 text-white">
                <Plus className="w-4 h-4 mr-2" />
                Book Job
              </Button>
            </Link>
            <AIActionButton type="next_action" label="AI: Next Action" customerId={customer.id} />
            <AIActionButton type="draft_message" label="AI: Draft Message" customerId={customer.id} />
            <AIActionButton type="upsell" label="AI: Upsell" customerId={customer.id} />
            <AlertDialog>
              <AlertDialogTrigger render={
                <Button variant="outline" size="icon" className="text-red-500 hover:text-red-600">
                  <Trash2 className="w-4 h-4" />
                </Button>
              } />
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete customer?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete {customer.name} and all associated data. This cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-red-500 hover:bg-red-600"
                    onClick={onDelete}
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        {(customer.referredBy || customer.referrals.length > 0) && (
          <div className="mt-4 pt-4 border-t border-slate-100 flex gap-6 text-sm">
            {customer.referredBy && (
              <span className="text-slate-500">
                Referred by{" "}
                <Link href={`/customers/${customer.referredBy.id}`} className="text-emerald-600 hover:underline">
                  {customer.referredBy.name}
                </Link>
              </span>
            )}
            {customer.referrals.length > 0 && (
              <span className="text-slate-500">
                Referred{" "}
                {customer.referrals.map((r, i) => (
                  <span key={r.id}>
                    <Link href={`/customers/${r.id}`} className="text-emerald-600 hover:underline">
                      {r.name}
                    </Link>
                    {i < customer.referrals.length - 1 && ", "}
                  </span>
                ))}
              </span>
            )}
          </div>
        )}
      </div>
    </>
  );
}
