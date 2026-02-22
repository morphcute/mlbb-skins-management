import { OrderStatus, Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

type UpdateOrderParams = {
  orderId: string;
  status?: OrderStatus;
  supplierId?: string;
  readyForGifting?: boolean;
  notes?: string;
  releaseDate?: Date;
};

export async function updateOrderWithBalanceEffects(params: UpdateOrderParams) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: params.orderId },
      include: {
        supplier: true,
      },
    });

    if (!order) {
      throw new Error("Order not found");
    }

    const nextStatus = params.status ?? order.status;
    const targetSupplierId = params.supplierId ?? order.supplierId;
    const isSupplierChanging = params.supplierId && params.supplierId !== order.supplierId;

    const nextReadyFlag =
      typeof params.readyForGifting === "boolean"
        ? params.readyForGifting
        : nextStatus === OrderStatus.READY_FOR_GIFTING
          ? true
          : order.readyForGifting;

    const updateData: Prisma.OrderUpdateInput = {
      status: nextStatus,
      supplier: isSupplierChanging ? { connect: { id: targetSupplierId } } : undefined,
      readyForGifting: nextReadyFlag,
      notes: params.notes ?? order.notes,
      releaseDate: params.releaseDate,
    };

    const now = new Date();
    const shouldDeduct =
      nextStatus !== OrderStatus.REFUNDED &&
      nextStatus !== OrderStatus.FAILED &&
      !order.balanceDeductedAt;
    const shouldRefund =
      (nextStatus === OrderStatus.REFUNDED || nextStatus === OrderStatus.FAILED) &&
      order.balanceDeductedAt;

    if (nextStatus === OrderStatus.FOLLOWED && !order.followedAt) {
      updateData.followedAt = now;
    }

    if (nextStatus === OrderStatus.COMPLETED && !order.completedAt) {
      updateData.completedAt = now;
    }

    if (shouldDeduct) {
      updateData.balanceDeductedAt = now;
    }

    if (shouldRefund) {
      updateData.balanceDeductedAt = null;
    }

    await tx.order.update({
      where: { id: order.id },
      data: updateData,
      include: {
        supplier: true,
      },
    });

    // Case 1: Deducting from New Supplier (or Current if not changing)
    if (shouldDeduct) {
      await tx.supplier.update({
        where: { id: targetSupplierId },
        data: {
          diamondBalance: {
            decrement: order.diamondPrice,
          },
        },
      });

      await tx.balanceLog.create({
        data: {
          supplierId: targetSupplierId,
          changeAmount: -order.diamondPrice,
          reason: `Order assigned: ${order.skinName}`,
          orderId: order.id,
        },
      });
    }

    // Case 2: Refunding Old Supplier
    if (shouldRefund) {
      await tx.supplier.update({
        where: { id: order.supplierId },
        data: {
          diamondBalance: {
            increment: order.diamondPrice,
          },
        },
      });

      await tx.balanceLog.create({
        data: {
          supplierId: order.supplierId,
          changeAmount: order.diamondPrice,
          reason: `Order refunded: ${order.skinName}`,
          orderId: order.id,
        },
      });
    }

    // Case 3: Transferring Balance (Already Deducted, Supplier Changed, Not Refunding)
    if (isSupplierChanging && order.balanceDeductedAt && !shouldRefund) {
      // Refund Old
      await tx.supplier.update({
        where: { id: order.supplierId },
        data: {
          diamondBalance: {
            increment: order.diamondPrice,
          },
        },
      });

      await tx.balanceLog.create({
        data: {
          supplierId: order.supplierId,
          changeAmount: order.diamondPrice,
          reason: `Order reassigned (out): ${order.skinName}`,
          orderId: order.id,
        },
      });

      // Deduct New
      await tx.supplier.update({
        where: { id: targetSupplierId },
        data: {
          diamondBalance: {
            decrement: order.diamondPrice,
          },
        },
      });

      await tx.balanceLog.create({
        data: {
          supplierId: targetSupplierId,
          changeAmount: -order.diamondPrice,
          reason: `Order reassigned (in): ${order.skinName}`,
          orderId: order.id,
        },
      });
    }

    const refreshedOrder = await tx.order.findUnique({
      where: { id: order.id },
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

    if (!refreshedOrder) {
      throw new Error("Order not found after update");
    }

    return refreshedOrder;
  });
}

export async function checkAndMarkReadyOrders() {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  // Find orders that are FOLLOWED and followedAt is older than 7 days
  const result = await prisma.order.updateMany({
    where: {
      status: OrderStatus.FOLLOWED,
      followedAt: {
        lte: sevenDaysAgo,
      },
    },
    data: {
      status: OrderStatus.READY_FOR_GIFTING,
      readyForGifting: true,
    },
  });

  return result.count;
}
