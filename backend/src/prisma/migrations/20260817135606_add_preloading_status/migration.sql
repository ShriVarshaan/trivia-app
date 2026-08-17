-- CreateEnum
CREATE TYPE "PreloadingStatus" AS ENUM ('pending', 'completed', 'failed');

-- AlterTable
ALTER TABLE "Room" ADD COLUMN     "preloading_status" "PreloadingStatus" NOT NULL DEFAULT 'pending';
