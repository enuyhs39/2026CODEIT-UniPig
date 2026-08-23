-- CreateTable
CREATE TABLE "source_terminations" (
    "source_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "confirmed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "source_terminations_pkey" PRIMARY KEY ("source_id")
);
