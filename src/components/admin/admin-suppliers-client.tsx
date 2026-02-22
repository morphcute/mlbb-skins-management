"use client";

import { LoaderCircle, Plus } from "lucide-react";
import React, { FormEvent, useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useLiveQuery } from "@/hooks/use-live-query";
import { HEALTH_STATE, getBalanceHealthState } from "@/lib/constants";
import { formatDate } from "@/lib/utils";

type SupplierRecord = {
  id: string;
  name: string;
  diamondBalance: number;
  lowBalanceThreshold: number;
  createdAt: string;
  user: {
    email: string;
  };
};

type SupplierApiResponse = {
  suppliers: SupplierRecord[];
};

type SupplierDraft = {
  name: string;
  lowBalanceThreshold: string;
};

const EMPTY_SUPPLIERS: SupplierRecord[] = [];

function healthVariant(balance: number, threshold: number) {
  const health = getBalanceHealthState(balance, threshold);

  if (health === HEALTH_STATE.CRITICAL) {
    return "danger" as const;
  }

  if (health === HEALTH_STATE.LOW) {
    return "warning" as const;
  }

  return "success" as const;
}

function healthLabel(balance: number, threshold: number) {
  const health = getBalanceHealthState(balance, threshold);

  if (health === HEALTH_STATE.CRITICAL) {
    return "Critical";
  }

  if (health === HEALTH_STATE.LOW) {
    return "Low";
  }

  return "Healthy";
}

