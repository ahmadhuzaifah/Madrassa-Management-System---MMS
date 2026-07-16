-- CreateTable
CREATE TABLE "ReportTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "definition" TEXT NOT NULL,
    "createdBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "SavedReport" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "templateId" TEXT,
    "name" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "parameters" TEXT,
    "resultData" TEXT,
    "createdBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ReportSchedule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "reportName" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "frequency" TEXT NOT NULL,
    "cron" TEXT,
    "recipients" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "DashboardWidget" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "widgetKey" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "config" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "DashboardLayout" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "layoutConfig" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ReportExport" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "requestedBy" TEXT,
    "reportType" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "filePath" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "AnalyticsEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT,
    "eventType" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "metadata" TEXT,
    "occurredAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "ReportTemplate_organizationId_module_idx" ON "ReportTemplate"("organizationId", "module");

-- CreateIndex
CREATE INDEX "SavedReport_organizationId_module_idx" ON "SavedReport"("organizationId", "module");

-- CreateIndex
CREATE INDEX "ReportSchedule_organizationId_module_idx" ON "ReportSchedule"("organizationId", "module");

-- CreateIndex
CREATE INDEX "DashboardWidget_organizationId_widgetKey_idx" ON "DashboardWidget"("organizationId", "widgetKey");

-- CreateIndex
CREATE INDEX "DashboardLayout_organizationId_isDefault_idx" ON "DashboardLayout"("organizationId", "isDefault");

-- CreateIndex
CREATE INDEX "ReportExport_organizationId_reportType_idx" ON "ReportExport"("organizationId", "reportType");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_organizationId_eventType_idx" ON "AnalyticsEvent"("organizationId", "eventType");

