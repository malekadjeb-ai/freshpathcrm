"use client";

import { FileText, Calendar, Edit2, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { formatCurrency, formatDate } from "@/lib/utils";
import { FleetContract, FREQUENCY_LABELS } from "./types";

interface ContractListProps {
  contracts: FleetContract[];
  onEdit: (contract: FleetContract) => void;
  onDelete: (id: string) => void;
}

export function ContractList({ contracts, onEdit, onDelete }: ContractListProps) {
  return (
    <div>
      <h2 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
        <FileText className="w-4 h-4" />
        Service Contracts ({contracts.length})
      </h2>
      {contracts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-500 mb-1">No contracts yet</p>
            <p className="text-xs text-slate-400">
              Create service contracts for recurring fleet work
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {contracts.map((c) => (
            <Card key={c.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-slate-900 truncate">{c.name}</span>
                      <Badge className={c.isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}>
                        {c.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-500">
                      {c.customer.companyName || c.customer.name}
                    </p>
                    <div className="flex gap-3 mt-2 text-xs text-slate-400">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {FREQUENCY_LABELS[c.frequency] || c.frequency}
                      </span>
                      <span>
                        {c.vehicleCount} vehicles
                      </span>
                      {c.pricePerVehicle != null && (
                        <span>{formatCurrency(c.pricePerVehicle)}/vehicle</span>
                      )}
                      {c.flatRate != null && (
                        <span>{formatCurrency(c.flatRate)} flat</span>
                      )}
                    </div>
                    <div className="text-xs text-slate-400 mt-1">
                      Started {formatDate(c.startDate)}
                      {c.endDate && ` · Ends ${formatDate(c.endDate)}`}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => onEdit(c)}>
                      <Edit2 className="w-3.5 h-3.5" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger render={
                        <Button variant="ghost" size="sm" className="text-red-500">
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      } />
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Contract</AlertDialogTitle>
                          <AlertDialogDescription>
                            Delete &quot;{c.name}&quot;? This cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => onDelete(c.id)}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
