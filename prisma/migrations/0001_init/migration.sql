-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "Agency" (
    "id" TEXT NOT NULL,
    "abbreviation" TEXT,
    "name" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Agency_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiUseCase" (
    "id" TEXT NOT NULL,
    "ombId" TEXT,
    "agencyId" TEXT NOT NULL,
    "useCaseName" TEXT NOT NULL,
    "agencyBureau" TEXT,
    "contactEmail" TEXT,
    "isWithheld" TEXT,
    "developmentStage" TEXT,
    "normalizedStage" TEXT,
    "activeSystemBoolean" BOOLEAN NOT NULL DEFAULT false,
    "isHighImpact" TEXT,
    "highImpactBoolean" BOOLEAN NOT NULL DEFAULT false,
    "highImpactJustification" TEXT,
    "topicArea" TEXT,
    "normalizedTopicArea" TEXT,
    "classification" TEXT,
    "normalizedClassification" TEXT,
    "problemSolved" TEXT,
    "benefits" TEXT,
    "systemOutputs" TEXT,
    "operationalDate" TIMESTAMP(3),
    "contractingUsage" TEXT,
    "vendorName" TEXT,
    "haveAto" TEXT,
    "atoBoolean" BOOLEAN,
    "systemNameAto" TEXT,
    "dataDescription" TEXT,
    "linkToData" TEXT,
    "hasPii" TEXT,
    "piiBoolean" BOOLEAN,
    "piaUrl" TEXT,
    "demographicFeaturesJson" JSONB,
    "hasCustomCode" TEXT,
    "customCodeBoolean" BOOLEAN,
    "codeUrl" TEXT,
    "rawJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiUseCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GovernanceControl" (
    "id" TEXT NOT NULL,
    "aiUseCaseId" TEXT NOT NULL,
    "hiTestingConducted" TEXT,
    "hiAssessmentCompleted" TEXT,
    "hiPotentialImpacts" TEXT,
    "hiIndependentReview" TEXT,
    "hiOngoingMonitoring" TEXT,
    "hiTrainingEstablished" TEXT,
    "hiFailsafePresence" TEXT,
    "hiAppealProcess" TEXT,
    "hiPublicConsultationJson" JSONB,
    "missingControlsJson" JSONB,
    "riskDriversJson" JSONB,
    "completionRate" DOUBLE PRECISION NOT NULL,
    "governanceScore" DOUBLE PRECISION NOT NULL,
    "riskScore" DOUBLE PRECISION NOT NULL,
    "riskTier" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GovernanceControl_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CotsUseCase" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "aiUseCase" TEXT NOT NULL,
    "agencyUse" TEXT,
    "agencyUseBoolean" BOOLEAN,
    "productText" TEXT,
    "productNamesJson" JSONB,
    "licenseBucket" TEXT,
    "estimatedLicenseMidpoint" INTEGER,
    "estimatedMonthlySpend" DOUBLE PRECISION,
    "rawJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CotsUseCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MonthlyMetric" (
    "id" TEXT NOT NULL,
    "aiUseCaseId" TEXT NOT NULL,
    "month" TIMESTAMP(3) NOT NULL,
    "estimatedMonthlyCost" DOUBLE PRECISION NOT NULL,
    "estimatedActiveUsers" INTEGER NOT NULL,
    "taskVolume" INTEGER NOT NULL,
    "estimatedHoursSaved" DOUBLE PRECISION NOT NULL,
    "estimatedValueCreated" DOUBLE PRECISION NOT NULL,
    "riskScore" DOUBLE PRECISION NOT NULL,
    "governanceScore" DOUBLE PRECISION NOT NULL,
    "utilizationScore" DOUBLE PRECISION NOT NULL,
    "adoptionScore" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MonthlyMetric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Conversation" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "partsJson" JSONB,
    "toolResultsJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Agency_normalizedName_key" ON "Agency"("normalizedName");

-- CreateIndex
CREATE INDEX "Agency_normalizedName_idx" ON "Agency"("normalizedName");

-- CreateIndex
CREATE INDEX "AiUseCase_agencyId_idx" ON "AiUseCase"("agencyId");

-- CreateIndex
CREATE INDEX "AiUseCase_normalizedStage_idx" ON "AiUseCase"("normalizedStage");

-- CreateIndex
CREATE INDEX "AiUseCase_activeSystemBoolean_idx" ON "AiUseCase"("activeSystemBoolean");

-- CreateIndex
CREATE INDEX "AiUseCase_highImpactBoolean_idx" ON "AiUseCase"("highImpactBoolean");

-- CreateIndex
CREATE INDEX "AiUseCase_normalizedTopicArea_idx" ON "AiUseCase"("normalizedTopicArea");

-- CreateIndex
CREATE INDEX "AiUseCase_normalizedClassification_idx" ON "AiUseCase"("normalizedClassification");

-- CreateIndex
CREATE INDEX "AiUseCase_piiBoolean_idx" ON "AiUseCase"("piiBoolean");

-- CreateIndex
CREATE INDEX "AiUseCase_atoBoolean_idx" ON "AiUseCase"("atoBoolean");

-- CreateIndex
CREATE UNIQUE INDEX "GovernanceControl_aiUseCaseId_key" ON "GovernanceControl"("aiUseCaseId");

-- CreateIndex
CREATE INDEX "CotsUseCase_agencyId_idx" ON "CotsUseCase"("agencyId");

-- CreateIndex
CREATE INDEX "CotsUseCase_agencyUseBoolean_idx" ON "CotsUseCase"("agencyUseBoolean");

-- CreateIndex
CREATE INDEX "CotsUseCase_licenseBucket_idx" ON "CotsUseCase"("licenseBucket");

-- CreateIndex
CREATE INDEX "MonthlyMetric_aiUseCaseId_idx" ON "MonthlyMetric"("aiUseCaseId");

-- CreateIndex
CREATE INDEX "MonthlyMetric_month_idx" ON "MonthlyMetric"("month");

-- CreateIndex
CREATE INDEX "Message_conversationId_idx" ON "Message"("conversationId");

-- AddForeignKey
ALTER TABLE "AiUseCase" ADD CONSTRAINT "AiUseCase_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GovernanceControl" ADD CONSTRAINT "GovernanceControl_aiUseCaseId_fkey" FOREIGN KEY ("aiUseCaseId") REFERENCES "AiUseCase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CotsUseCase" ADD CONSTRAINT "CotsUseCase_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonthlyMetric" ADD CONSTRAINT "MonthlyMetric_aiUseCaseId_fkey" FOREIGN KEY ("aiUseCaseId") REFERENCES "AiUseCase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

