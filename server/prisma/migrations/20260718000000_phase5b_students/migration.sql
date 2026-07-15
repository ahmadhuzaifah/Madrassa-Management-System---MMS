-- CreateTable
CREATE TABLE "Guardian" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "madrassaId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "relationship" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "occupation" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Guardian_madrassaId_fkey" FOREIGN KEY ("madrassaId") REFERENCES "Madrassa" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StudentSequence" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "madrassaId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "sequence" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "StudentSequence_madrassaId_fkey" FOREIGN KEY ("madrassaId") REFERENCES "Madrassa" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Student" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "madrassaId" TEXT NOT NULL,
    "guardianId" TEXT,
    "registrationNumber" TEXT NOT NULL,
    "admissionNumber" TEXT,
    "fullName" TEXT NOT NULL,
    "fatherName" TEXT,
    "grandfatherName" TEXT,
    "dateOfBirth" DATETIME,
    "gender" TEXT,
    "photo" TEXT,
    "phone" TEXT,
    "guardianPhone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "city" TEXT,
    "province" TEXT,
    "branchId" TEXT,
    "departmentId" TEXT,
    "programId" TEXT,
    "classRoomId" TEXT,
    "sectionId" TEXT,
    "academicYearId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "admissionDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Student_madrassaId_fkey" FOREIGN KEY ("madrassaId") REFERENCES "Madrassa" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Student_guardianId_fkey" FOREIGN KEY ("guardianId") REFERENCES "Guardian" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StudentDocument" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentId" TEXT NOT NULL,
    "documentName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "uploadedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "StudentDocument_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StudentTransfer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentId" TEXT NOT NULL,
    "previousBranchId" TEXT,
    "newBranchId" TEXT,
    "previousClassRoomId" TEXT,
    "newClassRoomId" TEXT,
    "transferDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "StudentTransfer_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "StudentSequence_madrassaId_year_key" ON "StudentSequence"("madrassaId", "year");
CREATE UNIQUE INDEX "Student_registrationNumber_key" ON "Student"("registrationNumber");
CREATE INDEX "Student_madrassaId_status_idx" ON "Student"("madrassaId", "status");
CREATE INDEX "StudentDocument_studentId_idx" ON "StudentDocument"("studentId");
CREATE INDEX "StudentTransfer_studentId_transferDate_idx" ON "StudentTransfer"("studentId", "transferDate");
