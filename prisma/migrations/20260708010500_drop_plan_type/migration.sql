-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Plan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "cadence" TEXT NOT NULL DEFAULT 'none',
    "cadenceTimes" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'active',
    "targetValue" REAL,
    "targetUnit" TEXT,
    "startAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueAt" DATETIME,
    "icon" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Plan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Plan" ("createdAt", "description", "dueAt", "icon", "id", "startAt", "status", "targetUnit", "targetValue", "title", "updatedAt", "userId", "cadence", "cadenceTimes") SELECT "createdAt", "description", "dueAt", "icon", "id", "startAt", "status", "targetUnit", "targetValue", "title", "updatedAt", "userId", "cadence", "cadenceTimes" FROM "Plan";
DROP TABLE "Plan";
ALTER TABLE "new_Plan" RENAME TO "Plan";
CREATE INDEX "Plan_userId_idx" ON "Plan"("userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
