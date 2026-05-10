-- SpesaSmart Database Schema

-- Enable RLS
-- (Note: In Supabase, RLS is enabled per table)

-- Products Table (Canonical Product Info)
CREATE TABLE products (
    id TEXT PRIMARY KEY, -- canonical_product_id
    name TEXT NOT NULL,
    brand TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Store Prices Table (Store-specific pricing)
CREATE TABLE store_prices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id TEXT REFERENCES products(id) ON DELETE CASCADE,
    store_name TEXT NOT NULL,
    price_eur NUMERIC(10, 2) NOT NULL,
    last_updated TIMESTAMP WITH TIME ZONE NOT NULL,
    city TEXT DEFAULT 'Milan',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_store_prices_product_id ON store_prices(product_id);
CREATE INDEX idx_store_prices_store_name ON store_prices(store_name);

-- RLS Policies

-- Public Read Access
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public products are viewable by everyone" ON products FOR SELECT USING (true);

ALTER TABLE store_prices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public prices are viewable by everyone" ON store_prices FOR SELECT USING (true);

-- Admin Write Access (assuming 'admin' role or specific auth UID)
-- Note: You'll need to define who the admin is. For now, we can use a role or allow authenticated users if you set up Supabase Auth.
-- For the challenge, I'll set it to authenticated users for simplicity, or we can use a specific policy if needed.
-- But the requirement says "Implement Supabase Auth for Admin routes."

CREATE POLICY "Admins can insert products" ON products FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Admins can update products" ON products FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Admins can delete products" ON products FOR DELETE TO authenticated USING (true);

CREATE POLICY "Admins can insert prices" ON store_prices FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Admins can update prices" ON store_prices FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Admins can delete prices" ON store_prices FOR DELETE TO authenticated USING (true);
