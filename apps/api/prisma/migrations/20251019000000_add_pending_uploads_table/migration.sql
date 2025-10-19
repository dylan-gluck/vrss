-- CreateTable
CREATE TABLE "pending_uploads" (
    "id" UUID NOT NULL,
    "user_id" BIGINT NOT NULL,
    "s3_key" VARCHAR(500) NOT NULL,
    "filename" VARCHAR(255) NOT NULL,
    "content_type" VARCHAR(100) NOT NULL,
    "size" BIGINT NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pending_uploads_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_pending_uploads_user_expires" ON "pending_uploads"("user_id", "expires_at");

-- AlterTable (Make post_id nullable if not already)
ALTER TABLE "post_media" ALTER COLUMN "post_id" DROP NOT NULL;
