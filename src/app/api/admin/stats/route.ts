import { NextResponse } from "next/server";
import { OrderStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAuthSession } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getAuthSession();

    if (!session?.user || session.user.role !== "ADMIN") {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const [totalOrders, pendingOrders, readyOrders] = await Promise.all([
      prisma.order.count(),
      prisma.order.count({
        where: {
          status: OrderStatus.PENDING,
        },
      }),
      prisma.order.count({
        where: {
          readyForGifting: true,
          status: {
            notIn: [OrderStatus.COMPLETED],
          },
        },
      }),
    ]);

    return NextResponse.json({
      totalOrders,
      pendingOrders,
      readyOrders,
    });
  } catch (error) {
    console.error("[ADMIN_STATS]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
