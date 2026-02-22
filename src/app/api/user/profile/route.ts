import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const updateProfileSchema = z.object({
  name: z.string().min(2),
  password: z.string().min(6).optional().or(z.literal("")),
  supplierName: z.string().optional(),
});

export async function GET() {
  const session = await getAuthSession();
  if (!session?.user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { supplier: true },
  });

  if (!user) {
    return new NextResponse("User not found", { status: 404 });
  }

  return NextResponse.json({
    name: user.name,
    email: user.email,
    role: user.role,
    supplier: user.supplier ? {
      name: user.supplier.name,
    } : null,
  });
}

export async function PATCH(req: Request) {
  const session = await getAuthSession();
  if (!session?.user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const body = await req.json();
    const { name, password, supplierName } = updateProfileSchema.parse(body);

    const updateData: any = { name };

    if (password) {
      const passwordHash = await bcrypt.hash(password, 10);
      updateData.passwordHash = passwordHash;
    }

    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: updateData,
      include: { supplier: true },
    });

    if (user.supplier && supplierName) {
      await prisma.supplier.update({
        where: { id: user.supplier.id },
        data: { name: supplierName },
      });
    }

    return NextResponse.json({ message: "Profile updated" });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new NextResponse("Invalid request data", { status: 422 });
    }
    console.error("Profile update error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
