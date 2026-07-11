CREATE TYPE "sold_status" AS ENUM ('YA', 'TIDAK');
CREATE TYPE "goat_condition" AS ENUM ('SEHAT', 'SAKIT');

ALTER TABLE "recording" ADD COLUMN "recording_date" DATE;
UPDATE "recording" SET "recording_date" = "createdAt"::date;
ALTER TABLE "recording" ALTER COLUMN "recording_date" SET NOT NULL;

ALTER TABLE "recording"
  ALTER COLUMN "mating_date" DROP DEFAULT,
  ALTER COLUMN "mating_date" DROP NOT NULL,
  ALTER COLUMN "mating_date" TYPE DATE USING (
    CASE WHEN "mating_date" = '-' THEN NULL ELSE to_date("mating_date", 'DD/MM/YYYY') END
  );

ALTER TABLE "recording"
  ALTER COLUMN "birth_date" DROP DEFAULT,
  ALTER COLUMN "birth_date" DROP NOT NULL,
  ALTER COLUMN "birth_date" TYPE DATE USING (
    CASE WHEN "birth_date" = '-' THEN NULL ELSE to_date("birth_date", 'DD/MM/YYYY') END
  );

ALTER TABLE "recording"
  ALTER COLUMN "sold" DROP DEFAULT,
  ALTER COLUMN "sold" DROP NOT NULL,
  ALTER COLUMN "sold" TYPE "sold_status" USING (
    CASE
      WHEN "sold" ILIKE 'ya' THEN 'YA'::"sold_status"
      WHEN "sold" ILIKE 'tidak' OR "sold" ILIKE 'belum' THEN 'TIDAK'::"sold_status"
      ELSE NULL
    END
  );

ALTER TABLE "recording" ADD COLUMN "condition" "goat_condition";
