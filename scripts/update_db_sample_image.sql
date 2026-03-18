-- SQL script to add sample_image column to relevant tables
-- Run this in your Supabase SQL Editor

-- 1. Add column to checklist table
ALTER TABLE checklist 
ADD COLUMN IF NOT EXISTS sample_image TEXT;

-- 2. Add column to delegation table
ALTER TABLE delegation 
ADD COLUMN IF NOT EXISTS sample_image TEXT;

-- 3. Add column to machine_maintenance table
ALTER TABLE machine_maintenance 
ADD COLUMN IF NOT EXISTS sample_image TEXT;

-- 4. Set RLS policy (optional, usually Supabase handle this via authenticated role)
-- COMMENT ON COLUMN checklist.sample_image IS 'Stores the sample image URL or link provided during task assignment';
