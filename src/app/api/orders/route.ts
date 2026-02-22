import { OrderStatus, Prisma, Role } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { appendOrderToSheet } from "@/lib/google-sheets";
import { formatOrderStatus } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { createOrderSchema } from "@/lib/validators";
import { getAuthSession } from "@/lib/auth";
import { checkAndMarkReadyOrders } from "@/lib/orders";

export async function GET(request: NextRequest) {
  const session = await getAuthSession();
  if (!session?.user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  // Check and update orders that are ready for gifting
  await checkAndMarkReadyOrders();

  const { role, id: userId } = session.user;
  const searchParams = request.nextUrl.searchParams;

  const statusParam = searchParams.get("status");
  const excludeStatusParam = searchParams.get("excludeStatus");
  const supplierIdParam = searchParams.get("supplierId");
  const searchQuery = searchParams.get("search");
  const limitParam = Number(searchParams.get("limit") ?? "200");
  const limit = Number.isNaN(limitParam) ? 200 : Math.min(Math.max(limitParam, 1), 500);

  const sortParam = searchParams.get("sort") ?? "createdAt";
  const orderParam = searchParams.get("order") ?? "desc";

  const orderBy: Prisma.OrderOrderByWithRelationInput = {};

  if (sortParam === "supplier") {
    orderBy.supplier = {
      name: orderParam === "asc" ? "asc" : "desc",
    };
  } else {
    // Basic fields
    orderBy[sortParam as keyof Prisma.OrderOrderByWithRelationInput] = orderParam === "asc" ? "asc" : "desc";
  }

  const where: Prisma.OrderWhereInput = {};

  if (statusParam && Object.values(OrderStatus).includes(statusParam as OrderStatus)) {
    where.status = statusParam as OrderStatus;
  } else if (excludeStatusParam && Object.values(OrderStatus).includes(excludeStatusParam as OrderStatus)) {
    where.status = {
      not: excludeStatusParam as OrderStatus,
    };
  }

  if (searchQuery) {
    where.OR = [
      { mlbbId: { contains: searchQuery, mode: "insensitive" } },
      { ign: { contains: searchQuery, mode: "insensitive" } },
      { skinName: { contains: searchQuery, mode: "insensitive" } },
      { serverId: { contains: searchQuery, mode: "insensitive" } },
    ];
  }

  if (role === Role.SUPPLIER) {
    const supplier = await prisma.supplier.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!supplier) {
      return NextResponse.json({ orders: [] });
    }

    where.supplierId = supplier.id;
  } else if (supplierIdParam) {
    where.supplierId = supplierIdParam;
  }

  const orders = await prisma.order.findMany({
    where,
    include: {
      supplier: {
        select: {
          id: true,
          name: true,
          diamondBalance: true,
          lowBalanceThreshold: true,
        },
      },
      assignedBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy,
    take: limit,
  });

  return NextResponse.json({ orders });
}

export async function POST(request: NextRequest) {
  const session = await getAuthSession();
  if (!session?.user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== Role.ADMIN) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const payload = await request.json();
  const parsed = createOrderSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      {
        message: "Invalid payload",
        issues: parsed.error.issues,
      },
      { status: 400 },
    );
  }

  const supplier = await prisma.supplier.findUnique({
    where: { id: parsed.data.supplierId },
    select: {
      id: true,
      name: true,
      diamondBalance: true,
      lowBalanceThreshold: true,
      googleSheetId: true,
      googleSyncEnabled: true,
    },
  });

  if (!supplier) {
    return NextResponse.json({ message: "Supplier not found" }, { status: 404 });
  }

  try {
    const createdOrder = await prisma.$transaction(async (tx) => {
      const now = new Date();
      const shouldComplete = parsed.data.status === OrderStatus.COMPLETED;
      const shouldDeduct = parsed.data.status !== OrderStatus.REFUNDED && parsed.data.status !== OrderStatus.FAILED;

      const order = await tx.order.create({
        data: {
          mlbbId: parsed.data.mlbbId,
          serverId: parsed.data.serverId,
          ign: parsed.data.ign,
          skinName: parsed.data.skinName,
          diamondPrice: parsed.data.diamondPrice,
          supplierId: parsed.data.supplierId,
          assignedById: session.user.id,
          status: parsed.data.status,
          readyForGifting: parsed.data.status === OrderStatus.READY_FOR_GIFTING || shouldComplete,
          notes: parsed.data.notes,
          releaseDate: parsed.data.releaseDate,
          completedAt: shouldComplete ? now : null,
          balanceDeductedAt: shouldDeduct ? now : null,
        },
        include: {
          supplier: true,
          assignedBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      if (shouldDeduct) {
        await tx.supplier.update({
          where: { id: parsed.data.supplierId },
          data: {
            diamondBalance: {
              decrement: parsed.data.diamondPrice,
            },
          },
        });

        await tx.balanceLog.create({
          data: {
            supplierId: parsed.data.supplierId,
            changeAmount: -parsed.data.diamondPrice,
            reason: `Order assigned: ${parsed.data.skinName}`,
            orderId: order.id,
          },
        });
      }

      // Sync with Google Sheets if enabled
      if (supplier.googleSyncEnabled && supplier.googleSheetId) {
        // We do this asynchronously and don't await it to not block the response
        // But for transaction safety, maybe we should await it or queue it.
        // For simplicity, we'll fire and forget inside the transaction but catch errors inside the function so it doesn't rollback the transaction if sheet fails.
        // Wait, if we are inside a transaction, we should probably do this AFTER the transaction commits.
        // But Prisma doesn't have post-commit hooks easily.
        // So we'll do it after the transaction block.
      }

      return order;
    });

    // After transaction success, sync with Google Sheets
    if (supplier.googleSyncEnabled && supplier.googleSheetId) {
      appendOrderToSheet(supplier.googleSheetId, {
        orderId: createdOrder.id,
        mlbbId: createdOrder.mlbbId,
        serverId: createdOrder.serverId,
        ign: createdOrder.ign,
        skinName: createdOrder.skinName,
        diamondPrice: createdOrder.diamondPrice,
        status: createdOrder.status,
        createdAt: createdOrder.createdAt,
      }).catch((err) => console.error("Failed to sync with Google Sheet", err));
    }

    return NextResponse.json({ order: createdOrder }, { status: 201 });
  } catch (error) {
    console.error("Failed to create order:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
