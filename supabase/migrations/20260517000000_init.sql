-- Enable uuid-ossp extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create Profiles Table
CREATE TABLE public.profiles (
  id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL PRIMARY KEY,
  username text UNIQUE,
  avatar_url text,
  bio text,
  updated_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create Parts Table
-- This stores the catalog of parts with metadata
CREATE TABLE public.parts (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  name text NOT NULL,
  category text NOT NULL, -- e.g., 'frame', 'motor', 'battery', 'controller'
  manufacturer text,
  price numeric(10, 2) NOT NULL DEFAULT 0.00,
  description text,
  image_url text,
  model_url text, -- URL to 3D model (GLB/GLTF)
  specs jsonb DEFAULT '{}'::jsonb, -- Flexible metadata for compatibility rules
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create Builds Table
-- Represents a user's custom build
CREATE TABLE public.builds (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  is_public boolean DEFAULT false,
  total_price numeric(10, 2) DEFAULT 0.00,
  performance_estimates jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create Build Parts Table (Junction)
-- Maps the specific parts included in a build
CREATE TABLE public.build_parts (
  build_id uuid REFERENCES public.builds(id) ON DELETE CASCADE NOT NULL,
  part_id uuid REFERENCES public.parts(id) ON DELETE RESTRICT NOT NULL,
  position_data jsonb DEFAULT '{}'::jsonb, -- Customization (colors, offset, etc.)
  PRIMARY KEY (build_id, part_id)
);

-- Set up Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.builds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.build_parts ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
CREATE POLICY "Public profiles are viewable by everyone." ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile." ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile." ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Parts Policies
CREATE POLICY "Parts are viewable by everyone." ON public.parts FOR SELECT USING (true);

-- Builds Policies
CREATE POLICY "Builds are viewable by everyone if public." ON public.builds FOR SELECT USING (is_public = true OR auth.uid() = user_id);
CREATE POLICY "Users can insert their own builds." ON public.builds FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own builds." ON public.builds FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own builds." ON public.builds FOR DELETE USING (auth.uid() = user_id);

-- Build Parts Policies
CREATE POLICY "Build parts are viewable if the build is viewable." ON public.build_parts FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.builds WHERE id = build_parts.build_id AND (is_public = true OR auth.uid() = user_id)
  )
);
CREATE POLICY "Users can insert/update/delete parts in their own builds." ON public.build_parts FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.builds WHERE id = build_parts.build_id AND auth.uid() = user_id
  )
);
