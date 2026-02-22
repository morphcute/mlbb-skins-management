"use client";

import { AlertTriangle, CheckCircle2, CircleDollarSign, LoaderCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useLiveQuery } from "@/hooks/use-live-query";
import { HEALTH_STATE, getBalanceHealthState } from "@/lib/constants";
import { formatDate } from "@/lib/utils";

type DashboardSupplier = {
  id: string;
  name: string;
  diamondBalance: number;
  lowBalanceThreshold: number;
  user: {
    email: string;
  };
};

type DashboardOrder = {
  id: string;
  mlbbId: string;
  ign: string;
  skinName: string;
  diamondPrice: number;
  status: string;
  createdAt: string;
  supplier: {
    name: string;
  };
};

type SupplierApiResponse = {
  suppliers: DashboardSupplier[];
};

type OrdersApiResponse = {
  orders: DashboardOrder[];
};

function healthBadgeVariant(balance: number, threshold: number) {
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

export function AdminDashboardClient() {
  const suppliersQuery = useLiveQuery<SupplierApiResponse>("/api/suppliers", 5000);
  const ordersQuery = useLiveQuery<OrdersApiResponse>("/api/orders?limit=10", 5000);
  const statsQuery = useLiveQuery<{ totalOrders: number; pendingOrders: number; readyOrders: number }>("/api/admin/stats", 5000);

  if (suppliersQuery.isLoading || ordersQuery.isLoading || statsQuery.isLoading) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        <LoaderCircle className="mr-2 h-5 w-5 animate-spin" />
        Loading dashboard...
      </div>
    );
  }

  if (suppliersQuery.error || ordersQuery.error || statsQuery.error) {
    return <p className="text-sm text-destructive">Failed to load dashboard data.</p>;
  }

  const suppliers = suppliersQuery.data?.suppliers ?? [];
  const orders = ordersQuery.data?.orders ?? [];
  const totalOrders = statsQuery.data?.totalOrders ?? 0;
  const pendingOrders = statsQuery.data?.pendingOrders ?? 0;
  const readyOrders = statsQuery.data?.readyOrders ?? 0;

  return (
    <div className="space-y-4">
      <div className="stagger-grid grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Suppliers</CardDescription>
            <CardTitle className="text-2xl">{suppliers.length}</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-2 text-xs text-muted-foreground">
            <CircleDollarSign className="h-4 w-4 text-success" />
            Active supplier accounts
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Orders</CardDescription>
            <CardTitle className="text-2xl">{totalOrders}</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-2 text-xs text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 text-success" />
            All time orders
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Ready for Gifting</CardDescription>
            <CardTitle className="text-2xl text-success">{readyOrders}</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-2 text-xs text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 text-success" />
            Orders ready to be gifted
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Pending Orders</CardDescription>
            <CardTitle className="text-2xl text-warning">{pendingOrders}</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-2 text-xs text-muted-foreground">
            <AlertTriangle className="h-4 w-4 text-warning" />
            Awaiting processing
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Supplier Balances</CardTitle>
          <CardDescription>Green = healthy, yellow = low, red = critical.</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Mobile View: Card List */}
          <div className="space-y-3 md:hidden">
            {suppliers.map((supplier) => (
              <div key={supplier.id} className="rounded-xl border border-glass-border bg-card p-3 shadow-sm">
                <div className="mb-2 flex items-center justify-between">
                  <p className="font-semibold text-foreground">{supplier.name}</p>
                  <Badge variant={healthBadgeVariant(supplier.diamondBalance, supplier.lowBalanceThreshold)}>
                    {healthLabel(supplier.diamondBalance, supplier.lowBalanceThreshold)}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mb-2">{supplier.user.email}</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Balance</p>
                    <p className="font-medium text-foreground">{supplier.diamondBalance.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Threshold</p>
                    <p className="font-medium text-foreground">{supplier.lowBalanceThreshold.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop View: Table */}
          <div className="hidden md:block">
            <Table className="min-w-175">
              <TableHeader>
                <TableRow>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Balance</TableHead>
                  <TableHead>Threshold</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {suppliers.map((supplier) => (
                  <TableRow key={supplier.id}>
                    <TableCell className="font-semibold">{supplier.name}</TableCell>
                    <TableCell>{supplier.user.email}</TableCell>
                    <TableCell>{supplier.diamondBalance.toLocaleString()}</TableCell>
                    <TableCell>{supplier.lowBalanceThreshold.toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge variant={healthBadgeVariant(supplier.diamondBalance, supplier.lowBalanceThreshold)}>
                        {healthLabel(supplier.diamondBalance, supplier.lowBalanceThreshold)}
                      </Badge>
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
          <CardTitle>Recent Orders</CardTitle>
          <CardDescription>Latest assigned orders across all suppliers.</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Mobile View: Card List */}
          <div className="space-y-4 md:hidden">
            {orders.map((order) => (
              <div key={order.id} className="rounded-xl border border-glass-border bg-card p-4 shadow-sm">
                <div className="mb-2 flex items-start justify-between">
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
                <div className="grid grid-cols-2 gap-y-2 text-sm">
                   <div>
                     <p className="text-xs uppercase tracking-wider text-muted-foreground">Supplier</p>
                     <p className="font-medium text-foreground">{order.supplier.name}</p>
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
            <Table className="min-w-245">
              <TableHeader>
                <TableRow>
                  <TableHead>Skin</TableHead>
                  <TableHead>MLBB ID</TableHead>
                  <TableHead>IGN</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
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
                    <TableCell>
                      <Badge variant={order.status === "REFUNDED" ? "danger" : "secondary"}>
                        {order.status.replaceAll("_", " ")}
                      </Badge>
                    </TableCell>
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
