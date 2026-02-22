"use client";

import { Check, LoaderCircle, RefreshCcw, Trash2 } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";

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
import { Progress } from "@/components/ui/progress";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useLiveQuery } from "@/hooks/use-live-query";
import { ORDER_STATUS_OPTIONS, type OrderStatusValue } from "@/lib/constants";
import { formatDate, formatDateOnly } from "@/lib/utils";

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
  status: OrderStatusValue;
  readyForGifting: boolean;
  createdAt: string;
  followedAt: string | null;
  releaseDate: string | null;
  notes: string | null;
  supplier: {
    name: string;
  };
};

type OrdersApiResponse = {
  orders: OrderRecord[];
};

export function getDaysLeft(followedAtStr: string) {
  const followedAt = new Date(followedAtStr);
  const targetDate = new Date(followedAt.getTime() + 7 * 24 * 60 * 60 * 1000);
  const now = new Date();
  const diffTime = targetDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}

export function getProgressPercentage(followedAtStr: string) {
  const followedAt = new Date(followedAtStr);
  const targetDate = new Date(followedAt.getTime() + 7 * 24 * 60 * 60 * 1000);
  const now = new Date();
  
  const totalDuration = targetDate.getTime() - followedAt.getTime();
  const elapsed = now.getTime() - followedAt.getTime();
  
  const percentage = (elapsed / totalDuration) * 100;
  return Math.min(100, Math.max(0, percentage));
}

