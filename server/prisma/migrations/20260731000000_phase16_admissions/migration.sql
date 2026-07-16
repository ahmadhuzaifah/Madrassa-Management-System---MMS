-- CreateTable
CREATE TABLE "AdmissionSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "madrassaId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "academicYearId" TEXT,
    "startsAt" DATETIME NOT NULL,
    "endsAt" DATETIME,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "applicationCounter" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "AdmissionForm" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AdmissionForm_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "AdmissionSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AdmissionField" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "formId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "fieldType" TEXT NOT NULL,
    "fieldKey" TEXT NOT NULL,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "options" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AdmissionField_formId_fkey" FOREIGN KEY ("formId") REFERENCES "AdmissionForm" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Applicant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "madrassaId" TEXT NOT NULL,
    "applicationNumber" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "fatherName" TEXT,
    "dateOfBirth" DATETIME,
    "gender" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "city" TEXT,
    "province" TEXT,
    "source" TEXT NOT NULL DEFAULT 'PUBLIC',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ApplicantGuardian" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "applicantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "relationship" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "occupation" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ApplicantGuardian_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES "Applicant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ApplicantDocument" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "applicantId" TEXT NOT NULL,
    "documentName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "verificationStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "uploadedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ApplicantDocument_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES "Applicant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AdmissionApplication" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "formId" TEXT,
    "applicantId" TEXT NOT NULL,
    "branchId" TEXT,
    "departmentId" TEXT,
    "programId" TEXT,
    "classRoomId" TEXT,
    "sectionId" TEXT,
    "academicYearId" TEXT,
    "applicationNumber" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "submittedAt" DATETIME,
    "reviewedAt" DATETIME,
    "admissionFeeAmount" INTEGER NOT NULL DEFAULT 0,
    "feePaymentStatus" TEXT NOT NULL DEFAULT 'UNPAID',
    "admissionStudentId" TEXT,
    "remarks" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AdmissionApplication_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "AdmissionSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AdmissionApplication_formId_fkey" FOREIGN KEY ("formId") REFERENCES "AdmissionForm" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "AdmissionApplication_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES "Applicant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AdmissionStatus" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "AdmissionInterview" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "applicantId" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "interviewDate" DATETIME NOT NULL,
    "interviewerName" TEXT,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AdmissionInterview_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES "Applicant" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AdmissionInterview_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "AdmissionApplication" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AdmissionPayment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "applicantId" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "paymentMethod" TEXT NOT NULL,
    "receiptNumber" TEXT NOT NULL,
    "paymentDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "financeTransactionId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AdmissionPayment_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES "Applicant" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AdmissionPayment_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "AdmissionApplication" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AdmissionDecision" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "applicantId" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "decision" TEXT NOT NULL,
    "decidedBy" TEXT,
    "decidedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AdmissionDecision_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES "Applicant" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AdmissionDecision_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "AdmissionApplication" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AdmissionActivityLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "applicantId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AdmissionActivityLog_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES "Applicant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "AdmissionSession_organizationId_isActive_idx" ON "AdmissionSession"("organizationId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "AdmissionSession_organizationId_name_key" ON "AdmissionSession"("organizationId", "name");

-- CreateIndex
CREATE INDEX "AdmissionForm_sessionId_status_idx" ON "AdmissionForm"("sessionId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "AdmissionForm_organizationId_name_key" ON "AdmissionForm"("organizationId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "AdmissionField_formId_fieldKey_key" ON "AdmissionField"("formId", "fieldKey");

-- CreateIndex
CREATE UNIQUE INDEX "Applicant_applicationNumber_key" ON "Applicant"("applicationNumber");

-- CreateIndex
CREATE INDEX "Applicant_organizationId_status_idx" ON "Applicant"("organizationId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ApplicantGuardian_applicantId_key" ON "ApplicantGuardian"("applicantId");

-- CreateIndex
CREATE INDEX "ApplicantDocument_applicantId_idx" ON "ApplicantDocument"("applicantId");

-- CreateIndex
CREATE UNIQUE INDEX "AdmissionApplication_applicationNumber_key" ON "AdmissionApplication"("applicationNumber");

-- CreateIndex
CREATE INDEX "AdmissionApplication_organizationId_status_idx" ON "AdmissionApplication"("organizationId", "status");

-- CreateIndex
CREATE INDEX "AdmissionApplication_applicantId_idx" ON "AdmissionApplication"("applicantId");

-- CreateIndex
CREATE UNIQUE INDEX "AdmissionStatus_organizationId_code_key" ON "AdmissionStatus"("organizationId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "AdmissionInterview_applicationId_key" ON "AdmissionInterview"("applicationId");

-- CreateIndex
CREATE UNIQUE INDEX "AdmissionPayment_applicationId_key" ON "AdmissionPayment"("applicationId");

-- CreateIndex
CREATE UNIQUE INDEX "AdmissionPayment_receiptNumber_key" ON "AdmissionPayment"("receiptNumber");

-- CreateIndex
CREATE UNIQUE INDEX "AdmissionDecision_applicationId_key" ON "AdmissionDecision"("applicationId");

-- CreateIndex
CREATE INDEX "AdmissionActivityLog_organizationId_applicantId_idx" ON "AdmissionActivityLog"("organizationId", "applicantId");

