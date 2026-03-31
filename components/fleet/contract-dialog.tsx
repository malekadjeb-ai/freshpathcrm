"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FleetCustomer, FleetContract, ContractFormData } from "./types";

interface ContractDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingContract: FleetContract | null;
  form: ContractFormData;
  onFormChange: (updater: (prev: ContractFormData) => ContractFormData) => void;
  onSave: () => void;
  isSaving: boolean;
  fleetCustomers: FleetCustomer[];
}

export function ContractDialog({
  open,
  onOpenChange,
  editingContract,
  form,
  onFormChange,
  onSave,
  isSaving,
  fleetCustomers,
}: ContractDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editingContract ? "Edit Contract" : "New Service Contract"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          {!editingContract && (
            <div>
              <Label>Fleet Account</Label>
              <Select
                value={form.customerId || "none"}
                onValueChange={(v) => {
                  const val = String(v ?? "");
                  onFormChange((p) => ({ ...p, customerId: val === "none" ? "" : val }));
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none" disabled>Select account</SelectItem>
                  {fleetCustomers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.companyName || c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div>
            <Label>Contract Name</Label>
            <Input
              value={form.name}
              onChange={(e) => onFormChange((p) => ({ ...p, name: e.target.value }))}
              placeholder="Monthly Fleet Wash Package"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Frequency</Label>
              <Select
                value={form.frequency}
                onValueChange={(v) => onFormChange((p) => ({ ...p, frequency: String(v ?? "monthly") }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="biweekly">Bi-Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Vehicle Count</Label>
              <Input
                type="number"
                min="0"
                value={form.vehicleCount}
                onChange={(e) => onFormChange((p) => ({ ...p, vehicleCount: e.target.value }))}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Price Per Vehicle</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.pricePerVehicle}
                onChange={(e) => onFormChange((p) => ({ ...p, pricePerVehicle: e.target.value }))}
                placeholder="$0.00"
              />
            </div>
            <div>
              <Label>Or Flat Rate</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.flatRate}
                onChange={(e) => onFormChange((p) => ({ ...p, flatRate: e.target.value }))}
                placeholder="$0.00"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Start Date</Label>
              <Input
                type="date"
                value={form.startDate}
                onChange={(e) => onFormChange((p) => ({ ...p, startDate: e.target.value }))}
              />
            </div>
            <div>
              <Label>End Date (optional)</Label>
              <Input
                type="date"
                value={form.endDate}
                onChange={(e) => onFormChange((p) => ({ ...p, endDate: e.target.value }))}
              />
            </div>
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea
              rows={2}
              value={form.notes}
              onChange={(e) => onFormChange((p) => ({ ...p, notes: e.target.value }))}
              placeholder="Contract terms, special pricing..."
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={onSave}
            disabled={!form.name || (!editingContract && !form.customerId) || isSaving}
          >
            {isSaving ? "Saving..." : editingContract ? "Update" : "Create Contract"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
