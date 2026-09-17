-- Farmer: nomor registrasi per peternak
ALTER TABLE "farmer" ADD COLUMN "registration_number" TEXT;
CREATE UNIQUE INDEX "farmer_registration_number_key" ON "farmer"("registration_number");

-- Goat: field pendataan tambahan
ALTER TABLE "goat"
  ADD COLUMN "registration_number" TEXT,
  ADD COLUMN "special_traits" TEXT,
  ADD COLUMN "origin" TEXT,
  ADD COLUMN "entered_at" DATE,
  ADD COLUMN "purchase_price" INTEGER,
  ADD COLUMN "length_cm" INTEGER,
  ADD COLUMN "height_cm" INTEGER,
  ADD COLUMN "lactation_count" INTEGER,
  ADD COLUMN "initial_condition" "goat_condition",
  ADD COLUMN "photo_urls" TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN "photo_public_ids" TEXT[] NOT NULL DEFAULT '{}';

CREATE UNIQUE INDEX "goat_registration_number_key" ON "goat"("registration_number");

-- Recording: dukung banyak foto per laporan
ALTER TABLE "recording"
  ADD COLUMN "photo_urls" TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN "photo_public_ids" TEXT[] NOT NULL DEFAULT '{}';

UPDATE "recording"
  SET "photo_urls" = ARRAY["photo_url"],
      "photo_public_ids" = ARRAY["photo_public_id"]
  WHERE "photo_url" IS NOT NULL;

ALTER TABLE "recording"
  DROP COLUMN "photo_url",
  DROP COLUMN "photo_public_id";
