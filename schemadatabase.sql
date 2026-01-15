-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.APPLICATION_FACT (
  appfact_id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  app_id bigint NOT NULL,
  CONSTRAINT APPLICATION_FACT_pkey PRIMARY KEY (appfact_id),
  CONSTRAINT APPLICATION_FACT_app_id_fkey FOREIGN KEY (app_id) REFERENCES public.APPLICATION_FORM(app_id)
);
CREATE TABLE public.APPLICATION_FORM (
  app_id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  address character varying NOT NULL,
  city text NOT NULL,
  province text NOT NULL,
  postal_code numeric NOT NULL,
  country text NOT NULL,
  email character varying NOT NULL,
  phone_number numeric NOT NULL,
  position json NOT NULL,
  resume json NOT NULL,
  issued_at timestamp without time zone NOT NULL,
  CONSTRAINT APPLICATION_FORM_pkey PRIMARY KEY (app_id)
);
CREATE TABLE public.CLIENT (
  client_id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  sub_id bigint NOT NULL,
  CONSTRAINT CLIENT_pkey PRIMARY KEY (client_id),
  CONSTRAINT CLIENT_sub_id_fkey FOREIGN KEY (sub_id) REFERENCES public.az_submissions(sub_id)
);
CREATE TABLE public.TRANSACTION_FACT (
  fact_id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  client_id bigint NOT NULL,
  CONSTRAINT TRANSACTION_FACT_pkey PRIMARY KEY (fact_id),
  CONSTRAINT TRANSACTION_FACT_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.CLIENT(client_id)
);
CREATE TABLE public.agency (
  agency_id smallint GENERATED ALWAYS AS IDENTITY NOT NULL,
  name text NOT NULL,
  location character varying NOT NULL,
  email character varying NOT NULL,
  contact_number numeric NOT NULL,
  CONSTRAINT agency_pkey PRIMARY KEY (agency_id)
);
CREATE TABLE public.az_submissions (
  sub_id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  user_id integer NOT NULL,
  client_name text NOT NULL,
  client_email character varying NOT NULL,
  policy_id bigint NOT NULL,
  premium_paid numeric NOT NULL,
  anp numeric NOT NULL,
  payment_interval json NOT NULL,
  serial_id bigint NOT NULL,
  issued_at timestamp without time zone NOT NULL DEFAULT now(),
  status text DEFAULT 'Pending'::text,
  form_type text,
  attachments jsonb DEFAULT '[]'::jsonb,
  submission_type text,
  next_payment_date date,
  mode_of_payment text,
  CONSTRAINT az_submissions_pkey PRIMARY KEY (sub_id),
  CONSTRAINT AZ SUB_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id),
  CONSTRAINT AZ SUB_policy_id_fkey FOREIGN KEY (policy_id) REFERENCES public.policy(policy_id),
  CONSTRAINT AZ SUB_serial_id_fkey FOREIGN KEY (serial_id) REFERENCES public.serial_number(serial_id)
);
CREATE TABLE public.client_sample (
  id bigint NOT NULL DEFAULT nextval('client_sample_id_seq'::regclass),
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text NOT NULL UNIQUE,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT client_sample_pkey PRIMARY KEY (id)
);
CREATE TABLE public.pdf file (
  PdfID bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  client_id bigint NOT NULL,
  send_at timestamp without time zone,
  CONSTRAINT pdf file_pkey PRIMARY KEY (PdfID)
);
CREATE TABLE public.policy (
  policy_id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  policy_name text NOT NULL,
  policy_type text NOT NULL,
  CONSTRAINT policy_pkey PRIMARY KEY (policy_id)
);
CREATE TABLE public.profiles (
  id uuid NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  username text UNIQUE,
  email text NOT NULL UNIQUE,
  account_type text DEFAULT 'user'::text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);
CREATE TABLE public.serial_number (
  serial_id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  serial_number numeric NOT NULL,
  is_issued boolean DEFAULT false,
  Confirm boolean,
  ResponseID bigint,
  date timestamp without time zone NOT NULL,
  serial_type character varying NOT NULL,
  CONSTRAINT serial_number_pkey PRIMARY KEY (serial_id)
);
CREATE TABLE public.user_hierarchy (
  uh_id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  user_id bigint NOT NULL,
  report_to_id uuid NOT NULL DEFAULT auth.uid(),
  assigned_at timestamp without time zone NOT NULL,
  assigned_by uuid NOT NULL DEFAULT auth.uid(),
  is_active boolean NOT NULL,
  CONSTRAINT user_hierarchy_pkey PRIMARY KEY (uh_id)
);
CREATE TABLE public.users (
  user_id integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  first_name text NOT NULL,
  middle_name text,
  last_name text NOT NULL,
  user_email character varying NOT NULL,
  contact_number numeric NOT NULL,
  agency_id smallint NOT NULL,
  role_id bigint NOT NULL,
  CONSTRAINT users_pkey PRIMARY KEY (user_id),
  CONSTRAINT USER_agency_id_fkey FOREIGN KEY (agency_id) REFERENCES public.agency(agency_id)
);