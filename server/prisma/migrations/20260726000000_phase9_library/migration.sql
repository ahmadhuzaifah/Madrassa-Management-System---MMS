-- CreateTable
CREATE TABLE "BookCategory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Author" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "biography" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Publisher" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contact" TEXT,
    "address" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Book" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "bookCode" TEXT NOT NULL,
    "isbn" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "authorId" TEXT,
    "publisherId" TEXT,
    "language" TEXT,
    "edition" TEXT,
    "publishYear" INTEGER,
    "description" TEXT,
    "totalCopies" INTEGER NOT NULL DEFAULT 0,
    "availableCopies" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Book_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "BookCategory" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Book_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "Author" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Book_publisherId_fkey" FOREIGN KEY ("publisherId") REFERENCES "Publisher" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BookCopy" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bookId" TEXT NOT NULL,
    "barcode" TEXT NOT NULL,
    "accessionNumber" TEXT NOT NULL,
    "condition" TEXT NOT NULL DEFAULT 'GOOD',
    "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "location" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "BookCopy_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LibraryMember" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "studentId" TEXT,
    "employeeId" TEXT,
    "memberNumber" TEXT NOT NULL,
    "joinDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "LibraryMember_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "LibraryMember_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BookIssue" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bookCopyId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "issueDate" DATETIME NOT NULL,
    "dueDate" DATETIME NOT NULL,
    "returnDate" DATETIME,
    "issuedBy" TEXT,
    "returnedTo" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ISSUED',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "BookIssue_bookCopyId_fkey" FOREIGN KEY ("bookCopyId") REFERENCES "BookCopy" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "BookIssue_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "LibraryMember" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LibraryFine" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "issueId" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "paid" BOOLEAN NOT NULL DEFAULT false,
    "paymentDate" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "LibraryFine_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "BookIssue" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "BookCategory_organizationId_name_key" ON "BookCategory"("organizationId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Author_organizationId_name_key" ON "Author"("organizationId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Publisher_organizationId_name_key" ON "Publisher"("organizationId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Book_organizationId_isbn_key" ON "Book"("organizationId", "isbn");

-- CreateIndex
CREATE UNIQUE INDEX "Book_organizationId_bookCode_key" ON "Book"("organizationId", "bookCode");

-- CreateIndex
CREATE UNIQUE INDEX "BookCopy_bookId_barcode_key" ON "BookCopy"("bookId", "barcode");

-- CreateIndex
CREATE UNIQUE INDEX "BookCopy_bookId_accessionNumber_key" ON "BookCopy"("bookId", "accessionNumber");

-- CreateIndex
CREATE UNIQUE INDEX "LibraryMember_organizationId_memberNumber_key" ON "LibraryMember"("organizationId", "memberNumber");

-- CreateIndex
CREATE UNIQUE INDEX "LibraryMember_studentId_key" ON "LibraryMember"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "LibraryMember_employeeId_key" ON "LibraryMember"("employeeId");

-- CreateIndex
CREATE INDEX "BookIssue_memberId_status_idx" ON "BookIssue"("memberId", "status");

-- CreateIndex
CREATE INDEX "BookIssue_bookCopyId_status_idx" ON "BookIssue"("bookCopyId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "LibraryFine_issueId_key" ON "LibraryFine"("issueId");
