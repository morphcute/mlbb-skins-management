import bcrypt from "bcryptjs";
import { PrismaClient, Role } from "@prisma/client";

const prisma = new PrismaClient();

async function upsertUserWithRole(params: {
  email: string;
  name: string;
  role: Role;
  password: string;
}) {
  const passwordHash = await bcrypt.hash(params.password, 10);

  return prisma.user.upsert({
    where: { email: params.email },
    update: {
      name: params.name,
      role: params.role,
      passwordHash,
    },
    create: {
      email: params.email,
      name: params.name,
      role: params.role,
      passwordHash,
    },
  });
}

async function main() {
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "admin123";
  const supplierPassword = process.env.SEED_SUPPLIER_PASSWORD ?? "supplier123";
  const viewerPassword = process.env.SEED_VIEWER_PASSWORD ?? "viewer123";

  const admin = await upsertUserWithRole({
    email: "admin@mlbb.local",
    name: "Main Admin",
    role: Role.ADMIN,
    password: adminPassword,
  });

  const supplierAUser = await upsertUserWithRole({
    email: "supplier1@mlbb.local",
    name: "Supplier One",
    role: Role.SUPPLIER,
    password: supplierPassword,
  });

  const supplierBUser = await upsertUserWithRole({
    email: "supplier2@mlbb.local",
    name: "Supplier Two",
    role: Role.SUPPLIER,
    password: supplierPassword,
  });

  await upsertUserWithRole({
    email: "viewer@mlbb.local",
    name: "Read Only Viewer",
    role: Role.VIEWER,
    password: viewerPassword,
  });

  await prisma.supplier.upsert({
    where: { userId: supplierAUser.id },
    update: {
      name: "Supplier One",
      diamondBalance: 12000,
      lowBalanceThreshold: 1000,
    },
    create: {
      userId: supplierAUser.id,
      name: "Supplier One",
      diamondBalance: 12000,
      lowBalanceThreshold: 1000,
    },
  });

  await prisma.supplier.upsert({
    where: { userId: supplierBUser.id },
    update: {
      name: "Supplier Two",
      diamondBalance: 8000,
      lowBalanceThreshold: 1000,
    },
    create: {
      userId: supplierBUser.id,
      name: "Supplier Two",
      diamondBalance: 8000,
      lowBalanceThreshold: 1000,
    },
  });

  console.log("Seed complete");
  console.log(`Admin: ${admin.email} / ${adminPassword}`);
  console.log(`Supplier: ${supplierAUser.email} / ${supplierPassword}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
