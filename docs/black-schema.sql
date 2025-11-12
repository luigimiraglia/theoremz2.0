-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.black_assessments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL,
  subject text,
  topics text,
  when_at date,
  target_grade numeric,
  readiness integer CHECK (readiness >= 0 AND readiness <= 100),
  created_by text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT black_assessments_pkey PRIMARY KEY (id),
  CONSTRAINT black_assessments_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.black_students(id),
  CONSTRAINT black_assessments_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id)
);
CREATE TABLE public.black_contact_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL,
  contacted_at timestamp with time zone NOT NULL DEFAULT now(),
  body text,
  source text NOT NULL DEFAULT 'telegram_bot'::text,
  author_chat_id text,
  author_label text,
  readiness_snapshot integer CHECK (readiness_snapshot >= 0 AND readiness_snapshot <= 100),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT black_contact_logs_pkey PRIMARY KEY (id),
  CONSTRAINT black_contact_logs_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.black_students(id)
);
CREATE TABLE public.black_grades (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL,
  subject text,
  score numeric,
  max_score numeric DEFAULT 10,
  when_at date,
  created_by text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT black_grades_pkey PRIMARY KEY (id),
  CONSTRAINT black_grades_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.black_students(id),
  CONSTRAINT black_grades_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id)
);
CREATE TABLE public.black_notes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL,
  author_id text,
  source text DEFAULT 'tutor'::text,
  body text NOT NULL,
  pinned boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT black_notes_pkey PRIMARY KEY (id),
  CONSTRAINT black_notes_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.black_students(id),
  CONSTRAINT black_notes_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.black_stripe_signups (
  session_id text NOT NULL,
  subscription_id text NOT NULL,
  customer_id text,
  plan_name text,
  plan_label text,
  price_id text,
  product_id text,
  amount_total bigint,
  amount_currency text,
  amount_display text,
  customer_name text,
  customer_email text,
  customer_phone text,
  persona text,
  quiz_kind text,
  whatsapp_link text,
  whatsapp_message text,
  metadata jsonb,
  source text,
  status text DEFAULT 'new'::text CHECK (status = ANY (ARRAY['new'::text, 'synced'::text, 'skipped'::text, 'error'::text])),
  student_user_id text,
  student_id uuid,
  event_created_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  synced_at timestamp with time zone,
  CONSTRAINT black_stripe_signups_pkey PRIMARY KEY (session_id, subscription_id),
  CONSTRAINT black_stripe_signups_student_user_id_fkey FOREIGN KEY (student_user_id) REFERENCES public.profiles(id),
  CONSTRAINT black_stripe_signups_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.black_students(id)
);
CREATE TABLE public.black_student_brief (
  student_id uuid NOT NULL,
  brief_md text NOT NULL,
  version integer NOT NULL DEFAULT 1,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT black_student_brief_pkey PRIMARY KEY (student_id),
  CONSTRAINT black_student_brief_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.black_students(id)
);
CREATE TABLE public.black_students (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  year_class text,
  track text DEFAULT 'entrambi'::text CHECK (track = ANY (ARRAY['matematica'::text, 'fisica'::text, 'entrambi'::text])),
  start_date date DEFAULT CURRENT_DATE,
  goal text,
  difficulty_focus text,
  parent_name text,
  parent_phone text,
  parent_email text,
  student_phone text,
  student_email text,
  tutor_id text,
  status text DEFAULT 'active'::text,
  initial_avg numeric,
  readiness integer CHECK (readiness >= 0 AND readiness <= 100),
  risk_level text CHECK (risk_level = ANY (ARRAY['green'::text, 'yellow'::text, 'red'::text])),
  ai_description text,
  next_assessment_subject text,
  next_assessment_date date,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  last_contacted_at timestamp with time zone,
  CONSTRAINT black_students_pkey PRIMARY KEY (id),
  CONSTRAINT black_students_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id),
  CONSTRAINT black_students_tutor_id_fkey FOREIGN KEY (tutor_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.conversations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  student_id text NOT NULL,
  status text NOT NULL DEFAULT 'open'::text CHECK (status = ANY (ARRAY['open'::text, 'closed'::text])),
  created_at timestamp with time zone DEFAULT now(),
  last_message_at timestamp with time zone,
  last_message_preview text,
  CONSTRAINT conversations_pkey PRIMARY KEY (id)
);
CREATE TABLE public.conversions (
  id integer NOT NULL DEFAULT nextval('conversions_id_seq'::regclass),
  user_id text,
  session_id text NOT NULL,
  conversion_type text NOT NULL,
  conversion_value numeric,
  conversion_data jsonb,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT conversions_pkey PRIMARY KEY (id)
);
CREATE TABLE public.daily_stats (
  id integer NOT NULL DEFAULT nextval('daily_stats_id_seq'::regclass),
  date date NOT NULL UNIQUE,
  total_visitors integer DEFAULT 0,
  total_page_views integer DEFAULT 0,
  total_sessions integer DEFAULT 0,
  total_conversions integer DEFAULT 0,
  bounce_rate numeric DEFAULT 0,
  avg_session_duration numeric DEFAULT 0,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT daily_stats_pkey PRIMARY KEY (id)
);
CREATE TABLE public.events (
  id integer NOT NULL DEFAULT nextval('events_id_seq'::regclass),
  user_id text,
  session_id text NOT NULL,
  event_type text NOT NULL,
  event_data jsonb,
  user_agent text,
  ip_address inet,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  page_url text,
  referrer text,
  CONSTRAINT events_pkey PRIMARY KEY (id)
);
CREATE TABLE public.messages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL,
  sender_id text NOT NULL,
  body text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT messages_pkey PRIMARY KEY (id),
  CONSTRAINT messages_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(id),
  CONSTRAINT messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.newsletter_subscriptions (
  id integer NOT NULL DEFAULT nextval('newsletter_subscriptions_id_seq'::regclass),
  user_id text NOT NULL UNIQUE,
  email text NOT NULL UNIQUE,
  nome text,
  cognome text,
  classe text,
  anno_scolastico text,
  scuola text,
  materie_interesse ARRAY,
  frequenza text DEFAULT 'weekly'::text CHECK (frequenza = ANY (ARRAY['daily'::text, 'weekly'::text, 'monthly'::text])),
  tipo_contenuti ARRAY DEFAULT ARRAY['lezioni'::text, 'esercizi'::text],
  subscribed_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  unsubscribed_at timestamp with time zone,
  is_active boolean DEFAULT true,
  source text DEFAULT 'profile'::text,
  user_agent text,
  ip_address inet,
  ciclo ARRAY DEFAULT '{NULL}'::text[],
  CONSTRAINT newsletter_subscriptions_pkey PRIMARY KEY (id)
);
CREATE TABLE public.profiles (
  id text NOT NULL,
  full_name text,
  avatar_url text,
  role text NOT NULL DEFAULT 'student'::text CHECK (role = ANY (ARRAY['student'::text, 'tutor'::text])),
  subscription_tier text NOT NULL DEFAULT 'free'::text CHECK (subscription_tier = ANY (ARRAY['free'::text, 'black'::text, 'mentor'::text])),
  created_at timestamp with time zone DEFAULT now(),
  email text UNIQUE,
  email_verified boolean DEFAULT false,
  stripe_customer_id text,
  stripe_subscription_status text,
  stripe_price_id text,
  stripe_current_period_end timestamp with time zone,
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT profiles_pkey PRIMARY KEY (id)
);
CREATE TABLE public.push_tokens (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  token text NOT NULL,
  platform text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT push_tokens_pkey PRIMARY KEY (id)
);
CREATE TABLE public.sessions (
  id text NOT NULL,
  user_id text,
  start_time timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  end_time timestamp with time zone,
  page_views integer DEFAULT 0,
  user_agent text,
  ip_address inet,
  referrer text,
  landing_page text,
  exit_page text,
  duration_seconds integer DEFAULT 0,
  CONSTRAINT sessions_pkey PRIMARY KEY (id)
);