export function AdminSuppliersClient() {
  const [sort, setSort] = useState("createdAt");
  const [order, setOrder] = useState("desc");
  const suppliersQuery = useLiveQuery<SupplierApiResponse>(`/api/suppliers?sort=${sort}&order=${order}`, 5000);

  const suppliers = suppliersQuery.data?.suppliers ?? EMPTY_SUPPLIERS;

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("supplier123");
  const [diamondBalance, setDiamondBalance] = useState("0");
  const [lowBalanceThreshold, setLowBalanceThreshold] = useState("1000");
  const [googleSheetId, setGoogleSheetId] = useState("");
  const [googleSyncEnabled, setGoogleSyncEnabled] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isSavingSupplierId, setIsSavingSupplierId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [drafts, setDrafts] = useState<Record<string, SupplierDraft>>({});

  const draftPayload = useMemo(() => {
    const next: Record<string, SupplierDraft> = {};

    for (const supplier of suppliers) {
      next[supplier.id] = {
        name: supplier.name,
        lowBalanceThreshold: String(supplier.lowBalanceThreshold),
      };
    }

    return next;
  }, [suppliers]);

  useEffect(() => {
    setDrafts(draftPayload);
  }, [draftPayload]);

  const handleCreateSupplier = async (event: React.FormEvent) => {
    event.preventDefault();
    setMessage(null);
    setIsCreating(true);

    const response = await fetch("/api/suppliers", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name,
        email,
        password,
        diamondBalance: Number(diamondBalance),
        lowBalanceThreshold: Number(lowBalanceThreshold),
        googleSheetId,
        googleSyncEnabled,
      }),
    });

    setIsCreating(false);

    if (!response.ok) {
      const payload = await response.json().catch(() => ({ message: "Failed to create supplier" }));
      setMessage(payload.message ?? "Failed to create supplier");
      return;
    }

    setName("");
    setEmail("");
    setPassword("supplier123");
    setDiamondBalance("0");
    setLowBalanceThreshold("1000");
    setGoogleSheetId("");
    setGoogleSyncEnabled(false);
    setMessage("Supplier created successfully.");

    await suppliersQuery.mutate();
  };

  const saveSupplierDraft = async (supplierId: string) => {
    const draft = drafts[supplierId];
    if (!draft) {
      return;
    }

    setMessage(null);
    setIsSavingSupplierId(supplierId);

    const response = await fetch(`/api/suppliers/${supplierId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: draft.name,
        lowBalanceThreshold: Number(draft.lowBalanceThreshold),
      }),
    });

    setIsSavingSupplierId(null);

    if (!response.ok) {
      const payload = await response.json().catch(() => ({ message: "Failed to update supplier" }));
      setMessage(payload.message ?? "Failed to update supplier");
      return;
    }

    setMessage("Supplier updated.");
    await suppliersQuery.mutate();
  };

  const adjustBalance = async (supplierId: string, changeAmount: number, reason: string) => {
    setMessage(null);

    const response = await fetch(`/api/suppliers/${supplierId}/balance`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        changeAmount,
        reason,
      }),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({ message: "Failed to adjust balance" }));
      setMessage(payload.message ?? "Failed to adjust balance");
      return;
    }

    await suppliersQuery.mutate();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Create Supplier</CardTitle>
          <CardDescription>Add a supplier user and initialize account settings.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="stagger-grid grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" onSubmit={handleCreateSupplier}>
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={name} onChange={(event) => setName(event.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="text"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="threshold">Low Balance Threshold</Label>
              <Input
                id="threshold"
                type="number"
                min={0}
                value={lowBalanceThreshold}
                onChange={(event) => setLowBalanceThreshold(event.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="googleSheetId">Google Sheet ID</Label>
              <Input
                id="googleSheetId"
                value={googleSheetId}
                onChange={(event) => setGoogleSheetId(event.target.value)}
                placeholder="Optional"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="googleSyncEnabled">Google Sync</Label>
              <Select
                value={googleSyncEnabled ? "true" : "false"}
                onChange={(event) => setGoogleSyncEnabled(event.target.value === "true")}
                className="h-9"
              >
                <option value="false">Disabled</option>
                <option value="true">Enabled</option>
              </Select>
            </div>
            <div className="col-span-full flex items-center gap-3">
              <Button type="submit" disabled={isCreating}>
                {isCreating ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                {isCreating ? "Creating..." : "Create Supplier"}
              </Button>
              {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Suppliers</CardTitle>
              <CardDescription>Manage thresholds, Google Sheet links, and quick balance adjustments.</CardDescription>
            </div>
            <Select
              value={`${sort}:${order}`}
              onChange={(event) => {
                const [newSort, newOrder] = event.target.value.split(":");
                setSort(newSort);
                setOrder(newOrder);
              }}
              className="h-9 w-40"
            >
              <option value="createdAt:desc">Newest First</option>
              <option value="createdAt:asc">Oldest First</option>
              <option value="name:asc">Name (A-Z)</option>
              <option value="name:desc">Name (Z-A)</option>
              <option value="diamondBalance:asc">Balance (Low-High)</option>
              <option value="diamondBalance:desc">Balance (High-Low)</option>
              <option value="lowBalanceThreshold:asc">Threshold (Low-High)</option>
              <option value="lowBalanceThreshold:desc">Threshold (High-Low)</option>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {suppliersQuery.isLoading ? (
            <div className="flex h-32 items-center justify-center text-muted-foreground">
              <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
              Loading suppliers...
            </div>
          ) : (
            <>
              {/* Mobile View: Card List */}
              <div className="space-y-6 md:hidden">
                {suppliers.map((supplier) => {
                  const draft = drafts[supplier.id];
                  if (!draft) return null;

                  return (
                    <div key={supplier.id} className="rounded-xl border border-glass-border bg-card p-4 shadow-sm space-y-4">
                      {/* Header with Name Input and Health Badge */}
                      <div className="flex justify-between items-start gap-3">
                        <div className="flex-1 space-y-1">
                          <Label className="text-xs text-muted-foreground">Name</Label>
                          <Input
                            value={draft.name}
                            onChange={(event) =>
                              setDrafts((previous) => ({
                                ...previous,
                                [supplier.id]: {
                                  ...previous[supplier.id],
                                  name: event.target.value,
                                },
                              }))
                            }
                          />
                        </div>
                        <div className="mt-7">
                          <Badge variant={healthVariant(supplier.diamondBalance, Number(draft.lowBalanceThreshold))}>
                            {healthLabel(supplier.diamondBalance, Number(draft.lowBalanceThreshold))}
                          </Badge>
                        </div>
                      </div>

                      {/* Email (Read only) */}
                      <div>
                        <Label className="text-xs text-muted-foreground">Email</Label>
                        <p className="text-sm font-medium text-foreground">{supplier.user.email}</p>
                      </div>

                      {/* Balance (Read only) & Threshold (Editable) */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-xs text-muted-foreground">Balance</Label>
                          <p className="text-lg font-semibold text-foreground">{supplier.diamondBalance.toLocaleString()}</p>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Threshold</Label>
                          <Input
                            type="number"
                            min={0}
                            value={draft.lowBalanceThreshold}
                            onChange={(event) =>
                              setDrafts((previous) => ({
                                ...previous,
                                [supplier.id]: {
                                  ...previous[supplier.id],
                                  lowBalanceThreshold: event.target.value,
                                },
                              }))
                            }
                          />
                        </div>
                      </div>

                      {/* Actions */}
                      <Button
                        className="w-full"
                        onClick={() => saveSupplierDraft(supplier.id)}
                        disabled={isSavingSupplierId === supplier.id}
                      >
                        {isSavingSupplierId === supplier.id ? (
                          <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                        ) : null}
                        Save Changes
                      </Button>
                    </div>
                  );
                })}
              </div>

              {/* Desktop View: Table */}
              <div className="hidden md:block">
                <Table className="min-w-330">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Balance</TableHead>
                      <TableHead>Threshold</TableHead>
                      <TableHead>Health</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {suppliers.map((supplier) => {
                      const draft = drafts[supplier.id];
                      if (!draft) {
                        return null;
                      }

                      return (
                        <TableRow key={supplier.id}>
                          <TableCell>
                            <Input
                              value={draft.name}
                              onChange={(event) =>
                                setDrafts((previous) => ({
                                  ...previous,
                                  [supplier.id]: {
                                    ...previous[supplier.id],
                                    name: event.target.value,
                                  },
                                }))
                              }
                            />
                          </TableCell>
                          <TableCell>{supplier.user.email}</TableCell>
                          <TableCell className="font-semibold">{supplier.diamondBalance.toLocaleString()}</TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min={0}
                              value={draft.lowBalanceThreshold}
                              onChange={(event) =>
                                setDrafts((previous) => ({
                                  ...previous,
                                  [supplier.id]: {
                                    ...previous[supplier.id],
                                    lowBalanceThreshold: event.target.value,
                                  },
                                }))
                              }
                            />
                          </TableCell>
                          <TableCell>
                            <Badge variant={healthVariant(supplier.diamondBalance, Number(draft.lowBalanceThreshold))}>
                              {healthLabel(supplier.diamondBalance, Number(draft.lowBalanceThreshold))}
                            </Badge>
                          </TableCell>
                          <TableCell suppressHydrationWarning>{formatDate(supplier.createdAt)}</TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-2">
                              <Button
                                size="sm"
                                onClick={() => saveSupplierDraft(supplier.id)}
                                disabled={isSavingSupplierId === supplier.id}
                              >
                                {isSavingSupplierId === supplier.id ? (
                                  <LoaderCircle className="h-4 w-4 animate-spin" />
                                ) : null}
                                Save
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
