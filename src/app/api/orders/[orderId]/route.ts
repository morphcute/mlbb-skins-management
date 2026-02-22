import { OrderStatus, Role } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { getAuthSession } from "@/lib/auth";
import { formatOrderStatus } from "@/lib/constants";
import { updateOrderInSheet } from "../../../../lib/google-sheets";
import { updateOrderWithBalanceEffects } from "@/lib/orders";
import { prisma } from "@/lib/prisma";
import { updateOrderSchema } from "@/lib/validators";

function normalizeOrderId(params: { orderId: string }) {
  return params.orderId;
}

async function canAccessOrder(orderId: string, userId: string, role: Role) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      supplier: {
        include: {
          user: {
            select: {
              id: true,
            },
          },
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
  });

  if (!order) {
    return null;
  }

  if (role === Role.ADMIN || role === Role.VIEWER) {
    return order;
  }

  if (role === Role.SUPPLIER && order.supplier.user.id === userId) {
    return order;
  }

  return null;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> },
) {
  const session = await getAuthSession();
  if (!session?.user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const resolvedParams = await params;
  const order = await canAccessOrder(normalizeOrderId(resolvedParams), session.user.id, session.user.role);

  if (!order) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ order });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> },
) {
  const session = await getAuthSession();
  if (!session?.user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role === Role.VIEWER) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const resolvedParams = await params;
  const order = await canAccessOrder(normalizeOrderId(resolvedParams), session.user.id, session.user.role);

  if (!order) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  const payload = await request.json();
  const parsed = updateOrderSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      {
        message: "Invalid payload",
        issues: parsed.error.issues,
      },
      { status: 400 },
    );
  }

  if (session.user.role === Role.SUPPLIER && parsed.data.status) {
    const supplierAllowedStatuses: OrderStatus[] = [
      OrderStatus.FOLLOWED,
      OrderStatus.READY_FOR_GIFTING,
      OrderStatus.COMPLETED,
      OrderStatus.FAILED,
    ];

    if (!supplierAllowedStatuses.includes(parsed.data.status)) {
      return NextResponse.json({ message: "Suppliers cannot set this status" }, { status: 403 });
    }
  }

  const updatedOrder = await updateOrderWithBalanceEffects({
    orderId: order.id,
    status: parsed.data.status,
    supplierId: parsed.data.supplierId,
    readyForGifting: parsed.data.readyForGifting,
    notes: parsed.data.notes,
    releaseDate: parsed.data.releaseDate,
  });

  try {
    if (updatedOrder.supplier.googleSyncEnabled && updatedOrder.supplier.googleSheetId) {
      await updateOrderInSheet(updatedOrder.supplier.googleSheetId, {
        orderId: updatedOrder.id,
        status: formatOrderStatus(updatedOrder.status),
      });
    }
  } catch (error) {
    console.error("Google Sheets sync failed on status update", error);
  }

  return NextResponse.json({ order: updatedOrder });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> },
) {
  const session = await getAuthSession();
  if (!session?.user || session.user.role !== Role.ADMIN) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const resolvedParams = await params;
  const orderId = normalizeOrderId(resolvedParams);

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { supplier: true },
  });

  if (!order) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  try {
    await prisma.$transaction(async (tx) => {
      // If balance was deducted, refund it before deleting
      if (order.balanceDeductedAt) {
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
            reason: `Order deleted: ${order.skinName}`,
            orderId: null, // Order is being deleted, so no link
          },
        });
      }

      await tx.order.delete({
        where: { id: orderId },
      });
    });

    return NextResponse.json({ message: "Order deleted" });
  } catch (error) {
    console.error("Failed to delete order:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
