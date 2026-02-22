"use client";

import { useState } from "react";
import { CheckCircle2, LoaderCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select } from "@/components/ui/select";
import { useLiveQuery } from "@/hooks/use-live-query";
import { formatDate, formatDateOnly } from "@/lib/utils";

type SupplierResponse = {
  suppliers: Array<{
    id: string;
    name: string;
    diamondBalance: number;
    lowBalanceThreshold: number;
  }>;
};

type SupplierOrder = {
  id: string;
  mlbbId: string;
  serverId: string;
  ign: string;
  skinName: string;
  diamondPrice: number;
  status: string;
  readyForGifting: boolean;
  createdAt: string;
  followedAt: string | null;
  releaseDate: string | null;
  notes: string | null;
};

type OrdersResponse = {
  orders: SupplierOrder[];
};

export function getDaysLeft(followedAtStr: string) {
  const followedAt = new Date(followedAtStr);
  const targetDate = new Date(followedAt.getTime() + 7 * 24 * 60 * 60 * 1000);
  const now = new Date();
  const diffTime = targetDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}

export function SupplierDashboardClient() {
  const [newBalance, setNewBalance] = useState("");
  const [isUpdatingBalance, setIsUpdatingBalance] = useState(false);
  const [sort, setSort] = useState("createdAt");
  const [order, setOrder] = useState("desc");

  const supplierQuery = useLiveQuery<SupplierResponse>("/api/suppliers", 4000);
  const ordersQuery = useLiveQuery<OrdersResponse>(`/api/orders?limit=300&sort=${sort}&order=${order}`, 4000);

  if (supplierQuery.isLoading || ordersQuery.isLoading) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        <LoaderCircle className="mr-2 h-5 w-5 animate-spin" />
        Loading supplier dashboard...
      </div>
    );
  }

  if (supplierQuery.error || ordersQuery.error) {
    return <p className="text-sm text-destructive">Failed to load supplier dashboard.</p>;
  }

  const supplier = supplierQuery.data?.suppliers[0];
  const orders = ordersQuery.data?.orders ?? [];

  const activeOrders = orders.filter((order) => order.status !== "COMPLETED" && order.status !== "FAILED");
  const historyOrders = orders.filter((order) => order.status === "COMPLETED" || order.status === "FAILED");

  const handleUpdateBalance = async () => {
    if (!supplier || !newBalance) return;

    const val = parseInt(newBalance, 10);
    if (isNaN(val) || val < 0) return;

    setIsUpdatingBalance(true);
    try {
      const res = await fetch(`/api/suppliers/${supplier.id}/balance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newBalance: val, reason: "Manual update by supplier" }),
      });

      if (res.ok) {
        await supplierQuery.mutate();
        setNewBalance("");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsUpdatingBalance(false);
    }
  };

  const updateOrder = async (orderId: string, payload: Record<string, unknown>) => {
    const response = await fetch(`/api/orders/${orderId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      return;
    }

    await Promise.all([ordersQuery.mutate(), supplierQuery.mutate()]);
  };

  return (
    <div className="space-y-6">
      <div className="stagger-grid grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Current Balance</CardDescription>
            <CardTitle className="text-3xl">{supplier?.diamondBalance.toLocaleString() ?? 0}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4 text-sm text-muted-foreground">Diamonds available for gifting orders</div>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                placeholder={supplier?.diamondBalance.toString()}
                value={newBalance}
                onChange={(e) => setNewBalance(e.target.value)}
                className="h-8 w-24 text-sm"
              />
              <Button size="sm" onClick={handleUpdateBalance} disabled={isUpdatingBalance || !newBalance}>
                {isUpdatingBalance ? <LoaderCircle className="h-4 w-4 animate-spin" /> : "Update"}
              </Button>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Low Balance Threshold</CardDescription>
            <CardTitle className="text-3xl">{supplier?.lowBalanceThreshold.toLocaleString() ?? 0}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">Ask admin to update threshold in supplier settings</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active Orders</CardDescription>
            <CardTitle className="text-3xl">{activeOrders.length}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">Pending or ready accounts to process</CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Assigned Orders</CardTitle>
              <CardDescription>Mark account ready and complete once gifting is done.</CardDescription>
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
              <option value="skinName:asc">Skin Name (A-Z)</option>
              <option value="skinName:desc">Skin Name (Z-A)</option>
              <option value="diamondPrice:asc">Price (Low-High)</option>
              <option value="diamondPrice:desc">Price (High-Low)</option>
              <option value="status:asc">Status (A-Z)</option>
              <option value="status:desc">Status (Z-A)</option>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {/* Mobile View: Card List */}
          <div className="space-y-4 md:hidden">
            {activeOrders.map((order) => (
              <div key={order.id} className="rounded-xl border border-glass-border bg-card p-4 shadow-sm">
                <div className="mb-3 flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-foreground">{order.skinName}</p>
                    <p className="text-sm text-muted-foreground">
                      {order.ign} <span className="text-xs">({order.mlbbId})</span>
                    </p>
                  </div>
                  <Badge variant={order.status === "REFUNDED" ? "danger" : "secondary"}>
                    {order.status.replaceAll("_", " ")}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-sm mb-4">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">Server</p>
                    <p className="font-medium text-foreground">{order.serverId}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">Price</p>
                    <p className="font-medium text-foreground">{order.diamondPrice.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">Ready Status</p>
                    <p className="font-medium text-foreground">
                      {order.readyForGifting ? <span className="text-success">Ready</span> : "Pending"}
                    </p>
                  </div>
                  {order.releaseDate && (
                    <div>
                      <p className="text-xs uppercase tracking-wider text-muted-foreground">Release Date</p>
                      <p className="font-medium text-foreground" suppressHydrationWarning>{formatDateOnly(order.releaseDate)}</p>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-2 border-t border-glass-border pt-3">
                    {order.status === "PENDING" && (
                      <Button
                        size="sm"
                        variant="secondary"
                        className="w-full sm:w-auto"
                        onClick={() => updateOrder(order.id, { status: "FOLLOWED" })}
                      >
                        Follow
                      </Button>
                    )}
                    
                    {order.status === "FOLLOWED" && (
                      <Button size="sm" variant="ghost" disabled className="w-full sm:w-auto text-muted-foreground">
                        <span suppressHydrationWarning>
                          {order.followedAt ? `${getDaysLeft(order.followedAt)} days left` : "Counting..."}
                        </span>
                      </Button>
                    )}

                    {(order.status === "READY_FOR_GIFTING" || order.readyForGifting) && (
                       <Button
                         size="sm"
                         className="w-full sm:w-auto"
                         onClick={() =>
                           updateOrder(order.id, {
                             status: "COMPLETED",
                           })
                         }
                       >
                         Sent (Complete)
                       </Button>
                    )}
                    
                    {order.status !== "PENDING" && order.status !== "FOLLOWED" && order.status !== "READY_FOR_GIFTING" && order.status !== "REFUNDED" && !order.readyForGifting && (
                       <Button
                         size="sm"
                         variant="outline"
                         className="w-full sm:w-auto"
                         onClick={() => updateOrder(order.id, { status: "COMPLETED" })}
                       >
                         Complete
                       </Button>
                    )}
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
                  <TableHead>Price</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Release Date</TableHead>
                  <TableHead>Ready</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-semibold">{order.skinName}</TableCell>
                    <TableCell>{order.mlbbId}</TableCell>
                    <TableCell>{order.serverId}</TableCell>
                    <TableCell>{order.ign}</TableCell>
                    <TableCell>{order.diamondPrice.toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge variant={order.status === "REFUNDED" ? "danger" : "secondary"}>
                        {order.status.replaceAll("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell suppressHydrationWarning>{order.releaseDate ? formatDateOnly(order.releaseDate) : "-"}</TableCell>
                    <TableCell>
                      {order.readyForGifting ? <Badge variant="success">Ready</Badge> : <Badge variant="warning">Pending</Badge>}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        {order.status === "PENDING" && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => updateOrder(order.id, { status: "FOLLOWED" })}
                          >
                            Follow
                          </Button>
                        )}
                        
                        {order.status === "FOLLOWED" && (
                          <Button size="sm" variant="ghost" disabled className="text-muted-foreground">
                            <span suppressHydrationWarning>
                              {order.followedAt ? `${getDaysLeft(order.followedAt)} days left` : "Counting..."}
                            </span>
                          </Button>
                        )}

                        {(order.status === "READY_FOR_GIFTING" || order.readyForGifting) && (
                           <Button
                             size="sm"
                             onClick={() =>
                               updateOrder(order.id, {
                                 status: "COMPLETED",
                               })
                             }
                           >
                             Sent (Complete)
                           </Button>
                        )}
                        
                        {order.status !== "PENDING" && order.status !== "FOLLOWED" && order.status !== "READY_FOR_GIFTING" && order.status !== "REFUNDED" && !order.readyForGifting && (
                           <Button
                             size="sm"
                             variant="outline"
                             onClick={() => updateOrder(order.id, { status: "COMPLETED" })}
                           >
                             Complete
                           </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Order History</CardTitle>
          <CardDescription>Completed and failed orders.</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Mobile View: Card List */}
          <div className="space-y-4 md:hidden">
             {historyOrders.map((order) => (
              <div key={order.id} className="rounded-xl border border-glass-border bg-card p-4 shadow-sm">
                <div className="mb-2 flex items-start justify-between">
                  <p className="font-semibold text-foreground">{order.skinName}</p>
                  <Badge variant={order.status === "COMPLETED" ? "success" : "danger"}>
                    {order.status.replaceAll("_", " ")}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-y-2 text-sm">
                   <div>
                     <p className="text-xs uppercase tracking-wider text-muted-foreground">MLBB ID</p>
                     <p className="font-medium text-foreground">{order.mlbbId}</p>
                   </div>
                   <div>
                     <p className="text-xs uppercase tracking-wider text-muted-foreground">Price</p>
                     <p className="font-medium text-foreground">{order.diamondPrice.toLocaleString()}</p>
                   </div>
                   <div className="col-span-2">
                     <p className="text-xs uppercase tracking-wider text-muted-foreground">Date</p>
                     <p className="font-medium text-foreground" suppressHydrationWarning>{formatDate(order.createdAt)}</p>
                   </div>
                </div>
              </div>
             ))}
          </div>

          {/* Desktop View: Table */}
          <div className="hidden md:block">
            <Table className="min-w-200">
              <TableHeader>
                <TableRow>
                  <TableHead>Skin</TableHead>
                  <TableHead>MLBB ID</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {historyOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-semibold">{order.skinName}</TableCell>
                    <TableCell>{order.mlbbId}</TableCell>
                    <TableCell>
                      <Badge variant={order.status === "COMPLETED" ? "success" : "danger"}>
                        {order.status.replaceAll("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell>{order.diamondPrice.toLocaleString()}</TableCell>
                    <TableCell suppressHydrationWarning>{formatDate(order.createdAt)}</TableCell>
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
