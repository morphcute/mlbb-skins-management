import { OrderStatus, Role } from "@prisma/client";
import { z } from "zod";
import { ORDER_STATUS_VALUES } from "./constants";

export const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(6),
});

export const createOrderSchema = z.object({
  mlbbId: z.string().min(2),
  serverId: z.string().min(1),
  ign: z.string().min(1),
  skinName: z.string().min(1),
  diamondPrice: z.coerce.number().int().positive(),
  supplierId: z.string().min(1),
  status: z.enum(ORDER_STATUS_VALUES).default("PENDING"),
  notes: z.string().optional(),
  releaseDate: z.coerce.date().optional(),
});

export const updateOrderSchema = z.object({
  status: z.enum(ORDER_STATUS_VALUES).optional(),
  supplierId: z.string().optional(),
  readyForGifting: z.boolean().optional(),
  notes: z.string().optional(),
  releaseDate: z.coerce.date().optional(),
});

export const createSupplierSchema = z.object({
  name: z.string().min(2),
  email: z.email(),
  password: z.string().min(6),
  role: z.nativeEnum(Role).default(Role.SUPPLIER),
  diamondBalance: z.coerce.number().int().nonnegative().default(0),
  lowBalanceThreshold: z.coerce.number().int().nonnegative().default(1000),
});

export const updateSupplierSchema = z.object({
  name: z.string().min(2).optional(),
  lowBalanceThreshold: z.coerce.number().int().nonnegative().optional(),
});

export const updateBalanceSchema = z.object({
  changeAmount: z.coerce.number().int().optional(),
  newBalance: z.coerce.number().int().nonnegative().optional(),
  reason: z.string().min(2),
}).refine(data => data.changeAmount !== undefined || data.newBalance !== undefined, {
  message: "Either changeAmount or newBalance must be provided",
});
