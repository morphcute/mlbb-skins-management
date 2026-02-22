import { Role } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateBalanceSchema } from "@/lib/validators";

async function resolveSupplierByPath(supplierId: string) {
  return prisma.supplier.findUnique({
    where: { id: supplierId },
    select: {
      id: true,
      userId: true,
      name: true,
      diamondBalance: true,
      lowBalanceThreshold: true,
    },
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ supplierId: string }> },
) {
  const session = await getAuthSession();
  if (!session?.user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { supplierId } = await params;
  const supplier = await resolveSupplierByPath(supplierId);

  if (!supplier) {
    return NextResponse.json({ message: "Supplier not found" }, { status: 404 });
  }

  const isOwner = supplier.userId === session.user.id;
  const isAdmin = session.user.role === Role.ADMIN;

  if (!isOwner && !isAdmin) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const payload = await request.json();
  const parsed = updateBalanceSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      {
        message: "Invalid payload",
        issues: parsed.error.issues,
      },
      { status: 400 },
    );
  }

  const updated = await prisma.$transaction(async (tx) => {
    let changeAmount = 0;
    let finalBalance = 0;

    const current = await tx.supplier.findUniqueOrThrow({
      where: { id: supplier.id },
    });

    if (parsed.data.newBalance !== undefined) {
      finalBalance = parsed.data.newBalance;
      changeAmount = finalBalance - current.diamondBalance;
    } else if (parsed.data.changeAmount !== undefined) {
      changeAmount = parsed.data.changeAmount;
      finalBalance = current.diamondBalance + changeAmount;
    } else {
      throw new Error("Invalid parameters");
    }

    if (changeAmount === 0) {
      return current;
    }

    const updatedSupplier = await tx.supplier.update({
      where: {
        id: supplier.id,
      },
      data: {
        diamondBalance: finalBalance,
      },
      select: {
        id: true,
        name: true,
        userId: true,
        diamondBalance: true,
        lowBalanceThreshold: true,
      },
    });

    await tx.balanceLog.create({
      data: {
        supplierId: supplier.id,
        changeAmount: changeAmount,
        reason: parsed.data.reason,
      },
    });

    return updatedSupplier;
  });

  return NextResponse.json({ supplier: updated });
}
