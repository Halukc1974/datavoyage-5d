-- Supabase Database Setup for Dynamic MySQL App
-- Run this script in your Supabase SQL Editor

-- Drop existing tables first to avoid schema conflicts
DROP TABLE IF EXISTS public.table_data CASCADE;
DROP TABLE IF EXISTS public.table_columns CASCADE;
DROP TABLE IF EXISTS public.dynamic_tables CASCADE;
DROP TABLE IF EXISTS public.sidebar_items CASCADE;

-- Create sidebar_items table for hierarchical folder/table structure
CREATE TABLE public.sidebar_items (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    item_type VARCHAR(50) NOT NULL CHECK (item_type IN ('folder', 'table')),
    parent_id INTEGER REFERENCES public.sidebar_items(id) ON DELETE CASCADE,
    icon VARCHAR(100),
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create dynamic_tables table for table metadata
CREATE TABLE public.dynamic_tables (
    id SERIAL PRIMARY KEY,
    sidebar_item_id INTEGER NOT NULL REFERENCES public.sidebar_items(id) ON DELETE CASCADE,
    table_name VARCHAR(255) NOT NULL,
    display_name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create table_columns table for column definitions
CREATE TABLE public.table_columns (
    id SERIAL PRIMARY KEY,
    table_id INTEGER NOT NULL REFERENCES public.dynamic_tables(id) ON DELETE CASCADE,
    column_name VARCHAR(255) NOT NULL,
    display_name VARCHAR(255) NOT NULL,
    data_type VARCHAR(50) NOT NULL CHECK (data_type IN ('text', 'number', 'date', 'boolean', 'decimal', 'double', 'checkbox')),
    is_required BOOLEAN DEFAULT FALSE,
    default_value TEXT,
    sort_order INTEGER DEFAULT 0,
    width INTEGER DEFAULT 150,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create table_data table for storing actual data
CREATE TABLE public.table_data (
    id SERIAL PRIMARY KEY,
    table_id INTEGER NOT NULL REFERENCES public.dynamic_tables(id) ON DELETE CASCADE,
    row_data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_sidebar_items_parent_id ON public.sidebar_items(parent_id);
CREATE INDEX idx_sidebar_items_item_type ON public.sidebar_items(item_type);
CREATE INDEX idx_dynamic_tables_sidebar_item_id ON public.dynamic_tables(sidebar_item_id);
CREATE INDEX idx_table_columns_table_id ON public.table_columns(table_id);
CREATE INDEX idx_table_data_table_id ON public.table_data(table_id);
CREATE INDEX idx_table_data_row_data ON public.table_data USING GIN(row_data);

-- Insert sample data
INSERT INTO public.sidebar_items (name, item_type, parent_id, icon, sort_order) VALUES
('Tables', 'folder', NULL, 'folder', 1),
('Reports', 'folder', NULL, 'folder', 2);

-- Get the folder IDs for reference
DO $$
DECLARE
    tables_folder_id INTEGER;
    reports_folder_id INTEGER;
    sample_table_sidebar_id INTEGER;
    sample_table_id INTEGER;
BEGIN
    -- Get folder IDs
    SELECT id INTO tables_folder_id FROM public.sidebar_items WHERE name = 'Tables' AND item_type = 'folder';
    SELECT id INTO reports_folder_id FROM public.sidebar_items WHERE name = 'Reports' AND item_type = 'folder';
    
    -- Insert sample table
    INSERT INTO public.sidebar_items (name, item_type, parent_id, icon, sort_order) 
    VALUES ('Sample Customers', 'table', tables_folder_id, 'table', 1)
    RETURNING id INTO sample_table_sidebar_id;
    
    -- Create dynamic table entry
    INSERT INTO public.dynamic_tables (sidebar_item_id, table_name, display_name, description)
    VALUES (sample_table_sidebar_id, 'sample_customers', 'Sample Customers', 'Sample customer data table')
    RETURNING id INTO sample_table_id;
    
    -- Create sample columns
    INSERT INTO public.table_columns (table_id, column_name, display_name, data_type, is_required, sort_order, width) VALUES
    (sample_table_id, 'name', 'Customer Name', 'text', true, 1, 200),
    (sample_table_id, 'email', 'Email Address', 'text', true, 2, 250),
    (sample_table_id, 'phone', 'Phone Number', 'text', false, 3, 150),
    (sample_table_id, 'active', 'Active Status', 'checkbox', false, 4, 100),
    (sample_table_id, 'created_date', 'Created Date', 'date', false, 5, 150);
    
    -- Insert sample data
    INSERT INTO public.table_data (table_id, row_data) VALUES
    (sample_table_id, '{"name": "John Doe", "email": "john@example.com", "phone": "+1-555-0123", "active": true, "created_date": "2024-01-15"}'),
    (sample_table_id, '{"name": "Jane Smith", "email": "jane@example.com", "phone": "+1-555-0124", "active": true, "created_date": "2024-01-16"}'),
    (sample_table_id, '{"name": "Bob Johnson", "email": "bob@example.com", "phone": "+1-555-0125", "active": false, "created_date": "2024-01-17"}');
END $$;
