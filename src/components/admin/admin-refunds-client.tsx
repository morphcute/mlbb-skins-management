"use client";

import { LoaderCircle, RefreshCcw } from "lucide-react";
import { FormEvent, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useLiveQuery } from "@/hooks/use-live-query";
import { formatDate } from "@/lib/utils";

type SupplierOption = {
  id: string;
  name: string;
  diamondBalance: number;
};

type SupplierApiResponse = {
  suppliers: SupplierOption[];
};

type OrderRecord = {
  id: string;
  mlbbId: string;
  serverId: string;
  ign: string;
  skinName: string;
  diamondPrice: number;
  supplierId: string;
  status: string;
  createdAt: string;
  supplier: {
    name: string;
  };
};

type OrdersApiResponse = {
  orders: OrderRecord[];
};

export function AdminRefundsClient() {
  const [reassignOrder, setReassignOrder] = useState<OrderRecord | null>(null);
  const [skinName, setSkinName] = useState("");
  const [diamondPrice, setDiamondPrice] = useState("0");
  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [sort, setSort] = useState("createdAt");
  const [order, setOrder] = useState("desc");

  const supplierQuery = useLiveQuery<SupplierApiResponse>("/api/suppliers", 7000);
  const queryUrl = `/api/orders?status=REFUNDED&limit=100&sort=${sort}&order=${order}`;
  const ordersQuery = useLiveQuery<OrdersApiResponse>(queryUrl, 5000);

  const suppliers = supplierQuery.data?.suppliers ?? [];
  const orders = ordersQuery.data?.orders ?? [];

  const handleReassignClick = (order: OrderRecord) => {
    setReassignOrder(order);
    setSkinName(order.skinName);
    setDiamondPrice(order.diamondPrice.toString());
    setSelectedSupplierId("");
    setErrorMessage(null);
  };

  const handleCancelReassign = () => {
    setReassignOrder(null);
    setSkinName("");
    setDiamondPrice("0");
    setSelectedSupplierId("");
    setErrorMessage(null);
  };

  const handleReassignSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!reassignOrder) return;

    if (!selectedSupplierId) {
      setErrorMessage("Please select a supplier.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mlbbId: reassignOrder.mlbbId,
          serverId: reassignOrder.serverId,
          ign: reassignOrder.ign,
          skinName,
          diamondPrice: Number(diamondPrice),
          supplierId: selectedSupplierId,
          status: "PENDING",
          notes: `Re-assigned from refunded order`, // Simplified note as ID will be gone
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({ message: "Failed to create order" }));
        throw new Error(payload.message ?? "Failed to create order");
      }

      // Delete the old refunded order
      const deleteResponse = await fetch(`/api/orders/${reassignOrder.id}`, {
        method: "DELETE",
      });

      if (!deleteResponse.ok) {
        console.warn("Failed to delete refunded order after re-assign", await deleteResponse.text());
      }

      // Success
      setReassignOrder(null);
      setSkinName("");
      setDiamondPrice("0");
      setSelectedSupplierId("");
      await Promise.all([ordersQuery.mutate(), supplierQuery.mutate()]);
    } catch (error: any) {
      setErrorMessage(error.message || "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">


      {/* Refunded Orders List */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Refunded Orders</CardTitle>
              <CardDescription>History of refunded orders. Re-assign them to create new orders.</CardDescription>
            </div>
            <div className="flex items-center gap-2">
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
                <option value="skinName:asc">Skin Name (A-Z)</option>
                <option value="skinName:desc">Skin Name (Z-A)</option>
                <option value="diamondPrice:asc">Price (Low-High)</option>
                <option value="diamondPrice:desc">Price (High-Low)</option>
              </Select>
              <Button variant="outline" size="sm" onClick={() => ordersQuery.mutate()} className="h-9">
                <RefreshCcw className="mr-2 h-3.5 w-3.5" />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {ordersQuery.isLoading ? (
            <div className="flex h-36 items-center justify-center text-muted-foreground">
              <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
              Loading refunds...
            </div>
          ) : orders.length === 0 ? (
            <div className="flex h-36 items-center justify-center text-muted-foreground">
              No refunded orders found.
            </div>
          ) : (
            <>
              {/* Mobile View */}
              <div className="space-y-3 md:hidden">
                {orders.map((order) => (
                  <div key={order.id} className="rounded-xl border border-glass-border bg-card p-3 shadow-sm">
                    <div className="mb-2 flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-foreground">{order.skinName}</p>
                        <p className="text-xs text-muted-foreground">
                          {order.ign} <span className="opacity-70">({order.mlbbId})</span>
                        </p>
                      </div>
                      <Badge variant="danger" className="text-[10px]">REFUNDED</Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-y-2 gap-x-3 text-xs mb-3">
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Price</p>
                        <p className="font-medium text-foreground">{order.diamondPrice.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Original Supplier</p>
                        <p className="font-medium text-foreground">{order.supplier.name}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Refunded Date</p>
                        <p className="font-medium text-foreground" suppressHydrationWarning>{formatDate(order.createdAt)}</p>
                      </div>
                    </div>
                    <Button 
                      className="w-full h-8 text-xs" 
                      onClick={() => handleReassignClick(order)}
                      variant="outline"
                    >
                      <RefreshCcw className="mr-2 h-3 w-3" />
                      Re-assign
                    </Button>
                  </div>
                ))}
              </div>

              {/* Desktop View */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Skin</TableHead>
                      <TableHead>MLBB ID</TableHead>
                      <TableHead>IGN</TableHead>
                      <TableHead>Original Supplier</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="w-30">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-semibold">{order.skinName}</TableCell>
                        <TableCell>{order.mlbbId}</TableCell>
                        <TableCell>{order.ign}</TableCell>
                        <TableCell>{order.supplier.name}</TableCell>
                        <TableCell>{order.diamondPrice.toLocaleString()}</TableCell>
                        <TableCell suppressHydrationWarning>{formatDate(order.createdAt)}</TableCell>
                        <TableCell>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-8 text-xs"
                            onClick={() => handleReassignClick(order)}
                          >
                            <RefreshCcw className="mr-2 h-3 w-3" />
                            Re-assign
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!reassignOrder} onOpenChange={(open) => !open && handleCancelReassign()}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Re-assign Order</DialogTitle>
            <DialogDescription>
              Create a new order based on refunded order for <strong>{reassignOrder?.ign}</strong> ({reassignOrder?.mlbbId})
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleReassignSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-1">
                  <Label>MLBB ID</Label>
                  <Input value={reassignOrder?.mlbbId || ""} disabled className="bg-muted h-9" />
                </div>
                <div className="space-y-1">
                  <Label>Server ID</Label>
                  <Input value={reassignOrder?.serverId || ""} disabled className="bg-muted h-9" />
                </div>
                <div className="space-y-1">
                  <Label>IGN</Label>
                  <Input value={reassignOrder?.ign || ""} disabled className="bg-muted h-9" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="skinName">New Skin Name</Label>
                  <Input
                    id="skinName"
                    value={skinName}
                    onChange={(e) => setSkinName(e.target.value)}
                    required
                    className="h-9"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="diamondPrice">Diamond Price</Label>
                  <Input
                    id="diamondPrice"
                    type="number"
                    value={diamondPrice}
                    onChange={(e) => setDiamondPrice(e.target.value)}
                    required
                    min="0"
                    className="h-9"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="supplier">Assign Supplier</Label>
                  <Select 
                    value={selectedSupplierId} 
                    onChange={(e) => setSelectedSupplierId(e.target.value)} 
                    required 
                    className="h-9"
                  >
                    <option value="" disabled>
                      Select a supplier
                    </option>
                    {suppliers.map((supplier) => (
                      <option key={supplier.id} value={supplier.id}>
                        {supplier.name} ({supplier.diamondBalance.toLocaleString()})
                      </option>
                    ))}
                  </Select>
                </div>
              </div>

              {errorMessage && <p className="text-sm text-destructive">{errorMessage}</p>}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCancelReassign}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
                Confirm Re-assign
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
