-- Create tables for Ayam Potong Gacor sales management system
-- Created: 2026-01-09 07:00 UTC

-- Table for preorders
CREATE TABLE IF NOT EXISTS public.preorders_2026_01_09_07_00 (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    customer_name VARCHAR(255) NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for purchases
CREATE TABLE IF NOT EXISTS public.purchases_2026_01_09_07_00 (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    weight DECIMAL(10,2) NOT NULL CHECK (weight > 0),
    price_per_kg INTEGER NOT NULL CHECK (price_per_kg > 0),
    total_price INTEGER NOT NULL CHECK (total_price > 0),
    date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for sales
CREATE TABLE IF NOT EXISTS public.sales_2026_01_09_07_00 (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    customer_name VARCHAR(255) NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    weight DECIMAL(10,2) NOT NULL CHECK (weight > 0),
    price_per_kg INTEGER NOT NULL CHECK (price_per_kg > 0),
    total_price INTEGER NOT NULL CHECK (total_price > 0),
    date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_preorders_date_2026_01_09_07_00 ON public.preorders_2026_01_09_07_00(date);
CREATE INDEX IF NOT EXISTS idx_preorders_customer_2026_01_09_07_00 ON public.preorders_2026_01_09_07_00(customer_name);

CREATE INDEX IF NOT EXISTS idx_purchases_date_2026_01_09_07_00 ON public.purchases_2026_01_09_07_00(date);

CREATE INDEX IF NOT EXISTS idx_sales_date_2026_01_09_07_00 ON public.sales_2026_01_09_07_00(date);
CREATE INDEX IF NOT EXISTS idx_sales_customer_2026_01_09_07_00 ON public.sales_2026_01_09_07_00(customer_name);

-- Enable Row Level Security (RLS)
ALTER TABLE public.preorders_2026_01_09_07_00 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchases_2026_01_09_07_00 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_2026_01_09_07_00 ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (since this is a business management system)
-- Allow all operations for authenticated users
CREATE POLICY "Allow all operations for authenticated users" ON public.preorders_2026_01_09_07_00
    FOR ALL USING (true);

CREATE POLICY "Allow all operations for authenticated users" ON public.purchases_2026_01_09_07_00
    FOR ALL USING (true);

CREATE POLICY "Allow all operations for authenticated users" ON public.sales_2026_01_09_07_00
    FOR ALL USING (true);