export function AdminOrdersClient() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [supplierFilter, setSupplierFilter] = useState<string>("ALL");
  const [sort, setSort] = useState("createdAt");
  const [order, setOrder] = useState("desc");

  const [mlbbId, setMlbbId] = useState("");
  const [serverId, setServerId] = useState("");
  const [ign, setIgn] = useState("");
  const [skinName, setSkinName] = useState("");
  const [diamondPrice, setDiamondPrice] = useState("0");
  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  const [releaseDate, setReleaseDate] = useState("");
  const [notes, setNotes] = useState("");
  const [refundOrderId, setRefundOrderId] = useState<string | null>(null);
  const [deleteOrderId, setDeleteOrderId] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const supplierQuery = useLiveQuery<SupplierApiResponse>("/api/suppliers", 7000);

  const queryUrl = useMemo(() => {
    const params = new URLSearchParams();
    params.set("limit", "300");

    if (statusFilter !== "ALL") {
      params.set("status", statusFilter);
    } else {
      params.set("excludeStatus", "REFUNDED");
    }

    if (supplierFilter !== "ALL") {
      params.set("supplierId", supplierFilter);
    }

    if (search) {
      params.set("search", search);
    }

    params.set("sort", sort);
    params.set("order", order);

    return `/api/orders?${params.toString()}`;
  }, [search, statusFilter, supplierFilter, sort, order]);

  const ordersQuery = useLiveQuery<OrdersApiResponse>(queryUrl, 5000);

  const suppliers = supplierQuery.data?.suppliers ?? [];
  const orders = ordersQuery.data?.orders ?? [];

  async function handleRefund(orderId: string) {
    setRefundOrderId(orderId);
  }

  async function confirmRefund() {
    if (!refundOrderId) return;
    try {
      const response = await fetch(`/api/orders/${refundOrderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "REFUNDED" }),
      });

      if (!response.ok) throw new Error("Failed to refund order");
      
      ordersQuery.mutate();
    } catch (error) {
      console.error(error);
      alert("Failed to update order status");
    } finally {
      setRefundOrderId(null);
    }
  }

  async function confirmDelete() {
    if (!deleteOrderId) return;
    try {
      const response = await fetch(`/api/orders/${deleteOrderId}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete order");
      
      ordersQuery.mutate();
    } catch (error) {
      console.error(error);
      alert("Failed to delete order");
    } finally {
      setDeleteOrderId(null);
    }
  }



  const resetForm = () => {
    setMlbbId("");
    setServerId("");
    setIgn("");
    setSkinName("");
    setDiamondPrice("0");
    setSelectedSupplierId("");
    setReleaseDate("");
    setNotes("");
    setErrorMessage(null);
  };

  const handleAssignOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplierId) {
      setErrorMessage("Please select a supplier");
      return;
    }
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mlbbId,
          serverId,
          ign,
          skinName,
          diamondPrice: Number(diamondPrice),
          supplierId: selectedSupplierId,
          status: "PENDING",
          releaseDate: releaseDate || undefined,
          notes,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to create order");
      }

      resetForm();
      ordersQuery.mutate();
    } catch (error: any) {
      setErrorMessage(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    if (!mlbbId || !serverId) return;
    setIsVerifying(true);
    setErrorMessage(null);
    try {
      const response = await fetch("/api/verify-mlbb", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mlbbId, serverId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Verification failed");
      setIgn(data.ign);
    } catch (error: any) {
      setErrorMessage(error.message);
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Assign New Order Card */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Assign New Order</CardTitle>
          <CardDescription>Create a new order assignment for a supplier.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAssignOrder} className="space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1">
                <Label htmlFor="mlbbId">MLBB ID</Label>
                <div className="flex gap-2">
                  <Input
                    id="mlbbId"
                    value={mlbbId}
                    onChange={(e) => setMlbbId(e.target.value)}
                    required
                    className="h-9"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="serverId">Server ID</Label>
                <div className="flex gap-2">
                  <Input
                    id="serverId"
                    value={serverId}
                    onChange={(e) => setServerId(e.target.value)}
                    required
                    className="h-9"
                  />
                  <Button 
                    type="button" 
                    variant="secondary" 
                    className="h-9 px-3"
                    onClick={handleVerify}
                    disabled={isVerifying || !mlbbId || !serverId}
                    title="Check IGN"
                  >
                    {isVerifying ? (
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="ign">IGN</Label>
                <Input
                  id="ign"
                  value={ign}
                  onChange={(e) => setIgn(e.target.value)}
                  required
                  className="h-9"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="skinName">Skin Name</Label>
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
              <div className="space-y-1 sm:col-span-2 lg:col-span-1">
                <Label htmlFor="supplier">Supplier</Label>
                <Select value={selectedSupplierId} onChange={(e) => setSelectedSupplierId(e.target.value)} required className="h-9">
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
              <div className="space-y-1 sm:col-span-2 lg:col-span-1">
                <Label htmlFor="releaseDate">Release Date</Label>
                <Input
                  id="releaseDate"
                  type="date"
                  value={releaseDate}
                  onChange={(e) => setReleaseDate(e.target.value)}
                  className="h-9"
                />
              </div>
              <div className="space-y-1 sm:col-span-2 lg:col-span-2">
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Input
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="h-9"
                />
              </div>
            </div>

            {errorMessage && <p className="text-sm text-destructive">{errorMessage}</p>}

            <div className="flex justify-end">
              <Button type="submit" disabled={isSubmitting} className="h-9">
                {isSubmitting && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
                Assign Order
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Orders List */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Order Management</CardTitle>
              <CardDescription>View and manage assigned orders.</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Input
                placeholder="Search orders..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 w-50 lg:w-75"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex flex-wrap gap-2">
            <Select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="h-9 w-37.5">
              <option value="ALL">All Status</option>
              {ORDER_STATUS_OPTIONS.filter((o) => o.value !== "REFUNDED").map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
            <Select value={supplierFilter} onChange={(event) => setSupplierFilter(event.target.value)} className="h-9 w-37.5">
              <option value="ALL">All suppliers</option>
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </option>
              ))}
            </Select>
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
              <option value="status:asc">Status (A-Z)</option>
              <option value="status:desc">Status (Z-A)</option>
            </Select>
            <Button variant="outline" size="sm" onClick={() => Promise.all([ordersQuery.mutate(), supplierQuery.mutate()])} className="h-9">
              <RefreshCcw className="mr-2 h-3.5 w-3.5" />
              Refresh
            </Button>
          </div>

          {ordersQuery.isLoading ? (
            <div className="flex h-36 items-center justify-center text-muted-foreground">
              <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
              Loading orders...
            </div>
          ) : (
            <>
              {/* Mobile View: Card List */}
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
                      <Badge
                        variant={
                          order.status === "PENDING"
                            ? "secondary"
                            : order.status === "FOLLOWED"
                              ? "warning"
                              : order.status === "READY_FOR_GIFTING" || order.status === "COMPLETED"
                                ? "success"
                                : "danger"
                        }
                        className="text-[10px]"
                      >
                        {ORDER_STATUS_OPTIONS.find((o) => o.value === order.status)?.label ?? order.status}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-y-2 gap-x-3 text-xs">
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Server</p>
                        <p className="font-medium text-foreground">{order.serverId}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Price</p>
                        <p className="font-medium text-foreground">{order.diamondPrice.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Supplier</p>
                        <p className="font-medium text-foreground">{order.supplier.name}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Ready In</p>
                        <p className="font-medium text-foreground">
                           {order.status === "COMPLETED" ? (
                            <span className="text-muted-foreground">-</span>
                          ) : order.readyForGifting ? (
                            <span className="text-success">Ready</span>
                          ) : order.status === "FOLLOWED" ? (
                            <div className="flex flex-col gap-1 w-full max-w-25">
                              <span className="text-xs font-medium" suppressHydrationWarning>
                                {order.followedAt ? `${getDaysLeft(order.followedAt)} days` : "Pending"}
                              </span>
                              {order.followedAt && (
                                <Progress value={getProgressPercentage(order.followedAt)} className="h-1" />
                              )}
                            </div>
                          ) : (
                            "-"
                          )}
                        </p>
                      </div>
                      {order.releaseDate && (
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Release Date</p>
                          <p className="font-medium text-foreground" suppressHydrationWarning>{formatDateOnly(order.releaseDate)}</p>
                        </div>
                      )}
                      <div className="col-span-2 flex justify-between items-center">
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Date</p>
                          <p className="font-medium text-foreground" suppressHydrationWarning>{formatDate(order.createdAt)}</p>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-6 px-2 text-xs text-danger hover:bg-danger/10 hover:text-danger"
                            onClick={() => handleRefund(order.id)}
                          >
                            Refund
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-6 px-2 text-xs text-red-500 hover:bg-red-50 hover:text-red-600"
                            onClick={() => setDeleteOrderId(order.id)}
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop View: Table */}
              <div className="hidden md:block">
                <Table className="min-w-250">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Skin</TableHead>
                      <TableHead>MLBB ID</TableHead>
                      <TableHead>Server</TableHead>
                      <TableHead>IGN</TableHead>
                      <TableHead>Supplier</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Ready / Followed</TableHead>
                      <TableHead>Release Date</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="w-20">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-semibold">{order.skinName}</TableCell>
                        <TableCell>{order.mlbbId}</TableCell>
                        <TableCell>{order.serverId}</TableCell>
                        <TableCell>{order.ign}</TableCell>
                        <TableCell>{order.supplier.name}</TableCell>
                        <TableCell>{order.diamondPrice.toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              order.status === "PENDING"
                                ? "secondary"
                                : order.status === "FOLLOWED"
                                  ? "warning"
                                  : order.status === "READY_FOR_GIFTING" || order.status === "COMPLETED"
                                    ? "success"
                                    : "danger"
                            }
                          >
                            {ORDER_STATUS_OPTIONS.find((o) => o.value === order.status)?.label ?? order.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {order.status === "COMPLETED" ? (
                            <Badge variant="success">Done</Badge>
                          ) : order.readyForGifting ? (
                            <Badge variant="success">Ready</Badge>
                          ) : order.status === "FOLLOWED" ? (
                            <div className="flex flex-col gap-1 w-32">
                              <Badge variant="warning" className="w-fit">
                                <span suppressHydrationWarning>
                                  {order.followedAt ? `${getDaysLeft(order.followedAt)} days left` : "Pending..."}
                                </span>
                              </Badge>
                              {order.followedAt && (
                                <Progress value={getProgressPercentage(order.followedAt)} className="h-1.5" />
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </TableCell>
                        <TableCell suppressHydrationWarning>{order.releaseDate ? formatDateOnly(order.releaseDate) : "-"}</TableCell>
                        <TableCell suppressHydrationWarning>{formatDate(order.createdAt)}</TableCell>
                        <TableCell className="flex items-center gap-1">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 w-8 p-0 text-red-500 hover:bg-red-50 hover:text-red-600"
                            onClick={() => handleRefund(order.id)}
                            title="Refund Order"
                          >
                            <RefreshCcw className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 w-8 p-0 text-red-500 hover:bg-red-50 hover:text-red-600"
                            onClick={() => setDeleteOrderId(order.id)}
                            title="Delete Order"
                          >
                            <Trash2 className="h-4 w-4" />
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

      <Dialog open={!!refundOrderId} onOpenChange={(open) => !open && setRefundOrderId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Refund</DialogTitle>
            <DialogDescription>
              Are you sure you want to mark this order as REFUNDED? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRefundOrderId(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmRefund}>
              Confirm Refund
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={!!deleteOrderId} onOpenChange={(open) => !open && setDeleteOrderId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Delete</DialogTitle>
            <DialogDescription>
              Are you sure you want to DELETE this order? This action cannot be undone.
              {ORDER_STATUS_OPTIONS.find(o => o.value === orders.find(ord => ord.id === deleteOrderId)?.status)?.label === "Completed" && 
                " Note: This order was completed. The supplier balance will be refunded."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOrderId(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Confirm Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
