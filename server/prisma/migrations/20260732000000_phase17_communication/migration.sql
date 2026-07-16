ALTER TABLE "Announcement" ADD COLUMN "audience" TEXT;
ALTER TABLE "Announcement" ADD COLUMN "publishDate" DATETIME;
ALTER TABLE "Announcement" ADD COLUMN "expiryDate" DATETIME;

CREATE TABLE "CommunicationTemplate" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "organizationId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "subject" TEXT,
  "body" TEXT NOT NULL,
  "variables" TEXT,
  "createdBy" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "CommunicationTemplate_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "CommunicationTemplate_organizationId_name_type_key" ON "CommunicationTemplate"("organizationId", "name", "type");
CREATE INDEX "CommunicationTemplate_organizationId_type_idx" ON "CommunicationTemplate"("organizationId", "type");

CREATE TABLE "Message" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "organizationId" TEXT NOT NULL,
  "senderId" TEXT,
  "receiverType" TEXT NOT NULL,
  "subject" TEXT,
  "content" TEXT NOT NULL,
  "channel" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "sentAt" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL
);

CREATE INDEX "Message_organizationId_channel_status_idx" ON "Message"("organizationId", "channel", "status");

CREATE TABLE "MessageRecipient" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "messageId" TEXT NOT NULL,
  "userId" TEXT,
  "studentId" TEXT,
  "guardianId" TEXT,
  "deliveryStatus" TEXT NOT NULL DEFAULT 'PENDING',
  "readAt" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MessageRecipient_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "MessageRecipient_messageId_deliveryStatus_idx" ON "MessageRecipient"("messageId", "deliveryStatus");

CREATE TABLE "ParentAccount" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "organizationId" TEXT NOT NULL,
  "guardianId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "ParentAccount_guardianId_fkey" FOREIGN KEY ("guardianId") REFERENCES "Guardian" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ParentAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "ParentAccount_organizationId_guardianId_key" ON "ParentAccount"("organizationId", "guardianId");
CREATE UNIQUE INDEX "ParentAccount_organizationId_userId_key" ON "ParentAccount"("organizationId", "userId");

CREATE TABLE "ParentNotificationPreference" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "parentAccountId" TEXT NOT NULL,
  "attendanceAlerts" BOOLEAN NOT NULL DEFAULT true,
  "feeAlerts" BOOLEAN NOT NULL DEFAULT true,
  "examAlerts" BOOLEAN NOT NULL DEFAULT true,
  "announcementAlerts" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "ParentNotificationPreference_parentAccountId_fkey" FOREIGN KEY ("parentAccountId") REFERENCES "ParentAccount" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "ParentNotificationPreference_parentAccountId_key" ON "ParentNotificationPreference"("parentAccountId");
