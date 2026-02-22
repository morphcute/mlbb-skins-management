import { Prisma, Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";

import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createSupplierSchema } from "@/lib/validators";

export async function GET(request: NextRequest) {
  const session = await getAuthSession();
  if (!session?.user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const includeOrders = request.nextUrl.searchParams.get("includeOrders") === "true";

  if (session.user.role === Role.SUPPLIER) {
    const supplier = await prisma.supplier.findUnique({
      where: { userId: session.user.id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        orders: includeOrders
          ? {
              orderBy: {
                createdAt: "desc",
              },
              take: 20,
            }
          : false,
      },
    });

    return NextResponse.json({ suppliers: supplier ? [supplier] : [] });
  }

  const where: Prisma.SupplierWhereInput = {};
  const search = request.nextUrl.searchParams.get("search");
  const sortParam = request.nextUrl.searchParams.get("sort") ?? "createdAt";
  const orderParam = request.nextUrl.searchParams.get("order") ?? "desc";

  const orderBy: Prisma.SupplierOrderByWithRelationInput = {};

  if (sortParam === "user") {
    orderBy.user = {
      email: orderParam === "asc" ? "asc" : "desc",
    };
  } else {
    orderBy[sortParam as keyof Prisma.SupplierOrderByWithRelationInput] = orderParam === "asc" ? "asc" : "desc";
  }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { user: { email: { contains: search, mode: "insensitive" } } },
    ];
  }

  const suppliers = await prisma.supplier.findMany({
    where,
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
      orders: includeOrders
        ? {
            orderBy: {
              createdAt: "desc",
            },
            take: 20,
          }
        : false,
    },
    orderBy,
  });

  return NextResponse.json({ suppliers });
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
  const parsed = createSupplierSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      {
        message: "Invalid payload",
        issues: parsed.error.issues,
      },
      { status: 400 },
    );
  }

  if (parsed.data.role !== Role.SUPPLIER) {
    return NextResponse.json({ message: "Supplier role must be SUPPLIER" }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({
    where: { email: parsed.data.email.toLowerCase() },
    select: { id: true },
  });

  if (existing) {
    return NextResponse.json({ message: "Email already exists" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);

  const supplier = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email: parsed.data.email.toLowerCase(),
        name: parsed.data.name,
        role: Role.SUPPLIER,
        passwordHash,
      },
    });

    return tx.supplier.create({
      data: {
        userId: user.id,
        name: parsed.data.name,
        diamondBalance: parsed.data.diamondBalance,
        lowBalanceThreshold: parsed.data.lowBalanceThreshold,
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
  });

  if (parsed.data.diamondBalance > 0) {
    await prisma.balanceLog.create({
      data: {
        supplierId: supplier.id,
        changeAmount: parsed.data.diamondBalance,
        reason: "Initial balance",
      },
    });
  }

  return NextResponse.json({ supplier }, { status: 201 });
}
