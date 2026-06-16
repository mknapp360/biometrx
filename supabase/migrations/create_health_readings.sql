-- Health readings table for BiometRx
CREATE TABLE IF NOT EXISTS public.health_readings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  systolic integer NOT NULL,
  diastolic integer NOT NULL,
  pulse integer,
  weight_kg numeric(5,2),
  mounjaro_dose_mg numeric(4,2),
  glucose_mmol numeric(4,1),
  sleep_hours numeric(3,1),
  steps integer,
  notes text,
  map numeric(5,2),
  pulse_pressure integer,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.health_readings ENABLE ROW LEVEL SECURITY;

-- RLS Policies: users can only access their own readings
CREATE POLICY "Users can select their own readings"
  ON public.health_readings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own readings"
  ON public.health_readings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own readings"
  ON public.health_readings FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own readings"
  ON public.health_readings FOR DELETE
  USING (auth.uid() = user_id);

-- Index for fast user-specific queries
CREATE INDEX idx_health_readings_user_recorded
  ON public.health_readings (user_id, recorded_at DESC);

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_health_readings_updated_at
  BEFORE UPDATE ON public.health_readings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
