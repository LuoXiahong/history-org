-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Event" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "dateStart" DATETIME,
    "dateEnd" DATETIME,
    "dateType" TEXT,
    "location" TEXT,
    "documentId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Event_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Event" ("createdAt", "dateEnd", "dateStart", "dateType", "description", "documentId", "id", "location", "title", "updatedAt") SELECT "createdAt", "dateEnd", "dateStart", "dateType", "description", "documentId", "id", "location", "title", "updatedAt" FROM "Event";
DROP TABLE "Event";
ALTER TABLE "new_Event" RENAME TO "Event";
CREATE INDEX "Event_documentId_idx" ON "Event"("documentId");
CREATE INDEX "Event_dateStart_idx" ON "Event"("dateStart");
CREATE INDEX "Event_title_idx" ON "Event"("title");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
