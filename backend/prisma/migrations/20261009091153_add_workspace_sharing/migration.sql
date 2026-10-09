-- CreateEnum
CREATE TYPE "WorkspacePermission" AS ENUM ('EDITOR', 'COMMENTER', 'VIEWER');

-- CreateTable
CREATE TABLE "workspace_shares" (
    "id" SERIAL NOT NULL,
    "workspaceId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "permission" "WorkspacePermission" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workspace_shares_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "workspace_shares_userId_idx" ON "workspace_shares"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "workspace_shares_workspaceId_userId_key" ON "workspace_shares"("workspaceId", "userId");

-- AddForeignKey
ALTER TABLE "workspace_shares" ADD CONSTRAINT "workspace_shares_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_shares" ADD CONSTRAINT "workspace_shares_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
