-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'USER'
);

-- CreateTable
CREATE TABLE "TimesheetEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "startTime" TEXT,
    "endTime" TEXT,
    "pauseTime" TEXT,
    "targetHours" INTEGER NOT NULL,
    "workHours" INTEGER NOT NULL,
    "diffHours" INTEGER NOT NULL,
    "isVacation" BOOLEAN NOT NULL DEFAULT false,
    "isConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "remarks" TEXT,
    CONSTRAINT "TimesheetEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "TimesheetEntry_userId_date_key" ON "TimesheetEntry"("userId", "date");
