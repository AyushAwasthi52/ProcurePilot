-- CreateEnum
CREATE TYPE "CheckoutCapability" AS ENUM ('DEMO_PAYPAL', 'MERCHANT_API', 'HANDOFF_ONLY');

-- CreateEnum
CREATE TYPE "CostStatus" AS ENUM ('KNOWN', 'ESTIMATED', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "PlanStatus" AS ENUM ('ACTIVE', 'SUPERSEDED', 'EXPIRED', 'APPROVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('CREATED', 'PAYER_ACTION_REQUIRED', 'CAPTURE_PENDING', 'COMPLETED', 'CANCELLED', 'DECLINED', 'FAILED', 'EXPIRED', 'REFUNDED', 'REQUIRES_RECONCILIATION');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rawPrompt" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "region" TEXT NOT NULL DEFAULT 'US',
    "currency" CHAR(3) NOT NULL DEFAULT 'USD',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PurchaseRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseBrief" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "schemaVersion" INTEGER NOT NULL DEFAULT 3,
    "category" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "useCases" JSONB NOT NULL,
    "budgetMinor" INTEGER NOT NULL,
    "budgetCurrency" CHAR(3) NOT NULL,
    "includesShipping" BOOLEAN NOT NULL DEFAULT true,
    "mustHave" JSONB NOT NULL,
    "preferences" JSONB NOT NULL,
    "excludedBrands" JSONB,
    "preferredBrands" JSONB,
    "region" CHAR(2) NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "urgency" TEXT NOT NULL DEFAULT 'normal',
    "assumptions" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PurchaseBrief_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SearchRun" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "providerOutcomes" JSONB NOT NULL,

    CONSTRAINT "SearchRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "canonicalKey" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "attributes" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Offer" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "providerOfferId" TEXT,
    "merchantId" TEXT NOT NULL,
    "merchantName" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "priceMinor" INTEGER NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "shippingStatus" "CostStatus" NOT NULL DEFAULT 'UNKNOWN',
    "shippingMinor" INTEGER,
    "availability" TEXT NOT NULL DEFAULT 'in_stock',
    "checkoutCapability" "CheckoutCapability" NOT NULL DEFAULT 'HANDOFF_ONLY',
    "sourceObservedAt" TIMESTAMP(3) NOT NULL,
    "ingestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Offer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriceSnapshot" (
    "id" TEXT NOT NULL,
    "offerId" TEXT NOT NULL,
    "amountMinor" INTEGER NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "availability" TEXT NOT NULL,
    "sourceObservedAt" TIMESTAMP(3) NOT NULL,
    "ingestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" TEXT NOT NULL,

    CONSTRAINT "PriceSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScoreBreakdown" (
    "id" TEXT NOT NULL,
    "offerId" TEXT NOT NULL,
    "searchRunId" TEXT NOT NULL,
    "modelVersion" TEXT NOT NULL,
    "totalScore" DOUBLE PRECISION NOT NULL,
    "completeness" DOUBLE PRECISION NOT NULL,
    "confidence" TEXT NOT NULL,
    "components" JSONB NOT NULL,
    "constraintResults" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScoreBreakdown_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrustAssessment" (
    "id" TEXT NOT NULL,
    "offerId" TEXT NOT NULL,
    "riskLevel" TEXT NOT NULL,
    "signals" JSONB NOT NULL,
    "assessedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrustAssessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Merchant" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "checkoutCapability" "CheckoutCapability" NOT NULL DEFAULT 'HANDOFF_ONLY',
    "adapterId" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Merchant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchasePlan" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "offerId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "itemSnapshot" JSONB NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "itemMinor" INTEGER NOT NULL,
    "shippingStatus" "CostStatus" NOT NULL,
    "shippingMinor" INTEGER,
    "taxStatus" "CostStatus" NOT NULL DEFAULT 'UNKNOWN',
    "taxMinor" INTEGER,
    "totalKnownMinor" INTEGER NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "planHash" TEXT NOT NULL,
    "status" "PlanStatus" NOT NULL DEFAULT 'ACTIVE',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "supersededById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PurchasePlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Approval" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "planHash" TEXT NOT NULL,
    "approvedAmountMinor" INTEGER NOT NULL,
    "approvedCurrency" CHAR(3) NOT NULL,
    "acknowledgedUnverified" JSONB,
    "approvedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "Approval_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "approvalId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerOrderId" TEXT,
    "providerCaptureId" TEXT,
    "status" "PaymentStatus" NOT NULL DEFAULT 'CREATED',
    "amountMinor" INTEGER NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "failureCode" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookEvent" (
    "id" TEXT NOT NULL,
    "providerEventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "payloadHash" TEXT NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "WebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IdempotencyRecord" (
    "key" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "route" TEXT NOT NULL,
    "requestHash" TEXT NOT NULL,
    "responseJson" TEXT NOT NULL,
    "statusCode" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IdempotencyRecord_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "AuditEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "metadata" JSONB NOT NULL,
    "requestId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Provider" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "config" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Provider_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "PurchaseRequest_userId_createdAt_idx" ON "PurchaseRequest"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseBrief_requestId_key" ON "PurchaseBrief"("requestId");

-- CreateIndex
CREATE INDEX "SearchRun_requestId_startedAt_idx" ON "SearchRun"("requestId", "startedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Product_canonicalKey_key" ON "Product"("canonicalKey");

-- CreateIndex
CREATE INDEX "Product_category_brand_idx" ON "Product"("category", "brand");

-- CreateIndex
CREATE INDEX "Offer_productId_sourceObservedAt_idx" ON "Offer"("productId", "sourceObservedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Offer_providerId_providerOfferId_key" ON "Offer"("providerId", "providerOfferId");

-- CreateIndex
CREATE INDEX "PriceSnapshot_offerId_sourceObservedAt_idx" ON "PriceSnapshot"("offerId", "sourceObservedAt");

-- CreateIndex
CREATE INDEX "ScoreBreakdown_searchRunId_totalScore_idx" ON "ScoreBreakdown"("searchRunId", "totalScore");

-- CreateIndex
CREATE INDEX "TrustAssessment_offerId_idx" ON "TrustAssessment"("offerId");

-- CreateIndex
CREATE INDEX "PurchasePlan_status_expiresAt_idx" ON "PurchasePlan"("status", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "PurchasePlan_userId_offerId_version_key" ON "PurchasePlan"("userId", "offerId", "version");

-- CreateIndex
CREATE INDEX "Approval_planId_revokedAt_idx" ON "Approval"("planId", "revokedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_providerOrderId_key" ON "Payment"("providerOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_providerCaptureId_key" ON "Payment"("providerCaptureId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_idempotencyKey_key" ON "Payment"("idempotencyKey");

-- CreateIndex
CREATE INDEX "Payment_status_updatedAt_idx" ON "Payment"("status", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "WebhookEvent_providerEventId_key" ON "WebhookEvent"("providerEventId");

-- CreateIndex
CREATE INDEX "WebhookEvent_receivedAt_status_idx" ON "WebhookEvent"("receivedAt", "status");

-- CreateIndex
CREATE INDEX "IdempotencyRecord_expiresAt_idx" ON "IdempotencyRecord"("expiresAt");

-- CreateIndex
CREATE INDEX "AuditEvent_entityType_entityId_createdAt_idx" ON "AuditEvent"("entityType", "entityId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditEvent_userId_createdAt_idx" ON "AuditEvent"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "PurchaseRequest" ADD CONSTRAINT "PurchaseRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseBrief" ADD CONSTRAINT "PurchaseBrief_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "PurchaseRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SearchRun" ADD CONSTRAINT "SearchRun_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "PurchaseRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceSnapshot" ADD CONSTRAINT "PriceSnapshot_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "Offer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScoreBreakdown" ADD CONSTRAINT "ScoreBreakdown_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "Offer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScoreBreakdown" ADD CONSTRAINT "ScoreBreakdown_searchRunId_fkey" FOREIGN KEY ("searchRunId") REFERENCES "SearchRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrustAssessment" ADD CONSTRAINT "TrustAssessment_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "Offer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchasePlan" ADD CONSTRAINT "PurchasePlan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchasePlan" ADD CONSTRAINT "PurchasePlan_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "PurchaseRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchasePlan" ADD CONSTRAINT "PurchasePlan_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "Offer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Approval" ADD CONSTRAINT "Approval_planId_fkey" FOREIGN KEY ("planId") REFERENCES "PurchasePlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Approval" ADD CONSTRAINT "Approval_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_planId_fkey" FOREIGN KEY ("planId") REFERENCES "PurchasePlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_approvalId_fkey" FOREIGN KEY ("approvalId") REFERENCES "Approval"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
