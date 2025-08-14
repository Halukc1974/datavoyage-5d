-- Supabase migration script to create all tables with proper structure
-- Migration script for Supabase "datavoyage" database
-- Run this in your Supabase SQL Editor

-- Enable Row Level Security (RLS) - recommended for Supabase
-- You can customize these policies based on your authentication needs

-- Create sidebar_items table
CREATE TABLE IF NOT EXISTS sidebar_items (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  parent_id BIGINT REFERENCES sidebar_items(id) ON DELETE CASCADE,
  item_type VARCHAR(20) NOT NULL CHECK (item_type IN ('folder', 'table')),
  icon VARCHAR(50),
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create dynamic_tables table
CREATE TABLE IF NOT EXISTS dynamic_tables (
  id BIGSERIAL PRIMARY KEY,
  sidebar_item_id BIGINT REFERENCES sidebar_items(id) ON DELETE CASCADE,
  table_name VARCHAR(255) NOT NULL,
  display_name VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create table_columns table
CREATE TABLE IF NOT EXISTS table_columns (
  id BIGSERIAL PRIMARY KEY,
  table_id BIGINT REFERENCES dynamic_tables(id) ON DELETE CASCADE,
  column_name VARCHAR(255) NOT NULL,
  display_name VARCHAR(255) NOT NULL,
  data_type VARCHAR(20) NOT NULL CHECK (data_type IN ('text', 'number', 'date', 'boolean', 'decimal', 'double', 'checkbox')),
  is_required BOOLEAN DEFAULT FALSE,
  default_value TEXT,
  sort_order INTEGER DEFAULT 0,
  width INTEGER DEFAULT 150,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create table_data table
CREATE TABLE IF NOT EXISTS table_data (
  id BIGSERIAL PRIMARY KEY,
  table_id BIGINT REFERENCES dynamic_tables(id) ON DELETE CASCADE,
  row_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_sidebar_items_parent_id ON sidebar_items(parent_id);
CREATE INDEX IF NOT EXISTS idx_sidebar_items_sort_order ON sidebar_items(sort_order);
CREATE INDEX IF NOT EXISTS idx_dynamic_tables_sidebar_item_id ON dynamic_tables(sidebar_item_id);
CREATE INDEX IF NOT EXISTS idx_table_columns_table_id ON table_columns(table_id);
CREATE INDEX IF NOT EXISTS idx_table_columns_sort_order ON table_columns(sort_order);
CREATE INDEX IF NOT EXISTS idx_table_data_table_id ON table_data(table_id);

-- Enable Row Level Security (optional - customize based on your needs)
ALTER TABLE sidebar_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE dynamic_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE table_columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE table_data ENABLE ROW LEVEL SECURITY;

-- Create policies (optional - customize based on your authentication needs)
-- For now, allow all operations (you can restrict this later)
CREATE POLICY "Allow all operations on sidebar_items" ON sidebar_items FOR ALL USING (true);
CREATE POLICY "Allow all operations on dynamic_tables" ON dynamic_tables FOR ALL USING (true);
CREATE POLICY "Allow all operations on table_columns" ON table_columns FOR ALL USING (true);
CREATE POLICY "Allow all operations on table_data" ON table_data FOR ALL USING (true);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to automatically update updated_at columns
CREATE TRIGGER update_sidebar_items_updated_at BEFORE UPDATE ON sidebar_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_dynamic_tables_updated_at BEFORE UPDATE ON dynamic_tables FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_table_columns_updated_at BEFORE UPDATE ON table_columns FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_table_data_updated_at BEFORE UPDATE ON table_data FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
