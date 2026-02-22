import { Role } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateSupplierSchema } from "@/lib/validators";

async function getSupplierOrNull(supplierId: string) {
  return prisma.supplier.findUnique({
    where: { id: supplierId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
    },
  });
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ supplierId: string }> },
) {
  const session = await getAuthSession();
  if (!session?.user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { supplierId } = await params;

  const supplier = await getSupplierOrNull(supplierId);
  if (!supplier) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  if (session.user.role === Role.SUPPLIER && supplier.userId !== session.user.id) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({ supplier });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ supplierId: string }> },
) {
  const session = await getAuthSession();
  if (!session?.user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== Role.ADMIN) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { supplierId } = await params;

  const payload = await request.json();
  const parsed = updateSupplierSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      {
        message: "Invalid payload",
        issues: parsed.error.issues,
      },
      { status: 400 },
    );
  }

  const updatedSupplier = await prisma.supplier.update({
    where: { id: supplierId },
    data: {
      ...(parsed.data.name ? { name: parsed.data.name } : {}),
      ...(typeof parsed.data.lowBalanceThreshold === "number"
        ? { lowBalanceThreshold: parsed.data.lowBalanceThreshold }
        : {}),
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
    },
  });

  return NextResponse.json({ supplier: updatedSupplier });
}
