"use client";

import { LoaderCircle } from "lucide-react";
import { FormEvent, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useLiveQuery } from "@/hooks/use-live-query";
import { formatDate } from "@/lib/utils";

type SupplierResponse = {
  suppliers: Array<{
    id: string;
    name: string;
    diamondBalance: number;
    lowBalanceThreshold: number;
  }>;
};

type BalanceLogResponse = {
  logs: Array<{
    id: string;
    changeAmount: number;
    reason: string;
    createdAt: string;
    order: {
      id: string;
      skinName: string;
    } | null;
  }>;
};

export function SupplierBalanceClient() {
  const supplierQuery = useLiveQuery<SupplierResponse>("/api/suppliers", 4000);
  const logsQuery = useLiveQuery<BalanceLogResponse>("/api/balance-logs?limit=200", 4000);

  const supplier = supplierQuery.data?.suppliers[0];

  const [newBalance, setNewBalance] = useState("");
  const [reason, setReason] = useState("Manual update");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (supplierQuery.isLoading || logsQuery.isLoading) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        <LoaderCircle className="mr-2 h-5 w-5 animate-spin" />
        Loading balance data...
      </div>
    );
  }

  if (!supplier) {
    return <p className="text-sm text-destructive">Supplier account not found.</p>;
  }

  const submitBalanceChange = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const response = await fetch(`/api/suppliers/${supplier.id}/balance`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        newBalance: Number(newBalance),
        reason,
      }),
    });

    setIsSubmitting(false);

    if (!response.ok) {
      const payload = await response.json().catch(() => ({ message: "Failed to update balance" }));
      setError(payload.message ?? "Failed to update balance");
      return;
    }

    setNewBalance("");
    await Promise.all([supplierQuery.mutate(), logsQuery.mutate()]);
  };

  return (
    <div className="space-y-6">
      <div className="stagger-grid grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Current Balance</CardDescription>
            <CardTitle className="text-3xl">{supplier.diamondBalance.toLocaleString()}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">Diamonds remaining in your account</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Threshold</CardDescription>
            <CardTitle className="text-3xl">{supplier.lowBalanceThreshold.toLocaleString()}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">Alert threshold configured by admin</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Status</CardDescription>
            <CardTitle className="text-3xl">
              {supplier.diamondBalance < supplier.lowBalanceThreshold ? "Low" : "Healthy"}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {supplier.diamondBalance < supplier.lowBalanceThreshold
              ? "Top-up recommended before completing new orders."
              : "Balance level is healthy."}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Update Balance</CardTitle>
          <CardDescription>Set the new total balance amount.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 md:grid-cols-3" onSubmit={submitBalanceChange}>
            <div className="space-y-2">
              <Label htmlFor="newBalance">New Total Balance</Label>
              <Input
                id="newBalance"
                type="number"
                value={newBalance}
                onChange={(event) => setNewBalance(event.target.value)}
                required
                placeholder={supplier.diamondBalance.toString()}
              />
            </div>
            <div className="space-y-2 col-span-full">
              <Label htmlFor="reason">Reason</Label>
              <Input id="reason" value={reason} onChange={(event) => setReason(event.target.value)} required />
            </div>
            {error ? <p className="text-sm text-destructive col-span-full">{error}</p> : null}
            <div className="col-span-full">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
                {isSubmitting ? "Updating..." : "Update Balance"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Balance History</CardTitle>
          <CardDescription>Audit trail of top-ups and auto-deductions.</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Mobile View: Card List */}
          <div className="space-y-4 md:hidden">
            {(logsQuery.data?.logs ?? []).map((log) => (
              <div key={log.id} className="rounded-xl border border-glass-border bg-card p-4 shadow-sm">
                <div className="mb-2 flex items-center justify-between">
                  <Badge variant={log.changeAmount >= 0 ? "success" : "danger"}>
                    {log.changeAmount > 0 ? "+" : ""}
                    {log.changeAmount.toLocaleString()}
                  </Badge>
                  <span className="text-xs text-muted-foreground" suppressHydrationWarning>
                    {formatDate(log.createdAt)}
                  </span>
                </div>
                <p className="font-medium text-foreground text-sm">{log.reason}</p>
                {log.order && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Order: <span className="font-medium">{log.order.skinName}</span>
                  </p>
                )}
              </div>
            ))}
          </div>

          {/* Desktop View: Table */}
          <div className="hidden md:block">
            <Table className="min-w-150">
              <TableHeader>
                <TableRow>
                  <TableHead>Amount</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Order</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(logsQuery.data?.logs ?? []).map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      <Badge variant={log.changeAmount >= 0 ? "success" : "danger"}>
                        {log.changeAmount > 0 ? "+" : ""}
                        {log.changeAmount.toLocaleString()}
                      </Badge>
                    </TableCell>
                    <TableCell>{log.reason}</TableCell>
                    <TableCell>{log.order?.skinName ?? "-"}</TableCell>
                    <TableCell suppressHydrationWarning>{formatDate(log.createdAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
