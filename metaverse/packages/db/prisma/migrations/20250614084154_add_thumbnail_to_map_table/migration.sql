/*
  Warnings:

  - Made the column `imageUrl` on table `Avatar` required. This step will fail if there are existing NULL values in that column.
  - Made the column `name` on table `Avatar` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Avatar" ALTER COLUMN "imageUrl" SET NOT NULL,
ALTER COLUMN "name" SET NOT NULL;

-- AlterTable
ALTER TABLE "Map" ADD COLUMN     "thumbnail" TEXT;
