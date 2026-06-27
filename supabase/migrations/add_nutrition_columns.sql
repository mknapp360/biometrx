-- Add calorie and macro nutrition columns to health_readings
ALTER TABLE public.health_readings
  ADD COLUMN IF NOT EXISTS calories integer,
  ADD COLUMN IF NOT EXISTS protein_g numeric(6,1),
  ADD COLUMN IF NOT EXISTS fat_g numeric(6,1),
  ADD COLUMN IF NOT EXISTS carbs_g numeric(6,1),
  ADD COLUMN IF NOT EXISTS sugar_g numeric(6,1);
