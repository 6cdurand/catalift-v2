-- ============================================================
-- Migration 00007: Programs (data layer)
-- saved_programs = trainer-owned program templates (library).
-- client_programs = a template assigned to a specific client.
-- Owner (trainer) has full access; the assigned client may READ
-- their own client_programs row. Fixes the program data layer that
-- v1 kept only in localStorage (apex-program-library) — now persisted
-- + RLS-scoped. See .pipeline/v2-programs-w1/spec.md.
-- ============================================================
-- ROLLBACK:
--   DROP TABLE IF EXISTS public.client_programs;
--   DROP TABLE IF EXISTS public.saved_programs;
-- (indexes, policies and triggers are dropped automatically with the tables)
-- ============================================================

-- ------------------------------------------------------------
-- saved_programs — a trainer's reusable program template.
-- `days` holds the ProgramDay[] structure as jsonb.
-- ------------------------------------------------------------
CREATE TABLE public.saved_programs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id  uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name        text NOT NULL,
  description text,
  phase       text CHECK (phase IN ('strength','hypertrophy','endurance','mobility','none')),
  goals       text[] NOT NULL DEFAULT '{}',
  duration_weeks  integer NOT NULL DEFAULT 4,
  days_per_week   integer NOT NULL DEFAULT 3,
  schedule_mode   text CHECK (schedule_mode IN ('fixed','flexible')),
  auto_repeat     boolean NOT NULL DEFAULT false,
  days            jsonb NOT NULL DEFAULT '[]',
  source_template_id text,
  times_assigned   integer NOT NULL DEFAULT 0,
  last_assigned_at timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.saved_programs ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER saved_programs_set_updated_at BEFORE UPDATE ON public.saved_programs FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE POLICY saved_programs_owner ON public.saved_programs
  FOR ALL USING (trainer_id = auth.uid()) WITH CHECK (trainer_id = auth.uid());

-- ------------------------------------------------------------
-- client_programs — a template assigned to a client.
-- `program_data` holds the full assigned ClientProgram snapshot.
-- next_workout_index advances as the client completes days.
-- ------------------------------------------------------------
CREATE TABLE public.client_programs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id  uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  client_id   uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name        text NOT NULL,
  status      text NOT NULL DEFAULT 'active' CHECK (status IN ('active','completed','paused','archived')),
  start_date  date,
  end_date    date,
  program_data jsonb NOT NULL DEFAULT '{}',
  next_workout_index integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.client_programs ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER client_programs_set_updated_at BEFORE UPDATE ON public.client_programs FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE POLICY client_programs_trainer ON public.client_programs
  FOR ALL USING (trainer_id = auth.uid()) WITH CHECK (trainer_id = auth.uid());
CREATE POLICY client_programs_client ON public.client_programs
  FOR SELECT USING (client_id = auth.uid());

-- ------------------------------------------------------------
-- Indexes
-- ------------------------------------------------------------
CREATE INDEX saved_programs_trainer_idx ON public.saved_programs(trainer_id);
CREATE INDEX client_programs_trainer_idx ON public.client_programs(trainer_id);
CREATE INDEX client_programs_client_idx ON public.client_programs(client_id);
CREATE INDEX client_programs_active_idx ON public.client_programs(client_id) WHERE status = 'active';
