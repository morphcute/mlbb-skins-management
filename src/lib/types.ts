import { OrderStatus, Role } from "@prisma/client";

export type SessionUser = {
  id: string;
  name: string | null;
  email: string | null;
  role: Role;
};

export type SupplierWithUser = {
  id: string;
  userId: string;
  name: string;
  diamondBalance: number;
  lowBalanceThreshold: number;
  googleSheetId: string | null;
  googleSyncEnabled: boolean;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: Role;
  };
};

export type OrderRecord = {
  id: string;
  mlbbId: string;
  serverId: string;
  ign: string;
  skinName: string;
  diamondPrice: number;
  supplierId: string;
  status: OrderStatus;
  readyForGifting: boolean;
  assignedById: string;
  completedAt: string | null;
  followedAt: string | null;
  createdAt: string;
  updatedAt: string;
  googleSheetRowNumber: number | null;
  notes: string | null;
  supplier: {
    id: string;
    name: string;
    diamondBalance: number;
    lowBalanceThreshold: number;
  };
  assignedBy: {
    id: string;
    name: string;
    email: string;
  };
};

export type BalanceLogRecord = {
  id: string;
  supplierId: string;
  changeAmount: number;
  reason: string;
  orderId: string | null;
  createdAt: string;
};
