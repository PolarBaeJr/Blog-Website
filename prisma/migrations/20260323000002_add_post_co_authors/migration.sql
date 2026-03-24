-- CreateTable
CREATE TABLE "PostCoAuthor" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "PostCoAuthor_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PostCoAuthor_postId_idx" ON "PostCoAuthor"("postId");

-- AddForeignKey
ALTER TABLE "PostCoAuthor" ADD CONSTRAINT "PostCoAuthor_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;
