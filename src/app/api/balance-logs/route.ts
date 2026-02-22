import { Role } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const session = await getAuthSession();
  if (!session?.user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const requestedSupplierId = request.nextUrl.searchParams.get("supplierId");
  const limitParam = Number(request.nextUrl.searchParams.get("limit") ?? "200");
  const limit = Number.isNaN(limitParam) ? 200 : Math.min(Math.max(limitParam, 1), 500);

  let supplierId = requestedSupplierId;

  if (session.user.role === Role.SUPPLIER) {
    const supplier = await prisma.supplier.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });

    if (!supplier) {
      return NextResponse.json({ logs: [] });
    }

    supplierId = supplier.id;
  }

  const logs = await prisma.balanceLog.findMany({
    where: supplierId
      ? {
          supplierId,
        }
      : undefined,
    include: {
      supplier: {
        select: {
          id: true,
          name: true,
        },
      },
      order: {
        select: {
          id: true,
          skinName: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    take: limit,
  });

  return NextResponse.json({ logs });
}
