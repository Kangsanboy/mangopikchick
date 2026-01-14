-- Create datamaster table for product types and prices
-- Created: 2026-01-14 00:39 UTC

-- Table for product master data
CREATE TABLE IF NOT EXISTS public.product_master_2026_01_14_00_39 (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    product_name VARCHAR(255) NOT NULL UNIQUE,
    price_per_kg INTEGER NOT NULL CHECK (price_per_kg > 0),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_product_master_name_2026_01_14_00_39 ON public.product_master_2026_01_14_00_39(product_name);
CREATE INDEX IF NOT EXISTS idx_product_master_active_2026_01_14_00_39 ON public.product_master_2026_01_14_00_39(is_active);

-- Enable Row Level Security (RLS)
ALTER TABLE public.product_master_2026_01_14_00_39 ENABLE ROW LEVEL SECURITY;

-- Create policy for public access
CREATE POLICY "Allow all operations for authenticated users" ON public.product_master_2026_01_14_00_39
    FOR ALL USING (true);

-- Add product_type column to existing tables
ALTER TABLE public.purchases_2026_01_09_07_00 
ADD COLUMN IF NOT EXISTS product_type VARCHAR(255) DEFAULT 'Ayam Utuh';

ALTER TABLE public.sales_2026_01_09_07_00 
ADD COLUMN IF NOT EXISTS product_type VARCHAR(255) DEFAULT 'Ayam Utuh';

-- Insert default product types
INSERT INTO public.product_master_2026_01_14_00_39 (product_name, price_per_kg) VALUES
('Ayam Utuh', 30000),
('Paha', 35000),
('Dada', 40000),
('Sayap', 25000),
('Ceker', 20000)
ON CONFLICT (product_name) DO NOTHING;