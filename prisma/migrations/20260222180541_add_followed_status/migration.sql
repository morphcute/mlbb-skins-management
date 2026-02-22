-- AlterEnum
ALTER TYPE "OrderStatus" ADD VALUE 'FOLLOWED';

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "followed_at" TIMESTAMP(3),
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "suppliers" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "updated_at" DROP DEFAULT;
