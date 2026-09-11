-- CreateIndex
CREATE INDEX "goat_farmer_id_idx" ON "goat"("farmer_id");

-- CreateIndex
CREATE INDEX "recording_goat_id_idx" ON "recording"("goat_id");

-- CreateIndex
CREATE INDEX "recording_createdAt_idx" ON "recording"("createdAt");

-- CreateIndex
CREATE INDEX "recording_status_idx" ON "recording"("status");
